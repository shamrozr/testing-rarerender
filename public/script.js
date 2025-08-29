// Professional CSV-Driven Catalog App
// ===================================

class CSVCatalogApp {
  constructor() {
    console.log('🏗️ CSVCatalogApp constructor called');
    this.data = null;
    this.currentBrand = null;
    this.sections = new Map();
    this.isLoading = false;
    
    // Immediate brand detection and setup
    this.detectAndSetBrand();
  }

  detectAndSetBrand() {
    console.log('🔍 Detecting brand from URL...');
    
    // Get brand from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const brandFromURL = urlParams.get('brand');
    
    console.log('🌐 Current URL:', window.location.href);
    console.log('🏷️ Brand parameter:', brandFromURL);
    
    // Set brand name immediately if available
    if (brandFromURL) {
      this.currentBrand = brandFromURL;
      
      // Update brand name immediately from URL
      const brandNameElement = document.getElementById('brandName');
      const brandLogoElement = document.getElementById('brandLogo');
      
      if (brandNameElement) {
        // Convert brand slug to display name
        const displayName = this.slugToDisplayName(brandFromURL);
        brandNameElement.textContent = displayName;
        console.log('📝 Updated brand name to:', displayName);
      }
      
      if (brandLogoElement) {
        const initials = this.getInitials(this.slugToDisplayName(brandFromURL));
        brandLogoElement.textContent = initials;
        console.log('🔤 Updated logo initials to:', initials);
      }
    } else {
      console.log('⚠️ No brand parameter found in URL');
    }
  }

  slugToDisplayName(slug) {
    // Convert slug like "LiyanaBags" to "Liyana Bags"
    return slug
      .replace(/([A-Z])/g, ' $1')  // Add space before capitals
      .replace(/^bags$/i, 'Bags')   // Handle "bags" at end
      .replace(/bags$/i, ' Bags')   // Add space before "Bags"
      .trim()
      .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
  }

  async init() {
    console.log('🚀 Initializing CSV-driven catalog...');
    
    await this.loadData();
    
    if (!this.data) {
      console.error('❌ No data available, initialization failed');
      return;
    }

    console.log('📊 Starting setup with data:', {
      brands: Object.keys(this.data.brands || {}),
      catalogItems: Object.keys(this.data.catalog?.tree || {}),
      currentBrand: this.currentBrand
    });

    try {
      this.setupBrandInfo();
      this.setupStats();
      this.setupDynamicSections();
      this.setupTaxonomy();
      this.setupFooter();
      this.setupEventListeners();
      console.log('✅ CSV catalog initialization complete!');
    } catch (error) {
      console.error('❌ Error during initialization:', error);
    }
  }

  async loadData() {
    try {
      this.showLoading();
      console.log('📥 Attempting to load data from /data.json...');
      
      const response = await fetch('/data.json?v=' + Date.now());
      if (response.ok) {
        this.data = await response.json();
        console.log('✅ Data loaded successfully:', this.data);
        
        // Get brand from URL or use first available brand
        const urlParams = new URLSearchParams(window.location.search);
        const brandFromURL = urlParams.get('brand');
        
        const availableBrands = Object.keys(this.data.brands);
        console.log('🏷️ Available brands:', availableBrands);
        
        if (brandFromURL && this.data.brands[brandFromURL]) {
          this.currentBrand = brandFromURL;
        } else {
          this.currentBrand = availableBrands[0];
        }
        
        console.log('🎯 Using brand:', this.currentBrand);
        
      } else {
        throw new Error(`Failed to load data: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      console.log('📦 Falling back to mock data...');
      this.loadMockData(); // Fallback for demo
    } finally {
      this.hideLoading();
    }
  }

  loadMockData() {
    console.log('📦 Loading mock data as fallback...');
    
    // Mock data structure matching your CSV format
    this.data = {
      brands: {
        'LiyanaBags': {
          brandName: 'Liyana Designer Collection',
          tagline: 'Artisan Excellence Personified',
          heroTitle: 'Where Craftsmanship Meets Beauty',
          heroSubtitle: 'Premium handbags designed for women who appreciate the finer details and exquisite quality',
          footerText: 'Liyana has been creating bespoke luxury handbags with meticulous attention to detail.',
          primaryColor: '#C9A961',
          accentColor: '#E8D5A3',
          whatsapp: 'https://wa.me/923001234567'
        },
        'MeriyaBags': {
          brandName: 'Meriya Heritage Collection',
          tagline: 'Heritage Meets Modernity',
          heroTitle: 'Honor Your Heritage',
          heroSubtitle: 'Heritage-inspired luxury handbags with modern functionality for today\'s sophisticated woman',
          footerText: 'Meriya honors traditional craftsmanship heritage while creating modern luxury handbags.',
          primaryColor: '#9B59B6',
          accentColor: '#BB8FCE',
          whatsapp: 'https://wa.me/923001234567'
        }
      },
      catalog: {
        totalProducts: 547,
        tree: {
          'BAGS': { count: 234, thumbnail: '', section: 'Featured' },
          'SHOES': { count: 156, thumbnail: '', section: 'Trending' },
          'JEWELRY': { count: 89, thumbnail: '', section: 'Featured' },
          'WATCHES': { count: 68, thumbnail: '', section: 'Premium' }
        }
      }
    };
    
    // Set current brand based on URL or default
    if (!this.currentBrand) {
      this.currentBrand = Object.keys(this.data.brands)[0];
    }
    
    // Ensure the current brand exists in mock data
    if (!this.data.brands[this.currentBrand]) {
      this.currentBrand = Object.keys(this.data.brands)[0];
    }
    
    console.log('✅ Mock data loaded, current brand:', this.currentBrand);
  }

  setupBrandInfo() {
    const brand = this.data.brands[this.currentBrand];
    if (!brand) {
      console.error('❌ Brand not found:', this.currentBrand);
      return;
    }

    console.log('🏷️ Setting up brand info for:', brand);

    // Update brand elements - handle different field names from CSV
    this.updateElement('brandName', brand.brandName || brand.name);
    this.updateElement('brandTagline', brand.tagline || 'Premium Quality Collection');
    this.updateElement('heroTitle', brand.heroTitle || 'Discover Luxury Collections');
    this.updateElement('heroSubtitle', brand.heroSubtitle || 'Curated premium products from the world\'s finest brands.');
    this.updateElement('footerBrandName', brand.brandName || brand.name);
    
    // Update logo
    const logo = document.getElementById('brandLogo');
    if (logo) {
      logo.textContent = this.getInitials(brand.brandName || brand.name);
    }

    // Apply brand colors
    if (brand.colors) {
      this.applyBrandColors(brand.colors);
    } else {
      // If colors are directly on brand object (CSV structure)
      const colors = {
        primary: brand.primaryColor || '#6366f1',
        accent: brand.accentColor || '#8b5cf6',
        text: brand.textColor || '#202124',
        bg: brand.bgColor || '#ffffff'
      };
      this.applyBrandColors(colors);
    }

    // WhatsApp
    const whatsApp = document.getElementById('whatsappFab');
    if (whatsApp && brand.whatsapp) {
      whatsApp.href = brand.whatsapp;
      whatsApp.style.display = 'flex';
    }

    console.log('✅ Brand info setup complete');
  }

  getInitials(name) {
    return name.split(' ')
              .map(word => word.charAt(0))
              .join('')
              .toUpperCase()
              .substring(0, 2);
  }

  updateElement(id, content) {
    const element = document.getElementById(id);
    if (element && content) {
      element.textContent = content;
    }
  }

  applyBrandColors(colors) {
    if (!colors) return;
    const root = document.documentElement;
    if (colors.primary) root.style.setProperty('--color-primary', colors.primary);
    if (colors.accent) root.style.setProperty('--color-accent', colors.accent);
    
    // Update meta theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme && colors.primary) {
      metaTheme.setAttribute('content', colors.primary);
    }
  }

  setupStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) {
      console.error('❌ statsGrid element not found');
      return;
    }

    console.log('📊 Setting up stats...');

    const stats = [
      { number: Object.keys(this.data.brands || {}).length + '+', label: 'Luxury Brands' },
      { number: (this.data.catalog?.totalProducts || 0) + '+', label: 'Premium Products' },
      { number: Object.keys(this.data.catalog?.tree || {}).length + '+', label: 'Categories' },
      { number: '24/7', label: 'Customer Support' }
    ];

    console.log('📈 Stats to display:', stats);

    statsGrid.innerHTML = stats.map(stat => `
      <div class="stat-item">
        <div class="stat-number">${stat.number}</div>
        <div class="stat-label">${stat.label}</div>
      </div>
    `).join('');

    console.log('✅ Stats setup complete');
  }

  setupDynamicSections() {
    const container = document.getElementById('dynamicSections');
    if (!container) {
      console.error('❌ dynamicSections container not found');
      return;
    }

    console.log('🌳 Setting up dynamic sections...');
    console.log('📊 Catalog data:', this.data.catalog);

    if (!this.data.catalog || !this.data.catalog.tree) {
      console.error('❌ No catalog tree data found');
      return;
    }

    console.log('📁 Catalog tree:', this.data.catalog.tree);

    // Group catalog items by section
    this.groupItemsBySection();
    
    // Create sections in order - only show sections that have items
    const sectionOrder = ['Featured', 'Trending', 'Premium', 'New Arrivals', 'Best Sellers'];
    
    // Clear existing content first
    container.innerHTML = '';
    let sectionsCreated = 0;
    
    sectionOrder.forEach(sectionName => {
      if (this.sections.has(sectionName) && this.sections.get(sectionName).length > 0) {
        const sectionHTML = this.createSectionHTML(sectionName, this.sections.get(sectionName));
        container.insertAdjacentHTML('beforeend', sectionHTML);
        sectionsCreated++;
        console.log(`✅ Created section: ${sectionName} with ${this.sections.get(sectionName).length} items`);
      }
    });

    // If no sections were created, create a default Featured section with all items
    if (sectionsCreated === 0) {
      console.log('⚠️ No sectioned items found, creating default Featured section');
      const allItems = [];
      
      Object.entries(this.data.catalog.tree).forEach(([key, item]) => {
        console.log(`📦 Processing item: ${key}`, item);
        allItems.push({
          key,
          title: key.replace(/_/g, ' '),
          description: `Explore our premium ${key.toLowerCase().replace('_', ' ')} collection`,
          count: item.count || 0,
          thumbnail: item.thumbnail || '',
          topOrder: item.topOrder || 999
        });
      });

      console.log('📋 All items collected:', allItems);

      if (allItems.length > 0) {
        const sectionHTML = this.createSectionHTML('Featured Collection', allItems);
        container.insertAdjacentHTML('beforeend', sectionHTML);
        console.log(`✅ Created default section with ${allItems.length} items`);
        sectionsCreated++;
      } else {
        console.error('❌ No items found in catalog tree');
        // Keep the fallback content
        return;
      }
    }

    console.log(`🎉 Setup complete: ${sectionsCreated} sections created`);
  }

  groupItemsBySection() {
    this.sections.clear();
    
    // Process catalog items and group by section
    Object.entries(this.data.catalog.tree).forEach(([key, item]) => {
      // Check if item has section property, otherwise default to 'Featured'
      const section = item.section || 'Featured';
      
      if (!this.sections.has(section)) {
        this.sections.set(section, []);
      }
      
      this.sections.get(section).push({
        key,
        title: key.replace(/_/g, ' '),
        description: `Explore our premium ${key.toLowerCase()} collection with ${item.count || 0} items`,
        count: item.count || 0,
        thumbnail: item.thumbnail || this.getEmojiForCategory(key),
        topOrder: item.topOrder || 999
      });
    });

    // Sort items within each section by topOrder
    this.sections.forEach(items => {
      items.sort((a, b) => a.topOrder - b.topOrder);
    });

    // Debug: Log the sections
    console.log('📊 Sections created:', Array.from(this.sections.keys()));
    this.sections.forEach((items, section) => {
      console.log(`📁 ${section}:`, items.length, 'items');
    });
  }

  createSectionHTML(sectionName, items) {
    const gridClass = this.getGridClass(items.length);
    
    return `
      <section class="content-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">${sectionName}</h2>
            <p class="section-description">Discover our curated ${sectionName.toLowerCase()} collection</p>
          </div>
          <div class="cards-grid ${gridClass}">
            ${items.map(item => this.createCardHTML(item)).join('')}
          </div>
        </div>
      </section>
    `;
  }

  getGridClass(itemCount) {
    if (itemCount === 1) return 'grid-1';
    if (itemCount === 2) return 'grid-2';
    if (itemCount === 3) return 'grid-3';
    if (itemCount === 4) return 'grid-4';
    return 'grid-many';
  }

  createCardHTML(item) {
    const imageSrc = item.thumbnail && item.thumbnail !== '' ? item.thumbnail : '';
    const imageContent = imageSrc ? 
      `<img src="${imageSrc}" alt="${item.title}" loading="lazy" onerror="this.parentElement.innerHTML='${this.getEmojiForCategory(item.key)}'">` : 
      this.getEmojiForCategory(item.key);

    return `
      <div class="content-card" data-category="${item.key}" role="button" tabindex="0">
        <div class="card-image">
          ${imageContent}
          <div class="card-overlay"></div>
        </div>
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
      'BAGS': '👜',
      'SHOES': '👠',
      'JEWELRY': '💎',
      'WATCHES': '⌚',
      'ACCESSORIES': '👑',
      'CLOTHING': '👗',
      'SUNGLASSES': '🕶️',
      'PERFUMES': '🌸',
      'SCARVES': '🧣',
      'BELTS': '👔'
    };
    return emojiMap[category.toUpperCase()] || '🎁';
  }

  setupTaxonomy() {
    const taxonomyGrid = document.getElementById('taxonomyGrid');
    if (!taxonomyGrid) return;

    const taxonomyItems = Object.entries(this.data.catalog.tree)
      .map(([key, item]) => ({
        name: key.replace(/_/g, ' '),
        count: item.count,
        key: key
      }))
      .sort((a, b) => b.count - a.count);

    taxonomyGrid.innerHTML = taxonomyItems.map(item => `
      <div class="taxonomy-item" data-category="${item.key}" role="button" tabindex="0">
        <div class="taxonomy-name">${item.name}</div>
        <div class="taxonomy-count">${item.count} items</div>
      </div>
    `).join('');
  }

  setupFooter() {
    const footerContent = document.getElementById('footerContent');
    if (!footerContent) return;

    const brand = this.data.brands[this.currentBrand];
    const footerText = brand?.footerText || 'Your premier destination for luxury goods. We curate only the finest products from the world\'s most prestigious brands.';

    footerContent.innerHTML = `
      <div class="footer-section">
        <h3>${brand?.brandName || brand?.name || 'Luxury Collection'}</h3>
        <p>${footerText}</p>
      </div>
      <div class="footer-section">
        <h3>Quick Links</h3>
        <a href="#categories">Categories</a>
        <a href="#products">Products</a>
        <a href="#contact">Contact Us</a>
      </div>
      <div class="footer-section">
        <h3>Customer Service</h3>
        <p>24/7 Support Available</p>
        <p>Premium Customer Care</p>
        <p>Worldwide Shipping</p>
      </div>
      <div class="footer-section">
        <h3>Connect With Us</h3>
        <p>Follow us for the latest luxury collections and exclusive offers.</p>
      </div>
    `;
  }

  setupEventListeners() {
    // Logo click - scroll to top
    const logo = document.getElementById('brandLogo');
    if (logo) {
      logo.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Card clicks
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.content-card, .taxonomy-item');
      if (card) {
        const category = card.dataset.category;
        this.navigateToCategory(category);
      }
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });
    }
  }

  navigateToCategory(category) {
    console.log('🔗 Navigate to category:', category);
    
    // Check if your original navigation system exists
    if (window.STATE && typeof window.renderPath === 'function') {
      // Use your existing navigation system
      console.log('📱 Using existing navigation system');
      window.STATE.path = [category];
      window.renderPath();
      
      // Update URL
      const params = new URLSearchParams(window.location.search);
      params.set('path', category);
      if (this.currentBrand) {
        params.set('brand', this.currentBrand);
      }
      const newURL = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ category, brand: this.currentBrand }, '', newURL);
      
    } else {
      // Navigate using page reload method
      console.log('🔄 Using page reload navigation');
      const params = new URLSearchParams(window.location.search);
      params.set('path', category);
      if (this.currentBrand) {
        params.set('brand', this.currentBrand);
      }
      
      const newURL = `${window.location.pathname}?${params.toString()}`;
      window.location.href = newURL;
    }
  }

  handleSearch(query) {
    if (!query.trim()) return;
    console.log('🔍 Searching for:', query);
    this.showNotification(`Searching for "${query}"...`);
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: var(--color-primary);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      font-weight: 500;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showLoading() {
    this.isLoading = true;
    document.body.classList.add('loading');
  }

  hideLoading() {
    this.isLoading = false;
    document.body.classList.remove('loading');
  }
}

// Initialize the application
console.log('🔧 Script loaded, starting initialization...');

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded, creating app instance...');
  const app = new CSVCatalogApp();
  app.init().catch(error => {
    console.error('💥 App initialization failed:', error);
    // Show fallback content
    document.body.innerHTML += `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: red; color: white; padding: 20px; border-radius: 10px; z-index: 9999;">
        <h3>Initialization Error</h3>
        <p>Error: ${error.message}</p>
        <p>Check console for details</p>
      </div>
    `;
  });
  
  // Make app globally available for debugging
  window.catalogApp = app;
  console.log('🔧 App instance created and available as window.catalogApp');
});

// Also try immediate initialization as backup
if (document.readyState === 'loading') {
  console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
} else {
  console.log('🚀 Document already loaded, initializing immediately...');
  setTimeout(() => {
    if (!window.catalogApp) {
      console.log('🔄 Backup initialization starting...');
      const app = new CSVCatalogApp();
      app.init().catch(console.error);
      window.catalogApp = app;
    }
  }, 100);
}

// Handle browser navigation
window.addEventListener('popstate', (e) => {
  console.log('🔙 Browser navigation detected:', e.state);
  if (window.catalogApp && e.state?.category) {
    console.log('🔙 Browser navigation to:', e.state.category);
  }
});

// Global error handler
window.addEventListener('error', (e) => {
  console.error('💥 Global error:', e.error);
  console.error('💥 Error details:', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno
  });
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('💥 Unhandled promise rejection:', e.reason);
  e.preventDefault();
});

detectAndSetBrand() {
  const params = new URLSearchParams(location.search);
  this.currentBrand = params.get('brand') || this.pickRandomBrand();
  this.setupBrand(this.currentBrand);

  const firstCategory = params.get('path');
  if (firstCategory) this.navigateToCategory(firstCategory, true); // render view without pushing history
}
