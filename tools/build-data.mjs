// Enhanced build-data.mjs - CSV-driven with sections support and image rendering
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

function normalizeBrandName(brandName) {
  if (!brandName) return '';
  
  // List of suffixes to remove (case-insensitive)
  const suffixes = [
    ' Bags',
    ' Shoes', 
    ' Wallets',
    ' Belts',
    ' Accessories',
    ' Watches',
    ' Jewelry',
    ' Jewellery',
    ' Sunglasses',
    ' Glasses',
    ' Handbags',
    ' Purses',
    ' Totes',
    ' Clutches',
    ' Backpacks'
  ];
  
  let normalized = brandName.trim();
  
  // Remove suffixes (case-insensitive)
  for (const suffix of suffixes) {
    const regex = new RegExp(suffix + '$', 'i'); // 'i' flag for case-insensitive
    normalized = normalized.replace(regex, '');
  }
  
  // Trim any extra whitespace
  normalized = normalized.trim();
  
  // Special case: Convert common brands to standard capitalization
  const brandCapitalization = {
    'ysl': 'YSL',
    'gucci': 'GUCCI',
    'dior': 'Dior',
    'fendi': 'FENDI',
    'lv': 'LV',
    'd&g': 'D&G',
    'bvlgari': 'BVLGARI',
    'omega': 'OMEGA'
  };
  
  const lowerNormalized = normalized.toLowerCase();
  if (brandCapitalization[lowerNormalized]) {
    return brandCapitalization[lowerNormalized];
  }
  
  return normalized;
}

/**
 * Get a slug for a brand (for URLs and matching)
 */
function getBrandSlug(brandName) {
  return brandName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

console.log("📝 Processing enhanced catalog entries with brand normalization...");

// Track brand mappings
const brandNormalizationMap = new Map(); // originalName → normalizedName
const brandCategoryMap = new Map(); // normalizedBrandSlug → Set of categories
  
const brandBrowseStatus = new Map();
  
let processedCount = 0;

for (const r of masterRows) {
  const name = (r["Name"] || r["Folder/Product"] || "").trim();
  const rel  = normPath(r["RelativePath"] || r["Relative Path"] || "");
  const driveLink = (r["Drive Link"] || r["Drive"] || "").trim();
  const thumbRel  = (r["Thumbs Path"] || r["Thumb"] || "").trim();
  
  const browseBrands = (r["Browse Brands"] || r["browse brands"] || r["Browse_Brands"] || "").trim().toLowerCase();
  
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

  let parsedTopOrder = 999;
  if (topOrderRaw) {
    const n = parseInt(topOrderRaw, 10);
    if (!Number.isNaN(n)) {
      parsedTopOrder = n;
    }
  }

  // ✅ BRAND NORMALIZATION - If this is a brand-level entry (depth 2)
  if (segs.length >= 2) {
    const categoryName = segs[0];
    const originalBrandName = segs[1];
    const normalizedBrandName = normalizeBrandName(originalBrandName);
    const brandSlug = getBrandSlug(normalizedBrandName);
    
    // Track the normalization
    if (originalBrandName !== normalizedBrandName) {
      brandNormalizationMap.set(originalBrandName, normalizedBrandName);
      console.log(`🔄 Normalized: "${originalBrandName}" → "${normalizedBrandName}"`);
    }
    
    // Track which categories this brand appears in
    if (!brandCategoryMap.has(brandSlug)) {
      brandCategoryMap.set(brandSlug, new Set());
    }
    brandCategoryMap.get(brandSlug).add(categoryName);
    
    // Track Browse Brands status - only set if explicitly "on" or "off"
if (browseBrands !== '') {
  if (['on', 'yes', 'true', '1'].includes(browseBrands)) {
    brandBrowseStatus.set(brandSlug, 'FORCE_SHOW');
  } else if (['off', 'no', 'false', '0'].includes(browseBrands)) {
    brandBrowseStatus.set(brandSlug, 'FORCE_HIDE');
  }
}
    
    // Replace the brand name in segments with normalized version
    segs[1] = normalizedBrandName;
  }

  if (isLeafProduct) {
    // Product
    const parentSegs = segs.slice(0, -1);
    const children = ensureFolderNode(tree, parentSegs);
    children[name] = { 
      isProduct: true, 
      driveLink, 
      thumbnail: normalizedThumb || PLACEHOLDER_THUMB,
      section: section,
      category: category,
      TopOrder: parsedTopOrder,
      topOrder: parsedTopOrder,
      ...(imageAlignment ? { alignment: imageAlignment } : {}),
      ...(imageFitting ? { fitting: imageFitting } : {}),
      ...(imageScaling ? { scaling: imageScaling } : {}),
    };
    totalProducts++;
  } else {
    // Folder
    ensureFolderNode(tree, segs);
    const k = segs.join("/");
    const existing = folderMeta.get(k) || {};
    if (normalizedThumb) existing.thumbnail = normalizedThumb;
    if (driveLink) existing.driveLink = driveLink;
    if (section) existing.section = section;
    if (category) existing.category = category;
    
    existing.TopOrder = parsedTopOrder;
    existing.topOrder = parsedTopOrder;
    
    if (imageAlignment) existing.alignment = imageAlignment;
    if (imageFitting) existing.fitting = imageFitting;
    if (imageScaling) existing.scaling = imageScaling;
    
    folderMeta.set(k, existing);
  }
  
  // ✅ BRAND LOGO CAPTURE - Capture at depth 2 (Category/Brand)
  if (segs.length === 2 && thumbRel) {
    const categoryName = segs[0];
    const normalizedBrandName = segs[1]; // Already normalized above
    
    const brandPath = `${categoryName}/${normalizedBrandName}`;
    const brandMeta = folderMeta.get(brandPath) || {};
    
    if (!brandMeta.thumbnail && normalizedThumb) {
      brandMeta.thumbnail = normalizedThumb;
      folderMeta.set(brandPath, brandMeta);
      console.log(`  📸 Brand logo: ${brandPath} → ${normalizedThumb}`);
    }
  }
}

// Log normalization summary
console.log(`\n📊 Brand Normalization Summary:`);
console.log(`   Total normalizations: ${brandNormalizationMap.size}`);
if (brandNormalizationMap.size > 0) {
  console.log(`   Examples:`);
  let count = 0;
  for (const [original, normalized] of brandNormalizationMap.entries()) {
    if (count < 10) {
      console.log(`     "${original}" → "${normalized}"`);
      count++;
    }
  }
}

console.log(`\n📊 Brand-Category Mapping:`);
for (const [brandSlug, categories] of brandCategoryMap.entries()) {
  console.log(`   ${brandSlug}: ${Array.from(categories).join(', ')}`);
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
console.log("🖼️  Applying brand logos to tree structure...");

function applyBrandLogosToTree(node, prefix = []) {
  for (const k of Object.keys(node)) {
    const n = node[k];
    const currentPath = [...prefix, k];
    const pathStr = currentPath.join("/");
    
    // Check if this is brand level (depth 2: Category/Brand)
    if (currentPath.length === 2 && !n.isProduct) {
      const meta = folderMeta.get(pathStr);
      if (meta?.thumbnail && !n.thumbnail) {
        n.thumbnail = meta.thumbnail;
        console.log(`  ✅ Applied brand logo to ${pathStr}: ${meta.thumbnail}`);
      }
    }
    
    if (n.children && !n.isProduct) {
      applyBrandLogosToTree(n.children, currentPath);
    }
  }
}

applyBrandLogosToTree(tree);

console.log("🔍 Applying smart Browse Brands filter (10+ items OR manual On)...");

console.log("🔍 Applying smart Browse Brands filter (10+ items OR manual On)...");

function applySmartBrowseBrandsFilter(node, prefix = []) {
  for (const k of Object.keys(node)) {
    const n = node[k];
    const currentPath = [...prefix, k];
    
    if (currentPath.length === 2 && !n.isProduct) {
      const brandSlug = k.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const manualStatus = brandBrowseStatus.get(brandSlug); // 'FORCE_SHOW', 'FORCE_HIDE', or undefined
      const itemCount = n.count || 0;
      
      let shouldShow;
      let reason;
      
      // Priority 1: Manual override to HIDE
      if (manualStatus === 'FORCE_HIDE') {
        shouldShow = false;
        reason = 'Manually hidden (Browse Brands = Off)';
      }
      // Priority 2: Manual override to SHOW
      else if (manualStatus === 'FORCE_SHOW') {
        shouldShow = true;
        reason = 'Manually shown (Browse Brands = On)';
      }
      // Priority 3: Auto-show if 10+ items
      else if (itemCount >= 10) {
        shouldShow = true;
        reason = 'Auto-shown (10+ items)';
      }
      // Default: Hide if <10 items and no manual override
      else {
        shouldShow = false;
        reason = `Hidden (<10 items: ${itemCount})`;
      }
      
      n.browseBrands = shouldShow;
      
      if (shouldShow) {
        console.log(`  ✅ ${k} (${itemCount} items) - ${reason}`);
      } else {
        console.log(`  ❌ ${k} (${itemCount} items) - ${reason}`);
      }
    }
    
    if (n.children && !n.isProduct) {
      applySmartBrowseBrandsFilter(n.children, currentPath);
    }
  }
}

applySmartBrowseBrandsFilter(tree);

// Add summary
console.log("\n📊 BROWSE BRANDS FILTER RESULTS:");
let totalBrands = 0;
let shownBrands = 0;
let auto10Plus = 0;
let manualOn = 0;
let hiddenBrands = 0;

Object.entries(tree).forEach(([categoryKey, categoryData]) => {
  if (!categoryData.children) return;
  Object.entries(categoryData.children).forEach(([brandKey, brandData]) => {
    totalBrands++;
    if (brandData.browseBrands) {
      shownBrands++;
      const brandSlug = brandKey.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (brandBrowseStatus.get(brandSlug) === 'FORCE_SHOW') {
        manualOn++;
      } else {
        auto10Plus++;
      }
    } else {
      hiddenBrands++;
    }
  });
});

console.log(`   Total brands: ${totalBrands}`);
console.log(`   ✅ SHOWN: ${shownBrands} brands`);
console.log(`      - Auto (10+ items): ${auto10Plus}`);
console.log(`      - Manual (Browse Brands = On): ${manualOn}`);
console.log(`   ❌ HIDDEN: ${hiddenBrands} brands`);

if (shownBrands === 0) {
  console.log("\n⚠️  WARNING: No brands will be shown!");
  console.log("   All brands have <10 items and no manual overrides.");
  console.log("   To fix: Add 'Browse Brands = On' to brands you want to show.");
}


  
function applyBrowseBrandsFilter(node, prefix = []) {
  for (const k of Object.keys(node)) {
    const n = node[k];
    const currentPath = [...prefix, k];
    
    if (currentPath.length === 2 && !n.isProduct) {
      const brandSlug = k.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      n.browseBrands = brandBrowseStatus.get(brandSlug) || false;
    }
    
    if (n.children && !n.isProduct) {
      applyBrowseBrandsFilter(n.children, currentPath);
    }
  }
}

applyBrowseBrandsFilter(tree);
  
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
  // ✅ BRAND VERIFICATION - Add this BEFORE the catch block
console.log("\n" + "=".repeat(70));
console.log("🔍 BRAND STRUCTURE VERIFICATION:\n");

let totalBrands = 0;
let brandsWithLogos = 0;

Object.entries(tree).forEach(([categoryKey, categoryData]) => {
  console.log(`📂 ${categoryKey}`);
  
  if (categoryData.children) {
    Object.entries(categoryData.children).forEach(([brandKey, brandData]) => {
      totalBrands++;
      const hasLogo = brandData.thumbnail && brandData.thumbnail !== PLACEHOLDER_THUMB;
      
      if (hasLogo) {
        brandsWithLogos++;
        console.log(`   ✅ ${brandKey} (${brandData.count} items) 🖼️`);
      } else {
        console.log(`   ⚠️  ${brandKey} (${brandData.count} items) NO LOGO`);
      }
    });
  }
});

console.log("\n" + "=".repeat(70));
console.log(`📊 Total Brands: ${totalBrands}`);
console.log(`🖼️  With Logos: ${brandsWithLogos}/${totalBrands} (${totalBrands > 0 ? ((brandsWithLogos/totalBrands)*100).toFixed(0) : 0}%)`);

if (totalBrands - brandsWithLogos > 0) {
  console.log(`\n⚠️  ${totalBrands - brandsWithLogos} brands missing logos - check CSV "Thumbs Path" column!`);
}
})().catch(err => {
  console.error("💥 Enhanced build failed:", err);
  process.exit(1);
});
