// Enhanced debug version of script.js with detailed path tracing
// Replace your current script.js with this version temporarily to debug

const STATE = {
  data: null,
  brand: null,
  path: [],
  items: [],
  batchSize: 20,
  rendered: 0,
  hoverTimer: null,
  isPop: false,
};

const els = {
  grid: document.getElementById('grid'),
  breadcrumb: document.getElementById('breadcrumb'),
  total: document.getElementById('totalProducts'),
  levelCount: document.getElementById('levelCount'),
  brandName: document.getElementById('brandName'),
  brandLogo: document.getElementById('brandLogo'),
  waFab: document.getElementById('whatsAppFab'),
  sentinel: document.getElementById('infiniteSentinel'),
};

const CONFIG = {
  ANALYTICS_PIXEL_URL: '',
  HOVER_PRELOAD_CHILDREN: 8,
  HOVER_DELAY_MS: 300,
};

const waRe = /^https:\/\/wa\.me\/\d+$/;
const norm = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '');

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-text', theme.colors.text || '#2C2926');
  root.style.setProperty('--color-bg', theme.colors.bg || '#FEFDFB');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme.colors.bg || '#000');
}

function initialsFor(name) {
  const p = (name || '').split(/\s+/).filter(Boolean);
  const a = p[0]?.[0] || '', b = p.length > 1 ? p[p.length-1][0] : (p[0]?.[1] || '');
  return (a + b).toUpperCase();
}

function resolveBrandSlug(brands, raw) {
  const slugs = Object.keys(brands);
  if (!raw) return slugs[0];
  const target = norm(raw);
  const bySlug = {}, byName = {};
  for (const s of slugs) { bySlug[norm(s)] = s; byName[norm(brands[s].name)] = s; }
  return bySlug[target] || byName[target] || slugs[0];
}

function resolvePathFromParam(tree, rawPath) {
  if (!rawPath) return [];
  const parts = rawPath.replace(/\\/g,'/').split('/').filter(Boolean);
  let node = tree, acc = [];
  for (let i=0;i<parts.length;i++) {
    const wanted = norm(i===0 ? parts[i].toUpperCase() : parts[i]);
    const keys = Object.keys(node);
    let hit = null;
    for (const k of keys) {
      if (norm(k) === wanted) { hit = k; break; }
    }
    if (!hit) break;
    acc.push(hit);
    const n = node[hit];
    if (n?.children) node = n.children; else break;
  }
  return acc;
}

async function loadData() {
  const res = await fetch('/data.json?v=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data.json');
  const data = await res.json();
  STATE.data = data;

  // Log the entire tree structure for debugging
  console.log('🌳 FULL TREE STRUCTURE:', JSON.stringify(data.catalog.tree, null, 2));

  // brand
  const u = new URL(location.href);
  const brandRaw = u.searchParams.get('brand') || '';
  const slug = resolveBrandSlug(data.brands, brandRaw);
  STATE.brand = slug;
  const theme = data.brands[slug];

  // header
  applyTheme(theme);
  els.brandName.textContent = theme.name;
  els.brandLogo.textContent = initialsFor(theme.name);
  const validWA = theme.whatsapp && waRe.test(theme.whatsapp);
  els.waFab.style.display = validWA ? 'grid' : 'none';
  if (validWA) els.waFab.href = theme.whatsapp;

  // totals
  els.total.textContent = (data.catalog?.totalProducts || 0).toLocaleString();

  // path from URL
  const pathParam = u.searchParams.get('path') || '';
  console.log('🔍 Raw path param:', pathParam);
  const startPath = resolvePathFromParam(data.catalog.tree, pathParam);
  console.log('✅ Resolved path:', startPath);
  STATE.path = startPath;

  renderPath();
}

// ENHANCED: Debug version with extensive logging
function listItemsAtPath(path) {
  console.log('\n🔍 === LISTING ITEMS AT PATH ===');
  console.log('Path:', path);
  console.log('Path length:', path.length);
  
  // Walk to the node for the current path
  let node = STATE.data.catalog.tree;
  console.log('🌳 Starting from tree root with keys:', Object.keys(node));
  
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    console.log(`\n📁 Processing segment ${i}: "${segment}"`);
    console.log('Available keys at this level:', Object.keys(node));
    
    if (!node[segment]) {
      console.error(`❌ SEGMENT NOT FOUND: "${segment}"`);
      console.log('Available alternatives:');
      Object.keys(node).forEach(key => {
        console.log(`  - "${key}" (normalized: "${norm(key)}")`);
      });
      return [];
    }
    
    node = node[segment];
    console.log(`✅ Found segment "${segment}"`);
    console.log('Node type:', {
      isProduct: !!node.isProduct,
      hasChildren: !!node.children,
      childrenCount: Object.keys(node.children || {}).length,
      count: node.count
    });
    
    // If this is not the last segment, move to children
    if (i < path.length - 1) {
      if (!node.children) {
        console.error(`❌ Expected children but found none at "${segment}"`);
        return [];
      }
      node = node.children;
      console.log('Moved to children, available keys:', Object.keys(node));
    }
  }

  console.log('\n📦 Final node analysis:');
  console.log('Node:', {
    isProduct: !!node.isProduct,
    hasChildren: !!node.children,
    count: node.count,
    thumbnail: node.thumbnail,
    driveLink: node.driveLink
  });

  const isRoot = path.length === 0;
  const container = isRoot ? node : (node.children || {});
  
  console.log('Container keys:', Object.keys(container));
  const items = [];

  for (const key of Object.keys(container)) {
    const v = container[key];
    console.log(`\n🔧 Processing item "${key}":`, {
      isProduct: !!v.isProduct,
      hasChildren: !!v.children && Object.keys(v.children).length > 0,
      count: v.count,
      thumbnail: v.thumbnail,
      driveLink: v.driveLink
    });
    
    const hasChildren = !!v.children && Object.keys(v.children).length > 0;
    const isProduct = !!v.isProduct;
    
    let count = 0;
    if (isProduct) {
      count = 1;
    } else if (v.count) {
      count = v.count;
    } else if (hasChildren) {
      count = countItemsInNode(v);
    }

    const item = {
      key,
      label: key,
      count: count,
      thumbnail: v.thumbnail || '',
      isProduct: isProduct,
      driveLink: v.driveLink || '',
      hasChildren: hasChildren,
      topOrder: typeof v.topOrder !== 'undefined' ? v.topOrder : Number.POSITIVE_INFINITY,
    };

    console.log(`📦 Created item:`, item);
    items.push(item);
  }

  // Sort items
  if (isRoot) {
    items.sort((a,b) =>
      (a.topOrder - b.topOrder) ||
      (b.count - a.count) ||
      a.label.localeCompare(b.label)
    );
  } else {
    items.sort((a,b) =>
      (Number(b.hasChildren) - Number(a.hasChildren)) ||
      (b.count - a.count) ||
      a.label.localeCompare(b.label)
    );
  }

  console.log(`\n✅ FINAL RESULT: ${items.length} items found`);
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.label} (${item.isProduct ? 'product' : 'folder'}, count: ${item.count})`);
  });
  
  return items;
}

function countItemsInNode(node) {
  if (node.isProduct) return 1;
  if (!node.children) return 0;
  
  let total = 0;
  for (const child of Object.values(node.children)) {
    total += countItemsInNode(child);
  }
  return total;
}

function updateURL() {
  if (STATE.isPop) return;
  const params = new URLSearchParams(location.search);
  params.set('brand', STATE.brand);
  if (STATE.path.length) params.set('path', STATE.path.join('/'));
  else params.delete('path');
  history.pushState({ path: STATE.path }, '', `${location.pathname}?${params.toString()}`);
}

function renderPath() {
  console.log('\n🎨 === RENDERING PATH ===');
  console.log('Current path:', STATE.path);
  
  els.grid.setAttribute('aria-busy', 'true');
  els.grid.innerHTML = '';
  STATE.items = listItemsAtPath(STATE.path);
  STATE.rendered = 0;

  const label = STATE.path.length ? STATE.path[STATE.path.length-1] : 'All';
  els.levelCount.textContent = `${visibleCountText()} in ${label}`;
  renderBreadcrumb();
  
  if (STATE.items.length === 0) {
    console.log('❌ No items found, showing empty message');
    els.grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; opacity: 0.6;">
        <p>No items found in this category.</p>
        <p>Path: ${STATE.path.join(' → ')}</p>
        <p>Check browser console for detailed debugging info.</p>
      </div>
    `;
    els.grid.setAttribute('aria-busy', 'false');
  } else {
    console.log(`✅ Rendering ${STATE.items.length} items`);
    renderNextBatch();
    setupInfiniteScroll();
  }
  
  updateURL();
}

function visibleCountText() {
  const tree = STATE.data.catalog.tree;
  if (STATE.path.length === 0) {
    let sum = 0;
    for (const k of Object.keys(tree)) sum += (tree[k]?.count || 0);
    return sum.toLocaleString();
  }
  let node = tree;
  for (const seg of STATE.path) {
    if (!node[seg]) return '0';
    node = node[seg];
  }
  return (node?.count || 0).toLocaleString();
}

function renderNextBatch() {
  const start = STATE.rendered;
  const end = Math.min(start + STATE.batchSize, STATE.items.length);
  for (let i = start; i < end; i++) els.grid.appendChild(cardEl(STATE.items[i]));
  STATE.rendered = end;
  els.grid.setAttribute('aria-busy', 'false');
}

function setupInfiniteScroll() {
  if (STATE.io) STATE.io.disconnect();
  STATE.io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && STATE.rendered < STATE.items.length) renderNextBatch();
    });
  }, { rootMargin: '1200px 0px 800px 0px' });
  STATE.io.observe(els.sentinel);
}

function cardEl(item) {
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;

  const img = document.createElement('img');
  img.className = 'card-thumb';
  if (item.thumbnail) { 
    img.loading = 'lazy'; 
    img.decoding = 'async'; 
    img.alt = `${item.label} thumbnail`; 
    img.src = item.thumbnail;
    img.onerror = () => {
      img.src = '/thumbs/_placeholder.webp';
      img.onerror = null;
    };
  } else { 
    img.alt = ''; 
    img.src = '/thumbs/_placeholder.webp';
  }

  const body = document.createElement('div'); 
  body.className = 'card-body';
  
  const title = document.createElement('h3'); 
  title.className = 'card-title'; 
  title.textContent = item.label;
  
  const right = document.createElement('div'); 
  right.className = 'card-count'; 
  
  if (item.hasChildren && item.count > 0) {
    right.textContent = `${item.count}`;
  } else if (item.isProduct) {
    right.textContent = '';
  } else {
    right.textContent = '0';
  }
  
  body.appendChild(title); 
  body.appendChild(right);
  card.appendChild(img); 
  card.appendChild(body);

  const go = () => {
    console.log('\n🖱️ === CARD CLICKED ===');
    console.log('Item:', item.label);
    console.log('Current path:', STATE.path);
    console.log('Item details:', {
      isProduct: item.isProduct,
      hasChildren: item.hasChildren,
      driveLink: item.driveLink
    });
    
    if (item.isProduct && item.driveLink) {
      console.log('🔗 Opening product drive link:', item.driveLink);
      trackClick(STATE.brand, [...STATE.path, item.label].join('/'));
      window.location.href = item.driveLink;
    } else if (item.hasChildren) {
      const newPath = [...STATE.path, item.label];
      console.log('📁 Navigating to new path:', newPath);
      STATE.path = newPath;
      renderPath();
    } else {
      console.log('⚠️ Item has no action available');
    }
  };
  
  card.addEventListener('click', go);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  card.addEventListener('mouseenter', () => {
    if (!item.hasChildren) return;
    clearTimeout(STATE.hoverTimer);
    STATE.hoverTimer = setTimeout(() => preloadChildrenThumbs([...STATE.path, item.label]), CONFIG.HOVER_DELAY_MS);
  });
  card.addEventListener('mouseleave', () => clearTimeout(STATE.hoverTimer));

  return card;
}

function preloadChildrenThumbs(path) {
  const children = listItemsAtPath(path).slice(0, CONFIG.HOVER_PRELOAD_CHILDREN);
  for (const c of children) { 
    if (!c.thumbnail) continue; 
    const i = new Image(); 
    i.referrerPolicy = 'no-referrer'; 
    i.src = c.thumbnail; 
  }
}

function renderBreadcrumb() {
  const frag = document.createDocumentFragment();

  const home = document.createElement('a');
  home.href = '#'; home.textContent = 'Home';
  home.addEventListener('click', (e) => { e.preventDefault(); STATE.path = []; renderPath(); });
  frag.appendChild(home);

  STATE.path.forEach((p, idx) => {
    const last = idx === STATE.path.length - 1;
    const el = document.createElement(last ? 'span' : 'a');
    el.textContent = p;
    if (!last) {
      el.href = '#';
      el.addEventListener('click', (e) => { e.preventDefault(); STATE.path = STATE.path.slice(0, idx + 1); renderPath(); });
    } else {
      el.className = 'current';
    }
    frag.appendChild(el);
  });

  els.breadcrumb.innerHTML = '';
  els.breadcrumb.appendChild(frag);
}

function trackClick(slug, productPath) {
  if (!CONFIG.ANALYTICS_PIXEL_URL) return;
  const u = new URL(CONFIG.ANALYTICS_PIXEL_URL);
  u.searchParams.set('d', new Date().toISOString().slice(0,10));
  u.searchParams.set('slug', slug);
  u.searchParams.set('product_path', productPath);
  u.searchParams.set('r', Math.random().toString(36).slice(2));
  const img = document.createElement('img');
  img.src = u.toString(); img.alt = ''; img.width = img.height = 1;
  img.style.position = 'absolute'; img.style.opacity = '0';
  document.body.appendChild(img); setTimeout () => img.remove(), 2000);
}

window.addEventListener('popstate', () => {
  STATE.isPop = true;
  const u = new URL(location.href);
  const pathParam = u.searchParams.get('path') || '';
  STATE.path = resolvePathFromParam(STATE.data.catalog.tree, pathParam);
  renderPath();
  STATE.isPop = false;
});

loadData().catch(err => {
  console.error('💥 Failed to load catalog:', err);
  els.grid.innerHTML = `<p>Failed to load catalog. Please try again later.</p>`;
});
