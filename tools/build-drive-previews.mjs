// tools/build-drive-previews.mjs - Google Drive Preview Database Builder
// Scans all products with Drive links and embeds preview data
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_JSON_PATH = path.join(PUBLIC_DIR, "data.json");

// Image file extensions we care about
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];

class DrivePreviewBuilder {
  constructor(serviceAccountKey) {
    this.auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.apiCallCount = 0;
    this.cache = new Map(); // Cache folder contents to avoid duplicate API calls
    this.stats = {
      productsFound: 0,
      productsWithDriveLinks: 0,
      productsProcessed: 0,
      totalImages: 0,
      errors: []
    };
  }

  async buildPreviews() {
    console.log('🚀 Starting Drive Preview Database Build...\n');
    
    try {
      // Load existing data.json
      const data = await this.loadDataJson();
      
      // Test API connection
      await this.testConnection();
      
      // Find all products with Drive links and embed preview data
      await this.processTree(data.catalog.tree);
      
      // Save updated data.json
      await this.saveDataJson(data);
      
      // Print statistics
      this.printStats();
      
      console.log('\n✅ Drive Preview Database Build Complete!');
      
    } catch (error) {
      console.error('\n❌ Build failed:', error);
      throw error;
    }
  }

  async loadDataJson() {
    console.log('📥 Loading data.json...');
    
    try {
      const content = await fs.readFile(DATA_JSON_PATH, 'utf8');
      const data = JSON.parse(content);
      
      if (!data.catalog || !data.catalog.tree) {
        throw new Error('Invalid data.json structure - missing catalog.tree');
      }
      
      console.log('✅ data.json loaded successfully\n');
      return data;
      
    } catch (error) {
      throw new Error(`Failed to load data.json: ${error.message}`);
    }
  }

  async testConnection() {
    console.log('🔧 Testing Google Drive API connection...');
    
    try {
      this.apiCallCount++;
      const response = await this.drive.about.get({
        fields: 'user'
      });
      
      console.log(`✅ Connected as: ${response.data.user.emailAddress}`);
      console.log(`   Using Service Account authentication\n`);
      
    } catch (error) {
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  async processTree(node, path = []) {
    for (const [key, item] of Object.entries(node)) {
      const currentPath = [...path, key];
      
      if (item.isProduct && item.driveLink) {
        this.stats.productsFound++;
        this.stats.productsWithDriveLinks++;
        
        await this.processProduct(item, currentPath.join('/'));
        
      } else if (item.children && !item.isProduct) {
        // Recurse into folders
        await this.processTree(item.children, currentPath);
      }
      
      // Count products without Drive links
      if (item.isProduct && !item.driveLink) {
        this.stats.productsFound++;
      }
    }
  }

  async processProduct(product, productPath) {
    console.log(`📦 Processing: ${productPath}`);
    
    try {
      // Extract folder ID from Drive link
      const folderId = this.extractFolderId(product.driveLink);
      
      if (!folderId) {
        console.log(`   ⚠️  Invalid Drive link format`);
        this.stats.errors.push({ path: productPath, error: 'Invalid Drive link' });
        return;
      }
      
      // Fetch images from Drive folder
      const images = await this.fetchFolderImages(folderId);
      
      if (images.length === 0) {
        console.log(`   ⚠️  No images found in folder`);
        return;
      }
      
      // Embed preview data in product object
      product.preview = {
        folderId: folderId,
        images: images.map(img => ({
          id: img.id,
          name: img.name,
          mimeType: img.mimeType,
          // Direct image URLs for faster loading
          thumbnailUrl: `https://lh3.googleusercontent.com/d/${img.id}=s400`,
          viewUrl: `https://lh3.googleusercontent.com/d/${img.id}`,
          driveUrl: `https://drive.google.com/file/d/${img.id}/view`
        })),
        imageCount: images.length,
        lastUpdated: new Date().toISOString()
      };
      
      this.stats.productsProcessed++;
      this.stats.totalImages += images.length;
      
      console.log(`   ✅ Embedded ${images.length} image(s)`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.stats.errors.push({ path: productPath, error: error.message });
    }
  }

  extractFolderId(driveLink) {
    // Support multiple Drive URL formats:
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/u/0/folders/FOLDER_ID
    // https://drive.google.com/file/d/FOLDER_ID/view
    
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = driveLink.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  async fetchFolderImages(folderId) {
    // Check cache first
    if (this.cache.has(folderId)) {
      console.log(`   💾 Using cached data`);
      return this.cache.get(folderId);
    }
    
    try {
      this.apiCallCount++;
      
      // Build query to only fetch image files
      const imageQuery = IMAGE_EXTENSIONS
        .map(ext => `name contains '.${ext}'`)
        .join(' or ');
      
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false and (${imageQuery})`,
        fields: 'files(id,name,mimeType)',
        pageSize: 100, // Limit to first 100 images
        orderBy: 'name' // Consistent ordering
      });
      
      const images = response.data.files || [];
      
      // Filter to only actual image mime types (double-check)
      const imageFiles = images.filter(file => 
        file.mimeType.startsWith('image/')
      );
      
      // Cache the results
      this.cache.set(folderId, imageFiles);
      
      console.log(`   📸 Found ${imageFiles.length} image(s) via API`);
      
      return imageFiles;
      
    } catch (error) {
      // Handle permission errors gracefully
      if (error.code === 403) {
        throw new Error('Access denied - ensure folder is shared with service account');
      }
      if (error.code === 404) {
        throw new Error('Folder not found - check Drive link');
      }
      throw error;
    }
  }

  async saveDataJson(data) {
    console.log('\n💾 Saving updated data.json...');
    
    // Add metadata about preview build
    data.meta = data.meta || {};
    data.meta.previewBuild = {
      timestamp: new Date().toISOString(),
      productsProcessed: this.stats.productsProcessed,
      totalImages: this.stats.totalImages,
      apiCalls: this.apiCallCount
    };
    
    // Save with pretty formatting
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(DATA_JSON_PATH, jsonContent, 'utf8');
    
    console.log(`✅ Saved to: ${DATA_JSON_PATH}`);
    console.log(`   File size: ${(jsonContent.length / 1024).toFixed(2)} KB`);
  }

  printStats() {
    console.log('\n📊 Build Statistics:');
    console.log('═'.repeat(50));
    console.log(`   Total products found:        ${this.stats.productsFound}`);
    console.log(`   Products with Drive links:   ${this.stats.productsWithDriveLinks}`);
    console.log(`   Products processed:          ${this.stats.productsProcessed}`);
    console.log(`   Total images embedded:       ${this.stats.totalImages}`);
    console.log(`   API calls made:              ${this.apiCallCount}`);
    console.log(`   Errors encountered:          ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.stats.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.path}: ${err.error}`);
      });
      if (this.stats.errors.length > 5) {
        console.log(`   ... and ${this.stats.errors.length - 5} more`);
      }
    }
    
    console.log('═'.repeat(50));
  }
}

// Main execution
async function main() {
  console.log('🔧 Google Drive Preview Database Builder');
  console.log('═'.repeat(50));
  console.log('');
  
  // Get Service Account credentials from environment
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountJson) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
    console.log('');
    console.log('💡 Setup instructions:');
    console.log('1. Create a Service Account in Google Cloud Console');
    console.log('2. Enable Google Drive API');
    console.log('3. Download the JSON key file');
    console.log('4. Add the JSON content to GitHub Secrets as GOOGLE_SERVICE_ACCOUNT_KEY');
    console.log('5. Share your Drive folders with the service account email');
    process.exit(1);
  }
  
  try {
    const serviceAccountKey = JSON.parse(serviceAccountJson);
    
    console.log('🔑 Service Account loaded');
    console.log(`   Email: ${serviceAccountKey.client_email}`);
    console.log('');
    
    const builder = new DrivePreviewBuilder(serviceAccountKey);
    await builder.buildPreviews();
    
    console.log('\n📋 Next steps:');
    console.log('1. Commit the updated data.json');
    console.log('2. Push to trigger deployment');
    console.log('3. Preview functionality will be available on the site');
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DrivePreviewBuilder };
