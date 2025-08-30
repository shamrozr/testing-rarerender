// Complete Working CSV-Driven Catalog App with All Fixes
// ========================================================

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
    
    // CRITICAL: Set brand immediately from URL
    if (brandFromURL) {
      this.currentBrand = brandFromURL;
      console.log('🎯 Set currentBrand from URL:', brandFromURL);
      
      // Force immediate display update
      this.updateBrandDisplay(brandFromURL);
    }
    
    // Set path
    if (pathFromURL) {
      this.currentPath = pathFromURL.split('/').filter(Boolean);
      console.log('📁 Current path:', this.currentPath);
    } else {
      this.currentPath = [];
    }
  }

  updateBrandDisplay(brandFromURL) {
    console.log('🔄 Updating brand display for:', brandFromURL);
    
    // Update brand name immediately from URL
    const brandNameElement = document.getElementById('brandName');
    const brandLogoElement = document.getElementById('brandLogo');
    
    if (brandNameElement) {
      const displayName = this.slugToDisplayName(brandFromURL);
      brandNameElement.textContent = displayName;
      console.log('📝 Updated brand name element to:', displayName);
    }
    
    if (brandLogoElement) {
      const initials = this.getInitials(this.slugToDisplayName(brandFromURL));
      brandLogoElement.textContent = initials;
      console.log('🔤 Updated logo element to:', initials);
    }
    
    // Also update page title
    const title = this.slugToDisplayName(brandFromURL);
    document.title = title + ' - Luxury Collection';
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
    
    try {
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

      this.setupBrandInfo();
      // Add this line after setupBrandInfo()
      this.generateParticles();
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
      this.setupFABFunctionality();
      
      console.log('✅ CSV catalog initialization complete!');
    } catch (error) {
      console.error('❌ Error during initialization:', error);
    }
  }
  
// Generate floating particles
generateParticles() {
  const container = document.getElementById('floatingParticles');
  if (!container) return;
  
  // Clear existing particles
  container.innerHTML = '';
  
  // Create 20 particles
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random size between 2px and 8px
    const size = Math.random() * 6 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Random horizontal position
    particle.style.left = Math.random() * 100 + '%';
    
    // Random animation delay
    particle.style.animationDelay = Math.random() * 15 + 's';
    
    // Random animation duration
    const duration = Math.random() * 15 + 10;
    particle.style.animationDuration = duration + 's';
    
    container.appendChild(particle);
  }
  
  console.log('✨ Generated animated background particles');
}
  async loadData() {
    try {
      this.showLoading();
      console.log('📥 Attempting to load data from /data.json...');
      
      const response = await fetch('/data.json?v=' + Date.now());
      if (response.ok) {
        this.data = await response.json();
        console.log('✅ Data loaded successfully:', this.data);
        
        // CRITICAL: Don't override currentBrand if it's already set from URL
        const urlParams = new URLSearchParams(window.location.search);
        const brandFromURL = urlParams.get('brand');
        
        const availableBrands = Object.keys(this.data.brands || {});
        console.log('🏷️ Available brands:', availableBrands);
        console.log('🌐 Brand from URL:', brandFromURL);
        console.log('📌 Current brand before logic:', this.currentBrand);
        
        // ALWAYS prioritize URL brand
        if (brandFromURL && this.data.brands[brandFromURL]) {
          this.currentBrand = brandFromURL;
          console.log('✅ FORCED brand from URL:', brandFromURL);
        } else if (!this.currentBrand && availableBrands.length > 0) {
          this.currentBrand = availableBrands[0];
          console.log('⚠️ Using first available brand:', this.currentBrand);
        } else if (availableBrands.length === 0) {
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
        'LuxuryEmporium': {
          name: 'Luxury Emporium',
          tagline: 'Premium Quality Collection',
          heroTitle: 'Discover Luxury Collections',
          heroSubtitle: 'Curated premium products from the world\'s finest brands. Experience elegance, quality, and sophistication in every piece.',
          footerText: 'Your premier destination for luxury goods. We curate only the finest products from the world\'s most prestigious brands.',
          colors: {
            primary: '#6366f1',
            accent: '#8b5cf6',
            text: '#202124',
            bg: '#ffffff'
          },
          whatsapp: 'https://wa.me/923001234567'
        },
        'MilayaBags': {
          name: 'Milaya Luxury Bags',
          tagline: 'Luxury Redefined Since 1992',
          heroTitle: 'Elegance Redefined Since 1992',
          heroSubtitle: 'Discover Your Perfect Statement with premium handbags designed for women who appreciate the finer details and exquisite quality',
          footerText: 'Milaya has been creating bespoke luxury handbags with meticulous attention to detail since 1992.',
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

  // Show category view
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
      justify-content: center;
      flex-wrap: wrap;
      gap: var(--space-2);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      padding: var(--space-3) var(--space-6);
      background: rgba(255, 255, 255, 0.8);
      border-radius: var(--radius-full);
      backdrop-filter: blur(10px);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
      margin-bottom: var(--space-8);
    `;

    // Home link
    const homeLink = document.createElement('a');
    homeLink.href = '#';
    homeLink.textContent = 'Home';
    homeLink.style.cssText = `
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
      transition: all var(--transition-base);
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
        current.style.cssText = `
          font-weight: 600;
          color: var(--color-text-primary);
          padding: var(--space-1) var(--space-2);
          background: rgba(99, 102, 241, 0.1);
          border-radius: var(--radius-sm);
        `;
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
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          transition: all var(--transition-base);
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
    console.log('🏷️ Setting up brand info...');
    
    
    // Get brand from URL first - THIS IS CRITICAL
    const urlParams = new URLSearchParams(window.location.search);
    const urlBrand = urlParams.get('brand');
    
    // ALWAYS use URL brand if available
    if (urlBrand) {
      console.log('🔄 Forcing brand from URL:', urlBrand);
      this.currentBrand = urlBrand;
    }
    
    if (!this.data || !this.data.brands) {
      console.error('❌ No brand data available');
      return;
    }

    let brand = this.data.brands[this.currentBrand];
    if (!brand) {
      console.error('❌ Brand not found:', this.currentBrand);
      console.log('Available brands:', Object.keys(this.data.brands));
      
      // Use first available brand as fallback
      const firstBrand = Object.keys(this.data.brands)[0];
      if (firstBrand) {
        console.log('⚠️ Falling back to first brand:', firstBrand);
        this.currentBrand = firstBrand;
        brand = this.data.brands[firstBrand];
      } else {
        return;
      }
    }

    console.log('🏷️ FORCE Setting up brand info for:', this.currentBrand);
    console.log('🏷️ Brand data:', brand);

    // Get brand information with multiple fallback patterns
    const brandName = brand.name || brand.brandName || brand['Brand Name'] || this.slugToDisplayName(this.currentBrand);
    const tagline = brand.tagline || brand.brandTagline || brand['Brand Tagline'] || 'Premium Quality Collection';
    const heroTitle = brand.heroTitle || brand.hero_title || brand['Hero Title'] || 'Discover Luxury Collections';
    const heroSubtitle = brand.heroSubtitle || brand.hero_subtitle || brand['Hero Subtitle'] || 'Curated premium products from the world\'s finest brands.';

    console.log('📝 Extracted brand info:', { brandName, tagline, heroTitle, heroSubtitle });

    // FORCE immediate DOM updates
    const elements = [
      { id: 'brandName', content: brandName },
      { id: 'brandTagline', content: tagline },
      { id: 'heroTitle', content: heroTitle },
      { id: 'heroSubtitle', content: heroSubtitle },
      { id: 'footerBrandName', content: brandName }
    ];

    elements.forEach(({ id, content }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = content;
        element.style.display = 'block'; // Ensure it's visible
        console.log(`✅ FORCED update ${id}:`, content);
        
        // Double-check after a brief delay
        setTimeout(() => {
          if (element.textContent !== content) {
            element.textContent = content;
            console.log(`🔄 Re-forced update ${id}:`, content);
          }
        }, 50);
      } else {
        console.log(`❌ Element not found: ${id}`);
      }
    });

    // Update logo with initials
    const logoEl = document.getElementById('brandLogo');
    if (logoEl) {
      const initials = this.getInitials(brandName);
      logoEl.textContent = initials;
      logoEl.title = brandName; // Add tooltip
      console.log('✅ FORCED logo update:', initials);
    }

    // FORCE apply brand colors
    const colors = brand.colors || {};
    const brandColors = {
      primary: colors.primary || colors.primaryColor || colors['Primary Color'] || '#6366f1',
      accent: colors.accent || colors.accentColor || colors['Accent Color'] || '#8b5cf6',
      text: colors.text || colors.textColor || colors['Text Color'] || '#202124',
      bg: colors.bg || colors.bgColor || colors['Background Color'] || '#ffffff'
    };

    console.log('🎨 FORCING brand colors:', brandColors);
    
    // Apply colors immediately to root with force
    const root = document.documentElement;
    Object.entries(brandColors).forEach(([key, value]) => {
      const cssVar = `--color-${key === 'text' ? 'text-primary' : key}`;
      root.style.setProperty(cssVar, value);
      console.log(`🎨 Set ${cssVar}: ${value}`);
    });
    
    // Update theme color meta tag
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', brandColors.primary);
    }

    // Force repaint by triggering style changes
    document.body.style.opacity = '0.99';
    setTimeout(() => {
      document.body.style.opacity = '1';
    }, 10);
    // Convert hex to RGB for background animations
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '99, 102, 241';
};

// Set RGB values for animations
root.style.setProperty('--color-primary-rgb', hexToRgb(brandColors.primary));
root.style.setProperty('--color-accent-rgb', hexToRgb(brandColors.accent));
    // Setup WhatsApp button
    const whatsApp = document.getElementById('whatsappFab');
    if (whatsApp) {
      const whatsappUrl = brand.whatsapp || brand.whatsappUrl || brand['WhatsApp'] || '';
      if (whatsappUrl) {
        whatsApp.href = whatsappUrl;
        whatsApp.style.display = 'flex';
        console.log('📱 WhatsApp link set:', whatsappUrl);
      }
    }

    // Update page title
    document.title = `${brandName} - Luxury Collection`;

    console.log('✅ Brand info FORCE setup complete for:', this.currentBrand);
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
        const sectionHTML = this.createSectionHTML('', allItems);
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

  // Force brand refresh when URL changes
  handleBrandNavigation() {
    console.log('🔄 Handling brand navigation...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlBrand = urlParams.get('brand');
    
    if (urlBrand && urlBrand !== this.currentBrand) {
      console.log('🔄 Brand changed in URL, forcing update:', urlBrand);
      this.currentBrand = urlBrand;
      
      // Force immediate brand info setup
      if (this.data && this.data.brands) {
        this.setupBrandInfo();
      }
    }
    
    // Handle path changes
    const pathFromURL = urlParams.get('path');
    if (pathFromURL) {
      this.currentPath = pathFromURL.split('/').filter(Boolean);
      this.showCategoryView();
    } else {
      this.currentPath = [];
      this.navigateToHome();
    }
  }

  handleBrowserNavigation() {
    console.log('🔙 Handling browser navigation');
    
    // Re-initialize from URL with FORCE
    this.initializeFromURL();
    
    // Force brand refresh
    this.handleBrandNavigation();
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

  // 3-Dot Menu and Image Viewer Functionality with Fixed Photo Loading
  setupFABFunctionality() {
    console.log('🔘 Setting up enhanced 3-dot menu functionality...');
    
    const threeDotToggle = document.getElementById('threeDotToggle');
    const threeDotMenu = document.getElementById('threeDotMenu');
    const menuItems = document.querySelectorAll('.menu-item');

    // 3-dot menu toggle
    if (threeDotToggle && threeDotMenu) {
      threeDotToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        threeDotMenu.classList.toggle('expanded');
        console.log('3-dot menu toggled:', threeDotMenu.classList.contains('expanded'));
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!threeDotMenu.contains(e.target)) {
          threeDotMenu.classList.remove('expanded');
        }
      });
    }

    // Dynamic image loading function with better error handling
    const loadImagesFromFolder = async (folderName) => {
      console.log(`📸 Loading images from ${folderName} folder...`);
      
      const images = [];
      let imageIndex = 1;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 3; // Stop after 3 consecutive failures
      
      while (consecutiveFailures < maxConsecutiveFailures && imageIndex <= 50) { // Max 50 images
        // Try multiple formats
        const formats = ['jpg', 'jpeg', 'png', 'webp'];
        let imageFound = false;
        
        for (const format of formats) {
          const imagePath = `${folderName}/${imageIndex}.${format}`;
          
          try {
            const imageExists = await this.checkImageExists(imagePath);
            if (imageExists) {
              images.push({
                src: imagePath,
                title: `${folderName} ${imageIndex}`
              });
              consecutiveFailures = 0; // Reset failure counter
              imageFound = true;
              console.log(`✅ Found: ${imagePath}`);
              break; // Found image, stop checking other formats
            }
          } catch (error) {
            console.log(`❌ Error checking: ${imagePath}`);
          }
        }
        
        if (!imageFound) {
          consecutiveFailures++;
          console.log(`❌ No image found for index ${imageIndex} (${consecutiveFailures}/${maxConsecutiveFailures})`);
        }
        
        imageIndex++;
      }
      
      console.log(`📊 Found ${images.length} images in ${folderName}`);
      return images;
    };

    // Image viewer variables
    let currentImages = [];
    let currentImageIndex = 0;
    const modal = document.getElementById('imageViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    const viewerCounter = document.getElementById('viewerCounter');
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerClose = document.getElementById('viewerClose');
    const viewerPrev = document.getElementById('viewerPrev');
    const viewerNext = document.getElementById('viewerNext');
    const viewerOverlay = document.getElementById('viewerOverlay');

    // Menu item click handlers with dynamic loading
    menuItems.forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const folderName = item.dataset.folder;
        console.log('Menu item clicked:', folderName);
        
        // Show loading state
        if (modal) {
          modal.classList.add('active');
          if (viewerImage) {
            viewerImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcgaW1hZ2VzLi4uPC90ZXh0Pjwvc3ZnPg==';
          }
          if (viewerTitle) viewerTitle.textContent = `Loading ${folderName} images...`;
          if (viewerCounter) viewerCounter.textContent = 'Loading...';
          document.body.style.overflow = 'hidden';
        }
        
        try {
          // Dynamically load images from folder
          const images = await loadImagesFromFolder(folderName);
          
          if (images.length === 0) {
            console.log(`No images found in ${folderName} folder`);
            currentImages = [{
              src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIGltYWdlcyBmb3VuZCBpbiAuICsgZm9sZGVyTmFtZSArIC4gZm9sZGVyPC90ZXh0Pjwvc3ZnPg==',
              title: `No images found in ${folderName} folder`
            }];
          } else {
            currentImages = images;
          }
          
          currentImageIndex = 0;
          showImage();
          
        } catch (error) {
          console.error('Error loading images:', error);
          currentImages = [{
            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yIGxvYWRpbmcgaW1hZ2VzPC90ZXh0Pjwvc3ZnPg==',
            title: `Error loading ${folderName} images`
          }];
          currentImageIndex = 0;
          showImage();
        }
        
        // Close menu after selection
        if (threeDotMenu) {
          threeDotMenu.classList.remove('expanded');
        }
      });
    });

    // Image viewer functions
    const showImage = () => {
      if (currentImages.length === 0) return;
      
      const image = currentImages[currentImageIndex];
      if (viewerImage) viewerImage.src = image.src;
      if (viewerTitle) viewerTitle.textContent = image.title;
      if (viewerCounter) viewerCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
      
      console.log('Showing image:', image.src);
    };

    const closeImageViewer = () => {
      if (modal) modal.classList.remove('active');
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

    // Image viewer event listeners
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
      if (!modal || !modal.classList.contains('active')) return;
      
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

    // Touch support for mobile
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

    console.log('✅ Enhanced 3-dot menu setup complete with dynamic image loading');
  }

  // Enhanced image checking with multiple format support
  checkImageExists(imageSrc) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeout = setTimeout(() => {
        console.log(`⏰ Timeout checking: ${imageSrc}`);
        resolve(false);
      }, 5000); // 5 second timeout
      
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
      
      // Add cache busting and try to load
      const cacheBuster = Date.now();
      img.src = imageSrc.includes('?') ? 
        `${imageSrc}&v=${cacheBuster}` : 
        `${imageSrc}?v=${cacheBuster}`;
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

// Enhanced initialization with forced brand refresh
console.log('🔧 Script loaded, starting initialization...');

function initializeApp() {
  console.log('📄 Initializing app...');
  
  const app = new CSVCatalogApp();
  
  app.init().then(() => {
    // Force brand refresh after initialization
    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBrand = urlParams.get('brand');
      if (urlBrand) {
        app.currentBrand = urlBrand;
        app.setupBrandInfo();
      }
    }, 100);
  }).catch(error => {
    console.error('💥 App initialization failed:', error);
  });
  
  window.catalogApp = app;
  console.log('🔧 App instance created and available as window.catalogApp');
  
  // Monitor URL changes for brand switching
  window.addEventListener('popstate', () => {
    console.log('🔄 URL changed, refreshing brand...');
    const urlParams = new URLSearchParams(window.location.search);
    const urlBrand = urlParams.get('brand');
    if (urlBrand && app.data && app.data.brands[urlBrand]) {
      app.currentBrand = urlBrand;
      app.setupBrandInfo();
    }
  });
}

document.addEventListener('DOMContentLoaded', initializeApp);

// Backup initialization
if (document.readyState === 'loading') {
  console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
} else {
  console.log('🚀 Document already loaded, initializing immediately...');
  setTimeout(() => {
    if (!window.catalogApp) {
      console.log('🔄 Backup initialization starting...');
      initializeApp();
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
      
