// Modern Luxury Catalog App - Fixed Navigation & Images
const STATE = {
  data: null,
  brand: null,
  path: [],
  items: [],
  allProducts: [],
  batchSize: 24,
  rendered: 0,
  hoverTimer: null,
  isPop: false,
  searchQuery: '',
  searchResults: [],
  searchTimeout: null,
};

const els = {
  grid: document.getElementById('grid'),
  breadcrumb: document.getElementById('breadcrumb'),
  brandName: document.getElementById('brandName'),
  brandLogo: document.getElementById('brandLogo'),
  waFab: document.getElementById('whatsAppFab'),
  sentinel: document.getElementById('infiniteSentinel'),
  searchInput: document.getElementById('searchInput'),
  searchResults: document.getElementById('searchResults'),
  searchClear: document.getElementById('searchClear'),
  loadingIndicator: document.getElementById('loadingIndicator'),
};

const CONFIG = {
  ANALYTICS_PIXEL_URL: '',
  HOVER_PRELOAD_CHILDREN: 8,
  HOVER_DELAY_MS: 300,
  SEARCH_DEBOUNCE_MS: 300,
  PLACEHOLDER_IMAGE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmOGY5ZmEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlNWU3ZWIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==',
};

const waRe = /^https:\/\/wa\.me\/\d+$/;

// FIXED: Better image URL processing
function processImageUrl(url) {
  if (!url || url.trim() === '') {
    return CONFIG.PLACEHOLDER_IMAGE;
  }

  const cleanUrl = url.trim();
  
  // If it's already a valid HTTP URL, return as-is
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }
  
  // If it's a data URL, return as-is
  if (cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }
  
  // Handle relative paths - convert to absolute web paths
  let processedUrl = cleanUrl.replace(/\\/g, '/'); // Convert backslashes
  
  // Remove leading slashes and add /thumbs/ prefix if not present
  processedUrl = processedUrl.replace(/^\/+/, '');
  
  if (!processedUrl.startsWith('thumbs/')) {
    processedUrl = 'thumbs/' + processedUrl;
  }
  
  // Return as absolute path
  return '/' + processedUrl;
}

// FIXED: Image validation and fallback
function createImageElement(src, alt, className = '') {
  const img = document.createElement('img');
  if (className) img.className = className;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  
  const processedSrc = processImageUrl(src);
  console.log(`🖼️ Image: "${src}" → "${processedSrc}"`);
  
  // Set up error handling before setting src
  img.onerror = function() {
    console.log(`❌ Image failed to load: ${this.src}`);
    if (this.src !== CONFIG.PLACEHOLDER_IMAGE) {
      console.log(`🔄 Falling back to placeholder`);
      this.src = CONFIG.PLACEHOLDER_IMAGE;
      this.onerror = null; // Prevent infinite loop
    }
  };
  
  img.onload = function() {
    console.log(`✅ Image loaded successfully: ${this.src.substring(0, 50)}...`);
  };
  
  img.src = processedSrc;
  return img;
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-text', theme.colors.text || '#1a1a1a');
  root.style.setProperty('--color-bg', theme.colors.bg || '#fefefe');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme.colors.primary);
}

function initialsFor(name) {
  const parts = (name || '').split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts.length > 1 ? parts[parts.length-1][0] : (parts[0]?.[1] || '');
  return (first + second).toUpperCase();
}

function resolveBrandSlug(brands, raw) {
  const slugs = Object.keys(brands);
  if (!raw) return slugs[0];
  const target = raw.toLowerCase();
  
  for (const s of slugs) {
    if (s.toLowerCase() === target || brands[s].name.toLowerCase() === target) {
      return s;
    }
  }
  return slugs[0];
}

function findKeyIgnoreCase(obj, searchKey) {
  if (!searchKey) return null;
  const searchLower = searchKey.toLowerCase();
  
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === searchLower) {
      return key;
    }
  }
  return null;
}

function resolvePathFromParam(tree, rawPath) {
  if (!rawPath) return [];
  
  const parts = rawPath.replace(/\\/g,'/').split('/').filter(Boolean);
  let node = tree;
  const resolvedPath = [];
  
  for (const part of parts) {
    const actualKey = findKeyIgnoreCase(node, part);
    if (!actualKey) {
      console.log(`❌ "${part}" not found in:`, Object.keys(node));
      break;
    }
    
    resolvedPath.push(actualKey);
    node = node[actualKey];
    
    if (node.children) {
      node = node.children;
    } else {
      break;
    }
  }
  
  return resolvedPath;
}

// Build search index from all products
function buildSearchIndex(tree, path = [], index = []) {
  for (const [key, value] of Object.entries(tree)) {
    const currentPath = [...path, key];
    const pathString = currentPath.join(' → ');
    
    // Process thumbnail URL
    const processedThumbnail = processImageUrl(value.thumbnail);
    
    // Add this item to search index
    index.push({
      title: key,
      path: currentPath,
      pathString: pathString,
      thumbnail: processedThumbnail,
      isProduct: !!value.isProduct,
      driveLink: value.driveLink || '',
      searchText: `${key} ${pathString}`.toLowerCase(),
      count: value.count || 0,
    });
    
    // Recursively index children
    if (value.children && !value.isProduct) {
      buildSearchIndex(value.children, currentPath, index);
    }
  }
  
  return index;
}

// Search functionality
function performSearch(query) {
  if (!query.trim()) return [];
  
  const searchTerm = query.toLowerCase();
  const results = STATE.allProducts.filter(item => 
    item.searchText.includes(searchTerm)
  );
  
  return results.sort((a, b) => {
    const aExact = a.title.toLowerCase().includes(searchTerm);
    const bExact = b.title.toLowerCase().includes(searchTerm);
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    return a.path.length - b.path.length;
  }).slice(0, 10);
}

function renderSearchResults(results) {
  if (results.length === 0) {
    els.searchResults.innerHTML = `
      <div class="search-result">
        <div class="search-result-content">
          <div class="search-result-title">No results found</div>
          <div class="search-result-path">Try a different search term</div>
        </div>
      </div>
    `;
    return;
  }
  
  els.searchResults.innerHTML = results.map(result => `
    <div class="search-result" data-path="${result.path.join('/')}" data-is-product="${result.isProduct}" data-drive-link="${result.driveLink}">
      <img class="search-result-image" src="${result.thumbnail}" alt="${result.title}" loading="lazy" 
           onerror="this.src='${CONFIG.PLACEHOLDER_IMAGE}'">
      <div class="search-result-content">
        <div class="search-result-title">${result.title}</div>
        <div class="search-result-path">${result.pathString}</div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers to search results
  els.searchResults.querySelectorAll('.search-result').forEach(result => {
    result.addEventListener('click', () => {
      const path = result.dataset.path;
      const isProduct = result.dataset.isProduct === 'true';
      const driveLink = result.dataset.driveLink;
      
      hideSearchResults();
      clearSearch();
      
      if (isProduct && driveLink) {
        // FIXED: Use location.href for better back button behavior
        window.location.href = driveLink;
      } else {
        const pathArray = path ? path.split('/') : [];
        STATE.path = pathArray;
        renderPath();
      }
    });
  });
}

function showSearchResults() {
  els.searchResults.style.display = 'block';
}

function hideSearchResults() {
  els.searchResults.style.display = 'none';
}

function clearSearch() {
  els.searchInput.value = '';
  STATE.searchQuery = '';
  STATE.searchResults = [];
  hideSearchResults();
  updateSearchClearButton();
}

function updateSearchClearButton() {
  els.searchClear.style.display = STATE.searchQuery ? 'flex' : 'none';
}

// Initialize search functionality
function initSearch() {
  els.searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    STATE.searchQuery = query;
    updateSearchClearButton();
    
    clearTimeout(STATE.searchTimeout);
    
    if (query.trim()) {
      STATE.searchTimeout = setTimeout(() => {
        const results = performSearch(query);
        STATE.searchResults = results;
        renderSearchResults(results);
        showSearchResults();
      }, CONFIG.SEARCH_DEBOUNCE_MS);
    } else {
      hideSearchResults();
    }
  });
  
  els.searchInput.addEventListener('focus', () => {
    if (STATE.searchResults.length > 0) {
      showSearchResults();
    }
  });
  
  els.searchClear.addEventListener('click', clearSearch);
  
  // Hide search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) {
      hideSearchResults();
    }
  });
  
  // Keyboard navigation
  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideSearchResults();
      els.searchInput.blur();
    }
  });
}

async function loadData() {
  try {
    showLoading();
    
    const res = await fetch('/data.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    
    const data = await res.json();
    STATE.data = data;

    // Build search index
    STATE.allProducts = buildSearchIndex(data.catalog.tree);
    console.log(`🔍 Built search index with ${STATE.allProducts.length} items`);

    // Brand resolution
    const u = new URL(location.href);
    const brandRaw = u.searchParams.get('brand') || '';
    const slug = resolveBrandSlug(data.brands, brandRaw);
    STATE.brand = slug;
    const theme = data.brands[slug];

    if (!theme) {
      throw new Error(`Brand "${slug}" not found`);
    }

    // Apply theme and setup header
    applyTheme(theme);
    els.brandName.textContent = theme.name;
    els.brandLogo.textContent = initialsFor(theme.name);
    
    // WhatsApp FAB
    const validWA = theme.whatsapp && waRe.test(theme.whatsapp);
    els.waFab.style.display = validWA ? 'flex' : 'none';
    if (validWA) els.waFab.href = theme.whatsapp;

    // Path resolution
    const pathParam = u.searchParams.get('path') || '';
    const startPath = resolvePathFromParam(data.catalog.tree, pathParam);
    STATE.path = startPath;

    // Initialize search
    initSearch();
    
    hideLoading();
    renderPath();
    
  } catch (err) {
    console.error('Failed to load data:', err);
    hideLoading();
    showError(err.message);
  }
}

function showLoading() {
  els.loadingIndicator.style.display = 'block';
  els.grid.setAttribute('aria-busy', 'true');
}

function hideLoading() {
  els.loadingIndicator.style.display = 'none';
  els.grid.setAttribute('aria-busy', 'false');
}

function showError(message) {
  els.grid.innerHTML = `
    <div class="empty-state">
      <h3>Unable to load catalog</h3>
      <p>Error: ${message}</p>
      <p>Please check your internet connection and try again.</p>
      <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--color-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}

function listItemsAtPath(path) {
  let node = STATE.data.catalog.tree;
  
  // Navigate to target node
  for (const segment of path) {
    if (!node[segment]) {
      console.log(`❌ Segment "${segment}" not found`);
      return [];
    }
    node = node[segment];
    if (path.indexOf(segment) < path.length - 1 && node.children) {
      node = node.children;
    }
  }

  // Determine container
  let container;
  if (path.length === 0) {
    container = node;
  } else if (node.children) {
    container = node.children;
  } else {
    return [];
  }

  const items = [];
  for (const key of Object.keys(container)) {
    const v = container[key];
    
    const hasChildren = !!(v.children && Object.keys(v.children).length > 0);
    const isProduct = !!v.isProduct;
    
    let count = v.count || 0;
    if (isProduct) count = 1;

    items.push({
      key,
      label: key,
      count: count,
      thumbnail: processImageUrl(v.thumbnail), // FIXED: Process image URL
      isProduct: isProduct,
      driveLink: v.driveLink || '',
      hasChildren: hasChildren,
      topOrder: v.topOrder || 999,
    });
  }

  // Sort items
  if (path.length === 0) {
    items.sort((a,b) => a.topOrder - b.topOrder || b.count - a.count || a.label.localeCompare(b.label));
  } else {
    items.sort((a,b) => Number(b.hasChildren) - Number(a.hasChildren) || b.count - a.count || a.label.localeCompare(b.label));
  }

  console.log(`✅ Found ${items.length} items at [${path.join(' → ')}]`);
  return items;
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
  els.grid.innerHTML = '';
  STATE.items = listItemsAtPath(STATE.path);
  STATE.rendered = 0;

  renderBreadcrumb();
  
  if (STATE.items.length === 0) {
    els.grid.innerHTML = `
      <div class="empty-state">
        <h3>No items found</h3>
        <p>This category appears to be empty or the path may not exist.</p>
        <p>Current path: ${STATE.path.join(' → ') || 'Home'}</p>
      </div>
    `;
  } else {
    renderNextBatch();
    setupInfiniteScroll();
  }
  
  updateURL();
}

function renderNextBatch() {
  const start = STATE.rendered;
  const end = Math.min(start + STATE.batchSize, STATE.items.length);
  
  for (let i = start; i < end; i++) {
    els.grid.appendChild(createCard(STATE.items[i]));
  }
  
  STATE.rendered = end;
}

function setupInfiniteScroll() {
  if (STATE.io) STATE.io.disconnect();
  STATE.io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && STATE.rendered < STATE.items.length) {
        renderNextBatch();
      }
    });
  }, { rootMargin: '400px 0px' });
  STATE.io.observe(els.sentinel);
}

// Enhanced createCard function with counts and visual indicators
function createCard(item) {
  const card = document.createElement('article');
  card.className = `card ${item.isProduct ? 'card-product' : 'card-folder'}`;
  card.tabIndex = 0;

  // Image container with overlay for visual distinction
  const imageContainer = document.createElement('div');
  imageContainer.className = 'card-image-container';

  const img = createImageElement(item.thumbnail, `${item.label} thumbnail`, 'card-thumb');
  imageContainer.appendChild(img);

  // Add visual indicator overlay for folders
  if (!item.isProduct && item.hasChildren) {
    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    
    const folderIcon = document.createElement('div');
    folderIcon.className = 'folder-icon';
    folderIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
      </svg>
    `;
    
    overlay.appendChild(folderIcon);
    imageContainer.appendChild(overlay);
  }

  // Add product badge for products
  if (item.isProduct) {
    const productBadge = document.createElement('div');
    productBadge.className = 'product-badge';
    productBadge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    `;
    imageContainer.appendChild(productBadge);
  }

  const body = document.createElement('div');
  body.className = 'card-body';
  
  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = item.label;
  
  // Enhanced count display with better logic
  const rightSection = document.createElement('div');
  rightSection.className = 'card-right-section';
  
  if (!item.isProduct && item.hasChildren && item.count > 0) {
    // Folder with items - show count
    const count = document.createElement('div');
    count.className = 'card-count';
    count.textContent = item.count.toString();
    
    const countLabel = document.createElement('div');
    countLabel.className = 'card-count-label';
    countLabel.textContent = item.count === 1 ? 'item' : 'items';
    
    rightSection.appendChild(count);
    rightSection.appendChild(countLabel);
  } else if (item.isProduct) {
    // Product - show product indicator
    const productIndicator = document.createElement('div');
    productIndicator.className = 'product-indicator';
    productIndicator.textContent = 'Product';
    rightSection.appendChild(productIndicator);
  }
  
  body.appendChild(title);
  body.appendChild(rightSection);
  card.appendChild(imageContainer);
  card.appendChild(body);

  // Click handler
  const handleClick = () => {
    if (item.isProduct && item.driveLink) {
      console.log(`🔗 Opening product: ${item.label} → ${item.driveLink}`);
      window.location.href = item.driveLink;
      trackClick(item);
    } else {
      console.log(`📁 Navigating to: ${item.label}`);
      STATE.path = [...STATE.path, item.label];
      renderPath();
    }
  };
  
  card.addEventListener('click', handleClick);
  card.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  });

  // Hover effects
  card.addEventListener('mouseenter', () => {
    if (item.hasChildren) {
      clearTimeout(STATE.hoverTimer);
      STATE.hoverTimer = setTimeout(() => {
        preloadChildren([...STATE.path, item.label]);
      }, CONFIG.HOVER_DELAY_MS);
    }
  });
  
  card.addEventListener('mouseleave', () => {
    clearTimeout(STATE.hoverTimer);
  });

  return card;
}

function preloadChildren(path) {
  const children = listItemsAtPath(path).slice(0, CONFIG.HOVER_PRELOAD_CHILDREN);
  children.forEach(child => {
    if (child.thumbnail && child.thumbnail !== CONFIG.PLACEHOLDER_IMAGE) {
      const img = new Image();
      img.src = child.thumbnail;
    }
  });
}

function renderBreadcrumb() {
  const fragment = document.createDocumentFragment();

  // Home link
  const home = document.createElement('a');
  home.href = '#';
  home.textContent = 'Home';
  home.addEventListener('click', (e) => {
    e.preventDefault();
    STATE.path = [];
    renderPath();
  });
  fragment.appendChild(home);

  // Path segments
  STATE.path.forEach((segment, index) => {
    const isLast = index === STATE.path.length - 1;
    const element = document.createElement(isLast ? 'span' : 'a');
    
    element.textContent = segment;
    if (isLast) {
      element.className = 'current';
    } else {
      element.href = '#';
      element.addEventListener('click', (e) => {
        e.preventDefault();
        STATE.path = STATE.path.slice(0, index + 1);
        renderPath();
      });
    }
    
    fragment.appendChild(element);
  });

  els.breadcrumb.innerHTML = '';
  els.breadcrumb.appendChild(fragment);
}

function trackClick(item) {
  if (!CONFIG.ANALYTICS_PIXEL_URL) return;
  console.log('Product clicked:', item.label);
}

// Browser navigation
window.addEventListener('popstate', () => {
  STATE.isPop = true;
  const u = new URL(location.href);
  const pathParam = u.searchParams.get('path') || '';
  STATE.path = resolvePathFromParam(STATE.data.catalog.tree, pathParam);
  renderPath();
  STATE.isPop = false;
});

// Initialize app
loadData();
