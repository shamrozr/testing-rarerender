// Enhanced build-data.mjs - CSV-driven with sections support and image rendering
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const slideshow = [];
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

function propagateThumbsFromChildren(node, currentDepth = 0) {
  for (const k of Object.keys(node)) {
    const n = node[k];
    if (!n.isProduct && n.children) {
      propagateThumbsFromChildren(n.children, currentDepth + 1);
      
      // FIXED: Only inherit for folder display at depth 2+ (BrandsFolders level)
      // Level 0: Homepage categories (BAGS, SHOES) - NO inheritance
      // Level 1: Brand folders (Chanel, Gucci) - NO inheritance  
      // Level 2+: Brand subfolders - YES inheritance for FOLDER display only
      const shouldInherit = currentDepth >= 2;
      
      if (!n.thumbnail && shouldInherit) {
        const childKeys = Object.keys(n.children);
        for (const ckey of childKeys) {
          const child = n.children[ckey];
          if (child.thumbnail) {
            n.thumbnail = child.thumbnail;
            
            // INHERIT image config for FOLDER display only
            // This is ONLY for how the folder itself looks, NOT for child items
            if (child.alignment && child.alignment.trim() !== '') {
              n.alignment = child.alignment;
              n._inherited_alignment = true; // Mark as inherited for folder display
            }
            if (child.fitting && child.fitting.trim() !== '') {
              n.fitting = child.fitting;
              n._inherited_fitting = true; // Mark as inherited for folder display
            }
            if (child.scaling && child.scaling.trim() !== '') {
              n.scaling = child.scaling;
              n._inherited_scaling = true; // Mark as inherited for folder display
            }
            
            console.log(`📸 FOLDER DISPLAY inheritance for ${k} at depth ${currentDepth} from child ${ckey}: alignment=${n.alignment || 'default'}, fitting=${n.fitting || 'default'}, scaling=${n.scaling || 'default'}`);
            break;
          }
        }
      }
    }
  }
}

function fillMissingThumbsFromAncestors(node, inheritedThumb = "", currentDepth = 0) {
  for (const k of Object.keys(node)) {
    const n = node[k];
    
    // Only inherit thumbnails for display purposes
    const currentThumb = n.thumbnail || inheritedThumb || PLACEHOLDER_THUMB || "";
    if (!n.thumbnail && currentThumb) n.thumbnail = currentThumb;
    
    // CRITICAL: Do NOT inherit image configuration to children
    // Children without explicit CSV config should use GLOBAL defaults (cover + center)
    // Children WITH explicit CSV config should keep their config
    // Only folders inherit for their own display, never pass it down to children
    
    if (!n.isProduct && n.children) {
      // Pass only thumbnail to children, never image config
      fillMissingThumbsFromAncestors(n.children, currentThumb, currentDepth + 1);
    }
  }
}

(async () => {
  console.log("🚀 Starting CSV-driven catalog build with image rendering...");
  
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

  // Build enhanced catalog tree with sections and image rendering
  console.log("🌳 Building section-aware catalog tree with image rendering...");
  
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

  console.log("📝 Processing enhanced catalog entries with image rendering...");
console.log("📝 Processing enhanced catalog entries with TopOrder at ALL levels...");
let processedCount = 0;

for (const r of masterRows) {
  const name = (r["Name"] || r["Folder/Product"] || "").trim();
  const rel  = normPath(r["RelativePath"] || r["Relative Path"] || "");
  const driveLink = (r["Drive Link"] || r["Drive"] || "").trim();
  const thumbRel  = (r["Thumbs Path"] || r["Thumb"] || "").trim();
  // Extract slideshow items in the same pass
  const slideshowValue = (r["slideshow"] || r["Slideshow"] || r["SLIDESHOW"] || "").trim().toLowerCase();
  if ((slideshowValue === 'on' || slideshowValue === 'yes') && thumbRel) {
    const normalizedThumb = toThumbSitePath(thumbRel);
    slideshowItems.push({
      image: normalizedThumb,
      title: name,
      path: rel
    });
  }
  // ENHANCED: Support TopOrder for ALL levels and ALL naming variations
  const topOrderRaw = (
    r["TopOrder"] || r["Top Order"] || r["topOrder"] || r["TOP ORDER"] ||
    r["Order"] || r["order"] || r["ORDER"] ||
    r["Priority"] || r["priority"] || r["PRIORITY"] ||
    r["Rank"] || r["rank"] || r["RANK"] ||
    r["Sort"] || r["sort"] || r["SORT"] ||
    r["Position"] || r["position"] || r["POSITION"] || ""
  ).trim();
  
  const section = (r["Section"] || r["section"] || "").trim() || "Featured";
  const category = (r["Category"] || r["category"] || "").trim();

  // Image rendering columns
  const imageAlignment = (r["Alignment"] || r["alignment"] || r["ALIGNMENT"] || "").trim();
  const imageFitting = (r["Fitting"] || r["fitting"] || r["FITTING"] || "").trim();
  const imageScaling = (r["Scaling"] || r["scaling"] || r["SCALING"] || "").trim();
  
  if (!rel || !name) continue;
  
  processedCount++;
  if (processedCount % 50 === 0) {
    console.log(`  ✨ Processed ${processedCount}/${masterRows.length} items...`);
  }

  const full = rel;
  const segs = full.split("/").filter(Boolean);
  const pathDepth = segs.length;
  const isCandidateProduct = !!driveLink;
  const hasChildren = parentsSet.has(full);
  const isLeafProduct = isCandidateProduct && !hasChildren;

  if (isCandidateProduct && !GDRIVE.test(driveLink)) {
    invalidDriveLinks.push({ name, rel, driveLink });
  }

  const normalizedThumb = toThumbSitePath(thumbRel);

  // ENHANCED: Parse TopOrder for items at ANY depth
  let parsedTopOrder = 999; // Default
  if (topOrderRaw) {
    const n = parseInt(topOrderRaw, 10);
    if (!Number.isNaN(n)) {
      parsedTopOrder = n;
      console.log(`✅ BUILD TopOrder for ${name} at depth ${pathDepth} (${isLeafProduct ? 'PRODUCT' : 'FOLDER'}) path ${rel}: ${parsedTopOrder}`);
    } else {
      console.log(`⚠️ BUILD Invalid TopOrder "${topOrderRaw}" for ${name} at depth ${pathDepth}, using default 999`);
    }
  } else {
    console.log(`📝 BUILD No TopOrder specified for ${name} at depth ${pathDepth}, using default 999`);
  }

  // Track section statistics
  if (!sectionStats.has(section)) {
    sectionStats.set(section, 0);
  }
  sectionStats.set(section, sectionStats.get(section) + 1);

  if (isLeafProduct) {
  // ENHANCED: Products at ANY depth get TopOrder
  const parentSegs = segs.slice(0, -1);
  const children = ensureFolderNode(tree, parentSegs);
  children[name] = { 
    isProduct: true, 
    driveLink, 
    thumbnail: normalizedThumb || PLACEHOLDER_THUMB,
    section: section,
    category: category,
    // CRITICAL: Add TopOrder to products at ANY depth in BOTH formats
    TopOrder: parsedTopOrder,
    topOrder: parsedTopOrder,
    // Image rendering config - only set if explicitly provided
    ...(imageAlignment ? { alignment: imageAlignment } : {}),
    ...(imageFitting ? { fitting: imageFitting } : {}),
    ...(imageScaling ? { scaling: imageScaling } : {}),
  };
  totalProducts++;
  console.log(`🎯 BUILD Set PRODUCT ${name} at depth ${pathDepth} TopOrder: ${parsedTopOrder}`);
} else {
  // ENHANCED: Folders at ANY depth get TopOrder
  ensureFolderNode(tree, segs);
  const k = segs.join("/");
  const existing = folderMeta.get(k) || {};
  if (normalizedThumb) existing.thumbnail = normalizedThumb;
  if (driveLink) existing.driveLink = driveLink;
  if (section) existing.section = section;
  if (category) existing.category = category;
  
  // CRITICAL: Set TopOrder for folders at ANY depth in BOTH formats
  existing.TopOrder = parsedTopOrder;
  existing.topOrder = parsedTopOrder;
  console.log(`📁 BUILD Set FOLDER ${k} at depth ${pathDepth} TopOrder: ${parsedTopOrder}`);
  
  // Image rendering config for folders - only set if explicitly provided
  if (imageAlignment) existing.alignment = imageAlignment;
  if (imageFitting) existing.fitting = imageFitting;
  if (imageScaling) existing.scaling = imageScaling;
  
  folderMeta.set(k, existing);
}
}

console.log(`📊 BUILD Processed ${totalProducts} products across all depths`);
console.log(`📊 BUILD Created ${folderMeta.size} folder entries across all depths`);


  // Attach enhanced folder metadata including image rendering
  console.log("🔗 Enhancing catalog with sections and image rendering...");
  console.log("🔗 Enhancing catalog with TopOrder at ALL levels...");

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
      
      // CRITICAL: Apply TopOrder and image config to folders only
      if (typeof meta?.TopOrder !== "undefined") {
        n.TopOrder = meta.TopOrder;
        n.topOrder = meta.TopOrder;
        console.log(`📌 BUILD Applied TopOrder ${meta.TopOrder} to folder: ${here}`);
      } else {
        n.TopOrder = 999;
        n.topOrder = 999;
      }
      
      // FIXED: Image config for folders only (for folder display)
      // Do NOT override inherited config if it exists
      if (meta?.alignment && !n._inherited_alignment) n.alignment = meta.alignment;
      if (meta?.fitting && !n._inherited_fitting) n.fitting = meta.fitting;
      if (meta?.scaling && !n._inherited_scaling) n.scaling = meta.scaling;
      
      if (n.children) attachFolderMeta(n.children, [...prefix, k]);
    } else {
      // ENSURE products have TopOrder fallback but NO image config inheritance
      if (typeof n.TopOrder === "undefined") {
        n.TopOrder = 999;
        n.topOrder = 999;
      }
      // Products keep their own explicit CSV config or get GLOBAL defaults via JavaScript
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
  // Enhance catalog with visual and section data
  console.log("🖼️  Enhancing visual and section elements with inherited config...");
  propagateThumbsFromChildren(tree);
  fillMissingThumbsFromAncestors(tree);
  console.log("✅ Image config inheritance complete");

  console.log("🧮 Calculating enhanced catalog metrics...");
  for (const top of Object.keys(tree)) {
    setCounts(tree[top]);
  }

  // Enhanced health checks including image rendering
  console.log("🔍 Running enhanced quality assurance with image rendering checks...");
  const missingThumbFiles = [];
  const sectionAnalysis = {};
  const imageRenderingStats = { withConfig: 0, total: 0 };
  
  // Analyze sections and image rendering config
  Object.entries(tree).forEach(([key, item]) => {
    const section = item.section || 'Featured';
    if (!sectionAnalysis[section]) {
      sectionAnalysis[section] = { categories: [], totalItems: 0 };
    }
    sectionAnalysis[section].categories.push(key);
    sectionAnalysis[section].totalItems += item.count || 0;
  });
console.log("🔍 BUILD Verifying TopOrder coverage...");
function verifyTopOrder(node, path = []) {
  for (const [key, item] of Object.entries(node)) {
    const fullPath = [...path, key].join("/");
    const hasTopOrder = typeof item.TopOrder !== "undefined" || typeof item.topOrder !== "undefined";
    
    if (!hasTopOrder) {
      console.log(`❌ BUILD Missing TopOrder: ${fullPath}`);
    } else {
      console.log(`✅ BUILD TopOrder verified: ${fullPath} = ${item.TopOrder || item.topOrder}`);
    }
    
    if (!item.isProduct && item.children) {
      verifyTopOrder(item.children, [...path, key]);
    }
  }
}
verifyTopOrder(tree);
console.log("✅ BUILD TopOrder verification complete");
  async function scanMissingThumbs(node, pfx = []) {
  for (const k of Object.keys(node)) {
    const n = node[k];
    imageRenderingStats.total++;
    
    // FIXED: Check if item has image rendering config INCLUDING custom
    // ENHANCED: Check if item has image rendering config (including inherited)
    if (n.alignment || n.fitting || n.scaling) {
      imageRenderingStats.withConfig++;
      if ([...pfx, k].join("/").includes("/")) {
        console.log(`📸 Config found at ${[...pfx, k].join("/")}: alignment=${n.alignment}, fitting=${n.fitting}, scaling=${n.scaling}`);
      }
    }
    
    if (n.thumbnail && n.thumbnail !== PLACEHOLDER_THUMB) {
      const exists = await fileExists(n.thumbnail);
      if (!exists) {
        missingThumbFiles.push({ 
          path: [...pfx, k].join("/"), 
          thumbnail: n.thumbnail,
          section: n.section || 'Unknown',
          hasImageConfig: !!(n.alignment || n.fitting || n.scaling)

        });
      }
    }
    if (!n.isProduct && n.children) {
      await scanMissingThumbs(n.children, [...pfx, k]);
    }
  }
}

  await scanMissingThumbs(tree);

  // Generate enhanced report with image rendering stats
  const report = {
    timestamp: new Date().toISOString(),
    build_version: "2.1.0-image-rendering",
    performance: {
      totalBrands: Object.keys(brands).length,
      totalProducts: totalProducts,
      totalCategories: Object.keys(tree).length,
      catalogEntries: masterRows.length,
      sectionsFound: Object.keys(sectionAnalysis).length,
    },
    imageRendering: {
      itemsWithConfig: imageRenderingStats.withConfig,
      totalItems: imageRenderingStats.total,
      configCoverage: `${((imageRenderingStats.withConfig / imageRenderingStats.total) * 100).toFixed(1)}%`
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
  topOrder: tree[cat].topOrder || 999,
  hasImageConfig: !!(tree[cat].alignment || tree[cat].fitting || tree[cat].scaling),
  imageConfig: {
    alignment: tree[cat].alignment || 'inherited/default',
    fitting: tree[cat].fitting || 'inherited/default', 
    scaling: tree[cat].scaling || 'inherited/default'
  }
}))
    }
  };

  // Save enhanced files
  console.log("💾 Saving enhanced CSV-driven catalog with image rendering...");
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  
  // Create enhanced data.json with sections and image rendering support
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
      buildVersion: "2.1.0-image-rendering",
      buildTime: new Date().toISOString(),
      features: [
        "csv_driven_homepage",
        "dynamic_sections", 
        "enhanced_branding",
        "section_based_organization",
        "image_rendering_system"
      ]
    }
  };

  await fs.writeFile(
    path.join(PUBLIC_DIR, "data.json"), 
    JSON.stringify(enhancedData, null, 2), 
    "utf8"
  );
  // NEW: Save slideshow.json
  await fs.writeFile(
    path.join(PUBLIC_DIR, "slideshow.json"),
    JSON.stringify(slideshowItems, null, 2),
    "utf8"
  );
    console.log(`📸 Generated slideshow.json with ${slideshowItems.length} items`);

  await fs.mkdir(path.join(ROOT, "build"), { recursive: true });
  await fs.writeFile(
    path.join(ROOT, "build", "health.json"), 
    JSON.stringify(report, null, 2), 
    "utf8"
  );

  // Generate enhanced summary with sections and image rendering
  const summary = [
    "## 🏆 Enhanced CSV-Driven Catalog Build Summary with Image Rendering",
    "",
    "### 📊 **Performance Metrics**",
    `- **Enhanced Brands:** ${Object.keys(brands).length}`,
    `- **Premium Products:** ${totalProducts}`,
    `- **Category Collections:** ${Object.keys(tree).length}`,
    `- **Dynamic Sections:** ${Object.keys(sectionAnalysis).length}`,
    `- **Catalog Entries Processed:** ${masterRows.length}`,
    "",
    "### 🎨 **Image Rendering System**",
    `- **Items with Custom Config:** ${imageRenderingStats.withConfig} / ${imageRenderingStats.total}`,
    `- **Configuration Coverage:** ${((imageRenderingStats.withConfig / imageRenderingStats.total) * 100).toFixed(1)}%`,
    "- **Supported Features:** Alignment, Fitting, Scaling",
    "- **Non-Intrusive:** Only applies when config provided",
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
    "- ✅ Advanced image rendering system",
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
        const hasConfig = !!(tree[cat].alignment || tree[cat].fitting || tree[cat].scaling);
        return `- **${cat}** (${section}): ${tree[cat].count || 0} items [Order: ${order}]${hasConfig ? ' 🎨' : ''}`;
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
    "- **`Alignment`** - Image position (center/top/50px 30px/crop-top/etc) - NOW SUPPORTS PIXELS!",
    "- **`Fitting`** - Image fit method (fit/fill/contain/cover/scale-down)",
    "- **`Scaling`** - Image scale (120%/300px/1.2)",
    "",
    "### 🎨 **Image Rendering Examples**",
    "- **Center product photo:** `Alignment: center, Fitting: cover`",
    "- **Show top of tall image:** `Alignment: top, Fitting: cover`",
    "- **Make image 20% larger:** `Scaling: 120%`",
    "- **Crop bottom-right:** `Alignment: bottom-right, Fitting: cover`",
    "- **Fit entire image:** `Fitting: contain`",
    "- **Pixel-perfect positioning:** `Custom: 50px 30px`", // ADD THIS LINE
    "- **Custom crop:** `Custom: crop-top`", // ADD THIS LINE
    "",
    "### 🚀 **Next Steps**",
    "1. Update your CSV files with the new image rendering columns",
    "2. Set `Alignment` values: center, top, bottom, left, right, top-left, etc.",
    "3. Set `Fitting` values: fit, fill, contain, cover, scale-down",
    "4. Set `Scaling` values: 120%, 80%, 300px, 1.5",
    "5. Set `Custom` values: 50px 30px, crop-top, center 25%, etc.", // ADD THIS LINE
    "6. Test the enhanced image rendering system",
    "7. Only fill columns when you want custom behavior - defaults preserved"
  ].filter(Boolean).join("\n");

  console.log("\n" + summary);
  
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.writeFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  }

  if (hardErrors.length) {
    console.error("\n❌ Build failed due to critical errors");
    process.exit(1);
  }
  
  console.log(`\n🎉 Successfully built enhanced CSV-driven catalog with image rendering!`);
  console.log(`📁 Output: ${path.join(PUBLIC_DIR, "data.json")}`);
  console.log(`📊 Health Report: ${path.join(ROOT, "build", "health.json")}`);
  console.log("✨ Ready for professional CSV-driven experience with advanced image rendering!");
})().catch(err => {
  console.error("💥 Enhanced build failed:", err);
  process.exit(1);
});
