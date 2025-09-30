// tools/build-drive-previews.mjs - OPTIMIZED VERSION
// Fast Drive Preview Database Builder with parallel processing
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
    this.cache = new Map();
    this.stats = {
      productsFound: 0,
      productsWithDriveLinks: 0,
      productsProcessed: 0,
      totalImages: 0,
      errors: [],
      startTime: Date.now()
    };
  }

  async buildPreviews() {
    console.log('🚀 Starting FAST Drive Preview Build...\n');
    
    try {
      const data = await this.loadDataJson();
      await this.testConnection();
      
      // Collect all products with Drive links FIRST
      const productsToProcess = [];
      this.collectProducts(data.catalog.tree, [], productsToProcess);
      
      console.log(`📦 Found ${productsToProcess.length} products with Drive links`);
      console.log('⚡ Processing in parallel batches...\n');
      
      // Process in batches of 5 for speed
      await this.processInBatches(productsToProcess, 5);
      
      await this.saveDataJson(data);
      this.printStats();
      
      console.log('\n✅ Drive Preview Build Complete!');
      
    } catch (error) {
      console.error('\n❌ Build failed:', error);
      throw error;
    }
  }

  async loadDataJson() {
    console.log('📥 Loading data.json...');
    const content = await fs.readFile(DATA_JSON_PATH, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.catalog || !data.catalog.tree) {
      throw new Error('Invalid data.json structure');
    }
    
    console.log('✅ data.json loaded\n');
    return data;
  }

  async testConnection() {
    console.log('🔧 Testing Google Drive API...');
    this.apiCallCount++;
    
    const response = await this.drive.about.get({ fields: 'user' });
    console.log(`✅ Connected: ${response.data.user.emailAddress}\n`);
  }

  collectProducts(node, path, collection) {
    for (const [key, item] of Object.entries(node)) {
      const currentPath = [...path, key];
      
      if (item.isProduct && item.driveLink) {
        this.stats.productsFound++;
        this.stats.productsWithDriveLinks++;
        
        collection.push({
          item: item,
          path: currentPath.join('/'),
          folderId: this.extractFolderId(item.driveLink)
        });
        
      } else if (item.children && !item.isProduct) {
        this.collectProducts(item.children, currentPath, collection);
      }
      
      if (item.isProduct && !item.driveLink) {
        this.stats.productsFound++;
      }
    }
  }

  async processInBatches(products, batchSize) {
    const batches = [];
    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Batch ${i + 1}/${batches.length} (${batch.length} products)`);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(product => this.processProduct(product.item, product.path, product.folderId))
      );
    }
  }

  async processProduct(product, productPath, folderId) {
    try {
      if (!folderId) {
        console.log(`   ⚠️  ${productPath}: Invalid Drive link`);
        this.stats.errors.push({ path: productPath, error: 'Invalid Drive link' });
        return;
      }
      
      const images = await this.fetchFolderImages(folderId);
      
      if (images.length === 0) {
        console.log(`   ⚠️  ${productPath}: No images found`);
        return;
      }
      
      // Embed preview data
      product.preview = {
        folderId: folderId,
        images: images.map(img => ({
          id: img.id,
          name: img.name,
          mimeType: img.mimeType,
          thumbnailUrl: `https://lh3.googleusercontent.com/d/${img.id}=s400`,
          viewUrl: `https://lh3.googleusercontent.com/d/${img.id}`,
          driveUrl: `https://drive.google.com/file/d/${img.id}/view`
        })),
        imageCount: images.length,
        lastUpdated: new Date().toISOString()
      };
      
      this.stats.productsProcessed++;
      this.stats.totalImages += images.length;
      
      console.log(`   ✅ ${productPath}: ${images.length} images`);
      
    } catch (error) {
      console.log(`   ❌ ${productPath}: ${error.message}`);
      this.stats.errors.push({ path: productPath, error: error.message });
    }
  }

  extractFolderId(driveLink) {
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
    if (this.cache.has(folderId)) {
      return this.cache.get(folderId);
    }
    
    this.apiCallCount++;
    
    // Optimized query - only fetch images, no pagination needed for <100 images
    const imageQuery = IMAGE_EXTENSIONS.map(ext => `name contains '.${ext}'`).join(' or ');
    
    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false and (${imageQuery})`,
      fields: 'files(id,name,mimeType)',
      pageSize: 100,
      orderBy: 'name'
    });
    
    const imageFiles = (response.data.files || []).filter(f => f.mimeType.startsWith('image/'));
    this.cache.set(folderId, imageFiles);
    
    return imageFiles;
  }

  async saveDataJson(data) {
    console.log('\n💾 Saving updated data.json...');
    
    data.meta = data.meta || {};
    data.meta.previewBuild = {
      timestamp: new Date().toISOString(),
      productsProcessed: this.stats.productsProcessed,
      totalImages: this.stats.totalImages,
      apiCalls: this.apiCallCount,
      buildTime: `${((Date.now() - this.stats.startTime) / 1000).toFixed(1)}s`
    };
    
    await fs.writeFile(DATA_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Saved: ${DATA_JSON_PATH}`);
  }

  printStats() {
    const buildTime = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    
    console.log('\n📊 Build Statistics:');
    console.log('═'.repeat(50));
    console.log(`   ⏱️  Build time:               ${buildTime}s`);
    console.log(`   📦 Total products:            ${this.stats.productsFound}`);
    console.log(`   🔗 With Drive links:          ${this.stats.productsWithDriveLinks}`);
    console.log(`   ✅ Successfully processed:    ${this.stats.productsProcessed}`);
    console.log(`   🖼️  Total images embedded:     ${this.stats.totalImages}`);
    console.log(`   📞 API calls:                 ${this.apiCallCount}`);
    console.log(`   ❌ Errors:                    ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  First 5 errors:');
      this.stats.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.path}: ${err.error}`);
      });
    }
    console.log('═'.repeat(50));
  }
}

async function main() {
  console.log('🔧 Google Drive Preview Builder (FAST)');
  console.log('═'.repeat(50));
  console.log('');
  
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountJson) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY required');
    process.exit(1);
  }
  
  try {
    const serviceAccountKey = JSON.parse(serviceAccountJson);
    console.log('🔑 Service Account loaded');
    console.log(`   Email: ${serviceAccountKey.client_email}\n`);
    
    const builder = new DrivePreviewBuilder(serviceAccountKey);
    await builder.buildPreviews();
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DrivePreviewBuilder };
