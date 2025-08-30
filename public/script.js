// Complete Working CSV-Driven Catalog App with Smart Grid and Enhanced Features
// ============================================================================

class CSVCatalogApp {
  constructor() {
    this.data = null;
    this.currentBrand = null;
    this.currentPath = [];
    this.sections = new Map();
    this.isLoading = false;
    
    // Initialize navigation state from URL
    this.initializeFromURL();
  }

  initializeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const brandFromURL = urlParams.get('brand');
    const pathFromURL = urlParams.get('path');
    
    // CRITICAL: Set brand immediately from URL
    if (brandFromURL) {
      this.currentBrand = brandFromURL;
      
      // Force immediate display update
      this.updateBrandDisplay(brandFromURL);
    }
    
    // Set path
    if (pathFromURL) {
      this.currentPath = pathFromURL.split('/').filter(Boolean);
    } else {
      this.currentPath = [];
    }
  }

  updateBrandDisplay(brandFromURL) {
    // Update brand name immediately from URL
    const brandNameElement = document.getElementById('brandName');
    const brandLogoElement = document.getElementById('brandLogo');
    
    if (brandNameElement) {
      const displayName = this.slugToDisplayName(brandFromURL);
      brandNameElement.textContent = displayName;
    }
    
    if (brandLogoElement) {
      const initials = this.getInitials(this.slugToDisplayName(brandFromURL));
      brandLogoElement.textContent = initials;
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
    try {
      await this.loadData();
      
      if (!this.data) {
        return;
      }

      this.setupBrandInfo();
      
      // Check if we need to show category view or homepage
      if (this.currentPath.length > 0) {
        this.showCategoryView();
      } else {
        this.setupDynamicSections();
      }
      
      this.setupTaxonomy();
      this.setupFooter();
      this.setupEventListeners();
      this.setupFABFunctionality();

      
    } catch (error) {
      // Silent error handling in production
    }
  }

  async loadData() {
    try {
      this.showLoading();
      
      const response = await fetch('/data.json?v=' + Date.now());
      if (response.ok) {
        this.data = await response.json();
        
        // CRITICAL: Don't override currentBrand if it's already set from URL
        const urlParams = new URLSearchParams(window.location.search);
        const brandFromURL = urlParams.get('brand');
        
        const availableBrands = Object.keys(this.data.brands || {});
        
        // ALWAYS prioritize URL brand
        if (brandFromURL && this.data.brands[brandFromURL]) {
          this.currentBrand = brandFromURL;
        } else if (!this.currentBrand && availableBrands.length > 0) {
          this.currentBrand = availableBrands[0];
        } else if (availableBrands.length === 0) {
          throw new Error('No brands available');
        }
        
      } else {
        throw new Error(`Failed to load data: ${response.status}`);
      }
    } catch (error) {
      this.loadMockData();
    } finally {
      this.hideLoading();
    }
  }

  loadMockData() {
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
        'MeriyaBags': {
          name: 'Meriya Bags',
          tagline: 'Luxury Redefined Since 1992',
          heroTitle: 'Elegance Redefined Since 1992',
          heroSubtitle: 'Discover Your Perfect Statement with premium handbags designed for women who appreciate the finer details and exquisite quality',
          footerText: 'Meriya has been creating bespoke luxury handbags with meticulous attention to detail since 1992.',
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
            section: 'Best Sellers',
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
          'JEWELRY': { count: 89, thumbnail: '', section: 'Premium', children: {} },
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
  }

  // Show category view
  showCategoryView() {
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
        this.showNotification(`Category "${segment}" not found`);
        this.navigateToHome();
        return;
      }
    }

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
    const containerId = `category-${Math.random().toString(36).substr(2, 9)}`;
    
    container.innerHTML = `
      <section class="content-section">
        <div class="container">
          <div class="cards-grid ${gridClass}" id="${containerId}">
            ${items.map(item => this.createCardHTML(item)).join('')}
          </div>
        </div>
      </section>
    `;

    // Apply smart centering for category contents
    if (gridClass === 'grid-smart') {
      setTimeout(() => {
        const gridContainer = document.getElementById(containerId);
        if (gridContainer) this.addSmartCentering(gridContainer, items.length);
      }, 10);
    }
  }

  navigateToHome() {
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
    // Get brand from URL first - THIS IS CRITICAL
    const urlParams = new URLSearchParams(window.location.search);
    const urlBrand = urlParams.get('brand');
    
    // ALWAYS use URL brand if available
    if (urlBrand) {
      this.currentBrand = urlBrand;
    }
    
    if (!this.data || !this.data.brands) {
      return;
    }

    let brand = this.data.brands[this.currentBrand];
    if (!brand) {
      // Use first available brand as fallback
      const firstBrand = Object.keys(this.data.brands)[0];
      if (firstBrand) {
        this.currentBrand = firstBrand;
        brand = this.data.brands[firstBrand];
      } else {
        return;
      }
    }

    // Get brand information with multiple fallback patterns
    const brandName = brand.name || brand.brandName || brand['Brand Name'] || this.slugToDisplayName(this.currentBrand);
    const tagline = brand.tagline || brand.brandTagline || brand['Brand Tagline'] || 'Premium Quality Collection';
    const heroTitle = brand.heroTitle || brand.hero_title || brand['Hero Title'] || 'Discover Luxury Collections';
    const heroSubtitle = brand.heroSubtitle || brand.hero_subtitle || brand['Hero Subtitle'] || 'Curated premium products from the world\'s finest brands.';

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
        
        // Double-check after a brief delay
        setTimeout(() => {
          if (element.textContent !== content) {
            element.textContent = content;
          }
        }, 50);
      }
    });

    // Update logo with initials
    const logoEl = document.getElementById('brandLogo');
    if (logoEl) {
      const initials = this.getInitials(brandName);
      logoEl.textContent = initials;
      logoEl.title = brandName; // Add tooltip
    }

    // FORCE apply brand colors
    const colors = brand.colors || {};
    const brandColors = {
      primary: colors.primary || colors.primaryColor || colors['Primary Color'] || '#6366f1',
      accent: colors.accent || colors.accentColor || colors['Accent Color'] || '#8b5cf6',
      text: colors.text || colors.textColor || colors['Text Color'] || '#202124',
      bg: colors.bg || colors.bgColor || colors['Background Color'] || '#ffffff'
    };
    
    // Apply colors immediately to root with force
    const root = document.documentElement;
    Object.entries(brandColors).forEach(([key, value]) => {
      const cssVar = `--color-${key === 'text' ? 'text-primary' : key}`;
      root.style.setProperty(cssVar, value);
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

    // Setup WhatsApp button
    const whatsApp = document.getElementById('whatsappFab');
    if (whatsApp) {
      const whatsappUrl = brand.whatsapp || brand.whatsappUrl || brand['WhatsApp'] || '';
      if (whatsappUrl) {
        whatsApp.href = whatsappUrl;
        whatsApp.style.display = 'flex';
      }
    }

    // Update page title
    document.title = `${brandName} - Luxury Collection`;
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
    
    // More aggressive color enhancement for better visibility
    const enhanceColor = (color, isForText = false) => {
      if (!color || !color.startsWith('#')) return color;
      
      // Convert hex to RGB
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      // Calculate perceived lightness (weighted for human perception)
      const lightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // If color is too light (common issue), make it much darker
      if (lightness > 0.7) {
        const factor = isForText ? 0.3 : 0.4; // Even darker for text
        const newR = Math.floor(r * factor);
        const newG = Math.floor(g * factor);
        const newB = Math.floor(b * factor);
        const enhancedColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        return enhancedColor;
      }
      
      // If color is too dark, lighten it slightly
      if (lightness < 0.2) {
        const factor = 1.8;
        const newR = Math.min(255, Math.floor(r * factor));
        const newG = Math.min(255, Math.floor(g * factor));
        const newB = Math.min(255, Math.floor(b * factor));
        const enhancedColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        return enhancedColor;
      }
      
      return color;
    };
    
    const root = document.documentElement;
    
    // Apply enhanced colors with much better contrast
    if (colors.primary) {
      const enhancedPrimary = enhanceColor(colors.primary, true);
      root.style.setProperty('--color-primary', enhancedPrimary);
      
      // Create a darker variant for text
      const textVariant = enhanceColor(colors.primary, true);
      root.style.setProperty('--color-primary-dark', textVariant);
    }
    
    if (colors.accent) {
      const enhancedAccent = enhanceColor(colors.accent, true);
      root.style.setProperty('--color-accent', enhancedAccent);
    }
    
    // Ensure text colors have good contrast
    if (colors.text) {
      const enhancedText = enhanceColor(colors.text, true);
      root.style.setProperty('--color-text-primary', enhancedText);
    }
    
    if (colors.bg) {
      root.style.setProperty('--color-bg', colors.bg);
    }
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme && colors.primary) {
      metaTheme.setAttribute('content', enhanceColor(colors.primary, true));
    }
    
    // Force a repaint to ensure changes are visible
    document.body.style.transform = 'translateZ(0)';
    setTimeout(() => {
      document.body.style.transform = '';
    }, 10);
  }

  setupDynamicSections() {
    const container = document.getElementById('dynamicSections');
    if (!container) return;

    if (!this.data.catalog || !this.data.catalog.tree) {
      return;
    }

    this.groupItemsBySection();
    
    const sectionOrder = ['Featured', 'Best Sellers', 'Premium', 'New Arrivals', 'Trending'];
    
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
    const shouldShowTitle = sectionName && sectionName !== 'Featured' && sectionName !== '';
    const sectionId = `section-${Math.random().toString(36).substr(2, 9)}`;
    
    const sectionHTML = `
      <section class="content-section">
        <div class="container">
          ${shouldShowTitle ? `
            <div class="section-header">
              <h2 class="section-title">${sectionName}</h2>
              <p class="section-description">Explore our ${sectionName.toLowerCase()} collection</p>
            </div>
          ` : ''}
          <div class="cards-grid ${gridClass}" id="${sectionId}">
            ${items.map(item => this.createCardHTML(item)).join('')}
          </div>
        </div>
      </section>
    `;
    
    // Apply smart centering after DOM insertion
    if (gridClass === 'grid-smart') {
      setTimeout(() => {
        const container = document.getElementById(sectionId);
        if (container) this.addSmartCentering(container, items.length);
      }, 10);
    }
    
    return sectionHTML;
  }

  getGridClass(itemCount) {
    if (itemCount === 1) return 'grid-1';
    if (itemCount === 2) return 'grid-2';  
    if (itemCount === 3) return 'grid-3';
    if (itemCount <= 12) return 'grid-smart';
    return 'grid-many'; // For 13+ items, use responsive auto-fit
  }

  // Add smart centering classes based on item count and position
  addSmartCentering(containerElement, itemCount) {
    const cards = containerElement.querySelectorAll('.content-card');
    const remainder = itemCount % 3;
    
    if (remainder === 1) {
      // Last item should be centered (4,7,10,13... items)
      const lastCard = cards[cards.length - 1];
      if (lastCard) lastCard.classList.add('center-item');
    } else if (remainder === 2) {
      // Last two items should be spaced (5,8,11,14... items)
      const secondLast = cards[cards.length - 2];
      const last = cards[cards.length - 1];
      if (secondLast) secondLast.classList.add('partial-row-left');
      if (last) last.classList.add('partial-row-right');
    }
    // remainder === 0 means perfect grid (6,9,12... items) - do nothing
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
      this.handleBrowserNavigation();
    });
  }

  navigateToPath(path) {
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
    this.showNotification('Opening product...');
    window.open(driveLink, '_blank', 'noopener,noreferrer');
  }

  navigateToCategory(category) {
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
    const urlParams = new URLSearchParams(window.location.search);
    const urlBrand = urlParams.get('brand');
    
    if (urlBrand && urlBrand !== this.currentBrand) {
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
    // Re-initialize from URL with FORCE
    this.initializeFromURL();
    
    // Force brand refresh
    this.handleBrandNavigation();
  }

  // Enhanced search functionality
  handleSearch(query) {
    if (!query.trim()) return;
    
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

// COMPLETE FIXED PATCH - Replace setupFABFunctionality method entirely
// This fixes all scope, caching, and method binding issues

// EMERGENCY FIX - Replace the broken setupFABFunctionality method

setupFABFunctionality() {
  const threeDotToggle = document.getElementById('threeDotToggle');
  const threeDotMenu = document.getElementById('threeDotMenu');
  const menuItems = document.querySelectorAll('.menu-item');

  const imageCache = new Map();

  // Force menu collapsed
  if (threeDotToggle && threeDotMenu) {
    threeDotMenu.classList.remove('expanded');
    
    threeDotToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      threeDotMenu.classList.toggle('expanded');
    });

    document.addEventListener('click', (e) => {
      if (!threeDotMenu.contains(e.target)) {
        threeDotMenu.classList.remove('expanded');
      }
    });
  }

  // FAST: Check if image exists
  const imageExists = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => resolve(false), 500);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      img.src = url;
    });
  };

  // SMART: Target your exact file patterns
  const scanFolder = async (folderName) => {
    console.log(`🎯 Scanning ${folderName}...`);
    
    const foundImages = [];
    const formats = ['webp', 'jpg', 'jpeg', 'png'];
    
    // Check your exact patterns: image1, image2, image3...
    const patterns = [
      ...Array.from({length: 50}, (_, i) => `image${i + 1}`),
      ...Array.from({length: 50}, (_, i) => `${i + 1}`)
    ];

    // Check in small fast batches
    for (let i = 0; i < patterns.length; i += 10) {
      const batch = patterns.slice(i, i + 10);
      
      const promises = [];
      for (const pattern of batch) {
        for (const format of formats) {
          const url = `/${folderName}/${pattern}.${format}`;
          promises.push(
            imageExists(url).then(exists => 
              exists ? {
                src: url,
                title: `${folderName} - ${pattern}`,
                name: `${pattern}.${format}`
              } : null
            )
          );
        }
      }
      
      const results = await Promise.all(promises);
      const valid = results.filter(Boolean);
      foundImages.push(...valid);
      
      // Stop if we found some and checked first few batches
      if (valid.length > 0 && i > 20) break;
    }

    // Sort naturally
    foundImages.sort((a, b) => {
      const aNum = parseInt(a.name.match(/\d+/)?.[0]);
      const bNum = parseInt(b.name.match(/\d+/)?.[0]);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`✅ Found ${foundImages.length} images in ${folderName}`);
    imageCache.set(folderName, foundImages);
    return foundImages;
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

  // Menu click handlers
  menuItems.forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const folderName = item.dataset.folder;
      
      // Show modal
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      // Check cache
      let images = imageCache.get(folderName);
      
      if (!images) {
        // Show loading
        if (viewerImage) {
          viewerImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2Nhbm5pbmcuLi48L3RleHQ+PC9zdmc+';
        }
        if (viewerTitle) viewerTitle.textContent = `Scanning ${folderName}...`;
        
        images = await scanFolder(folderName);
      }

      if (images.length === 0) {
        currentImages = [{
          src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gaW1hZ2VzPC90ZXh0Pjwvc3ZnPg==',
          title: `No images in ${folderName}`
        }];
      } else {
        currentImages = images;
      }
      
      currentImageIndex = 0;
      showImage();
      
      // Close menu
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
  };

  const closeViewer = () => {
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  };

  const nextImage = () => {
    if (currentImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    showImage();
  };

  const prevImage = () => {
    if (currentImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    showImage();
  };

  // Event listeners
  if (viewerClose) viewerClose.addEventListener('click', closeViewer);
  if (viewerOverlay) viewerOverlay.addEventListener('click', closeViewer);
  if (viewerNext) viewerNext.addEventListener('click', nextImage);  
  if (viewerPrev) viewerPrev.addEventListener('click', prevImage);
  if (viewerImage) {
    viewerImage.addEventListener('click', (e) => {
      e.stopPropagation();
      nextImage();
    });
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!modal || !modal.classList.contains('active')) return;
    
    switch(e.key) {
      case 'Escape': closeViewer(); break;
      case 'ArrowRight': nextImage(); break;
      case 'ArrowLeft': prevImage(); break;
    }
  });

  console.log('✅ FAB functionality working!');
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

// Enhanced initialization
function initializeApp() {
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
    // Silent error handling
  });
  
  window.catalogApp = app;
  
  // Monitor URL changes for brand switching
  window.addEventListener('popstate', () => {
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
  // Wait for DOMContentLoaded
} else {
  setTimeout(() => {
    if (!window.catalogApp) {
      initializeApp();
    }
  }, 100);
}

// Global error handlers
window.addEventListener('error', (e) => {
  // Silent error handling
});

window.addEventListener('unhandledrejection', (e) => {
  // Silent error handling
  e.preventDefault();
});
