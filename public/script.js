// Enhanced Luxury Catalog App - Fixed Version
// ===========================================

// State Management
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
  isSearchLoaded: false,
  isMobileSearchVisible: false,
};

// DOM Elements
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
  searchSection: document.getElementById('searchSection'),
  mobileSearchToggle: document.getElementById('mobileSearchToggle'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  skeletonLoader: document.getElementById('skeletonLoader'),
  inspirationText: document.getElementById('inspirationText'),
};

// Configuration
const CONFIG = {
  ANALYTICS_PIXEL_URL: '',
  HOVER_PRELOAD_CHILDREN: 8,
  HOVER_DELAY_MS: 300,
  SEARCH_DEBOUNCE_MS: 300,
  PLACEHOLDER_IMAGE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxYTFhMWEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMyYTJhMmEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOGE4YThhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOGE4YThhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==',
};

const waRe = /^https:\/\/wa\.me\/\d+$/;

// Enhanced Smart Color System for Dark Luxury Theme
class LuxuryColorSystem {
  constructor() {
    this.luxuryPalette = {
      black: '#0a0a0a',
      charcoal: '#1a1a1a',
      darkGray: '#2a2a2a',
      gray: '#3a3a3a',
      lightGray: '#4a4a4a',
      silver: '#8a8a8a',
      gold: '#d4af37',
      roseGold: '#e8b4a0',
      platinum: '#e5e4e2',
      champagne: '#f7e7ce',
    };
    
    this.fallbackColors = {
      primary: '#d4af37',
      accent: '#e8b4a0',
      text: '#f5f5f5',
      bg: '#0a0a0a',
      surface: '#1a1a1a',
    };
  }

  hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  getLuminance(r, g, b) {
    const rs = r / 255;
    const gs = g / 255;
    const bs = b / 255;
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  getContrastRatio(color1, color2) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  adjustBrightness(hex, amount) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const adjust = (value) => Math.max(0, Math.min(255, value + amount));
    
    return this.rgbToHex(
      adjust(rgb.r),
      adjust(rgb.g),
      adjust(rgb.b)
    );
  }

  generateLuxuryAccent(primary) {
    const rgb = this.hexToRgb(primary);
    if (!rgb) return this.fallbackColors.accent;

    const accent = this.rgbToHex(
      Math.min(255, Math.max(0, rgb.r + 20)),
      Math.min(255, Math.max(0, rgb.g + 15)),
      Math.min(255, Math.max(0, rgb.b - 10))
    );

    return accent;
  }

  generateLuxuryPalette(brandColors) {
    const palette = { ...this.fallbackColors };

    try {
      let primary = brandColors.primary;
      if (!primary || !this.hexToRgb(primary)) {
        console.log('🎨 Invalid primary color, using luxury gold fallback');
        primary = this.luxuryPalette.gold;
      }

      let accent = brandColors.accent;
      if (!accent || !this.hexToRgb(accent)) {
        accent = this.generateLuxuryAccent(primary);
        console.log('🎨 Generated luxury accent color:', accent);
      }

      const contrastWithDark = this.getContrastRatio(primary, this.luxuryPalette.black);
      if (contrastWithDark < 3) {
        primary = this.adjustBrightness(primary, 80);
        console.log('🎨 Brightened primary for dark theme:', primary);
      }

      palette.primary = primary;
      palette.accent = accent;
      palette.text = '#f5f5f5';
      palette.bg = this.luxuryPalette.black;
      palette.surface = this.luxuryPalette.charcoal;

      console.log('🎨 Generated luxury dark palette:', palette);
      return palette;

    } catch (error) {
      console.error('🎨 Error generating luxury palette, using fallbacks:', error);
      return this.fallbackColors;
    }
  }
}

// Smart Scroll Manager
class SmartScrollManager {
  constructor() {
    this.scrollPositions = new Map();
    this.isNavigating = false;
    this.resetTimeout = null;
  }

  saveScrollPosition(path) {
    const pathKey = path.join('/') || 'home';
    const scrollY = window.scrollY;
    this.scrollPositions.set(pathKey, scrollY);
  }

  resetScrollPosition(delay = 0) {
    clearTimeout(this.resetTimeout);
    
    this.resetTimeout = setTimeout(() => {
      if (this.isNavigating) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      }
    }, delay);
  }

  startNavigation() {
    this.isNavigating = true;
    this.saveScrollPosition(STATE.path);
  }

  endNavigation() {
    this.resetScrollPosition(100);
    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
  }
}

// Initialize managers
const colorSystem = new LuxuryColorSystem();
const scrollManager = new SmartScrollManager();

// Utility Functions
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

// Enhanced Theme Application for Dark Luxury
function applyLuxuryTheme(theme) {
  const smartPalette = colorSystem.generateLuxuryPalette(theme.colors);
  
  const root = document.documentElement;
  
  root.style.setProperty('--color-primary', smartPalette.primary);
  root.style.setProperty('--color-accent', smartPalette.accent);
  root.style.setProperty('--color-text', smartPalette.text);
  root.style.setProperty('--color-bg', smartPalette.bg);
  root.style.setProperty('--color-surface', smartPalette.surface);
  
  root.style.setProperty('--color-surface-elevated', colorSystem.adjustBrightness(smartPalette.surface, 15));
  root.style.setProperty('--color-glow', `${smartPalette.primary}33`);
  
  document.querySelector('meta[name="theme-color"]').setAttribute('content', smartPalette.primary);
  
  console.log('🎨 Applied luxury dark theme for:', theme.name);
}

// Optimized Image Processing
function processImageUrl(url) {
  if (!url || url.trim() === '') {
    return CONFIG.PLACEHOLDER_IMAGE;
  }

  const cleanUrl = url.trim();
  
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }
  
  if (cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }
  
  let processedUrl = cleanUrl.replace(/\\/g, '/').replace(/^\/+/, '');
  
  const pathParts = processedUrl.split('/').filter(Boolean);
  const cleanedParts = [];
  
  for (let i = 0; i < pathParts.length; i++) {
    const current = pathParts[i];
    const previous = pathParts[i - 1];
    
    if (previous && current.toLowerCase() === previous.toLowerCase()) {
      continue;
    }
    cleanedParts.push(current);
  }
  
  processedUrl = cleanedParts.join('/');
  
  if (!processedUrl.startsWith('thumbs/')) {
    processedUrl = 'thumbs/' + processedUrl;
  }
  
  return '/' + processedUrl;
}

function createOptimizedImageElement(src, alt, className = '') {
  const img = document.createElement('img');
  if (className) img.className = className;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  
  const processedPath = processImageUrl(src);
  
  img.onerror = function() {
    this.src = CONFIG.PLACEHOLDER_IMAGE;
  };
  
  img.src = processedPath;
  return img;
}

// Lazy Search Loading
function initSearchLazy() {
  if (STATE.isSearchLoaded) return;
  
  console.log('🔍 Initializing search functionality...');
  
  STATE.allProducts = buildSearchIndex(STATE.data.catalog.tree);
  STATE.isSearchLoaded = true;
  
  console.log(`🔍 Search index built with ${STATE.allProducts.length} items`);
}

function buildSearchIndex(tree, path = [], index = []) {
  for (const [key, value] of Object.entries(tree)) {
    const currentPath = [...path, key];
    const pathString = currentPath.join(' → ');
    
    const processedThumbnail = processImageUrl(value.thumbnail);
    
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
    
    if (value.children && !value.isProduct) {
      buildSearchIndex(value.children, currentPath, index);
    }
  }
  
  return index;
}

// Enhanced Search Functionality
function performSearch(query) {
  if (!query.trim() || !STATE.isSearchLoaded) return [];
  
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
  
  els.searchResults.querySelectorAll('.search-result').forEach(result => {
    result.addEventListener('click', () => {
      const path = result.dataset.path;
      const isProduct = result.dataset.isProduct === 'true';
      const driveLink = result.dataset.driveLink;
      
      hideSearchResults();
      clearSearch();
      
      if (isProduct && driveLink) {
        scrollManager.saveScrollPosition(STATE.path);
        window.location.href = driveLink;
      } else {
        const pathArray = path ? path.split('/') : [];
        scrollManager.startNavigation();
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

// Mobile Search Toggle
function initMobileSearch() {
  if (els.mobileSearchToggle) {
    els.mobileSearchToggle.addEventListener('click', () => {
      STATE.isMobileSearchVisible = !STATE.isMobileSearchVisible;
      
      if (STATE.isMobileSearchVisible) {
        els.searchSection.classList.add('mobile-visible');
        if (!STATE.isSearchLoaded) {
          initSearchLazy();
        }
        setTimeout(() => els.searchInput.focus(), 100);
      } else {
        els.searchSection.classList.remove('mobile-visible');
        hideSearchResults();
      }
    });
  }
}

function initSearch() {
  if (els.searchInput) {
    els.searchInput.addEventListener('focus', () => {
      if (!STATE.isSearchLoaded) {
        initSearchLazy();
      }
    });

    els.searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      STATE.searchQuery = query;
      updateSearchClearButton();
      
      clearTimeout(STATE.searchTimeout);
      
      if (query.trim()) {
        if (!STATE.isSearchLoaded) {
          initSearchLazy();
        }
        
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
  }
  
  if (els.searchClear) {
    els.searchClear.addEventListener('click', clearSearch);
  }
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) {
      hideSearchResults();
    }
  });
  
  if (els.searchInput) {
    els.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideSearchResults();
        els.searchInput.blur();
        if (window.innerWidth <= 768) {
          STATE.isMobileSearchVisible = false;
          els.searchSection.classList.remove('mobile-visible');
        }
      }
    });
  }
}

// Enhanced Loading States
function showSkeletonLoader() {
  if (els.skeletonLoader) {
    els.skeletonLoader.style.display = 'block';
    els.grid.style.display = 'none';
  }
}

function hideSkeletonLoader() {
  if (els.skeletonLoader) {
    els.skeletonLoader.style.display = 'none';
    els.grid.style.display = 'grid';
  }
}

function showLoading() {
  if (els.loadingIndicator) els.loadingIndicator.style.display = 'block';
  els.grid.setAttribute('aria-busy', 'true');
}

function hideLoading() {
  if (els.loadingIndicator) els.loadingIndicator.style.display = 'none';
  els.grid.setAttribute('aria-busy', 'false');
}

// Data Loading with Performance Optimizations
async function loadData() {
  try {
    showSkeletonLoader();
    
    const res = await fetch('/data.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    
    const data = await res.json();
    STATE.data = data;

    const u = new URL(location.href);
    const brandRaw = u.searchParams.get('brand') || '';
    const slug = resolveBrandSlug(data.brands, brandRaw);
    STATE.brand = slug;
    const theme = data.brands[slug];

    if (!theme) {
      throw new Error(`Brand "${slug}" not found`);
    }

    applyLuxuryTheme(theme);
    els.brandName.textContent = theme.name;
    els.brandLogo.textContent = initialsFor(theme.name);
    
    const validWA = theme.whatsapp && waRe.test(theme.whatsapp);
    els.waFab.style.display = validWA ? 'flex' : 'none';
    if (validWA) els.waFab.href = theme.whatsapp;

    const pathParam = u.searchParams.get('path') || '';
    const startPath = resolvePathFromParam(data.catalog.tree, pathParam);
    STATE.path = startPath;

    initSearch();
    initMobileSearch();
    initLogoClick();
    
    hideSkeletonLoader();
    renderPath();
    
  } catch (err) {
    console.error('Failed to load data:', err);
    hideSkeletonLoader();
    showError(err.message);
  }
}

function showError(message) {
  els.grid.innerHTML = `
    <div class="empty-state">
      <h3>Unable to load catalog</h3>
      <p>Error: ${message}</p>
      <p>Please check your internet connection and try again.</p>
      <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--color-primary); color: var(--color-luxury-black); border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
        Reload Page
      </button>
    </div>
  `;
}

// Logo Click Handler
function initLogoClick() {
  if (els.brandLogo) {
    els.brandLogo.addEventListener('click', () => {
      scrollManager.startNavigation();
      STATE.path = [];
      renderPath();
    });
    
    els.brandLogo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollManager.startNavigation();
        STATE.path = [];
        renderPath();
      }
    });
  }
}

// Catalog Navigation
function listItemsAtPath(path) {
  let node = STATE.data.catalog.tree;
  
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
      thumbnail: processImageUrl(v.thumbnail),
      isProduct: isProduct,
      driveLink: v.driveLink || '',
      hasChildren: hasChildren,
      topOrder: v.topOrder || 999,
    });
  }

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
  console.log('🎨 Rendering path:', STATE.path);
  
  scrollManager.startNavigation();
  
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
  scrollManager.endNavigation();
}

function renderNextBatch() {
  const start = STATE.rendered;
  const end = Math.min(start + STATE.batchSize, STATE.items.length);
  
  for (let i = start; i < end; i++) {
    els.grid.appendChild(createEnhancedCard(STATE.items[i]));
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

// Enhanced Card Creation with Luxury Styling
function createEnhancedCard(item) {
  const card = document.createElement('article');
  card.className = `card ${item.isProduct ? 'card-product' : 'card-folder'}`;
  card.tabIndex = 0;

  const imageContainer = document.createElement('div');
  imageContainer.className = 'card-image-container';

  const img = createOptimizedImageElement(item.thumbnail, `${item.label} thumbnail`, 'card-thumb');
  imageContainer.appendChild(img);

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
  
  const rightSection = document.createElement('div');
  rightSection.className = 'card-right-section';
  
  if (!item.isProduct && item.hasChildren && item.count > 0) {
    const count = document.createElement('div');
    count.className = 'card-count';
    count.textContent = item.count.toString();
    
    const countLabel = document.createElement('div');
    countLabel.className = 'card-count-label';
    countLabel.textContent = item.count === 1 ? 'item' : 'items';
    
    rightSection.appendChild(count);
    rightSection.appendChild(countLabel);
  } else if (item.isProduct) {
    const productIndicator = document.createElement('div');
    productIndicator.className = 'product-indicator';
    productIndicator.textContent = 'Check Details';
    rightSection.appendChild(productIndicator);
  }
  
  body.appendChild(title);
  body.appendChild(rightSection);
  card.appendChild(imageContainer);
  card.appendChild(body);

  const handleClick = () => {
    if (item.isProduct && item.driveLink) {
      console.log(`🔗 Opening product: ${item.label} → ${item.driveLink}`);
      scrollManager.saveScrollPosition(STATE.path);
      window.location.href = item.driveLink;
      trackClick(item);
    } else {
      console.log(`📁 Navigating to: ${item.label}`);
      scrollManager.startNavigation();
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

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  });

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

// Enhanced Breadcrumb Navigation
function renderBreadcrumb() {
  const fragment = document.createDocumentFragment();

  const home = document.createElement('a');
  home.href = '#';
  home.textContent = 'Home';
  home.addEventListener('click', (e) => {
    e.preventDefault();
    scrollManager.startNavigation();
    STATE.path = [];
    renderPath();
  });
  fragment.appendChild(home);

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
        scrollManager.startNavigation();
        STATE.path = STATE.path.slice(0, index + 1);
        renderPath();
      });
    }
    
    fragment.appendChild(element);
  });

  els.breadcrumb.innerHTML = '';
  els.breadcrumb.appendChild(fragment);
}

// Analytics and Tracking
function trackClick(item) {
  if (!CONFIG.ANALYTICS_PIXEL_URL) return;
  
  const u = new URL(CONFIG.ANALYTICS_PIXEL_URL);
  u.searchParams.set('d', new Date().toISOString().slice(0,10));
  u.searchParams.set('slug', STATE.brand);
  u.searchParams.set('product_path', [...STATE.path, item.label].join('/'));
  u.searchParams.set('r', Math.random().toString(36).slice(2));
  
  const img = document.createElement('img');
  img.src = u.toString();
  img.alt = '';
  img.width = img.height = 1;
  img.style.position = 'absolute';
  img.style.opacity = '0';
  document.body.appendChild(img);
  
  setTimeout(() => img.remove(), 2000);
  
  console.log('📊 Product clicked:', item.label);
}

// Browser Navigation
window.addEventListener('popstate', () => {
  STATE.isPop = true;
  scrollManager.startNavigation();
  
  const u = new URL(location.href);
  const pathParam = u.searchParams.get('path') || '';
  STATE.path = resolvePathFromParam(STATE.data.catalog.tree, pathParam);
  renderPath();
  STATE.isPop = false;
});

// Enhanced Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (STATE.isMobileSearchVisible) {
      STATE.isMobileSearchVisible = false;
      els.searchSection.classList.remove('mobile-visible');
    } else if (STATE.searchResults.length > 0) {
      hideSearchResults();
      clearSearch();
    } else if (STATE.path.length > 0) {
      scrollManager.startNavigation();
      STATE.path = STATE.path.slice(0, -1);
      renderPath();
    }
    return;
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (!STATE.isSearchLoaded) {
      initSearchLazy();
    }
    if (window.innerWidth <= 768 && !STATE.isMobileSearchVisible) {
      STATE.isMobileSearchVisible = true;
      els.searchSection.classList.add('mobile-visible');
    }
    if (els.searchInput) {
      els.searchInput.focus();
    }
    return;
  }
  
  if (e.key === 'Backspace' && 
      !e.target.matches('input, textarea, [contenteditable]') && 
      STATE.path.length > 0) {
    e.preventDefault();
    scrollManager.startNavigation();
    STATE.path = STATE.path.slice(0, -1);
    renderPath();
    return;
  }
});

// Performance Optimizations
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    }
  });
}, {
  rootMargin: '200px 0px'
});

// Enhanced Error Handling
window.addEventListener('error', (e) => {
  console.error('💥 Global error:', e.error);
  
  if (e.target && e.target.tagName === 'IMG') {
    e.target.src = CONFIG.PLACEHOLDER_IMAGE;
    return;
  }
  
  if (e.error && e.error.message) {
    showError(`Something went wrong: ${e.error.message}`);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('💥 Unhandled promise rejection:', e.reason);
  e.preventDefault();
});

// Initialize Application
console.log('🚀 Initializing Luxury Catalog App...');
console.log('🎨 Theme: Dark Luxury');
console.log('📱 User Agent:', navigator.userAgent);
console.log('🌐 Location:', window.location.href);

// Start the application
loadData().catch(err => {
  console.error('💥 Failed to initialize app:', err);
  showError('Failed to load the catalog. Please refresh the page.');
});

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.DEBUG = {
    STATE,
    els,
    CONFIG,
    scrollManager,
    colorSystem,
    processImageUrl,
    listItemsAtPath,
    renderPath,
    clearSearch,
    initSearchLazy,
  };
  
  console.log('🔧 Development mode - DEBUG object available');
}
