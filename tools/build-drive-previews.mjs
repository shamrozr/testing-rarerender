// tools/build-drive-previews.mjs - ENHANCED: Photos + Videos
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_JSON_PATH = path.join(PUBLIC_DIR, "data.json");

// ENHANCED: Support both images AND videos
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v', 'wmv'];

class FastDrivePreviewBuilder {
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
      totalVideos: 0,
      errors: [],
      startTime: Date.now()
    };
  }

  async buildPreviews() {
    console.log('🚀 Starting ENHANCED Drive Preview Build (Photos + Videos)...\n');
    
    try {
      const data = await this.loadDataJson();
      await this.testConnection();
      
      const productsToProcess = [];
      this.collectProducts(data.catalog.tree, [], productsToProcess);
      
      console.log(`📦 Found ${productsToProcess.length} products with Drive links`);
      console.log('⚡ Processing in parallel batches of 10...\n');
      
      await this.processInBatches(productsToProcess, 10);
      
      await this.saveDataJson(data);
      this.printStats();
      
      console.log('\n✅ Enhanced Drive Preview Build Complete!');
      
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
      const progress = Math.round(((i + 1) / batches.length) * 100);
      console.log(`📦 Batch ${i + 1}/${batches.length} (${progress}% complete)`);
      
      const results = await Promise.allSettled(
        batch.map(product => this.processProduct(product.item, product.path, product.folderId))
      );
      
      const successes = results.filter(r => r.status === 'fulfilled').length;
      console.log(`   ✅ ${successes}/${batch.length} successful\n`);
    }
  }

  async processProduct(product, productPath, folderId) {
    try {
      if (!folderId) {
        throw new Error('Invalid Drive link');
      }
      
      const { images, videos } = await this.fetchFolderMedia(folderId);
      
      if (images.length === 0 && videos.length === 0) {
        console.log(`   ⚠️  ${productPath}: No media found`);
        return;
      }
      
      // ENHANCED: Store both images and videos separately
      product.preview = {
        folderId: folderId,
        images: images.map(img => ({
          id: img.id,
          name: img.name,
          mimeType: img.mimeType,
          size: img.size,
          type: 'image',
          thumbnailUrl: `https://lh3.googleusercontent.com/d/${img.id}=s400`,
          viewUrl: `https://lh3.googleusercontent.com/d/${img.id}=w2000`,
          driveUrl: `https://drive.google.com/file/d/${img.id}/view`,
          directDownload: `https://drive.google.com/uc?export=download&id=${img.id}`
        })),
        videos: videos.map(vid => ({
          id: vid.id,
          name: vid.name,
          mimeType: vid.mimeType,
          size: vid.size,
          type: 'video',
          driveUrl: `https://drive.google.com/file/d/${vid.id}/view`,
          directDownload: `https://drive.google.com/uc?export=download&id=${vid.id}`,
          embedUrl: `https://drive.google.com/file/d/${vid.id}/preview`
        })),
        imageCount: images.length,
        videoCount: videos.length,
        totalMedia: images.length + videos.length,
        lastUpdated: new Date().toISOString(),
        folderUrl: `https://drive.google.com/drive/folders/${folderId}`
      };
      
      this.stats.productsProcessed++;
      this.stats.totalImages += images.length;
      this.stats.totalVideos += videos.length;
      
      console.log(`   ✅ ${productPath}: ${images.length} images + ${videos.length} videos`);
      
    } catch (error) {
      console.log(`   ❌ ${productPath}: ${error.message}`);
      this.stats.errors.push({ path: productPath, error: error.message });
      throw error;
    }
  }

  extractFolderId(driveLink) {
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = driveLink.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async fetchFolderMedia(folderId) {
    if (this.cache.has(folderId)) {
      return this.cache.get(folderId);
    }
    
    this.apiCallCount++;
    
    try {
      // ENHANCED: Query for both images AND videos
      const imageQuery = IMAGE_EXTENSIONS.map(ext => 
        `(name contains '.${ext}' or mimeType contains 'image/${ext}')`
      ).join(' or ');
      
      const videoQuery = VIDEO_EXTENSIONS.map(ext => 
        `(name contains '.${ext}' or mimeType contains 'video/${ext}')`
      ).join(' or ');
      
      const mediaQuery = `(${imageQuery}) or (${videoQuery})`;
      
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false and (${mediaQuery})`,
        fields: 'files(id,name,mimeType,size,thumbnailLink,webViewLink)',
        pageSize: 1000, // Increased to fetch all media
        orderBy: 'name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      
      const allFiles = response.data.files || [];
      
      // Separate images and videos
      const images = allFiles
        .filter(f => f.mimeType?.startsWith('image/'))
        .map(f => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          thumbnailLink: f.thumbnailLink,
          webViewLink: f.webViewLink
        }));
      
      const videos = allFiles
        .filter(f => f.mimeType?.startsWith('video/'))
        .map(f => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          webViewLink: f.webViewLink
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort videos alphabetically
      
      const result = { images, videos };
      this.cache.set(folderId, result);
      
      return result;
      
    } catch (error) {
      console.error(`   ❌ Error fetching media for folder ${folderId}:`, error.message);
      return { images: [], videos: [] };
    }
  }

  async saveDataJson(data) {
    console.log('\n💾 Saving updated data.json...');
    
    data.meta = data.meta || {};
    data.meta.previewBuild = {
      timestamp: new Date().toISOString(),
      productsProcessed: this.stats.productsProcessed,
      totalImages: this.stats.totalImages,
      totalVideos: this.stats.totalVideos,
      totalMedia: this.stats.totalImages + this.stats.totalVideos,
      apiCalls: this.apiCallCount,
      buildTime: `${((Date.now() - this.stats.startTime) / 1000).toFixed(1)}s`,
      cacheHits: this.cache.size,
      features: ['images', 'videos', 'alphabetical-sort']
    };
    
    await fs.writeFile(DATA_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Saved: ${DATA_JSON_PATH}`);
  }

  printStats() {
    const buildTime = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    const avgTimePerProduct = this.stats.productsProcessed > 0 
      ? (buildTime / this.stats.productsProcessed).toFixed(2) 
      : 0;
    
    console.log('\n📊 Build Statistics:');
    console.log('═'.repeat(60));
    console.log(`   ⏱️  Build time:               ${buildTime}s`);
    console.log(`   ⚡ Avg time per product:      ${avgTimePerProduct}s`);
    console.log(`   📦 Total products:            ${this.stats.productsFound}`);
    console.log(`   🔗 With Drive links:          ${this.stats.productsWithDriveLinks}`);
    console.log(`   ✅ Successfully processed:    ${this.stats.productsProcessed}`);
    console.log(`   🖼️  Total images embedded:     ${this.stats.totalImages}`);
    console.log(`   🎬 Total videos embedded:     ${this.stats.totalVideos}`);
    console.log(`   📹 Total media files:         ${this.stats.totalImages + this.stats.totalVideos}`);
    console.log(`   📞 API calls:                 ${this.apiCallCount}`);
    console.log(`   💾 Cache entries:             ${this.cache.size}`);
    console.log(`   ❌ Errors:                    ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.stats.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.path}: ${err.error}`);
      });
    }
    console.log('═'.repeat(60));
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   🚀 ENHANCED Drive Preview Builder (Photos + Videos)   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountJson) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY environment variable required');
    process.exit(1);
  }
  
  try {
    const serviceAccountKey = JSON.parse(serviceAccountJson);
    console.log('🔑 Service Account Key Loaded');
    console.log(`   📧 Email: ${serviceAccountKey.client_email}`);
    console.log(`   🆔 Project: ${serviceAccountKey.project_id}\n`);
    
    const builder = new FastDrivePreviewBuilder(serviceAccountKey);
    await builder.buildPreviews();
    
    console.log('\n🎉 Build completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FastDrivePreviewBuilder };
