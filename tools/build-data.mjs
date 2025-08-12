// Node 20+ (native fetch)
// Inputs (env): BRANDS_CSV_URL, MASTER_CSV_URL, PLACEHOLDER_THUMB (optional, e.g. /thumbs/_placeholder.webp)
// Output: /public/data.json + build/health.json (+ job summary for GitHub Actions)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const BRANDS_CSV_URL = process.env.BRANDS_CSV_URL;
const MASTER_CSV_URL = process.env.MASTER_CSV_URL;
const PLACEHOLDER_THUMB = (process.env.PLACEHOLDER_THUMB || "").trim(); // optional

if (!BRANDS_CSV_URL || !MASTER_CSV_URL) {
  console.error("Missing BRANDS_CSV_URL or MASTER_CSV_URL");
  process.exit(1);
}

const HEX = /^#([0-9a-fA-F]{6})$/;
const WA = /^https:\/\/wa\.me\/[0-9]+/;
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
  if (!p.startsWith("thumbs/")) p = "thumbs/" + p;
  return "/" + p;
}
async function fileExists(relFromPublic) {
  try {
    await fs.access(path.join(PUBLIC_DIR, relFromPublic.replace(/^\//, "")));
    return true;
  } catch { return false; }
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
  for (const k of Object.keys(node.children || {})) sum += setCounts(node.children[k]);
  node.count = sum;
  return sum;
}

function propagateThumbsFromChildren(node) {
  for (const k of Object.keys(node)) {
    const n = node[k];
    if (!n.isProduct) {
      if (!n.thumbnail) {
        const ck = Object.keys(n.children || {});
        for (const ckey of ck) {
          const c = n.children[ckey];
          const t = c.thumbnail || (c.children ? c.thumbnail : "");
          if (t) { n.thumbnail = t; break; }
        }
      }
      propagateThumbsFromChildren(n.children || {});
    }
  }
}

function fillMissingThumbsFromAncestors(node, inherited = "") {
  for (const k of Object.keys(node)) {
    const n = node[k];
    const current = n.thumbnail || inherited || PLACEHOLDER_THUMB || "";
    if (!n.thumbnail && current) n.thumbnail = current;
    if (!n.isProduct) fillMissingThumbsFromAncestors(n.children || {}, current);
  }
}

(async () => {
  const [brandsRes, masterRes] = await Promise.all([
    fetch(BRANDS_CSV_URL),
    fetch(MASTER_CSV_URL),
  ]);
  if (!brandsRes.ok || !masterRes.ok) {
    console.error("Failed to fetch one or more CSVs");
    process.exit(1);
  }
  const [brandsCSV, masterCSV] = await Promise.all([brandsRes.text(), masterRes.text()]);
  const brandsRows = parseCSV(brandsCSV);
  const masterRows = parseCSV(masterCSV);

  const errors = [];
  const warnings = [];

  // ===== Build brands map =====
  const brands = {};
  for (const r of brandsRows) {
    const slug = (r.csvslug || "").trim();
    const name = (r.brandName || "").trim();
    const primary = (r.primaryColor || "").trim();
    const accent = (r.accentColor || "").trim();
    const text = (r.textColor || "#2C2926").trim();
    const bg = (r.bgColor || "#FEFDFB").trim();
    const whatsapp = (r.whatsapp || "").trim();
    const defaultCategory = (r.defaultCategory || "").trim();

    if (!slug || !name || !primary || !accent || !whatsapp) {
      errors.push(`Brand missing required fields: ${JSON.stringify(r)}`); continue;
    }
    if (![primary, accent, text, bg].every(c => HEX.test(c))) {
      errors.push(`Brand color invalid: ${slug}`);
    }
    if (!WA.test(whatsapp)) errors.push(`WhatsApp URL invalid: ${slug}`);
    if (brands[slug]) errors.push(`Duplicate brand slug: ${slug}`);

    brands[slug] = { name, colors: { primary, accent, text, bg }, whatsapp, defaultCategory };
  }

  // ===== Precompute path relations =====
  const allFullPaths = masterRows.map(r => normPath(r["RelativePath"] || r["Relative Path"] || r["Relative_Path"] || ""));
  const parentsSet = new Set();
  for (const full of allFullPaths) {
    const segs = full.split("/").filter(Boolean);
    for (let i = 1; i < segs.length; i++) {
      parentsSet.add(segs.slice(0, i).join("/"));
    }
  }

  // ===== Build catalog tree from master rows =====
  const tree = {};
  let totalProducts = 0;

  const productKeys = new Set();
  const invalidDriveLinks = [];

  const folderMeta = new Map();

  for (const r of masterRows) {
    const name = (r["Name"] || r["Folder/Product"] || "").trim();
    const rel = normPath(r["RelativePath"] || r["Relative Path"] || "");
    let driveLink = (r["Drive Link"] || r["Drive"] || "").trim();
    let thumbRel = (r["Thumbs Path"] || r["Thumb"] || "").trim();

    if (!rel || !name) continue;

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
      const key = parentSegs.join("/") + "•" + name.toLowerCase();
      if (productKeys.has(key)) {
        warnings.push(`Duplicate product label under same folder → "${parentSegs.join("/")}/${name}" (auto-suffix will be applied)`);
      }
      productKeys.add(key);

      children[name] = {
        isProduct: true,
        driveLink,
        thumbnail: normalizedThumb || "",
      };
      totalProducts++;
    } else {
      ensureFolderNode(tree, segs);
      const k = segs.join("/");
      const existing = folderMeta.get(k) || {};
      if (normalizedThumb) existing.thumbnail = normalizedThumb;
      if (driveLink) existing.driveLink = driveLink;
      folderMeta.set(k, existing);
    }
  }

  function attachFolderMeta(node, prefix = []) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (!n.isProduct) {
        const here = [...prefix, k].join("/");
        const meta = folderMeta.get(here);
        if (meta?.thumbnail) n.thumbnail = meta.thumbnail;
        if (meta?.driveLink) n.driveLink = meta.driveLink;
        attachFolderMeta(n.children || {}, [...prefix, k]);
      }
    }
  }
  attachFolderMeta(tree);

  function convertEmptyFoldersWithLinks(node, prefix = []) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (!n.isProduct) {
        const hasChildren = Object.keys(n.children || {}).length > 0;
        if (!hasChildren && n.driveLink) {
          delete n.children;
          n.isProduct = true;
          totalProducts++;
        } else {
          convertEmptyFoldersWithLinks(n.children || {}, [...prefix, k]);
        }
      }
    }
  }
  convertEmptyFoldersWithLinks(tree);

  propagateThumbsFromChildren(tree);
  fillMissingThumbsFromAncestors(tree);

  for (const top of Object.keys(tree)) setCounts(tree[top]);

  const missingThumbFiles = [];
  async function scanMissingThumbs(node, pfx = []) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (n.thumbnail) {
        const exists = await fileExists(n.thumbnail);
        if (!exists) missingThumbFiles.push({ path: [...pfx, k].join("/"), thumbnail: n.thumbnail });
      }
      if (!n.isProduct) await scanMissingThumbs(n.children || {}, [...pfx, k]);
    }
  }
  await scanMissingThumbs(tree);

  let productsWithoutThumb = 0;
  function countNoThumbProducts(node) {
    for (const k of Object.keys(node)) {
      const n = node[k];
      if (n.isProduct && !n.thumbnail) productsWithoutThumb++;
      if (!n.isProduct) countNoThumbProducts(n.children || {});
    }
  }
  countNoThumbProducts(tree);

  const hardErrors = [];
  if (invalidDriveLinks.length) hardErrors.push(`${invalidDriveLinks.length} product(s) with non-Google Drive links`);

  const output = { brands, catalog: { totalProducts, tree } };

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_DIR, "data.json"), JSON.stringify(output, null, 2), "utf8");

  const report = {
    totals: { rowsInMaster: masterRows.length, products: totalProducts },
    invalidDriveLinks,
    missingThumbFiles,
    productsWithoutThumb,
    warnings,
    errors,
    hardErrors
  };
  await fs.mkdir(path.join(ROOT, "build"), { recursive: true });
  await fs.writeFile(path.join(ROOT, "build", "health.json"), JSON.stringify(report, null, 2), "utf8");

  const summaryLines = [];
  summaryLines.push(`## Data Health Report`);
  summaryLines.push(`- Rows (master): **${masterRows.length}**`);
  summaryLines.push(`- Products (leaf): **${totalProducts}**`);
  summaryLines.push(`- Products without thumbnail after fallback: **${productsWithoutThumb}**`);
  summaryLines.push(`- Missing thumbnail files on disk: **${missingThumbFiles.length}**`);
  if (invalidDriveLinks.length) summaryLines.push(`- ❌ Invalid Drive links: **${invalidDriveLinks.length}**`);
  if (warnings.length) summaryLines.push(`- ⚠️ Warnings: **${warnings.length}**`);
  if (errors.length) summaryLines.push(`- ❌ Validation errors: **${errors.length}**`);
  if (PLACEHOLDER_THUMB) summaryLines.push(`- Placeholder in use: \`${PLACEHOLDER_THUMB}\``);

  console.log("\n::group::Data Health Report");
  console.log(summaryLines.join("\n"));
  console.log("::endgroup::\n");

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    await fs.appendFile(summaryPath, summaryLines.join("\n") + "\n", "utf8");
  }

  if (errors.length || hardErrors.length) {
    console.error(`\n❌ Build failed due to validation/hard errors.`);
    errors.forEach(e => console.error(" -", e));
    hardErrors.forEach(e => console.error(" -", e));
    process.exit(1);
  }

  console.log(`✅ Built public/data.json with ${totalProducts} products`);
})();
