// Simplified build-data.mjs - focusing on core functionality without minification
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const BRANDS_CSV_URL = process.env.BRANDS_CSV_URL;
const MASTER_CSV_URL = process.env.MASTER_CSV_URL;
const PLACEHOLDER_THUMB = (process.env.PLACEHOLDER_THUMB || "/thumbs/_placeholder.webp").trim();

if (!BRANDS_CSV_URL || !MASTER_CSV_URL) {
  console.error("❌ Missing BRANDS_CSV_URL or MASTER_CSV_URL");
  process.exit(1);
}

const HEX = /^#([0-9a-fA-F]{6})$/;
const WA = /^https:\/\/wa\.me\/\d+$/;
const GDRIVE = /^https:\/\/drive\.google\.com\//;

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const rawHeaders = lines[0].split(",").map((h) => h.trim());
  const headers = rawHeaders.map((h) => h.replace(/\s+/g, " ").trim());
  
  return lines.slice(1).filter(Boolean).map((line) => {
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

function normPath(p) {
  if (!p) return "";
  const parts = p.replace(/\\/g, "/").split("/").map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  parts[0] = parts[0].toUpperCase();
  return parts.join("/");
}

function toThumbSitePath(rel) {
  if (!rel) return "";
  let p = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  
  if (!p.startsWith("thumbs/")) {
    p = "thumbs/" + p;
  }
  
  return "/" + p;
}

async function fileExists(relFromPublic) {
  try {
    await fs.access(path.join(PUBLIC_DIR, relFromPublic.replace(/^\//, "")));
    return true;
  } catch { 
    return false; 
  }
}

function ensureFolderNode(tree, segs) {
  let node = tree;
  for (const seg of segs) {
    node[seg] = node[seg] || { thumbnail: "", children: {} };
    node = node[seg].children;
  }
  return node;
}

function setCounts(node) {
  if (node.isProduct) return 1;
  let sum = 0;
  for (const k of Object.keys(node.children || {})) {
    sum += setCounts(node.children[k]);
  }
  node.count = sum;
  return sum;
}

function propagateThumbsFromChildren(node) {
  for (const k of Object.keys(node)) {
    const n = node[k];
    if (!n.isProduct && n.children) {
      propagateThumbsFromChildren(n.children);
      
      if (!n.thumbnail) {
        const childKeys = Object.keys(n.children);
        for (const ckey of childKeys) {
          const child = n.children[ckey];
          if (child.thumbnail) {
            n.thumbnail = child.thumbnail;
            break;
          }
        }
      }
    }
  }
}

function fillMissingThumbsFromAncestors(node, inherited = "") {
  for (const k of Object.keys(node)) {
    const n = node[k];
    const current = n.thumbnail || inherited || PLACEHOLDER_THUMB || "";
    if (!n.thumbnail && current) n.thumbnail = current;
    if (!n.isProduct && n.children) {
      fillMissingThumbsFromAncestors(n.children, current);
    }
  }
}

(async () => {
  console.log("🚀 Starting luxury catalog build process...");
  
  // Fetch data
  console.log("📥 Fetching CSV data...");
  const [brandsRes, masterRes] = await Promise.all([
    fetch(BRANDS_CSV_URL),
    fetch(MASTER_CSV_URL),
  ]);
  
  if (!brandsRes.ok || !masterRes.ok) {
    console.error("❌ Failed to fetch CSVs:", !brandsRes.ok ? "brands" : "", !masterRes.ok ? "master" : "");
    process.exit(1);
  }
  
  const [brandsCSV, masterCSV] = await Promise.all([brandsRes.text(), masterRes.text()]);
  const brandsRows = parseCSV(brandsCSV);
  const masterRows = parseCSV(masterCSV);
  
  console.log(`📊 Parsed ${brandsRows.length} brands and ${masterRows.length} catalog items`);

  const warnings = [];
  const hardErrors = [];

  // Process Brands
  console.log("🏷️  Processing luxury brands...");
  const brands = {};
  for (const r of brandsRows) {
    const slug = (r.csvslug || "").trim();
    const name = (r.brandName || "").trim();
    if (!slug && !name) continue;
    if (!slug || !name) { 
      warnings.push(`Brand row skipped (needs both slug & name): ${JSON.stringify(r)}`); 
      continue; 
    }

    let primary = (r.primaryColor || "").trim();
    let accent  = (r.accentColor  || "").trim();
    let text    = (r.textColor    || "").trim();
    let bg      = (r.bgColor      || "").trim();

    // Enhanced defaults for luxury dark theme
    if (!HEX.test(primary)) { 
      if (primary) warnings.push(`Brand ${slug}: invalid primaryColor "${primary}" → luxury gold used`); 
      primary = "#d4af37";
    }
    if (!HEX.test(accent))  { 
      if (accent)  warnings.push(`Brand ${slug}: invalid accentColor "${accent}" → rose gold used`);  
      accent  = "#e8b4a0";
    }
    if (!HEX.test(text))    { 
      if (text)    warnings.push(`Brand ${slug}: invalid textColor "${text}" → luxury white used`);      
      text    = "#f5f5f5";
    }
    if (!HEX.test(bg))      { 
      if (bg)      warnings.push(`Brand ${slug}: invalid bgColor "${bg}" → luxury black used`);          
      bg      = "#0a0a0a";
    }

    const waRaw = (r.whatsapp || "").trim();
    const whatsapp = WA.test(waRaw) ? waRaw : "";
    if (waRaw && !whatsapp) warnings.push(`Brand ${slug}: WhatsApp is not wa.me/* → ignored`);

    const defaultCategory = (r.defaultCategory || "").trim() || "BAGS";
    if (brands[slug]) { 
      warnings.push(`Duplicate brand slug ignored: ${slug}`); 
      continue; 
    }

    brands[slug] = { name, colors: { primary, accent, text, bg }, whatsapp, defaultCategory };
  }
  
  console.log(`✅ Processed ${Object.keys(brands).length} luxury brands`);

  // Build catalog tree
  console.log("🌳 Building luxury catalog tree...");
  
  const allFullPaths = masterRows.map(r => normPath(r["RelativePath"] || r["Relative Path"] || r["Relative_Path"] || ""));
  const parentsSet = new Set();
  for (const full of allFullPaths) {
    const segs = full.split("/").filter(Boolean);
    for (let i = 1; i < segs.length; i++) {
      parentsSet.add(segs.slice(0, i).join("/"));
    }
  }

  const tree = {};
  let totalProducts = 0;
  const invalidDriveLinks = [];
  const folderMeta = new Map();

  console.log("📝 Processing luxury catalog entries...");
  let processedCount = 0;
  
  for (const r of masterRows) {
    const name = (r["Name"] || r["Folder/Product"] || "").trim();
    const rel  = normPath(r["RelativePath"] || r["Relative Path"] || "");
    const driveLink = (r["Drive Link"] || r["Drive"] || "").trim();
    const thumbRel  = (r["Thumbs Path"] || r["Thumb"] || "").trim();
    const topOrderRaw = (r["TopOrder"] || r["Top Order"] || "").trim();

    if (!rel || !name) continue;
    
    processedCount++;
    if (processedCount % 100 === 0) {
      console.log(`  ✨ Processed ${processedCount}/${masterRows.length} luxury items...`);
    }

    const full = rel;
    const segs = full.split("/").filter(Boolean);
    const isCandidateProduct = !!driveLink;
    const hasChildren = parentsSet.has(full);
    const isLeafProduct = isCandidateProduct && !hasChildren;

    if (isCandidateProduct && !GDRIVE.test(driveLink)) {
      invalidDriveLinks.push({ name, rel, driveLink });
    }

    const normalizedThumb = toThumbSitePath(thumbRel);

    if (isLeafProduct) {
      const parentSegs = segs.slice(0, -1);
      const children = ensureFolderNode(tree, parentSegs);
      children[name] = { 
        isProduct: true, 
        driveLink, 
        thumbnail: normalizedThumb || PLACEHOLDER_THUMB 
      };
      totalProducts++;
    } else {
      ensureFolderNode(tree, segs);
      const k = segs.join("/");
      const existing = folderMeta.get(k) || {};
      if (normalizedThumb) existing.thumbnail = normalizedThumb;
      if (driveLink) existing.driveLink = driveLink;
      
      if (segs.length === 1) {
        const n = parseInt(topOrderRaw, 10);
        if (!Number.isNaN(n)) existing.topOrder = n;
      }
      folderMeta.set(k, existing);
    }
  }

  console.log(`📦 Created luxury catalog with ${totalProducts} products`);

  // Attach folder metadata
  console.log("🔗 Enhancing catalog structure...");
  function attachFolderMeta(node, prefix = []) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (!n.isProduct) {
        const here = [...prefix, k].join("/");
        const meta = folderMeta.get(here);
        if (meta?.thumbnail) n.thumbnail = meta.thumbnail;
        if (meta?.driveLink) n.driveLink = meta.driveLink;
        if (typeof meta?.topOrder !== "undefined") n.topOrder = meta.topOrder;
        if (n.children) attachFolderMeta(n.children, [...prefix, k]);
      }
    }
  }
  attachFolderMeta(tree);

  // Convert empty folders with drive links to products
  console.log("🔄 Optimizing catalog structure...");
  function convertEmpty(node) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (!n.isProduct) {
        const hasChildren = Object.keys(n.children || {}).length > 0;
        if (!hasChildren && n.driveLink) {
          delete n.children;
          n.isProduct = true;
          totalProducts++;
        } else if (n.children) {
          convertEmpty(n.children);
        }
      }
    }
  }
  convertEmpty(tree);

  // Enhance catalog
  console.log("🖼️  Enhancing visual elements...");
  propagateThumbsFromChildren(tree);
  fillMissingThumbsFromAncestors(tree);

  console.log("🧮 Calculating luxury catalog metrics...");
  for (const top of Object.keys(tree)) {
    setCounts(tree[top]);
  }

  // Health checks
  console.log("🔍 Running quality assurance checks...");
  const missingThumbFiles = [];
  async function scanMissingThumbs(node, pfx = []) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (n.thumbnail && n.thumbnail !== PLACEHOLDER_THUMB) {
        const exists = await fileExists(n.thumbnail);
        if (!exists) {
          missingThumbFiles.push({ 
            path: [...pfx, k].join("/"), 
            thumbnail: n.thumbnail 
          });
        }
      }
      if (!n.isProduct && n.children) {
        await scanMissingThumbs(n.children, [...pfx, k]);
      }
    }
  }
  await scanMissingThumbs(tree);

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    performance: {
      totalBrands: Object.keys(brands).length,
      totalProducts: totalProducts,
      totalCategories: Object.keys(tree).length,
      catalogEntries: masterRows.length,
    },
    quality: {
      invalidDriveLinks: invalidDriveLinks.length,
      missingThumbnails: missingThumbFiles.length,
      warnings: warnings.length,
      errors: hardErrors.length,
    },
    details: {
      invalidDriveLinks: invalidDriveLinks.slice(0, 5),
      missingThumbFiles: missingThumbFiles.slice(0, 10),
      warnings: warnings.slice(0, 5),
      sampleCategories: Object.keys(tree).slice(0, 10).map(cat => ({
        name: cat,
        items: tree[cat].count || 0
      }))
    }
  };

  // Save files
  console.log("💾 Saving luxury catalog...");
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(
    path.join(PUBLIC_DIR, "data.json"), 
    JSON.stringify({ brands, catalog: { totalProducts, tree } }, null, 2), 
    "utf8"
  );
  
  await fs.mkdir(path.join(ROOT, "build"), { recursive: true });
  await fs.writeFile(
    path.join(ROOT, "build", "health.json"), 
    JSON.stringify(report, null, 2), 
    "utf8"
  );

  // Generate summary
  const summary = [
    "## 🏆 Luxury Catalog Build Summary",
    "",
    "### 📊 **Performance Metrics**",
    `- **Luxury Brands:** ${Object.keys(brands).length}`,
    `- **Premium Products:** ${totalProducts}`,
    `- **Category Collections:** ${Object.keys(tree).length}`,
    `- **Catalog Entries Processed:** ${masterRows.length}`,
    "",
    "### 🎨 **Quality Assurance**",
    `- **Missing Thumbnails:** ${missingThumbFiles.length}`,
    `- **Invalid Drive Links:** ${invalidDriveLinks.length}`,
    warnings.length ? `- **⚠️ Warnings:** ${warnings.length}` : "- **✅ No Warnings**",
    hardErrors.length ? `- **❌ Errors:** ${hardErrors.length}` : "- **✅ No Errors**",
    "",
    "### 🗂️ **Luxury Categories**",
    ...Object.keys(tree).map(cat => `- **${cat}:** ${tree[cat].count || 0} premium items`)
  ].filter(Boolean).join("\n");

  console.log("\n" + summary);
  
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.writeFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  }

  if (hardErrors.length) {
    console.error("\n❌ Build failed due to critical errors");
    process.exit(1);
  }
  
  console.log(`\n🎉 Successfully built luxury catalog with ${totalProducts} premium products!`);
  console.log(`📁 Output: ${path.join(PUBLIC_DIR, "data.json")}`);
  console.log("✨ Ready for luxury shopping experience!");
})().catch(err => {
  console.error("💥 Build failed:", err);
  process.exit(1);
});
