// tools/build-drive-database.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

// Service Account credentials from environment
env:
  GOOGLE_SERVICE_ACCOUNT_EMAIL: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_EMAIL }}
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY }}

if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
  console.error("❌ Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  process.exit(1);
}

// Extract folder ID from Drive URL
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

// Initialize Google Drive API
async function initDriveAPI() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });
  return drive;
}

// Get all image/video files from a folder
async function getFilesFromFolder(drive, folderId) {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`,
      fields: 'files(id, name, mimeType, thumbnailLink)',
      orderBy: 'name'
    });

    return response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      // Public URLs that work without authentication
      preview: `https://drive.google.com/uc?export=view&id=${file.id}`,
      thumbnail: file.thumbnailLink || `https://lh3.googleusercontent.com/d/${file.id}`,
      viewLink: `https://drive.google.com/file/d/${file.id}/preview`
    }));
  } catch (error) {
    console.error(`❌ Error fetching files from folder ${folderId}:`, error.message);
    return [];
  }
}

// Recursively process catalog tree
async function processCatalogTree(drive, node, processed = 0, total = 0) {
  for (const [key, item] of Object.entries(node)) {
    if (item.isProduct && item.driveLink) {
      const folderId = extractFolderId(item.driveLink);
      
      if (folderId) {
        console.log(`📁 Processing: ${key} (${processed + 1}/${total})`);
        const files = await getFilesFromFolder(drive, folderId);
        
        if (files.length > 0) {
          item.previewFiles = files;
          console.log(`   ✅ Found ${files.length} files`);
        } else {
          console.log(`   ⚠️  No files found`);
        }
        
        processed++;
        
        // Rate limiting - Google API has quota limits
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
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
  console.log("🚀 Building Drive preview database...");
  
  try {
    // Load existing data.json
    const dataPath = path.join(PUBLIC_DIR, "data.json");
    const dataContent = await fs.readFile(dataPath, "utf8");
    const data = JSON.parse(dataContent);
    
    if (!data.catalog?.tree) {
      console.error("❌ No catalog tree found in data.json");
      process.exit(1);
    }
    
    // Initialize Drive API
    console.log("🔑 Initializing Google Drive API...");
    const drive = await initDriveAPI();
    
    // Count total products
    const totalProducts = countProducts(data.catalog.tree);
    console.log(`📊 Found ${totalProducts} products with Drive links`);
    
    if (totalProducts === 0) {
      console.log("⚠️  No products to process");
      process.exit(0);
    }
    
    // Process all products
    console.log("\n📥 Fetching preview files from Drive folders...\n");
    await processCatalogTree(drive, data.catalog.tree, 0, totalProducts);
    
    // Save updated data.json
    console.log("\n💾 Saving updated data.json...");
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");
    
    console.log("✅ Drive preview database built successfully!");
    console.log(`📁 Output: ${dataPath}`);
    
  } catch (error) {
    console.error("💥 Build failed:", error);
    process.exit(1);
  }
})();
