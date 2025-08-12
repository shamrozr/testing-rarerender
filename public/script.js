// Enhanced Luxury Catalog App with Performance Optimizations
// ==========================================================

// State Management
// ================
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
// ============
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
// =============
const CONFIG = {
  ANALYTICS_PIXEL_URL: '',
  HOVER_PRELOAD_CHILDREN: 8,
  HOVER_DELAY_MS: 300,
  SEARCH_DEBOUNCE_MS: 300,
  PLACEHOLDER_IMAGE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxYTFhMWEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMyYTJhMmEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOGE4YThhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOGE4YThhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==',
};

const waRe = /^https:\/\/wa\.me\/\d+$/;

// Enhanced Smart Color System for Dark Luxury Theme
// ================================================
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
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
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

    // Create a warmer, more luxurious accent
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

      // Ensure colors work well on dark background
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

// Smart Scroll Manager (Optimized)
// ================================
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
// =================
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
// ==========================================
function applyLuxuryTheme(theme) {
  const smartPalette = colorSystem.generateLuxuryPalette(theme.colors);
  
  const root = document.documentElement;
  
  // Apply luxury color palette
  root.style.setProperty('--color-primary', smartPalette.primary);
  root.style.setProperty('--color-accent', smartPalette.accent);
  root.style.setProperty('--color-text', smartPalette.text);
  root.style.setProperty('--color-bg', smartPalette.bg);
  root.style.setProperty('--color-surface', smartPalette.surface);
  
  // Apply enhanced UI colors based on brand palette
  root.style.setProperty('--color-surface-elevated', colorSystem.adjustBrightness(smartPalette.surface, 15));
  root.style.setProperty('--color-glow', `${smartPalette.primary}33`); // 20% opacity
  
  document.querySelector('meta[name="theme-color"]').setAttribute('content', smartPalette.primary);
  
  console.log('🎨 Applied luxury dark theme for:', theme.name);
}

// Optimized Image Processing
// ==========================
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
// ==================
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
// =============================
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
