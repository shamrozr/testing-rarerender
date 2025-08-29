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
  
  // Force brand refresh on page load
  this.forceRefreshOnLoad = true;
  
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
      
      // Get brand from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const brandFromURL = urlParams.get('brand');
      
      const availableBrands = Object.keys(this.data.brands || {});
      console.log('🏷️ Available brands:', availableBrands);
      console.log('🌐 Brand from URL:', brandFromURL);
      
      // Set current brand based on URL or use first available
      if (brandFromURL && this.data.brands[brandFromURL]) {
        this.currentBrand = brandFromURL;
        console.log('✅ Using brand from URL:', brandFromURL);
      } else if (availableBrands.length > 0) {
        this.currentBrand = availableBrands[0];
        console.log('⚠️ Brand from URL not found, using first available:', this.currentBrand);
        
        // Update URL to reflect the actual brand being used
        const params = new URLSearchParams(window.location.search);
        params.set('brand', this.currentBrand);
        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newURL);
      } else {
        console.error('❌ No brands found in data');
        throw new Error('No brands available');
      }
      
      console.log('🎯 Final brand selection:', this.currentBrand);
      
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
          name: 'Liyana Designer Collection',
          tagline: 'Artisan Excellence Personified',
          heroTitle: 'Where Craftsmanship Meets Beauty',
          heroSubtitle: 'Premium handbags designed for women who appreciate the finer details and exquisite quality',
          footerText: 'Liyana has been creating bespoke luxury handbags with meticulous attention to detail.',
          colors: {
            primary: '#C9A961',
            accent: '#E8D5A3',
            text: '#2C2926',
            bg: '#FEFDFB'
          },
          whatsapp: 'https://wa.me/923001234567'
        },
        'MeriyaBags': {
          name: 'Meriya Heritage Collection',
          tagline: 'Heritage Meets Modernity',
          heroTitle: 'Honor Your Heritage',
          heroSubtitle: 'Heritage-inspired luxury handbags with modern functionality for today\'s sophisticated woman',
          footerText: 'Meriya honors traditional craftsmanship heritage while creating modern luxury handbags.',
          colors: {
            primary: '#9B59B6',
            accent: '#BB8FCE',
            text: '#2C2926',
            bg: '#FEFDFB'
          },
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
  
  // Add body attribute for CSS targeting
  document.body.setAttribute('data-page-type', 'category');
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
    
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
    
    if (heroSubtitle) {
      heroSubtitle.style.display = 'none'; // Hide subtitle on category pages
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
          
          // Split the path and navigate properly
          const pathSegments = crumb.path.split('/').filter(Boolean);
          this.currentPath = pathSegments;
          
          // Update URL
          const params = new URLSearchParams(window.location.search);
          params.set('path', crumb.path);
          if (this.currentBrand) {
            params.set('brand', this.currentBrand);
          }
          
          const newURL = `${window.location.pathname}?${params.toString()}`;
          window.history.pushState({ 
            path: pathSegments, 
            brand: this.currentBrand 
          }, '', newURL);
          
          // Show the category view
          this.showCategoryView();
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
      <div class="cards-grid ${gridClass}">
        ${items.map(item => this.createCardHTML(item)).join('')}
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
  
  // Remove category page attribute
  document.body.removeAttribute('data-page-type');
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
    
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
  if (!this.data || !this.data.brands) {
    console.error('❌ No brand data available');
    return;
  }

  const brand = this.data.brands[this.currentBrand];
  if (!brand) {
    console.error('❌ Brand not found:', this.currentBrand);
    console.log('Available brands:', Object.keys(this.data.brands));
    return;
  }

  console.log('🏷️ Setting up brand info for:', this.currentBrand, brand);

  // Update brand elements with actual data
  this.updateElement('brandName', brand.name || brand.brandName || this.currentBrand);
  this.updateElement('brandTagline', brand.tagline || 'Premium Quality Collection');
  this.updateElement('heroTitle', brand.heroTitle || 'Discover Luxury Collections');
  this.updateElement('heroSubtitle', brand.heroSubtitle || 'Curated premium products from the world\'s finest brands.');
  this.updateElement('footerBrandName', brand.name || brand.brandName || this.currentBrand);
  
  // Reset subtitle display for homepage
  const heroSubtitle = document.getElementById('heroSubtitle');
  if (heroSubtitle) {
    heroSubtitle.style.display = 'block';
  }
  
  // Update logo with brand initials
  const logo = document.getElementById('brandLogo');
  if (logo) {
    const brandName = brand.name || brand.brandName || this.currentBrand;
    logo.textContent = this.getInitials(brandName);
  }

  // Apply brand colors
  if (brand.colors) {
    console.log('🎨 Applying brand colors:', brand.colors);
    this.applyBrandColors(brand.colors);
  } else {
    // Fallback colors if no colors specified
    const fallbackColors = {
      primary: '#6366f1',
      accent: '#8b5cf6',
      text: '#202124',
      bg: '#ffffff'
    };
    this.applyBrandColors(fallbackColors);
  }

  // Setup WhatsApp button
  const whatsApp = document.getElementById('whatsappFab');
  if (whatsApp && brand.whatsapp) {
    whatsApp.href = brand.whatsapp;
    whatsApp.style.display = 'flex';
    console.log('📱 WhatsApp link set:', brand.whatsapp);
  }

  console.log('✅ Brand info setup complete for:', this.currentBrand);
}

  // Debug method to check brand switching
  debugBrandSwitching() {
    console.log('🔍 BRAND DEBUG INFO:');
    console.log('Current brand:', this.currentBrand);
    console.log('Available brands:', Object.keys(this.data?.brands || {}));
    console.log('URL params:', new URLSearchParams(window.location.search).toString());
    console.log('Brand data:', this.data?.brands[this.currentBrand]);
    
    // Check if elements are being updated
    console.log('Brand name element:', document.getElementById('brandName')?.textContent);
    console.log('Hero title element:', document.getElementById('heroTitle')?.textContent);
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
      <div class="content-card" data-category="${item.key}" data-is-product="${item.isProduct || false}" data-drive-link="${item.driveLink || ''}" data-search-path="${item.searchPath || ''}" role="button" tabindex="0">
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
        <h3>${brand?.name || 'Luxury Collection'}</h3>
        <p>${footerText}</p>
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
        const searchPath = card.dataset.searchPath;
        
        if (isProduct && driveLink) {
          // Open product link
          this.openProduct(driveLink);
        } else if (searchPath) {
          // Navigate using search path
          this.navigateToPath(searchPath);
        } else {
          // Navigate to category
          this.navigateToCategory(category);
        }
      }
    });

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

    // FAB functionality
    this.setupFABFunctionality();
  }

  navigateToPath(path) {
    console.log('🔗 Navigate to path:', path);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Build new path
    const pathSegments = path.split('/').filter(Boolean);
    this.currentPath = pathSegments;
    
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('path', path);
    if (this.currentBrand) {
      params.set('brand', this.currentBrand);
    }
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ 
      path: pathSegments, 
      brand: this.currentBrand 
    }, '', newURL);
    
    // Show category view
    this.showCategoryView();
  }

  openProduct(driveLink) {
    console.log('🔗 Opening product:', driveLink);
    this.showNotification('Opening product...');
    window.open(driveLink, '_blank', 'noopener,noreferrer');
  }

  navigateToCategory(category) {
    console.log('🔗 Navigate to category:', category);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
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

  // Enhanced search functionality
  handleSearch(query) {
    if (!query.trim()) return;
    
    console.log('🔍 Searching for:', query);
    this.showNotification(`Searching for "${query}"...`);
    
    // Actual search implementation
    const results = this.performSearch(query.toLowerCase());
    this.displaySearchResults(results, query);
  }

  performSearch(query) {
    const results = [];
    
    function searchNode(node, path = []) {
      for (const [key, item] of Object.entries(node)) {
        const currentPath = [...path, key];
        
        // Check if current item matches search
        if (key.toLowerCase().includes(query) || 
            (item.title && item.title.toLowerCase().includes(query))) {
          results.push({
            name: key,
            path: currentPath.join('/'),
            isProduct: item.isProduct,
            count: item.count,
            thumbnail: item.thumbnail,
            driveLink: item.driveLink
          });
        }
        
        // Search in children
        if (item.children && !item.isProduct) {
          searchNode(item.children, currentPath);
        }
      }
    }
    
    if (this.data && this.data.catalog && this.data.catalog.tree) {
      searchNode(this.data.catalog.tree);
    }
    
    return results;
  }

  displaySearchResults(results, query) {
    const container = document.getElementById('dynamicSections');
    if (!container) return;
    
    if (results.length === 0) {
      container.innerHTML = `
        <section class="content-section">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">No Results Found</h2>
              <p class="section-description">No items found for "${query}". Try different keywords.</p>
            </div>
          </div>
        </section>
      `;
      return;
    }
    
    const gridClass = this.getGridClass(results.length);
    const resultsHTML = results.map(result => ({
      key: result.name,
      title: result.name.replace(/_/g, ' '),
      description: result.isProduct ? 'Premium product' : `${result.count || 0} items`,
      count: result.count || (result.isProduct ? 1 : 0),
      thumbnail: result.thumbnail || this.getEmojiForCategory(result.name),
      isProduct: result.isProduct,
      searchPath: result.path,
      driveLink: result.driveLink
    }));
    
    container.innerHTML = `
      <section class="content-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Search Results</h2>
            <p class="section-description">Found ${results.length} result${results.length === 1 ? '' : 's'} for "${query}"</p>
          </div>
          <div class="cards-grid ${gridClass}">
            ${resultsHTML.map(item => this.createCardHTML(item)).join('')}
          </div>
        </div>
      </section>
    `;
    
    // Hide taxonomy section during search
    const taxonomySection = document.querySelector('.taxonomy-section');
    if (taxonomySection) {
      taxonomySection.style.display = 'none';
    }
  }

  // FAB functionality
  setupFABFunctionality() {
    const fabToggle = document.getElementById('fabToggle');
    const fabContainer = document.getElementById('fabContainer');
    const fabActions = document.querySelectorAll('.fab-action[data-folder]');

    if (fabToggle && fabContainer) {
      fabToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        fabContainer.classList.toggle('expanded');
      });

      // Close FAB when clicking outside
      document.addEventListener('click', (e) => {
        if (!fabContainer.contains(e.target)) {
          fabContainer.classList.remove('expanded');
        }
      });
    }

    // Image viewer functionality with dynamic folder loading
    let currentImages = [];
    let currentImageIndex = 0;
    let currentFolderIndex = 0;
    let allFolders = ['Reviews', 'Delivered', 'Payment'];
    const modal = document.getElementById('imageViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    const viewerCounter = document.getElementById('viewerCounter');
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerClose = document.getElementById('viewerClose');
    const viewerPrev = document.getElementById('viewerPrev');
    const viewerNext = document.getElementById('viewerNext');
    const viewerOverlay = document.getElementById('viewerOverlay');

    // Replace the loadFolderImages function with this corrected version
// Enhanced image loading function with extensive file name patterns
const loadFolderImages = async (folderName) => {
  try {
    console.log(`🔍 Loading images from folder: ${folderName}`);
    const images = [];
    const basePath = `/${folderName}/`;
    
    // All possible file extensions
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'bmp', 'BMP'];
    
    // Pattern 1: Simple numbers (1.jpg, 2.jpg, etc.)
    console.log(`📝 Trying pattern: ${folderName}/1.jpg, 2.jpg, etc.`);
    for (let i = 1; i <= 10; i++) {
      let found = false;
      for (const ext of extensions) {
        const imagePath = `${basePath}${i}.${ext}`;
        const exists = await checkImageExists(imagePath);
        if (exists) {
          images.push({
            src: imagePath,
            title: `${folderName} ${i}`
          });
          found = true;
          console.log(`✅ Found: ${imagePath}`);
          break;
        }
      }
      if (!found && i > 3 && images.length === 0) break; // Stop if no images found in first 3
    }
    
    // Pattern 2: Folder name + numbers (reviews1.jpg, payment1.jpg, etc.)
    if (images.length === 0) {
      console.log(`📝 Trying pattern: ${folderName.toLowerCase()}1.jpg, etc.`);
      for (let i = 1; i <= 10; i++) {
        for (const ext of extensions) {
          const imagePath = `${basePath}${folderName.toLowerCase()}${i}.${ext}`;
          const exists = await checkImageExists(imagePath);
          if (exists) {
            images.push({
              src: imagePath,
              title: `${folderName} ${i}`
            });
            console.log(`✅ Found: ${imagePath}`);
            break;
          }
        }
        if (images.length > 0) break;
      }
    }
    
    // Pattern 3: Common image names
    if (images.length === 0) {
      const commonNames = [
        'image1', 'image2', 'image3', 'image4', 'image5',
        'img1', 'img2', 'img3', 'img4', 'img5',
        'photo1', 'photo2', 'photo3', 'photo4', 'photo5',
        'pic1', 'pic2', 'pic3', 'pic4', 'pic5',
        'screenshot1', 'screenshot2', 'screenshot3'
      ];
      
      console.log(`📝 Trying common names: image1.jpg, photo1.jpg, etc.`);
      for (const name of commonNames) {
        for (const ext of extensions) {
          const imagePath = `${basePath}${name}.${ext}`;
          const exists = await checkImageExists(imagePath);
          if (exists) {
            images.push({
              src: imagePath,
              title: `${folderName} - ${name}`
            });
            console.log(`✅ Found: ${imagePath}`);
            break;
          }
        }
      }
    }
    
    // Pattern 4: Any files in the directory (fallback)
    if (images.length === 0) {
      console.log(`📝 Trying any files pattern...`);
      const anyFileNames = ['a', 'b', 'c', 'd', 'e', 'test', 'sample', folderName.toLowerCase()];
      
      for (const name of anyFileNames) {
        for (const ext of extensions) {
          const imagePath = `${basePath}${name}.${ext}`;
          const exists = await checkImageExists(imagePath);
          if (exists) {
            images.push({
              src: imagePath,
              title: `${folderName} - ${name}`
            });
            console.log(`✅ Found: ${imagePath}`);
            break;
          }
        }
      }
    }
    
    console.log(`📊 Total images found in ${folderName}: ${images.length}`);
    if (images.length === 0) {
      console.error(`❌ No images found in ${folderName} folder. Checked patterns:
        - ${folderName}/1.jpg, 2.jpg, etc.
        - ${folderName}/${folderName.toLowerCase()}1.jpg, etc.
        - ${folderName}/image1.jpg, photo1.jpg, etc.
        - ${folderName}/[any-name].jpg, etc.`);
    }
    
    return images;
  } catch (error) {
    console.error(`💥 Error loading images for ${folderName}:`, error);
    return [];
  }
};

    // FAB action listeners
    fabActions.forEach((action, index) => {
      action.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const folderName = action.dataset.folder;
        currentFolderIndex = allFolders.indexOf(folderName);
        
        const images = await loadFolderImages(folderName);
        
        if (images.length === 0) {
          currentImages = [{
            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIGltYWdlcyBmb3VuZCBpbiAnICsgZm9sZGVyTmFtZSArICcgZm9sZGVyPC90ZXh0Pjwvc3ZnPg==',
            title: `No images found in ${folderName} folder`
          }];
        } else {
          currentImages = images;
        }
        
        currentImageIndex = 0;
        showImage();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        if (fabContainer) {
          fabContainer.classList.remove('expanded');
        }
      });
    });

    const showImage = () => {
      if (currentImages.length === 0) return;
      
      const image = currentImages[currentImageIndex];
      viewerImage.src = image.src;
      viewerTitle.textContent = image.title;
      viewerCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
      
      if (currentImageIndex < currentImages.length - 1) {
        const nextImg = new Image();
        nextImg.src = currentImages[currentImageIndex + 1].src;
      }
    };

    const closeImageViewer = () => {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    };

    const showNextImage = () => {
      if (currentImages.length === 0) return;
      currentImageIndex = (currentImageIndex + 1) % currentImages.length;
      showImage();
    };

    const showPrevImage = () => {
      if (currentImages.length === 0) return;
      currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
      showImage();
    };

    // Event listeners
    if (viewerClose) viewerClose.addEventListener('click', closeImageViewer);
    if (viewerOverlay) viewerOverlay.addEventListener('click', closeImageViewer);
    if (viewerNext) viewerNext.addEventListener('click', showNextImage);
    if (viewerPrev) viewerPrev.addEventListener('click', showPrevImage);
    if (viewerImage) {
      viewerImage.addEventListener('click', (e) => {
        e.stopPropagation();
        showNextImage();
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      
      switch(e.key) {
        case 'Escape':
          closeImageViewer();
          break;
        case 'ArrowRight':
          showNextImage();
          break;
        case 'ArrowLeft':
          showPrevImage();
          break;
      }
    });

    // Touch support
    let touchStartX = 0;
    let touchEndX = 0;

    if (modal) {
      modal.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      modal.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const swipeDistance = touchStartX - touchEndX;
        const minSwipeDistance = 50;

        if (Math.abs(swipeDistance) > minSwipeDistance) {
          if (swipeDistance > 0) {
            showNextImage();
          } else {
            showPrevImage();
          }
        }
      }, { passive: true });
    }
  }

  checkImageExists(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS if needed
    
    const timeout = setTimeout(() => {
      console.log(`⏰ Timeout checking: ${imageSrc}`);
      resolve(false);
    }, 2000); // Reduced timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`✅ Image exists: ${imageSrc}`);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.log(`❌ Image not found: ${imageSrc}`);
      resolve(false);
    };
    
    img.src = imageSrc;
  });
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
