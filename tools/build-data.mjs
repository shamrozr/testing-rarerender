// Enhanced build-data.mjs - CSV-driven with sections support
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
  console.log("🚀 Starting CSV-driven catalog build...");
  
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

  // Process Enhanced Brands with Homepage Content
  console.log("🏷️  Processing enhanced brands...");
  const brands = {};
  for (const r of brandsRows) {
    const slug = (r.csvslug || r.slug || "").trim();
    const name = (r.brandName || r.name || "").trim();
    if (!slug && !name) continue;
    if (!slug || !name) { 
      warnings.push(`Brand row skipped (needs both slug & name): ${JSON.stringify(r)}`); 
      continue; 
    }

    // Enhanced brand properties from CSV
    const brandData = {
      name,
      // Homepage content
      tagline: (r.tagline || r.brandTagline || "").trim(),
      heroTitle: (r.heroTitle || r.hero_title || "").trim(),
      heroSubtitle: (r.heroSubtitle || r.hero_subtitle || "").trim(),
      footerText: (r.footerText || r.footer_text || "").trim(),
      
      // Color validation
      colors: {}
    };

    // Process colors with enhanced defaults
    let primary = (r.primaryColor || r.primary_color || "").trim();
    let accent = (r.accentColor || r.accent_color || "").trim();
    let text = (r.textColor || r.text_color || "").trim();
    let bg = (r.bgColor || r.bg_color || "").trim();

    // Enhanced defaults for light professional theme
    if (!HEX.test(primary)) { 
      if (primary) warnings.push(`Brand ${slug}: invalid primaryColor "${primary}" → professional blue used`); 
      primary = "#6366f1";
    }
    if (!HEX.test(accent))  { 
      if (accent)  warnings.push(`Brand ${slug}: invalid accentColor "${accent}" → professional purple used`);  
      accent  = "#8b5cf6";
    }
    if (!HEX.test(text))    { 
      if (text)    warnings.push(`Brand ${slug}: invalid textColor "${text}" → professional dark used`);      
      text    = "#202124";
    }
    if (!HEX.test(bg))      { 
      if (bg)      warnings.push(`Brand ${slug}: invalid bgColor "${bg}" → clean white used`);          
      bg      = "#ffffff";
    }

    brandData.colors = { primary, accent, text, bg };

    // WhatsApp validation
    const waRaw = (r.whatsapp || "").trim();
    const whatsapp = WA.test(waRaw) ? waRaw : "";
    if (waRaw && !whatsapp) warnings.push(`Brand ${slug}: WhatsApp is not wa.me/* → ignored`);
    if (whatsapp) brandData.whatsapp = whatsapp;

    // Default category
    brandData.defaultCategory = (r.defaultCategory || r.default_category || "").trim() || "BAGS";

    if (brands[slug]) { 
      warnings.push(`Duplicate brand slug ignored: ${slug}`); 
      continue; 
    }

    brands[slug] = brandData;
  }
  
  console.log(`✅ Processed ${Object.keys(brands).length} enhanced brands`);

  // Build enhanced catalog tree with sections
  console.log("🌳 Building section-aware catalog tree...");
  
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
  const sectionStats = new Map();

  console.log("📝 Processing enhanced catalog entries...");
  let processedCount = 0;
  
  for (const r of masterRows) {
    const name = (r["Name"] || r["Folder/Product"] || "").trim();
    const rel  = normPath(r["RelativePath"] || r["Relative Path"] || "");
    const driveLink = (r["Drive Link"] || r["Drive"] || "").trim();
    const thumbRel  = (r["Thumbs Path"] || r["Thumb"] || "").trim();
    const topOrderRaw = (r["TopOrder"] || r["Top Order"] || r["topOrder"] || "").trim();
    
    // Enhanced section support
    const section = (r["Section"] || r["section"] || "").trim() || "Featured";
    const category = (r["Category"] || r["category"] || "").trim();

    if (!rel || !name) continue;
    
    processedCount++;
    if (processedCount % 100 === 0) {
      console.log(`  ✨ Processed ${processedCount}/${masterRows.length} items...`);
    }

    // Track section statistics
    if (!sectionStats.has(section)) {
      sectionStats.set(section, 0);
    }
    sectionStats.set(section, sectionStats.get(section) + 1);

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
        thumbnail: normalizedThumb || PLACEHOLDER_THUMB,
        section: section,
        category: category
      };
      totalProducts++;
    } else {
      ensureFolderNode(tree, segs);
      const k = segs.join("/");
      const existing = folderMeta.get(k) || {};
      if (normalizedThumb) existing.thumbnail = normalizedThumb;
      if (driveLink) existing.driveLink = driveLink;
      if (section) existing.section = section;
      if (category) existing.category = category;
      
      // Handle topOrder for categories (first level items)
      if (segs.length === 1) {
        const n = parseInt(topOrderRaw, 10);
        if (!Number.isNaN(n)) existing.topOrder = n;
      }
      folderMeta.set(k, existing);
    }
  }

  console.log(`📦 Created section-aware catalog with ${totalProducts} products`);
  console.log(`📋 Sections found:`, Array.from(sectionStats.keys()).join(', '));

  // Attach enhanced folder metadata
  console.log("🔗 Enhancing catalog with sections...");
  function attachFolderMeta(node, prefix = []) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (!n.isProduct) {
        const here = [...prefix, k].join("/");
        const meta = folderMeta.get(here);
        if (meta?.thumbnail) n.thumbnail = meta.thumbnail;
        if (meta?.driveLink) n.driveLink = meta.driveLink;
        if (meta?.section) n.section = meta.section;
        if (meta?.category) n.category = meta.category;
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

  // Enhance catalog with visual and section data
  console.log("🖼️  Enhancing visual and section elements...");
  propagateThumbsFromChildren(tree);
  fillMissingThumbsFromAncestors(tree);

  console.log("🧮 Calculating enhanced catalog metrics...");
  for (const top of Object.keys(tree)) {
    setCounts(tree[top]);
  }

  // Enhanced health checks
  console.log("🔍 Running enhanced quality assurance...");
  const missingThumbFiles = [];
  const sectionAnalysis = {};
  
  // Analyze sections
  Object.entries(tree).forEach(([key, item]) => {
    const section = item.section || 'Featured';
    if (!sectionAnalysis[section]) {
      sectionAnalysis[section] = { categories: [], totalItems: 0 };
    }
    sectionAnalysis[section].categories.push(key);
    sectionAnalysis[section].totalItems += item.count || 0;
  });

  async function scanMissingThumbs(node, pfx = []) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (n.thumbnail && n.thumbnail !== PLACEHOLDER_THUMB) {
        const exists = await fileExists(n.thumbnail);
        if (!exists) {
          missingThumbFiles.push({ 
            path: [...pfx, k].join("/"), 
            thumbnail: n.thumbnail,
            section: n.section || 'Unknown'
          });
        }
      }
      if (!n.isProduct && n.children) {
        await scanMissingThumbs(n.children, [...pfx, k]);
      }
    }
  }
  await scanMissingThumbs(tree);

  // Generate enhanced report
  const report = {
    timestamp: new Date().toISOString(),
    build_version: "2.0.0-sections",
    performance: {
      totalBrands: Object.keys(brands).length,
      totalProducts: totalProducts,
      totalCategories: Object.keys(tree).length,
      catalogEntries: masterRows.length,
      sectionsFound: Object.keys(sectionAnalysis).length,
    },
    sections: sectionAnalysis,
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
      sectionsBreakdown: Object.entries(sectionAnalysis).map(([section, data]) => ({
        section,
        categories: data.categories,
        totalItems: data.totalItems
      })),
      sampleCategories: Object.keys(tree).slice(0, 10).map(cat => ({
        name: cat,
        items: tree[cat].count || 0,
        section: tree[cat].section || 'Featured',
        topOrder: tree[cat].topOrder || 999
      }))
    }
  };

  // Save enhanced files
  console.log("💾 Saving enhanced CSV-driven catalog...");
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  
  // Create enhanced data.json with sections support
  const enhancedData = {
    brands,
    catalog: {
      totalProducts,
      tree,
      sections: Object.keys(sectionAnalysis),
      sectionStats: Object.fromEntries(
        Object.entries(sectionAnalysis).map(([name, data]) => [name, data.totalItems])
      )
    },
    meta: {
      buildVersion: "2.0.0-sections",
      buildTime: new Date().toISOString(),
      features: [
        "csv_driven_homepage",
        "dynamic_sections", 
        "enhanced_branding",
        "section_based_organization"
      ]
    }
  };

  await fs.writeFile(
    path.join(PUBLIC_DIR, "data.json"), 
    JSON.stringify(enhancedData, null, 2), 
    "utf8"
  );
  
  await fs.mkdir(path.join(ROOT, "build"), { recursive: true });
  await fs.writeFile(
    path.join(ROOT, "build", "health.json"), 
    JSON.stringify(report, null, 2), 
    "utf8"
  );

  // Generate enhanced summary with sections
  const summary = [
    "## 🏆 Enhanced CSV-Driven Catalog Build Summary",
    "",
    "### 📊 **Performance Metrics**",
    `- **Enhanced Brands:** ${Object.keys(brands).length}`,
    `- **Premium Products:** ${totalProducts}`,
    `- **Category Collections:** ${Object.keys(tree).length}`,
    `- **Dynamic Sections:** ${Object.keys(sectionAnalysis).length}`,
    `- **Catalog Entries Processed:** ${masterRows.length}`,
    "",
    "### 🎨 **Section Organization**",
    ...Object.entries(sectionAnalysis).map(([section, data]) => 
      `- **${section}:** ${data.categories.length} categories, ${data.totalItems} items`
    ),
    "",
    "### 🔧 **Enhanced Features**",
    "- ✅ CSV-driven homepage content",
    "- ✅ Dynamic section organization", 
    "- ✅ Enhanced brand customization",
    "- ✅ TopOrder-based sorting",
    "- ✅ Professional light theme",
    "",
    "### 🎯 **Quality Assurance**",
    `- **Missing Thumbnails:** ${missingThumbFiles.length}`,
    `- **Invalid Drive Links:** ${invalidDriveLinks.length}`,
    warnings.length ? `- **⚠️ Warnings:** ${warnings.length}` : "- **✅ No Warnings**",
    hardErrors.length ? `- **❌ Errors:** ${hardErrors.length}` : "- **✅ No Errors**",
    "",
    "### 🗂️ **Category Structure**",
    ...Object.keys(tree)
      .sort((a, b) => (tree[a].topOrder || 999) - (tree[b].topOrder || 999))
      .map(cat => {
        const section = tree[cat].section || 'Featured';
        const order = tree[cat].topOrder || 'Auto';
        return `- **${cat}** (${section}): ${tree[cat].count || 0} items [Order: ${order}]`;
      }),
    "",
    "### 📋 **CSV Column Reference**",
    "",
    "**Brands CSV Columns:**",
    "- `csvslug` - Brand identifier",
    "- `brandName` - Display name", 
    "- `tagline` - Subtitle under brand name",
    "- `heroTitle` - Main homepage title",
    "- `heroSubtitle` - Homepage description",
    "- `footerText` - Footer description",
    "- `primaryColor` - Main brand color (#hex)",
    "- `accentColor` - Secondary color (#hex)",
    "- `whatsapp` - WhatsApp link (wa.me format)",
    "",
    "**Master CSV Columns:**",
    "- `Name` - Item/category name",
    "- `RelativePath` - Catalog path",
    "- `Section` - Homepage section (Featured/Trending/Premium/etc)",
    "- `TopOrder` - Sort order within section (lower = first)",
    "- `Category` - Additional categorization",
    "- `Thumbs Path` - Thumbnail image path",
    "- `Drive Link` - Google Drive link for products",
    "",
    "### 🚀 **Next Steps**",
    "1. Update your CSV files with the new columns",
    "2. Set `Section` values: Featured, Trending, Premium, New Arrivals, Best Sellers",
    "3. Use `TopOrder` to control display sequence",
    "4. Add brand content: tagline, heroTitle, heroSubtitle, footerText",
    "5. Test the new professional interface"
  ].filter(Boolean).join("\n");

  console.log("\n" + summary);
  
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.writeFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  }

  if (hardErrors.length) {
    console.error("\n❌ Build failed due to critical errors");
    process.exit(1);
  }
  
  console.log(`\n🎉 Successfully built enhanced CSV-driven catalog!`);
  console.log(`📁 Output: ${path.join(PUBLIC_DIR, "data.json")}`);
  console.log(`📊 Health Report: ${path.join(ROOT, "build", "health.json")}`);
  console.log("✨ Ready for professional CSV-driven experience!");
})().catch(err => {
  console.error("💥 Enhanced build failed:", err);
  process.exit(1);
});
