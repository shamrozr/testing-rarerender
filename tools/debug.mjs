// debug.mjs - Run this to analyze your current data.json and identify issues
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

async function debugDataStructure() {
  console.log("🔍 DEBUGGING DATA STRUCTURE");
  console.log("=====================================\n");

  try {
    // Check if data.json exists
    const dataPath = path.join(PUBLIC_DIR, "data.json");
    const exists = await fs.access(dataPath).then(() => true).catch(() => false);
    
    if (!exists) {
      console.log("❌ data.json NOT FOUND in public directory!");
      console.log("   Run: npm run build");
      return;
    }

    console.log("✅ data.json exists");

    // Load and analyze data
    const dataContent = await fs.readFile(dataPath, "utf8");
    const data = JSON.parse(dataContent);

    console.log("\n📊 DATA STRUCTURE ANALYSIS:");
    console.log(`- Brands configured: ${Object.keys(data.brands || {}).length}`);
    console.log(`- Total products: ${data.catalog?.totalProducts || 0}`);
    console.log(`- Tree root keys: ${Object.keys(data.catalog?.tree || {}).join(", ")}`);

    // Check specific path: HATS/Chanel
    console.log("\n🎩 CHECKING HATS/Chanel PATH:");
    const tree = data.catalog?.tree || {};
    
    if (!tree.HATS) {
      console.log("❌ HATS category not found in tree");
      console.log("   Available top-level categories:", Object.keys(tree));
      return;
    }

    console.log("✅ HATS category exists");
    console.log(`   Items in HATS: ${Object.keys(tree.HATS.children || {}).length}`);

    if (tree.HATS.children?.Chanel) {
      console.log("✅ Chanel subcategory exists in HATS");
      const chanelItems = tree.HATS.children.Chanel.children || {};
      console.log(`   Items in HATS/Chanel: ${Object.keys(chanelItems).length}`);
      
      if (Object.keys(chanelItems).length > 0) {
        console.log("   Sample items:");
        Object.keys(chanelItems).slice(0, 5).forEach(key => {
          const item = chanelItems[key];
          console.log(`   - ${key}: ${item.isProduct ? 'PRODUCT' : 'FOLDER'} (thumb: ${item.thumbnail || 'none'})`);
        });
      } else {
        console.log("❌ No items found in HATS/Chanel");
      }
    } else {
      console.log("❌ Chanel not found in HATS");
      console.log("   Available brands in HATS:", Object.keys(tree.HATS.children || {}));
    }

    // Check MeriyaBags brand
    console.log("\n👜 CHECKING MeriyaBags BRAND:");
    if (data.brands.MeriyaBags) {
      console.log("✅ MeriyaBags brand exists");
      console.log("   Config:", JSON.stringify(data.brands.MeriyaBags, null, 2));
    } else {
      console.log("❌ MeriyaBags brand not found");
      console.log("   Available brands:", Object.keys(data.brands).slice(0, 10).join(", "));
    }

    // Check thumbnail structure
    console.log("\n🖼️  THUMBNAIL ANALYSIS:");
    let totalItems = 0;
    let itemsWithThumbnails = 0;
    let missingThumbnails = [];

    function analyzeThumbnails(node, path = []) {
      for (const [key, item] of Object.entries(node)) {
        totalItems++;
        const currentPath = [...path, key].join("/");
        
        if (item.thumbnail) {
          itemsWithThumbnails++;
        } else {
          missingThumbnails.push(currentPath);
        }

        if (item.children && !item.isProduct) {
          analyzeThumbnails(item.children, [...path, key]);
        }
      }
    }

    analyzeThumbnails(tree);
    
    console.log(`   Total items: ${totalItems}`);
    console.log(`   Items with thumbnails: ${itemsWithThumbnails}`);
    console.log(`   Missing thumbnails: ${missingThumbnails.length}`);
    
    if (missingThumbnails.length > 0) {
      console.log("   First 10 missing thumbnails:");
      missingThumbnails.slice(0, 10).forEach(path => console.log(`     - ${path}`));
    }

    // Check thumbs directory
    console.log("\n📁 CHECKING THUMBS DIRECTORY:");
    const thumbsPath = path.join(PUBLIC_DIR, "thumbs");
    const thumbsExists = await fs.access(thumbsPath).then(() => true).catch(() => false);
    
    if (thumbsExists) {
      console.log("✅ thumbs directory exists");
      try {
        const thumbsContents = await fs.readdir(thumbsPath, { recursive: true });
        console.log(`   Files in thumbs: ${thumbsContents.length}`);
        console.log("   Sample files:", thumbsContents.slice(0, 5));
      } catch (err) {
        console.log("❌ Error reading thumbs directory:", err.message);
      }
    } else {
      console.log("❌ thumbs directory not found");
      console.log("   Create: mkdir -p public/thumbs");
    }

    // Generate test URL
    console.log("\n🔗 TEST URLS:");
    console.log("   Home: https://rarerender.pages.dev/?brand=MeriyaBags");
    console.log("   HATS: https://rarerender.pages.dev/?brand=MeriyaBags&path=HATS");
    console.log("   HATS/Chanel: https://rarerender.pages.dev/?brand=MeriyaBags&path=HATS%2FChanel");

  } catch (err) {
    console.error("💥 Error during debug:", err);
  }
}

// Check if this is the main script
if (import.meta.url === `file://${process.argv[1]}`) {
  debugDataStructure();
}

export { debugDataStructure };
