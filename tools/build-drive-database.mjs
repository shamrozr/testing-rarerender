// tools/build-drive-database.mjs - FAST targeted Drive preview builder
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
  console.error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  process.exit(1);
}

// Initialize Google Drive API with Service Account
async function initDriveAPI() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

// Extract folder ID from Drive link
function extractFolderId(driveLink) {
  if (!driveLink) return null;
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/
  ];
  for (const pattern of patterns) {
    const match = driveLink.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Get ONLY image files from folder (minimal fields)
async function getImagesFromFolder(drive, folderId) {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
      fields: 'files(id,name,mimeType)', // ONLY necessary fields
      orderBy: 'name',
      pageSize: 100
    });

    return response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      preview: `https://drive.google.com/uc?export=view&id=${file.id}`,
      thumbnail: `https://lh3.googleusercontent.com/d/${file.id}`,
      viewLink: `https://drive.google.com/file/d/${file.id}/preview`
    }));
  } catch (error) {
    console.error(`Error fetching ${folderId}:`, error.message);
    return [];
  }
}

// Process catalog tree (only products with Drive links)
async function processCatalogTree(drive, node, processed = 0, total = 0) {
  for (const [key, item] of Object.entries(node)) {
    if (item.isProduct && item.driveLink) {
      const folderId = extractFolderId(item.driveLink);
      
      if (folderId) {
        console.log(`[${processed + 1}/${total}] ${key}`);
        const files = await getImagesFromFolder(drive, folderId);
        
        if (files.length > 0) {
          item.previewFiles = files;
          console.log(`  ✓ ${files.length} images`);
        } else {
          console.log(`  - No images`);
        }
        
        processed++;
      }
    } else if (!item.isProduct && item.children) {
      processed = await processCatalogTree(drive, item.children, processed, total);
    }
  }
  
  return processed;
}

// Count total products
function countProducts(node) {
  let count = 0;
  for (const item of Object.values(node)) {
    if (item.isProduct && item.driveLink) {
      count++;
    } else if (!item.isProduct && item.children) {
      count += countProducts(item.children);
    }
  }
  return count;
}

(async () => {
  console.log("Building Drive preview database...");
  
  try {
    const dataPath = path.join(PUBLIC_DIR, "data.json");
    const dataContent = await fs.readFile(dataPath, "utf8");
    const data = JSON.parse(dataContent);
    
    if (!data.catalog?.tree) {
      console.error("No catalog tree found");
      process.exit(1);
    }
    
    console.log("Initializing Drive API...");
    const drive = await initDriveAPI();
    
    const totalProducts = countProducts(data.catalog.tree);
    console.log(`Found ${totalProducts} products\n`);
    
    if (totalProducts === 0) {
      console.log("No products to process");
      process.exit(0);
    }
    
    const startTime = Date.now();
    await processCatalogTree(drive, data.catalog.tree, 0, totalProducts);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\nSaving data.json...`);
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");
    
    console.log(`✓ Complete in ${duration}s`);
    
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
})();
