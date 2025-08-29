// Enhanced script.js with proper navigation handling
// Professional CSV-Driven Catalog App with Enhanced Navigation
// =============================================================

class CSVCatalogApp {
  constructor() {
    console.log('🏗️ CSVCatalogApp constructor called');
    this.data = null;
    this.currentBrand = null;
    this.currentPath = [];
    this.sections = new Map();
    this.isLoading = false;
    
    // Initialize navigation state from URL
    this.initializeFromURL();
  }

  initializeFromURL() {
    console.log('🔍 Initializing from URL...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const brandFromURL = urlParams.get('brand');
    const pathFromURL = urlParams.get('path');
    
    console.log('🌐 Current URL:', window.location.href);
    console.log('🏷️ Brand parameter:', brandFromURL);
    console.log('📍 Path parameter:', pathFromURL);
    
    // Set brand
    if (brandFromURL) {
      this.currentBrand = brandFromURL;
      this.updateBrandDisplay(brandFromURL);
    }
    
    // Set path
    if (pathFromURL) {
      this.currentPath = pathFromURL.split('/').filter(Boolean);
      console.log('📁 Current path:', this.currentPath);
    }
  }

  updateBrandDisplay(brandFromURL) {
    // Update brand name immediately from URL
    const brandNameElement = document.getElementById('brandName');
    const brandLogoElement = document.getElementById('brandLogo');
    
    if (brandNameElement) {
      const displayName = this.slugToDisplayName(brandFromURL);
      brandNameElement.textContent = displayName;
      console.log('📝 Updated brand name to:', displayName);
    }
    
    if (brandLogoElement) {
      const initials = this.getInitials(this.slugToDisplayName(brandFromURL));
      brandLogoElement.textContent = initials;
      console.log('🔤 Updated logo initials to:', initials);
    }
  }

  slugToDisplayName(slug) {
    return slug
      .replace(/([A-Z])/g, ' $1')
      .replace(/^bags$/i, 'Bags')
      .replace(/bags$/i, ' Bags')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
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
      currentBrand: this.currentBrand,
      currentPath: this.currentPath
    });

    try {
      this.setupBrandInfo();
      this.setupStats();
      
      // Check if we need to show category view or homepage
      if (this.currentPath.length > 0) {
        console.log('📁 Showing category view for path:', this.currentPath);
        this.showCategoryView();
      } else {
        console.log('🏠 Showing homepage view');
        this.setupDynamicSections();
      }
      
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
      this.loadMockData();
    } finally {
      this.hideLoading();
    }
  }

  loadMockData() {
    console.log('📦 Loading mock data as fallback...');
    
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
          'BAGS': { 
            count: 234, 
            thumbnail: '', 
            section: 'Featured',
            children: {
              'Chanel': {
                count: 45,
                thumbnail: '',
                children: {
                  'Chanel Bag 1': { isProduct: true, driveLink: 'https://drive.google.com/file/d/1', thumbnail: '' },
                  'Chanel Bag 2': { isProduct: true, driveLink: 'https://drive.google.com/file/d/2', thumbnail: '' }
                }
              },
              'Gucci': {
                count: 38,
                thumbnail: '',
                children: {
                  'Gucci Bag 1': { isProduct: true, driveLink: 'https://drive.google.com/file/d/3', thumbnail: '' }
                }
              }
            }
          },
          'SHOES': { 
            count: 156, 
            thumbnail: '', 
            section: 'Trending',
            children: {
              'Nike': {
                count: 25,
                thumbnail: '',
                children: {
                  'Nike Shoe 1': { isProduct: true, driveLink: 'https://drive.google.com/file/d/4', thumbnail: '' }
                }
              }
            }
          },
          'JEWELRY': { count: 89, thumbnail: '', section: 'Featured', children: {} },
          'WATCHES': { count: 68, thumbnail: '', section: 'Premium', children: {} }
        }
      }
    };
    
    if (!this.currentBrand) {
      this.currentBrand = Object.keys(this.data.brands)[0];
    }
    
    if (!this.data.brands[this.currentBrand]) {
      this.currentBrand = Object.keys(this.data.brands)[0];
    }
    
    console.log('✅ Mock data loaded, current brand:', this.currentBrand);
  }

  // New method to show category view
  showCategoryView() {
    console.log('📁 Showing category view for path:', this.currentPath);
    
    // Navigate to the current path in the data tree
    let currentNode = this.data.catalog.tree;
    let breadcrumbs = [];
    
    for (const segment of this.currentPath) {
      if (currentNode[segment]) {
        breadcrumbs.push({
          name: segment,
          path: breadcrumbs.length === 0 ? segment : breadcrumbs[breadcrumbs.length - 1].path + '/' + segment
        });
        currentNode = currentNode[segment].children || {};
      } else {
        console.error('❌ Path not found:', segment, 'in', Object.keys(currentNode));
        this.showNotification(`Category "${segment}" not found`);
        this.navigateToHome();
        return;
      }
    }

    console.log('🗂️ Current node contents:', Object.keys(currentNode));
    console.log('🍞 Breadcrumbs:', breadcrumbs);

    // Update hero section for category view
    this.updateHeroForCategory(breadcrumbs);

    // Hide taxonomy section
    const taxonomySection = document.querySelector('.taxonomy-section');
    if (taxonomySection) {
      taxonomySection.style.display = 'none';
    }

    // Show category contents
    this.renderCategoryContents(currentNode, breadcrumbs);
  }

  updateHeroForCategory(breadcrumbs) {
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    
    if (heroTitle && breadcrumbs.length > 0) {
      const currentCategory = breadcrumbs[breadcrumbs.length - 1].name;
      heroTitle.textContent = `${currentCategory} Collection`;
    }
    
    if (heroSubtitle && breadcrumbs.length > 0) {
      const currentCategory = breadcrumbs[breadcrumbs.length - 1].name;
      heroSubtitle.textContent = `Explore our premium ${currentCategory.toLowerCase()} collection with carefully curated items.`;
    }

    // Add breadcrumb navigation
    this.addBreadcrumbNavigation(breadcrumbs);
  }

  addBreadcrumbNavigation(breadcrumbs) {
    const hero = document.querySelector('.hero .hero-content');
    if (!hero) return;

    // Remove existing breadcrumbs
    const existingBreadcrumbs = hero.querySelector('.breadcrumb-nav');
    if (existingBreadcrumbs) {
      existingBreadcrumbs.remove();
    }

    // Create breadcrumb navigation
    const breadcrumbNav = document.createElement('nav');
    breadcrumbNav.className = 'breadcrumb-nav';
    breadcrumbNav.style.cssText = `
      margin-bottom: var(--space-6);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
    `;

    // Home link
    const homeLink = document.createElement('a');
    homeLink.href = '#';
    homeLink.textContent = 'Home';
    homeLink.style.cssText = `
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    `;
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateToHome();
    });

    breadcrumbNav.appendChild(homeLink);

    // Add breadcrumb items
    breadcrumbs.forEach((crumb, index) => {
      // Add separator
      const separator = document.createElement('span');
      separator.textContent = ' / ';
      separator.style.color = 'var(--color-text-muted)';
      breadcrumbNav.appendChild(separator);

      if (index === breadcrumbs.length - 1) {
        // Current page - no link
        const current = document.createElement('span');
        current.textContent = crumb.name;
        current.style.fontWeight = '600';
        breadcrumbNav.appendChild(current);
      } else {
        // Clickable breadcrumb
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = crumb.name;
        link.style.cssText = `
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 500;
        `;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigateToCategory(crumb.path);
        });
        breadcrumbNav.appendChild(link);
      }
    });

    hero.insertBefore(breadcrumbNav, hero.firstChild);
  }

  renderCategoryContents(currentNode, breadcrumbs) {
    const container = document.getElementById('dynamicSections');
    if (!container) return;

    const items = Object.entries(currentNode).map(([key, item]) => {
      if (item.isProduct) {
        return {
          key,
          title: key,
          description: 'Premium product from our luxury collection',
          count: 1,
          thumbnail: item.thumbnail || this.getEmojiForCategory('PRODUCT'),
          isProduct: true,
          driveLink: item.driveLink
        };
      } else {
        return {
          key,
          title: key.replace(/_/g, ' '),
          description: `Explore ${item.count || 0} items in this collection`,
          count: item.count || 0,
          thumbnail: item.thumbnail || this.getEmojiForCategory(key),
          isProduct: false
        };
      }
    });

    console.log('🎯 Rendering category contents:', items);

    if (items.length === 0) {
      container.innerHTML = `
        <section class="content-section">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">No Items Found</h2>
              <p class="section-description">This category is currently empty.</p>
            </div>
          </div>
        </section>
      `;
      return;
    }

    const gridClass = this.getGridClass(items.length);
    
    container.innerHTML = `
      <section class="content-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">${breadcrumbs[breadcrumbs.length - 1]?.name || 'Category'} Collection</h2>
            <p class="section-description">Discover ${items.length} item${items.length === 1 ? '' : 's'} in this collection</p>
          </div>
          <div class="cards-grid ${gridClass}">
            ${items.map(item => this.createCardHTML(item)).join('')}
          </div>
        </div>
      </section>
    `;
  }

  navigateToHome() {
    console.log('🏠 Navigating to home');
    
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.delete('path');
    if (this.currentBrand) {
      params.set('brand', this.currentBrand);
    }
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ brand: this.currentBrand }, '', newURL);
    
    // Reset state
    this.currentPath = [];
    
    // Re-render homepage
    this.setupDynamicSections();
    
    // Show taxonomy section
    const taxonomySection = document.querySelector('.taxonomy-section');
    if (taxonomySection) {
      taxonomySection.style.display = 'block';
    }

    // Reset hero
    this.setupBrandInfo();
    
    // Remove breadcrumbs
    const existingBreadcrumbs = document.querySelector('.breadcrumb-nav');
    if (existingBreadcrumbs) {
      existingBreadcrumbs.remove();
    }
  }

  setupBrandInfo() {
    const brand = this.data.brands[this.currentBrand];
    if (!brand) {
      console.error('❌ Brand not found:', this.currentBrand);
      return;
    }

    console.log('🏷️ Setting up brand info for:', brand);

    this.updateElement('brandName', brand.brandName || brand.name);
    this.updateElement('brandTagline', brand.tagline || 'Premium Quality Collection');
    this.updateElement('heroTitle', brand.heroTitle || 'Discover Luxury Collections');
    this.updateElement('heroSubtitle', brand.heroSubtitle || 'Curated premium products from the world\'s finest brands.');
    this.updateElement('footerBrandName', brand.brandName || brand.name);
    
    const logo = document.getElementById('brandLogo');
    if (logo) {
      logo.textContent = this.getInitials(brand.brandName || brand.name);
    }

    if (brand.colors) {
      this.applyBrandColors(brand.colors);
    } else {
      const colors = {
        primary: brand.primaryColor || '#6366f1',
        accent: brand.accentColor || '#8b5cf6',
        text: brand.textColor || '#202124',
        bg: brand.bgColor || '#ffffff'
      };
      this.applyBrandColors(colors);
    }

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
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme && colors.primary) {
      metaTheme.setAttribute('content', colors.primary);
    }
  }

  setupStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    const stats = [
      { number: Object.keys(this.data.brands || {}).length + '+', label: 'Luxury Brands' },
      { number: (this.data.catalog?.totalProducts || 0) + '+', label: 'Premium Products' },
      { number: Object.keys(this.data.catalog?.tree || {}).length + '+', label: 'Categories' },
      { number: '24/7', label: 'Customer Support' }
    ];

    statsGrid.innerHTML = stats.map(stat => `
      <div class="stat-item">
        <div class="stat-number">${stat.number}</div>
        <div class="stat-label">${stat.label}</div>
      </div>
    `).join('');
  }

  setupDynamicSections() {
    const container = document.getElementById('dynamicSections');
    if (!container) return;

    if (!this.data.catalog || !this.data.catalog.tree) {
      console.error('❌ No catalog tree data found');
      return;
    }

    this.groupItemsBySection();
    
    const sectionOrder = ['Featured', 'Trending', 'Premium', 'New Arrivals', 'Best Sellers'];
    
    container.innerHTML = '';
    let sectionsCreated = 0;
    
    sectionOrder.forEach(sectionName => {
      if (this.sections.has(sectionName) && this.sections.get(sectionName).length > 0) {
        const sectionHTML = this.createSectionHTML(sectionName, this.sections.get(sectionName));
        container.insertAdjacentHTML('beforeend', sectionHTML);
        sectionsCreated++;
      }
    });

    if (sectionsCreated === 0) {
      const allItems = [];
      
      Object.entries(this.data.catalog.tree).forEach(([key, item]) => {
        allItems.push({
          key,
          title: key.replace(/_/g, ' '),
          description: `Explore our premium ${key.toLowerCase().replace('_', ' ')} collection`,
          count: item.count || 0,
          thumbnail: item.thumbnail || '',
          topOrder: item.topOrder || 999
        });
      });

      if (allItems.length > 0) {
        const sectionHTML = this.createSectionHTML('Featured Collection', allItems);
        container.insertAdjacentHTML('beforeend', sectionHTML);
      }
    }
  }

  groupItemsBySection() {
    this.sections.clear();
    
    Object.entries(this.data.catalog.tree).forEach(([key, item]) => {
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

    this.sections.forEach(items => {
      items.sort((a, b) => a.topOrder - b.topOrder);
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

    const badgeText = item.isProduct ? 'View Product' : `${item.count} Items`;

    return `
      <div class="content-card" data-category="${item.key}" data-is-product="${item.isProduct || false}" data-drive-link="${item.driveLink || ''}" role="button" tabindex="0">
        <div class="card-image">
          ${imageContent}
          <div class="card-overlay"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${item.title}</h3>
          <p class="card-description">${item.description}</p>
          <div class="card-footer">
            <span class="card-badge">${badgeText}</span>
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
      'BELTS': '👔',
      'PRODUCT': '✨'
    };
    return emojiMap[category?.toUpperCase()] || '🎁';
  }

  setupTaxonomy() {
    const taxonomyGrid = document.getElementById('taxonomyGrid');
    if (!taxonomyGrid || !this.data.catalog?.tree) return;

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
    // Logo click - go to home
    const logo = document.getElementById('brandLogo');
    if (logo) {
      logo.addEventListener('click', () => {
        this.navigateToHome();
      });
    }

    // Card clicks
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.content-card, .taxonomy-item');
      if (card) {
        const category = card.dataset.category;
        const isProduct = card.dataset.isProduct === 'true';
        const driveLink = card.dataset.driveLink;
        
        if (isProduct && driveLink) {
          // Open product link
          this.openProduct(driveLink);
        } else {
          // Navigate to category
          this.navigateToCategory(category);
        }
      }
    });

    // Search functionality
    // Search functionality - only on Enter press
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleSearch(e.target.value);
    }
  });
}

    // Browser back/forward navigation
    window.addEventListener('popstate', (e) => {
      console.log('🔙 Browser navigation detected:', e.state);
      this.handleBrowserNavigation();
    });
  }

  openProduct(driveLink) {
    console.log('🔗 Opening product:', driveLink);
    this.showNotification('Opening product...');
    window.open(driveLink, '_blank', 'noopener,noreferrer');
  }

  navigateToCategory(category) {
    console.log('🔗 Navigate to category:', category);
    
    // Build new path
    let newPath;
    if (this.currentPath.length === 0) {
      // From homepage
      newPath = [category];
    } else {
      // From current path
      newPath = [...this.currentPath, category];
    }
    
    // Update state
    this.currentPath = newPath;
    
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('path', newPath.join('/'));
    if (this.currentBrand) {
      params.set('brand', this.currentBrand);
    }
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ 
      category, 
      brand: this.currentBrand, 
      path: newPath 
    }, '', newURL);
    
    // Show category view
    this.showCategoryView();
  }

  handleBrowserNavigation() {
    console.log('🔙 Handling browser navigation');
    
    // Re-initialize from URL
    this.initializeFromURL();
    
    // Re-render based on new state
    if (this.currentPath.length > 0) {
      this.showCategoryView();
    } else {
      this.navigateToHome();
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
    document.body.innerHTML += `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: red; color: white; padding: 20px; border-radius: 10px; z-index: 9999;">
        <h3>Initialization Error</h3>
        <p>Error: ${error.message}</p>
        <p>Check console for details</p>
      </div>
    `;
  });
  
  window.catalogApp = app;
  console.log('🔧 App instance created and available as window.catalogApp');
});

// Backup initialization
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

// Global error handlers
window.addEventListener('error', (e) => {
  console.error('💥 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('💥 Unhandled promise rejection:', e.reason);
  e.preventDefault();
});
