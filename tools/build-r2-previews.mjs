// tools/build-r2-previews.mjs - CSV-BASED VIDEO PREVIEW BUILDER
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_JSON_PATH = path.join(PUBLIC_DIR, "data.json");

// R2 Configuration
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-473157af2ec948f98aff1f3ce756662b.r2.dev";
const VIDEO_CSV_URL = `${R2_PUBLIC_URL}/video_mirror_log.csv`;

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());
  
  return lines.slice(1).filter(Boolean).map(line => {
    const cells = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cells.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cells.push(cur);
    
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  });
}

class CSVVideoPreviewBuilder {
  constructor() {
    this.stats = {
      productsFound: 0,
      productsWithVideos: 0,
      totalVideos: 0,
      csvRowsProcessed: 0,
      errors: [],
      startTime: Date.now()
    };
    this.videoMap = new Map();
  }

  async buildVideoPreviewsData() {
    console.log('🎬 Starting CSV-Based Video Preview Build...\n');
    
    try {
      // Fetch video CSV from R2
      const videoData = await this.fetchVideoCSV();
      console.log(`📊 Loaded ${videoData.length} rows from video CSV\n`);
      
      // Build video map
      this.buildVideoMap(videoData);
      console.log(`🗺️  Built video map with ${this.videoMap.size} product folders\n`);
      
      // Load data.json
      const data = await this.loadDataJson();
      
      // Collect all products
      console.log('📦 Scanning catalog for products...');
      const products = [];
      this.collectProducts(data.catalog.tree, [], products);
      console.log(`   Found ${products.length} products\n`);
      
      // Match products with videos
      console.log('🔍 Matching products with videos...\n');
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        this.processProduct(product.item, product.path);
        
        if ((i + 1) % 100 === 0) {
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

  async fetchVideoCSV() {
    console.log(`📥 Fetching video CSV from: ${VIDEO_CSV_URL}`);
    
    try {
      const response = await fetch(VIDEO_CSV_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const csvContent = await response.text();
      console.log(`✅ CSV fetched successfully (${csvContent.length} bytes)`);
      
      return parseCSV(csvContent);
    } catch (error) {
      console.error(`❌ Failed to fetch CSV from R2: ${error.message}`);
      console.error(`   URL: ${VIDEO_CSV_URL}`);
      throw error;
    }
  }

  buildVideoMap(videoData) {
    for (const row of videoData) {
      this.stats.csvRowsProcessed++;
      
      // Check if video exists
      const hasVideo = row.Video_Found?.toLowerCase() === 'yes';
      if (!hasVideo) continue;
      
      // Get the relative path (product folder path)
      const folderPath = (row.Folder_Relative_Path || '').trim();
      if (!folderPath || folderPath === 'root') continue;
      
      // Get video filename
      const videoName = (row.Source_Video_Name || 'video.mp4').trim();
      
      // Get destination relative path
      const videoRelativePath = (row.Destination_Relative_Path || '').trim();
      
      if (!videoRelativePath) continue;
      
      // Store video info
      if (!this.videoMap.has(folderPath)) {
        this.videoMap.set(folderPath, []);
      }
      
      this.videoMap.get(folderPath).push({
        name: videoName,
        relativePath: videoRelativePath,
        folderPath: folderPath
      });
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

  processProduct(product, productPath) {
    try {
      // Try multiple path format variations
      const pathVariants = [
        productPath,
        productPath.replace(/\//g, '\\'),
        productPath.replace(/\\/g, '/'),
        // Also try with normalized slashes
        productPath.split(/[\/\\]/).join('\\'),
        productPath.split(/[\/\\]/).join('/')
      ];
      
      let videos = null;
      for (const variant of pathVariants) {
        videos = this.videoMap.get(variant);
        if (videos) {
          console.log(`   🔗 Matched path variant: ${variant}`);
          break;
        }
      }
      
      if (!videos || videos.length === 0) {
        return;
      }
      
      // Embed video preview data
      product.videoPreview = {
        videos: videos.map(video => ({
          key: video.relativePath.replace(/\\/g, '/'),
          name: video.name,
          url: `${R2_PUBLIC_URL}/${video.relativePath.replace(/\\/g, '/')}`
        })),
        videoCount: videos.length,
        lastUpdated: new Date().toISOString(),
        sourcePath: productPath
      };
      
      this.stats.productsWithVideos++;
      this.stats.totalVideos += videos.length;
      
      console.log(`   ✅ ${productPath}: ${videos.length} video(s)`);
      
    } catch (error) {
      console.log(`   ⚠️  ${productPath}: ${error.message}`);
      this.stats.errors.push({ path: productPath, error: error.message });
    }
  }

  async saveDataJson(data) {
    console.log('\n💾 Saving updated data.json...');
    
    data.meta = data.meta || {};
    data.meta.videoBuild = {
      timestamp: new Date().toISOString(),
      productsWithVideos: this.stats.productsWithVideos,
      totalVideos: this.stats.totalVideos,
      csvRowsProcessed: this.stats.csvRowsProcessed,
      method: 'csv-from-r2',
      csvUrl: VIDEO_CSV_URL,
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
    console.log(`   📋 CSV rows processed:        ${this.stats.csvRowsProcessed}`);
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
  if (!R2_PUBLIC_URL) {
    console.error('❌ Missing R2_PUBLIC_URL environment variable');
    console.error('Please set your R2 public URL');
    process.exit(1);
  }
  
  const builder = new CSVVideoPreviewBuilder();
  await builder.buildVideoPreviewsData();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CSVVideoPreviewBuilder };
