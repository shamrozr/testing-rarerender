// tools/build-r2-previews.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_JSON_PATH = path.join(PUBLIC_DIR, "data.json");

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "660c5d6b5866a6cb7fa1cb5d3dc4ec74";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "brand-videos";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Your pub-xxxxx.r2.dev URL

class R2VideoPreviewBuilder {
  constructor() {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    
    this.stats = {
      productsFound: 0,
      productsWithVideos: 0,
      totalVideos: 0,
      errors: [],
      startTime: Date.now()
    };
  }

  async buildVideoPreviewsData() {
    console.log('🎬 Starting R2 Video Preview Build...\n');
    
    try {
      const data = await this.loadDataJson();
      
      console.log('📦 Scanning catalog for products...');
      const products = [];
      this.collectProducts(data.catalog.tree, [], products);
      
      console.log(`   Found ${products.length} products\n`);
      console.log('🔍 Checking R2 for videos...\n');
      
      // Process products in batches of 50
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        await this.processProduct(product.item, product.path);
        
        if ((i + 1) % 50 === 0) {
          console.log(`   📊 Progress: ${i + 1}/${products.length} products checked`);
        }
      }
      
      await this.saveDataJson(data);
      this.printStats();
      
      console.log('\n✅ Video Preview Build Complete!');
      
    } catch (error) {
      console.error('\n❌ Build failed:', error);
      throw error;
    }
  }

  async loadDataJson() {
    const content = await fs.readFile(DATA_JSON_PATH, 'utf8');
    return JSON.parse(content);
  }

  collectProducts(node, path, collection) {
    for (const [key, item] of Object.entries(node)) {
      const currentPath = [...path, key];
      
      if (item.isProduct) {
        this.stats.productsFound++;
        collection.push({
          item: item,
          path: currentPath.join('/')
        });
      } else if (item.children) {
        this.collectProducts(item.children, currentPath, collection);
      }
    }
  }

  async processProduct(product, productPath) {
    try {
      // R2 path matches catalog path exactly (backslashes converted to forward slashes)
      const r2Path = productPath.replace(/\\/g, '/') + '/';
      
      const videos = await this.listVideosInPath(r2Path);
      
      if (videos.length === 0) {
        return;
      }
      
      // Embed video preview data
      product.videoPreview = {
        videos: videos.map(video => ({
          key: video.Key,
          name: path.basename(video.Key),
          size: video.Size,
          lastModified: video.LastModified,
          url: `${R2_PUBLIC_URL}/${video.Key}`
        })),
        videoCount: videos.length,
        lastUpdated: new Date().toISOString(),
        r2Path: r2Path
      };
      
      this.stats.productsWithVideos++;
      this.stats.totalVideos += videos.length;
      
      console.log(`   ✅ ${productPath}: ${videos.length} video(s)`);
      
    } catch (error) {
      console.log(`   ⚠️  ${productPath}: ${error.message}`);
      this.stats.errors.push({ path: productPath, error: error.message });
    }
  }

  async listVideosInPath(prefix) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 100
      });
      
      const response = await this.client.send(command);
      
      // Filter for video files
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.MP4', '.WEBM', '.MOV'];
      const videos = (response.Contents || []).filter(obj => 
        videoExtensions.some(ext => obj.Key.toLowerCase().endsWith(ext))
      );
      
      // Sort videos by name (video.mp4 first, then video1.mp4, video2.mp4, etc.)
      videos.sort((a, b) => {
        const aName = path.basename(a.Key).toLowerCase();
        const bName = path.basename(b.Key).toLowerCase();
        
        // Match pattern: video.mp4, video1.mp4, video2.mp4
        const aMatch = aName.match(/video(\d*)\./);
        const bMatch = bName.match(/video(\d*)\./);
        
        if (aMatch && bMatch) {
          const aNum = aMatch[1] === '' ? 0 : parseInt(aMatch[1]);
          const bNum = bMatch[1] === '' ? 0 : parseInt(bMatch[1]);
          return aNum - bNum;
        }
        
        return aName.localeCompare(bName);
      });
      
      return videos;
    } catch (error) {
      console.error(`Error listing videos in ${prefix}:`, error.message);
      return [];
    }
  }

  async saveDataJson(data) {
    console.log('\n💾 Saving updated data.json...');
    
    data.meta = data.meta || {};
    data.meta.videoBuild = {
      timestamp: new Date().toISOString(),
      productsWithVideos: this.stats.productsWithVideos,
      totalVideos: this.stats.totalVideos,
      r2Bucket: R2_BUCKET_NAME,
      r2PublicUrl: R2_PUBLIC_URL,
      buildTime: `${((Date.now() - this.stats.startTime) / 1000).toFixed(1)}s`
    };
    
    await fs.writeFile(DATA_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Saved: ${DATA_JSON_PATH}`);
  }

  printStats() {
    const buildTime = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    
    console.log('\n📊 Video Build Statistics:');
    console.log('═'.repeat(60));
    console.log(`   ⏱️  Build time:               ${buildTime}s`);
    console.log(`   📦 Total products:            ${this.stats.productsFound}`);
    console.log(`   🎬 Products with videos:      ${this.stats.productsWithVideos}`);
    console.log(`   🎥 Total videos:              ${this.stats.totalVideos}`);
    console.log(`   ❌ Errors:                    ${this.stats.errors.length}`);
    console.log('═'.repeat(60));
    
    if (this.stats.errors.length > 0 && this.stats.errors.length <= 10) {
      console.log('\n⚠️  Errors:');
      this.stats.errors.forEach(err => {
        console.log(`   - ${err.path}: ${err.error}`);
      });
    }
  }
}

async function main() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Missing R2 environment variables');
    console.error('Required: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL');
    process.exit(1);
  }
  
  if (!R2_PUBLIC_URL) {
    console.error('❌ Missing R2_PUBLIC_URL environment variable');
    console.error('Please set your R2 public URL (e.g., https://pub-xxxxx.r2.dev)');
    process.exit(1);
  }
  
  const builder = new R2VideoPreviewBuilder();
  await builder.buildVideoPreviewsData();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { R2VideoPreviewBuilder };
