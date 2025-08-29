// Emergency Working Script - Simplified and Functional
class CSVCatalogApp {
  constructor() {
    console.log('🏗️ CSVCatalogApp constructor called');
    this.data = null;
    this.currentBrand = null;
    this.currentPath = [];
    this.sections = new Map();
    
    // Get brand from URL immediately
    const urlParams = new URLSearchParams(window.location.search);
    this.currentBrand = urlParams.get('brand') || null;
    
    const pathFromURL = urlParams.get('path');
    this.currentPath = pathFromURL ? pathFromURL.split('/').filter(Boolean) : [];
    
    console.log('Initial state:', { brand: this.currentBrand, path: this.currentPath });
  }

  async init() {
    console.log('🚀 Initializing CSV-driven catalog...');
    
    try {
      await this.loadData();
      
      if (!this.data) {
        console.error('❌ No data available');
        return;
      }

      this.setupBrandInfo();
      
      if (this.currentPath.length > 0) {
        this.showCategoryView();
      } else {
        this.setupDynamicSections();
      }
      
      this.setupTaxonomy();
      this.setupFooter();
      this.setupEventListeners();
      this.setupFABFunctionality();
      
      console.log('✅ Initialization complete!');
    } catch (error) {
      console.error('❌ Initialization error:', error);
    }
  }

  async loadData() {
    try {
      console.log('📥 Loading data...');
      
      const response = await fetch('/data.json?v=' + Date.now());
      if (response.ok) {
        this.data = await response.json();
        console.log('✅ Data loaded:', this.data);
        
        // Set brand if not already set
        if (!this.currentBrand || !this.data.brands[this.currentBrand]) {
          this.currentBrand = Object.keys(this.data.brands)[0];
        }
        
      } else {
        throw new Error('Failed to load data');
      }
    } catch (error) {
      console.error('❌ Data loading failed, using mock:', error);
      this.loadMockData();
    }
  }

  loadMockData() {
    console.log('📦 Loading mock data...');
    this.data = {
      brands: {
        'LuxuryEmporium': {
          name: 'Luxury Emporium',
          tagline: 'Premium Quality Collection',
          heroTitle: 'Luxury Emporium Collections',
          heroSubtitle: 'Curated premium products from the world\'s finest brands',
          colors: { primary: '#6366f1', accent: '#8b5cf6', text: '#202124', bg: '#ffffff' },
          whatsapp: 'https://wa.me/923001234567'
        },
        'MilayaBags': {
          name: 'Milaya Luxury Bags',
          tagline: 'Luxury Redefined',
          heroTitle: 'Milaya Collections',
          heroSubtitle: 'Discover luxury handbags and accessories',
          colors: { primary: '#9B59B6', accent: '#BB8FCE', text: '#202124', bg: '#ffffff' },
          whatsapp: 'https://wa.me/923001234567'
        }
      },
      catalog: {
        totalProducts: 100,
        tree: {
          'BAGS': { 
            count: 50, 
            thumbnail: '', 
            section: 'Featured',
            children: {
              'Chanel': {
                count: 25,
                children: {
                  'Chanel Bag 1': { isProduct: true, driveLink: 'https://drive.google.com/file/d/1' }
                }
              }
            }
          },
          'SHOES': { count: 30, thumbnail: '', section: 'Featured', children: {} },
          'JEWELRY': { count: 20, thumbnail: '', section: 'Featured', children: {} }
        }
      }
    };
    
    if (!this.currentBrand) {
      this.currentBrand = Object.keys(this.data.brands)[0];
    }
  }

  setupBrandInfo() {
    console.log('🏷️ Setting up brand info for:', this.currentBrand);
    
    const brand = this.data.brands[this.currentBrand];
    if (!brand) {
      console.error('❌ Brand not found:', this.currentBrand);
      return;
    }

    // Update DOM elements
    this.updateElement('brandName', brand.name);
    this.updateElement('brandTagline', brand.tagline || 'Premium Quality Collection');
    this.updateElement('heroTitle', brand.heroTitle || 'Discover Luxury Collections');
    this.updateElement('heroSubtitle', brand.heroSubtitle || 'Curated premium products');
    this.updateElement('footerBrandName', brand.name);
    
    const logo = document.getElementById('brandLogo');
    if (logo) {
      logo.textContent = this.getInitials(brand.name);
    }

    // Apply colors
    if (brand.colors) {
      this.applyBrandColors(brand.colors);
    }

    // WhatsApp
    const whatsApp = document.getElementById('whatsappFab');
    if (whatsApp && brand.whatsapp) {
      whatsApp.href = brand.whatsapp;
      whatsApp.style.display = 'flex';
    }

    console.log('✅ Brand setup complete');
  }

  updateElement(id, content) {
    const element = document.getElementById(id);
    if (element && content) {
      element.textContent = content;
    }
  }

  getInitials(name) {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  applyBrandColors(colors) {
    const root = document.documentElement;
    if (colors.primary) root.style.setProperty('--color-primary', colors.primary);
    if (colors.accent) root.style.setProperty('--color-accent', colors.accent);
  }

  setupDynamicSections() {
    const container = document.getElementById('dynamicSections');
    if (!container || !this.data.catalog) return;

    const items = Object.entries(this.data.catalog.tree).map(([key, item]) => ({
      key,
      title: key.replace(/_/g, ' '),
      description: `Explore our premium ${key.toLowerCase()} collection`,
      count: item.count || 0,
      thumbnail: this.getEmojiForCategory(key)
    }));

    container.innerHTML = `
      <section class="content-section">
        <div class="container">
          <div class="cards-grid grid-${Math.min(items.length, 4)}">
            ${items.map(item => this.createCardHTML(item)).join('')}
          </div>
        </div>
      </section>
    `;
  }

  createCardHTML(item) {
    return `
      <div class="content-card" data-category="${item.key}" role="button">
        <div class="card-image">${item.thumbnail}</div>
        <div class="card-content">
          <h3 class="card-title">${item.title}</h3>
          <p class="card-description">${item.description}</p>
          <div class="card-footer">
            <span class="card-badge">${item.count} Items</span>
            <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  getEmojiForCategory(category) {
    const emojiMap = {
      'BAGS': '👜', 'SHOES': '👠', 'JEWELRY': '💎', 'WATCHES': '⌚'
    };
    return emojiMap[category?.toUpperCase()] || '🎁';
  }

  showCategoryView() {
    console.log('📁 Showing category view');
    // Simplified category view
    const container = document.getElementById('dynamicSections');
    if (container) {
      container.innerHTML = `
        <section class="content-section">
          <div class="container">
            <h2>Category View</h2>
            <p>Path: ${this.currentPath.join(' > ')}</p>
          </div>
        </section>
      `;
    }
  }

  setupTaxonomy() {
    const taxonomyGrid = document.getElementById('taxonomyGrid');
    if (!taxonomyGrid || !this.data.catalog) return;

    const items = Object.entries(this.data.catalog.tree).map(([key, item]) => ({
      name: key.replace(/_/g, ' '),
      count: item.count || 0,
      key: key
    }));

    taxonomyGrid.innerHTML = items.map(item => `
      <div class="taxonomy-item" data-category="${item.key}">
        <div class="taxonomy-name">${item.name}</div>
        <div class="taxonomy-count">${item.count} items</div>
      </div>
    `).join('');
  }

  setupFooter() {
    const footerContent = document.getElementById('footerContent');
    if (!footerContent) return;

    const brand = this.data.brands[this.currentBrand];
    footerContent.innerHTML = `
      <div class="footer-section">
        <h3>${brand?.name || 'Luxury Collection'}</h3>
        <p>Your premier destination for luxury goods.</p>
      </div>
      <div class="footer-section">
        <h3>Customer Service</h3>
        <p>24/7 Support Available</p>
      </div>
      <div class="footer-section">
        <h3>Connect With Us</h3>
        <p>Follow us for the latest collections.</p>
      </div>
    `;
  }

  setupEventListeners() {
    // Logo click
    const logo = document.getElementById('brandLogo');
    if (logo) {
      logo.addEventListener('click', () => {
        window.location.href = window.location.pathname + (this.currentBrand ? `?brand=${this.currentBrand}` : '');
      });
    }

    // Card clicks
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.content-card, .taxonomy-item');
      if (card) {
        const category = card.dataset.category;
        if (category) {
          const newPath = this.currentPath.length === 0 ? [category] : [...this.currentPath, category];
          const params = new URLSearchParams();
          if (this.currentBrand) params.set('brand', this.currentBrand);
          params.set('path', newPath.join('/'));
          window.location.href = `${window.location.pathname}?${params.toString()}`;
        }
      }
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Search:', e.target.value);
        }
      });
    }
  }

  setupFABFunctionality() {
    console.log('🔘 Setting up FAB functionality...');
    
    // 3-dot menu toggle
    const threeDotToggle = document.getElementById('threeDotToggle');
    const threeDotMenu = document.getElementById('threeDotMenu');
    
    if (threeDotToggle && threeDotMenu) {
      threeDotToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        threeDotMenu.classList.toggle('expanded');
        console.log('Menu toggled');
      });

      document.addEventListener('click', (e) => {
        if (!threeDotMenu.contains(e.target)) {
          threeDotMenu.classList.remove('expanded');
        }
      });
    }

    // Menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const folderName = item.dataset.folder;
        console.log('Menu item clicked:', folderName);
        
        // Simple alert for testing
        alert(`${folderName} clicked! (Images will load here)`);
        
        if (threeDotMenu) {
          threeDotMenu.classList.remove('expanded');
        }
      });
    });

    console.log('✅ FAB setup complete');
  }
}

// Simple initialization
console.log('🔧 Script loaded, initializing...');

function startApp() {
  const app = new CSVCatalogApp();
  app.init();
  window.catalogApp = app;
  console.log('🚀 App started');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
