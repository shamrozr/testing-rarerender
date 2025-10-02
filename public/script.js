// Complete Working CSV-Driven Catalog App with Smart Grid and Enhanced Features
// ============================================================================

class CSVCatalogApp {
  constructor() {
  this.data = null;
  this.currentBrand = null;
  this.currentPath = [];
  this.sections = new Map();
  this.isLoading = false;
  
  // Scroll behavior properties
  this.lastScrollY = 0;
  this.scrollThreshold = 100;
  this.isHeaderCollapsed = false;
  
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

    // DEBUG: Verify topOrder data is available
    console.log('🔍 Checking topOrder data after load...');
    if (this.data.catalog && this.data.catalog.tree) {
      Object.entries(this.data.catalog.tree).forEach(([key, item]) => {
        const topOrder = item.topOrder || item['Top Order'] || item.top_order;
        if (topOrder !== undefined) {
          console.log(`✅ ${key} has topOrder: ${topOrder}`);
        } else {
          console.log(`❌ ${key} missing topOrder`);
        }
      });
    }

    this.setupBrandInfo();
    
    
    // Check if we need to show category view or homepage
    // Check if we need to show category view or homepage
    // Check if we need to show category view or homepage
// Check if we need to show category view or homepage
if (this.currentPath.length > 0) {
  this.showCategoryView();
} else {
  this.setupDynamicSections();
}

// Setup brands and slideshow FIRST (creates the sections)
this.setupBrands();
this.setupReviewSlideshow();

// THEN control visibility based on current view
if (this.currentPath.length > 0) {
  // On category/brand view - hide brands and slideshow
  const brandsSection = document.querySelector('.brands-section');
  const slideshowSection = document.querySelector('.slideshow-section');
  if (brandsSection) {
    brandsSection.style.display = 'none';
    console.log('🙈 Hiding brands section (category view)');
  }
  if (slideshowSection) {
    slideshowSection.style.display = 'none';
    console.log('🙈 Hiding slideshow section (category view)');
  }
} else {
  // On homepage - show brands and slideshow
  const brandsSection = document.querySelector('.brands-section');
  const slideshowSection = document.querySelector('.slideshow-section');
  if (brandsSection) {
    brandsSection.style.display = 'block';
    console.log('👁️ Showing brands section (homepage)');
  }
  if (slideshowSection) {
    slideshowSection.style.display = 'block';
    console.log('👁️ Showing slideshow section (homepage)');
  }
}
    
    this.setupFooter();
    this.setupEventListeners();
    this.setupPreviewModal();
    this.initHeroSlideshow();
    this.setupHeroButtons();
    this.setupFABFunctionality();
    
    // NEW: Setup scroll behavior
    this.setupScrollBehavior();
    
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
      
      // DEBUG: Check if CSV data is properly loaded
      console.log('🔍 Loaded data from data.json');
      this.debugCSVData();
      
    } else {
      throw new Error(`Failed to load data: ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️ Loading mock data instead');
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
  
  // FIXED: Reset scroll position first
  this.resetScrollPosition();
  
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

  // HIDE brands and slideshow sections on category pages
  this.updateSectionVisibility(false);

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

  // REPLACE the addBreadcrumbNavigation function in public/script.js:

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

  // Home link
  const homeLink = document.createElement('a');
  homeLink.href = '#';
  homeLink.textContent = 'Home';
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
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const pathSegments = crumb.path.split('/').filter(Boolean);
        this.currentPath = pathSegments;
        
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
        
        this.showCategoryView();
      });
      breadcrumbNav.appendChild(link);
    }
  });

  // FIXED: Insert breadcrumbs AFTER hero title and subtitle
  const heroTitle = hero.querySelector('.hero-title');
  const heroSubtitle = hero.querySelector('.hero-subtitle');
  
  if (heroSubtitle) {
    // Insert after subtitle
    heroSubtitle.insertAdjacentElement('afterend', breadcrumbNav);
  } else if (heroTitle) {
    // Insert after title if no subtitle
    heroTitle.insertAdjacentElement('afterend', breadcrumbNav);
  } else {
    // Fallback: append to hero content
    hero.appendChild(breadcrumbNav);
  }
}

  // LOCATION: public/script.js
// REPLACE: The entire renderCategoryContents function (around line 600) with this ENHANCED version:

renderCategoryContents(currentNode, breadcrumbs) {
  const container = document.getElementById('dynamicSections');
  if (!container) return;

  console.log('🔍 DEEP NESTED DEBUG: Current node structure:', currentNode);
  console.log('🗂️ BREADCRUMBS:', breadcrumbs.map(b => b.name).join(' > '));

  const items = Object.entries(currentNode).map(([key, item]) => {
    const currentPath = breadcrumbs.length > 0 ? breadcrumbs.map(b => b.name).join('/') + '/' + key : key;
    
    // COMPREHENSIVE DEBUG: Check ALL possible TopOrder variations
    console.log(`🔍 DEEP ITEM DEBUG for ${key} at path ${currentPath}:`, {
      fullItem: item,
      keys: Object.keys(item),
      TopOrder: item.TopOrder,
      topOrder: item.topOrder,
      'Top Order': item['Top Order'],
      'TOP ORDER': item['TOP ORDER'],
      Order: item.Order,
      order: item.order,
      Priority: item.Priority,
      priority: item.priority,
      Rank: item.Rank,
      rank: item.rank,
      Sort: item.Sort,
      sort: item.sort
      
    });

    const extractTopOrder = (item, itemKey, fullPath) => {
      // Check EVERY possible variation
      const variations = [
        'TopOrder', 'topOrder', 'Top Order', 'TOP ORDER',
        'Order', 'order', 'ORDER',
        'Priority', 'priority', 'PRIORITY',
        'Rank', 'rank', 'RANK',
        'Sort', 'sort', 'SORT',
        'Position', 'position', 'POSITION'
      ];
      
      for (const variation of variations) {
        const value = item[variation];
        if (value !== undefined && value !== null && value !== '') {
          const parsed = parseInt(value);
          if (!isNaN(parsed)) {
            console.log(`✅ DEEP SUCCESS: Found ${variation} for ${itemKey} at ${fullPath}: ${value} → ${parsed}`);
            return parsed;
          } else {
            console.log(`⚠️ DEEP Found ${variation} but can't parse: ${value} for ${itemKey}`);
          }
        }
      }
      
      console.log(`❌ DEEP NO TopOrder found for ${itemKey} at ${fullPath}, using default 999`);
      return 999;
    };

    const topOrder = extractTopOrder(item, key, currentPath);

    if (item.isProduct) {
      return {
        key,
        title: key,
        description: 'Premium product from our luxury collection',
        count: 1,
        thumbnail: item.thumbnail || this.getEmojiForCategory('PRODUCT'),
        isProduct: true,
        driveLink: item.driveLink,
        topOrder: topOrder,
        fullPath: currentPath,
        fullPath: currentPath,
        alignment: item.alignment || item.Alignment || item.ALIGNMENT,
        fitting: item.fitting || item.Fitting || item.FITTING,
        scaling: item.scaling || item.Scaling || item.SCALING
      };
    } else {
      return {
        key,
        title: key.replace(/_/g, ' '),
        description: `Explore ${item.count || 0} items in this collection`,
        count: item.count || 0,
        thumbnail: item.thumbnail || this.getEmojiForCategory(key),
        isProduct: false,
        topOrder: topOrder,
        fullPath: currentPath,
        fullPath: currentPath,
        alignment: item.alignment || item.Alignment || item.ALIGNMENT,
        fitting: item.fitting || item.Fitting || item.FITTING,
        scaling: item.scaling || item.Scaling || item.SCALING
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

  // DEBUG: Show extracted topOrder values with full paths
  console.log('🎯 DEEP EXTRACTED TopOrder VALUES:');
  items.forEach(item => {
    console.log(`   ${item.fullPath}: TopOrder=${item.topOrder} (${item.isProduct ? 'PRODUCT' : 'FOLDER'})`);
  });

  // ENHANCED SORTING: TopOrder has ABSOLUTE PRIORITY at ANY depth
  const currentDepth = breadcrumbs.length;
  console.log(`📊 DEEP SORTING ${items.length} items at depth ${currentDepth} by TopOrder (absolute priority)`);

  items.sort((a, b) => {
    console.log(`🔄 DEEP Comparing: ${a.title}(${a.topOrder}) vs ${b.title}(${b.topOrder})`);
    
    // TopOrder has ABSOLUTE PRIORITY - works at any depth
    if (a.topOrder !== b.topOrder) {
      const result = a.topOrder - b.topOrder;
      console.log(`  → 🏆 DEEP TopOrder WINS: ${result > 0 ? b.title : a.title} (${result > 0 ? b.topOrder : a.topOrder})`);
      return result;
    }
    
    // If TopOrder is equal, folders come before products
    if (a.isProduct !== b.isProduct) {
      return a.isProduct ? 1 : -1; // Folders first
    }
    
    // If same type and folders, sort by count
    if (!a.isProduct && !b.isProduct && a.count !== b.count) {
      return b.count - a.count; // Higher count first for folders
    }
    
    // Finally alphabetically
    return a.title.localeCompare(b.title);
  });

  console.log(`✅ DEEP FINAL SORT ORDER at depth ${currentDepth}:`);
  items.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.title} (TopOrder: ${item.topOrder})`);
  });

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

  if (gridClass === 'grid-smart') {
    setTimeout(() => {
      const gridContainer = document.getElementById(containerId);
      if (gridContainer) this.addSmartCentering(gridContainer, items.length);
    }, 10);
  }
}

  
debugCSVData() {
  console.log('=== CSV DATA DEBUG ===');
  console.log('Full data object:', this.data);
  
  if (this.data && this.data.catalog && this.data.catalog.tree) {
    console.log('Catalog tree structure:');
    
    // Walk through the tree and log topOrder values
    const walkTree = (node, path = []) => {
      Object.entries(node).forEach(([key, item]) => {
        const currentPath = [...path, key];
        const topOrder = item.topOrder || item['Top Order'] || item.top_order || 'NOT FOUND';
        
        console.log(`${currentPath.join('/')} - topOrder: ${topOrder}`, item);
        
        if (item.children && !item.isProduct) {
          walkTree(item.children, currentPath);
        }
      });
    };
    
    walkTree(this.data.catalog.tree);
  } else {
    console.log('❌ No catalog tree found in data');
  }
  console.log('=== END DEBUG ===');
}
// ADD this new helper function after renderCategoryContents:

/**
 * Enhanced sorting for any category items
 * @param {Array} items - Array of items to sort
 * @param {boolean} isHomepage - Whether this is for homepage (uses existing logic)
 * @returns {Array} Sorted items
 */
sortItemsEnhanced(items, isHomepage = false) {
  if (isHomepage) {
    // Homepage: use existing topOrder logic only
    return items.sort((a, b) => a.topOrder - b.topOrder);
  }
  
  // Category pages: enhanced sorting
  const folders = items.filter(item => !item.isProduct);
  const products = items.filter(item => item.isProduct);

  // Sort folders: topOrder → count → alphabetical
  folders.sort((a, b) => {
    if (a.topOrder !== b.topOrder) {
      return a.topOrder - b.topOrder;
    }
    if (a.count !== b.count) {
      return b.count - a.count; // Higher count first
    }
    return a.title.localeCompare(b.title);
  });

  // Sort products: topOrder → alphabetical  
  products.sort((a, b) => {
    if (a.topOrder !== b.topOrder) {
      return a.topOrder - b.topOrder;
    }
    return a.title.localeCompare(b.title);
  });

  return [...folders, ...products];
}

  setupPreviewModal() {
  // Remove any existing modal
  const existingModal = document.getElementById('drivePreviewModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  console.log('🔨 Creating simplified preview modal...');
  
  // Create modal with INLINE STYLES for guaranteed rendering
  const modal = document.createElement('div');
  modal.id = 'drivePreviewModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10000;
    display: none;
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
    align-items: center;
    justify-content: center;
  `;
  
  modal.innerHTML = `
    <div id="previewOverlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; cursor: pointer;"></div>
    
    <div class="preview-wrapper" style="
      position: relative;
      z-index: 10001;
      width: 90%;
      max-width: 1200px;
      height: 90%;
      display: flex;
      flex-direction: column;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    ">
      
      <!-- Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        background: rgba(0, 0, 0, 0.95);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        flex-shrink: 0;
      ">
        <div id="previewTitle" style="
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">Product Gallery</div>
        
        <button id="previewClose" style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 2rem;
          font-weight: 300;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          flex-shrink: 0;
        " title="Close">×</button>
      </div>
      
      <!-- Image Container -->
      <div id="previewContent" style="
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        overflow: hidden;
        position: relative;
        background: #000;
        min-height: 0;
      ">
        <div class="preview-loading" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: white;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          "></div>
          <span>Loading images...</span>
        </div>
      </div>
      
      <!-- Navigation -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        background: rgba(0, 0, 0, 0.95);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        flex-shrink: 0;
      ">
        <button id="previewPrev" style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-size: 2rem;
          font-weight: 300;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          flex-shrink: 0;
        " title="Previous">‹</button>
        
        <div style="
          font-size: 1rem;
          font-weight: 500;
          color: white;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          min-width: 80px;
          text-align: center;
        ">
          <span id="previewCurrent">1</span> / <span id="previewTotal">1</span>
        </div>
        
        <button id="previewNext" style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-size: 2rem;
          font-weight: 300;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          flex-shrink: 0;
        " title="Next">›</button>
      </div>
      
    </div>
  `;
  
  document.body.appendChild(modal);
  console.log('✅ Modal created with inline styles');
  
  // Bind events
  this.bindPreviewEventsSimple();
}





  
bindPreviewEventsSimple() {
  const modal = document.getElementById('drivePreviewModal');
  const overlay = document.getElementById('previewOverlay');
  const closeBtn = document.getElementById('previewClose');
  const prevBtn = document.getElementById('previewPrev');
  const nextBtn = document.getElementById('previewNext');
  
  console.log('🔗 Binding simple events...');
  
  // Close events
  closeBtn?.addEventListener('click', () => {
    console.log('❌ Close clicked');
    this.closePreview();
  });
  
  overlay?.addEventListener('click', () => {
    console.log('❌ Overlay clicked');
    this.closePreview();
  });
  
  // Navigation events - UPDATED to use new method names
  prevBtn?.addEventListener('click', () => {
    console.log('⬅️ Prev clicked, current index:', this.currentPreview?.currentIndex);
    this.showPreviousMedia(); // CHANGED
  });
  
  nextBtn?.addEventListener('click', () => {
    console.log('➡️ Next clicked, current index:', this.currentPreview?.currentIndex);
    this.showNextMedia(); // CHANGED
  });
  
  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (modal?.style.display !== 'flex') return;
    
    console.log('⌨️ Key:', e.key);
    
    if (e.key === 'Escape') this.closePreview();
    if (e.key === 'ArrowLeft') this.showPreviousMedia(); // CHANGED
    if (e.key === 'ArrowRight') this.showNextMedia(); // CHANGED
  });
  
  console.log('✅ Events bound');
}


  
isPreviewActive() {
  const modal = document.getElementById('drivePreviewModal');
  return modal && modal.classList.contains('active');
}

openPreview(product, productTitle) {
  console.log('🎯 Opening UNIFIED preview for:', productTitle);
  console.log('📦 Product data:', product);
  
  // Build priority-ordered media array
  const priorityMedia = this.buildPriorityMedia(product);
  
  if (priorityMedia.length === 0) {
    console.log('⚠️ No media available, opening Drive');
    if (product?.driveLink) {
      window.open(product.driveLink, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  
  // Ensure modal exists
  this.setupPreviewModal();
  
  // Set data
  this.currentPreview = {
    media: priorityMedia,
    currentIndex: 0,
    title: productTitle,
    preloadedIndices: new Set() // Track preloaded items
  };
  
  console.log(`✅ Priority media order: ${priorityMedia.length} items`);
  console.log('Priority breakdown:', {
    r2Videos: priorityMedia.filter(m => m.type === 'r2-video').length,
    firstPhotos: priorityMedia.filter((m, i) => m.type === 'image' && i < 4).length,
    otherVideos: priorityMedia.filter(m => m.type === 'drive-video').length,
    remainingPhotos: priorityMedia.filter((m, i) => m.type === 'image' && i >= 4).length
  });
  
  // Update title
  document.getElementById('previewTitle').textContent = productTitle;
  
  // Show modal
  const modal = document.getElementById('drivePreviewModal');
  modal.style.display = 'flex';
  
  // Lock scroll
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  
  console.log('✅ Modal visible');
  
  // Show first item and preload initial batch
  setTimeout(() => {
    this.showCurrentMedia();
    this.preloadInitialBatch();
  }, 100);
}

// Build priority-ordered media array
buildPriorityMedia(product) {
  const media = [];
  
  // 1. R2 Video (if exists) - HIGHEST PRIORITY
  if (product?.videoPreview?.videos?.length > 0) {
    product.videoPreview.videos.forEach(video => {
      media.push({
        type: 'r2-video',
        url: video.url,
        name: video.name,
        source: 'r2'
      });
    });
    console.log(`🎬 Added ${product.videoPreview.videos.length} R2 video(s) as priority 1`);
  }
  
  // 2. First 3 Drive Photos - SECOND PRIORITY
  if (product?.preview?.images?.length > 0) {
    const first3Photos = product.preview.images.slice(0, 3);
    first3Photos.forEach(img => {
      media.push({
        type: 'image',
        id: img.id,
        name: img.name,
        viewUrl: img.viewUrl,
        driveUrl: img.driveUrl,
        source: 'drive'
      });
    });
    console.log(`📸 Added ${first3Photos.length} photo(s) as priority 2`);
  }
  
  // 3. All Drive Videos (alphabetically sorted) - THIRD PRIORITY
  if (product?.preview?.videos?.length > 0) {
    const sortedVideos = [...product.preview.videos].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    sortedVideos.forEach(video => {
      media.push({
        type: 'drive-video',
        id: video.id,
        name: video.name,
        embedUrl: video.embedUrl,
        driveUrl: video.driveUrl,
        source: 'drive'
      });
    });
    console.log(`🎥 Added ${sortedVideos.length} Drive video(s) as priority 3`);
  }
  
  // 4. Remaining Drive Photos (after first 3) - LOWEST PRIORITY
  if (product?.preview?.images?.length > 3) {
    const remainingPhotos = product.preview.images.slice(3);
    remainingPhotos.forEach(img => {
      media.push({
        type: 'image',
        id: img.id,
        name: img.name,
        viewUrl: img.viewUrl,
        driveUrl: img.driveUrl,
        source: 'drive'
      });
    });
    console.log(`📸 Added ${remainingPhotos.length} remaining photo(s) as priority 4`);
  }
  
  console.log(`\n🎯 FINAL PRIORITY ORDER (${media.length} total):`);
  media.forEach((item, i) => {
    const priority = i === 0 && item.type === 'r2-video' ? '🥇' :
                    i < 4 && item.type === 'image' ? '🥈' :
                    item.type === 'drive-video' ? '🥉' : '4️⃣';
    console.log(`   ${priority} ${i + 1}. [${item.type}] ${item.name}`);
  });
  
  return media;
}

// NEW: Preload initial batch (first 5 photos + 1 R2 video)
preloadInitialBatch() {
  if (!this.currentPreview?.media) return;
  
  console.log('🚀 Preloading initial batch...');
  
  let photosPreloaded = 0;
  let r2VideoPreloaded = false;
  
  this.currentPreview.media.forEach((item, index) => {
    // Preload first R2 video
    if (item.type === 'r2-video' && !r2VideoPreloaded) {
      this.preloadVideo(item, index);
      r2VideoPreloaded = true;
      return;
    }
    
    // Preload first 5 photos
    if (item.type === 'image' && photosPreloaded < 5) {
      this.preloadImage(item, index);
      photosPreloaded++;
      return;
    }
  });
  
  console.log(`✅ Preloaded: ${photosPreloaded} photos + ${r2VideoPreloaded ? 1 : 0} R2 video`);
}

// NEW: Preload individual image
preloadImage(imageItem, index) {
  if (this.currentPreview.preloadedIndices.has(index)) return;
  
  const img = new Image();
  img.onload = () => {
    this.currentPreview.preloadedIndices.add(index);
    console.log(`✅ Preloaded image ${index + 1}: ${imageItem.name}`);
  };
  img.onerror = () => {
    console.log(`⚠️ Failed to preload image ${index + 1}: ${imageItem.name}`);
  };
  
  const imageUrls = [
    `https://lh3.googleusercontent.com/d/${imageItem.id}=w2000`,
    `https://lh3.googleusercontent.com/d/${imageItem.id}`,
    `https://drive.google.com/uc?export=view&id=${imageItem.id}`
  ];
  
  img.src = imageUrls[0];
}

// NEW: Preload individual video
preloadVideo(videoItem, index) {
  if (this.currentPreview.preloadedIndices.has(index)) return;
  
  // For videos, just mark as "attempted"
  this.currentPreview.preloadedIndices.add(index);
  console.log(`✅ Marked video ${index + 1} for preload: ${videoItem.name}`);
}

showCurrentMedia() {
  if (!this.currentPreview?.media) {
    console.error('❌ No preview data');
    return;
  }
  
  const { media, currentIndex } = this.currentPreview;
  const currentItem = media[currentIndex];
  
  console.log(`\n🎬 Showing item ${currentIndex + 1}/${media.length}:`);
  console.log(`   Type: ${currentItem.type}`);
  console.log(`   Name: ${currentItem.name}`);
  console.log(`   Source: ${currentItem.source}`);
  
  // Update UI
  document.getElementById('previewCurrent').textContent = currentIndex + 1;
  document.getElementById('previewTotal').textContent = media.length;
  
  // Update buttons
  const prevBtn = document.getElementById('previewPrev');
  const nextBtn = document.getElementById('previewNext');
  
  if (prevBtn) {
    prevBtn.disabled = currentIndex === 0;
    prevBtn.style.opacity = currentIndex === 0 ? '0.3' : '1';
    prevBtn.style.cursor = currentIndex === 0 ? 'not-allowed' : 'pointer';
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentIndex === media.length - 1;
    nextBtn.style.opacity = currentIndex === media.length - 1 ? '0.3' : '1';
    nextBtn.style.cursor = currentIndex === media.length - 1 ? 'not-allowed' : 'pointer';
  }
  
  // Show loading
  const content = document.getElementById('previewContent');
  const mediaTypeLabel = currentItem.type === 'r2-video' ? 'R2 Video' :
                         currentItem.type === 'drive-video' ? 'Drive Video' :
                         'Photo';
  
  content.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; color: white;">
      <div style="width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.2); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <span>Loading ${mediaTypeLabel}...</span>
    </div>
  `;
  
  // Render based on type
  if (currentItem.type === 'image') {
    this.renderImage(currentItem, content);
  } else if (currentItem.type === 'r2-video') {
    this.renderR2Video(currentItem, content);
  } else if (currentItem.type === 'drive-video') {
    this.renderDriveVideo(currentItem, content);
  }
  
  // Lazy load next item if not preloaded
  this.lazyLoadNext();
}

// NEW: Render image
renderImage(imageItem, container) {
  const img = new Image();
  const imageUrls = [
    `https://lh3.googleusercontent.com/d/${imageItem.id}=w2000`,
    `https://lh3.googleusercontent.com/d/${imageItem.id}`,
    `https://drive.google.com/uc?export=view&id=${imageItem.id}`
  ];
  
  let urlIndex = 0;
  
  const tryNext = () => {
    if (urlIndex >= imageUrls.length) {
      console.error('❌ All image URLs failed');
      container.innerHTML = `
        <div style="text-align: center; color: white;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">🖼️</div>
          <h3 style="margin-bottom: 0.5rem;">Image unavailable</h3>
          <p style="opacity: 0.8; margin-bottom: 1rem;">${imageItem.name}</p>
          <button onclick="window.open('${imageItem.driveUrl}', '_blank')" style="
            padding: 0.75rem 1.5rem;
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
          ">Open in Drive</button>
        </div>
      `;
      return;
    }
    
    console.log(`🔄 Trying image URL ${urlIndex + 1}/${imageUrls.length}`);
    img.src = imageUrls[urlIndex];
    urlIndex++;
  };
  
  img.onload = () => {
    console.log('✅ Image loaded successfully');
    container.innerHTML = `
      <img src="${img.src}" 
           alt="${imageItem.name}"
           onclick="window.catalogApp.showNextMedia()"
           style="
             max-width: 100%;
             max-height: 100%;
             width: auto;
             height: auto;
             object-fit: contain;
             object-position: center center;
             border-radius: 8px;
             cursor: pointer;
             display: block;
             margin: 0 auto;
           ">
    `;
  };
  
  img.onerror = () => {
    console.warn(`⚠️ Image URL ${urlIndex} failed`);
    tryNext();
  };
  
  tryNext();
}

// NEW: Render R2 video
renderR2Video(videoItem, container) {
  console.log(`🎬 Rendering R2 video: ${videoItem.name}`);
  
  container.innerHTML = `
    <video 
      controls 
      autoplay 
      style="
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      "
      onloadedmetadata="console.log('✅ R2 video loaded')"
      onerror="console.error('❌ R2 video failed to load')">
      <source src="${videoItem.url}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  `;
  
  const video = container.querySelector('video');
  video.play().catch(err => {
    console.log('⚠️ Autoplay blocked, user must click play');
  });
}

// NEW: Render Drive video
renderDriveVideo(videoItem, container) {
  console.log(`🎥 Rendering Drive video: ${videoItem.name}`);
  
  container.innerHTML = `
    <iframe 
      src="${videoItem.embedUrl}" 
      style="
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 8px;
      "
      allow="autoplay"
      onload="console.log('✅ Drive video embedded')"
      onerror="console.error('❌ Drive video embed failed')">
    </iframe>
  `;
}

// NEW: Lazy load next item
lazyLoadNext() {
  if (!this.currentPreview?.media) return;
  
  const nextIndex = this.currentPreview.currentIndex + 1;
  if (nextIndex >= this.currentPreview.media.length) return;
  
  const nextItem = this.currentPreview.media[nextIndex];
  
  // Only preload if not already done
  if (!this.currentPreview.preloadedIndices.has(nextIndex)) {
    if (nextItem.type === 'image') {
      this.preloadImage(nextItem, nextIndex);
    } else if (nextItem.type === 'r2-video' || nextItem.type === 'drive-video') {
      this.preloadVideo(nextItem, nextIndex);
    }
  }
}

// REPLACE showPreviousImage with this:
showPreviousMedia() {
  if (!this.currentPreview) {
    console.error('❌ No preview data available');
    return;
  }
  
  if (this.currentPreview.currentIndex <= 0) {
    console.log('⚠️ Already at first item');
    return;
  }
  
  this.currentPreview.currentIndex--;
  console.log(`⬅️ Previous: Moving to item ${this.currentPreview.currentIndex + 1}/${this.currentPreview.media.length}`);
  this.showCurrentMedia();
}

// REPLACE showNextImage with this:
showNextMedia() {
  if (!this.currentPreview) {
    console.error('❌ No preview data available');
    return;
  }
  
  if (this.currentPreview.currentIndex >= this.currentPreview.media.length - 1) {
    console.log('⚠️ Already at last item');
    return;
  }
  
  this.currentPreview.currentIndex++;
  console.log(`➡️ Next: Moving to item ${this.currentPreview.currentIndex + 1}/${this.currentPreview.media.length}`);
  this.showCurrentMedia();
}

showCurrentImage() {
  if (!this.currentPreview?.images) {
    console.error('❌ No preview data');
    return;
  }
  
  const { images, currentIndex } = this.currentPreview;
  const currentImage = images[currentIndex];
  
  console.log(`🖼️ Showing image ${currentIndex + 1}/${images.length}: ${currentImage.name}`);
  
  // Update UI
  document.getElementById('previewCurrent').textContent = currentIndex + 1;
  document.getElementById('previewTotal').textContent = images.length;
  
  // Update buttons
  const prevBtn = document.getElementById('previewPrev');
  const nextBtn = document.getElementById('previewNext');
  
  if (prevBtn) {
    prevBtn.disabled = currentIndex === 0;
    prevBtn.style.opacity = currentIndex === 0 ? '0.3' : '1';
    prevBtn.style.cursor = currentIndex === 0 ? 'not-allowed' : 'pointer';
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentIndex === images.length - 1;
    nextBtn.style.opacity = currentIndex === images.length - 1 ? '0.3' : '1';
    nextBtn.style.cursor = currentIndex === images.length - 1 ? 'not-allowed' : 'pointer';
  }
  
  // Show loading
  const content = document.getElementById('previewContent');
  content.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; color: white;">
      <div style="width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.2); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <span>Loading image...</span>
    </div>
  `;
  
  // Load image
  const img = new Image();
  const imageUrls = [
    `https://lh3.googleusercontent.com/d/${currentImage.id}=w2000`,
    `https://lh3.googleusercontent.com/d/${currentImage.id}`,
    `https://drive.google.com/uc?export=view&id=${currentImage.id}`
  ];
  
  let urlIndex = 0;
  
  const tryNext = () => {
    if (urlIndex >= imageUrls.length) {
      console.error('❌ All URLs failed');
      content.innerHTML = `
        <div style="text-align: center; color: white;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">🖼️</div>
          <h3 style="margin-bottom: 0.5rem;">Image preview unavailable</h3>
          <p style="opacity: 0.8; margin-bottom: 1rem;">${currentImage.name}</p>
          <button onclick="window.open('${currentImage.driveUrl}', '_blank')" style="
            padding: 0.75rem 1.5rem;
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
          ">Open in Google Drive</button>
        </div>
      `;
      return;
    }
    
    console.log(`🔄 Trying URL ${urlIndex + 1}/${imageUrls.length}`);
    img.src = imageUrls[urlIndex];
    urlIndex++;
  };
  
  img.onload = () => {
    console.log('✅ Image loaded successfully');
    
    // CRITICAL: Use inline styles for guaranteed centering
    content.innerHTML = `
      <img src="${img.src}" 
           alt="${currentImage.name}"
           onclick="window.catalogApp.showNextImage()"
           style="
             max-width: 100%;
             max-height: 100%;
             width: auto;
             height: auto;
             object-fit: contain;
             object-position: center center;
             border-radius: 8px;
             cursor: pointer;
             display: block;
             margin: 0 auto;
           ">
    `;
  };
  
  img.onerror = () => {
    console.warn(`⚠️ URL ${urlIndex} failed`);
    tryNext();
  };
  
  tryNext();
}
    


showPreviousImage() {
  if (!this.currentPreview) {
    console.error('❌ No preview data available');
    return;
  }
  
  if (this.currentPreview.currentIndex <= 0) {
    console.log('⚠️ Already at first image');
    return;
  }
  
  this.currentPreview.currentIndex--;
  console.log(`⬅️ Previous: Moving to image ${this.currentPreview.currentIndex + 1}/${this.currentPreview.images.length}`);
  this.showCurrentImage();
}

showNextImage() {
  if (!this.currentPreview) {
    console.error('❌ No preview data available');
    return;
  }
  
  if (this.currentPreview.currentIndex >= this.currentPreview.images.length - 1) {
    console.log('⚠️ Already at last image');
    return;
  }
  
  this.currentPreview.currentIndex++;
  console.log(`➡️ Next: Moving to image ${this.currentPreview.currentIndex + 1}/${this.currentPreview.images.length}`);
  this.showCurrentImage();
}

closePreview() {
  console.log('🔓 Closing preview...');
  
  const modal = document.getElementById('drivePreviewModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  
  // Restore body scroll
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.documentElement.style.overflow = '';
  
  this.currentPreview = null;
  
  console.log('✅ Preview closed, scroll restored');
}



  // Debug function to check modal state
debugModalState() {
  const modal = document.getElementById('drivePreviewModal');
  console.log('🔍 Modal Debug:');
  console.log('  - Exists:', !!modal);
  if (modal) {
    console.log('  - Display:', window.getComputedStyle(modal).display);
    console.log('  - Visibility:', window.getComputedStyle(modal).visibility);
    console.log('  - Z-index:', window.getComputedStyle(modal).zIndex);
    console.log('  - Position:', window.getComputedStyle(modal).position);
    console.log('  - Classes:', modal.className);
    console.log('  - Has active class:', modal.classList.contains('active'));
  }
}

  
  navigateToHome() {
  // Remove category page attribute
  document.body.removeAttribute('data-page-type');
  
  // FIXED: Reset scroll position first
  this.resetScrollPosition();
  
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
  
  // FIXED: SHOW brands and slideshow sections on homepage
  this.updateSectionVisibility(true);
  
  // Reset hero
  this.setupBrandInfo();
  
  // Remove breadcrumbs
  const existingBreadcrumbs = document.querySelector('.breadcrumb-nav');
  if (existingBreadcrumbs) {
    existingBreadcrumbs.remove();
  }
}

// Helper function to control section visibility
updateSectionVisibility(showSections) {
  const brandsSection = document.querySelector('.brands-section');
  const slideshowSection = document.querySelector('.slideshow-section');
  
  const displayValue = showSections ? 'block' : 'none';
  
  if (brandsSection) {
    brandsSection.style.display = displayValue;
    console.log(`${showSections ? '👁️ Showing' : '🙈 Hiding'} brands section`);
  }
  
  if (slideshowSection) {
    slideshowSection.style.display = displayValue;
    console.log(`${showSections ? '👁️ Showing' : '🙈 Hiding'} slideshow section`);
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
async initHeroSlideshow() {
  // Only run on homepage
  if (this.currentBrand || this.breadcrumbs.length > 0) {
    return;
  }
  
  const heroSlideshow = document.getElementById('heroSlideshow');
  if (!heroSlideshow) return;
  
  try {
    // Fetch pre-generated slideshow data
    const response = await fetch('/slideshow.json');
    if (!response.ok) {
      throw new Error('Slideshow data not found');
    }
    
    const slideshowItems = await response.json();
    
    console.log('Loaded slideshow items:', slideshowItems.length);
    
    if (slideshowItems.length === 0) {
      // Fallback placeholder
      heroSlideshow.innerHTML = '<div class="hero-slide-image active"><img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop" alt="Luxury"></div>';
      return;
    }
    
    // Clear any existing content
    heroSlideshow.innerHTML = '';
    
    // Create slides
    slideshowItems.forEach((item, index) => {
      const slide = document.createElement('div');
      slide.className = 'hero-slide-image';
      if (index === 0) slide.classList.add('active');
      
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.title;
      img.loading = index === 0 ? 'eager' : 'lazy';
      
      slide.appendChild(img);
      heroSlideshow.appendChild(slide);
    });
    
    // Auto-rotate if multiple slides
    if (slideshowItems.length > 1) {
      let currentSlide = 0;
      const slides = heroSlideshow.querySelectorAll('.hero-slide-image');
      
      setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
      }, 5000);
    }
    
  } catch (error) {
    console.error('Failed to load slideshow:', error);
    // Fallback placeholder
    heroSlideshow.innerHTML = '<div class="hero-slide-image active"><img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop" alt="Luxury"></div>';
  }
}

setupHeroButtons() {
  // "Explore all Luxury Brands" button
  const exploreAllBtn = document.querySelector('.hero-btn-primary');
  if (exploreAllBtn) {
    exploreAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const brandsSection = document.querySelector('.brands-section');
      if (brandsSection) {
        brandsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
  
  // "Explore CHANEL Collection" button
  const chanelBtn = document.querySelector('.hero-btn-secondary');
  if (chanelBtn) {
    chanelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Find CHANEL in brands
      const chanelBrand = Object.keys(this.data?.brands || {}).find(
        brand => brand.toLowerCase().includes('chanel')
      );
      
      if (chanelBrand) {
        this.currentBrand = chanelBrand;
        this.renderCurrentView();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('CHANEL collection not found');
      }
    });
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
      // DEBUG: Log items as they're processed
      console.log(`🔍 Processing item ${key}:`, {
        alignment: item.alignment,
        fitting: item.fitting, 
        scaling: item.scaling,
        fullItem: item
      });
      
      allItems.push({
        key,
        title: key.replace(/_/g, ' '),
        description: `Explore our premium ${key.toLowerCase().replace('_', ' ')} collection`,
        count: item.count || 0,
        thumbnail: item.thumbnail || '',
        topOrder: item.topOrder || 999,
        // ENSURE all image properties are passed through
        alignment: item.alignment || item.Alignment || item.ALIGNMENT,
        fitting: item.fitting || item.Fitting || item.FITTING,
        scaling: item.scaling || item.Scaling || item.SCALING,
      });
    });

    if (allItems.length > 0) {
      const sectionHTML = this.createSectionHTML('', allItems);
      container.insertAdjacentHTML('beforeend', sectionHTML);
    }
  }
}

  // LOCATION: public/script.js
// REPLACE: Find the groupItemsBySection() function (around line 400) and replace it entirely:

groupItemsBySection() {
  this.sections.clear();
  
  Object.entries(this.data.catalog.tree).forEach(([key, item]) => {
    const section = item.section || 'Featured';
    
    if (!this.sections.has(section)) {
      this.sections.set(section, []);
    }
    
    // FIXED: Extract TopOrder with comprehensive fallback for HOMEPAGE
    const getTopOrder = (item) => {
      const variations = [
        'TopOrder', 'topOrder', 'Top Order', 'TOP ORDER',
        'Order', 'order', 'ORDER',
        'Priority', 'priority', 'PRIORITY',
        'Rank', 'rank', 'RANK',
        'Sort', 'sort', 'SORT'
      ];
      
      for (const variation of variations) {
        const value = item[variation];
        if (value !== undefined && value !== null && value !== '') {
          const parsed = parseInt(value);
          if (!isNaN(parsed)) {
            console.log(`✅ HOMEPAGE TopOrder for ${key}: ${variation} = ${parsed}`);
            return parsed;
          }
        }
      }
      
      console.log(`⚠️ No TopOrder found for ${key} on homepage, using default 999`);
      return 999;
    };
    
    this.sections.get(section).push({
      key,
      title: key.replace(/_/g, ' '),
      description: `Explore our premium ${key.toLowerCase()} collection with ${item.count || 0} items`,
      count: item.count || 0,
      thumbnail: item.thumbnail || this.getEmojiForCategory(key),
      topOrder: getTopOrder(item),
      // Pass through image configuration
      alignment: item.alignment || item.Alignment || item.ALIGNMENT,
      fitting: item.fitting || item.Fitting || item.FITTING,
      scaling: item.scaling || item.Scaling || item.SCALING
    });
  });

  // FIXED: Sort each section by TopOrder on HOMEPAGE
  this.sections.forEach((items, sectionName) => {
    items.sort((a, b) => {
      console.log(`🏠 HOMEPAGE sorting in ${sectionName}: ${a.title}(${a.topOrder}) vs ${b.title}(${b.topOrder})`);
      
      // TopOrder has ABSOLUTE priority on homepage too
      if (a.topOrder !== b.topOrder) {
        const result = a.topOrder - b.topOrder;
        console.log(`  → 🏆 HOMEPAGE TopOrder WINS: ${result > 0 ? b.title : a.title}`);
        return result;
      }
      
      // Secondary sort by count (higher first)
      if (a.count !== b.count) {
        return b.count - a.count;
      }
      
      // Tertiary sort alphabetically
      return a.title.localeCompare(b.title);
    });
    
    console.log(`📋 Final HOMEPAGE ${sectionName} order:`, items.map(item => `${item.title}(${item.topOrder})`));
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

  // REPLACE the createCardHTML function in public/script.js:

createCardHTML(item) {
  const imageSrc = item.thumbnail && item.thumbnail !== '' ? item.thumbnail : '';
  
  // Extract image config
  const imageConfig = this.extractImageConfig(item);
  console.log('🔍 Image config for', item.title, ':', imageConfig);
  
  let imageContent = '';
  
  if (imageSrc) {
    // Check if using background-image method
    const isBackgroundMethod = this.isBackgroundImageMethod(imageConfig.fitting);
    
    if (isBackgroundMethod) {
      console.log('🖼️ Using background-image method for', item.title);
      
      // Generate background-image styles
      const backgroundStyles = this.generateBackgroundImageStyles(imageSrc, imageConfig);
      
      // Create div with background-image instead of img tag
      imageContent = `<div class="card-image-background" style="${backgroundStyles}" data-method="background"></div>`;
      
    } else {
      console.log('📐 Using standard img tag method for', item.title);
      
      // Generate standard img styles
      const imageStyles = this.generateImageStyles(imageConfig);
      
      if (imageStyles === 'BACKGROUND_METHOD') {
        // Fallback: shouldn't happen but just in case
        imageContent = this.getEmojiForCategory(item.key);
      } else {
        imageContent = `<img src="${imageSrc}" alt="${item.title}" loading="lazy" 
             style="${imageStyles}" 
             class="card-image-enhanced"
             data-method="img-tag"
             onerror="this.parentElement.innerHTML='${this.getEmojiForCategory(item.key)}'">`;
      }
    }
  } else {
    // No image - show emoji placeholder
    imageContent = this.getEmojiForCategory(item.key);
  }

  const badgeText = item.isProduct ? 'View Product' : `${item.count} Items`;

  return `
    <div class="content-card" 
         data-category="${item.key}" 
         data-is-product="${item.isProduct || false}" 
         data-drive-link="${item.driveLink || ''}" 
         data-search-path="${item.fullPath || ''}"
         role="button" 
         tabindex="0">
      <div class="card-image card-image-container">
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

extractImageConfig(item) {
  console.log('Item data for image config:', item);
  
  // Extract raw values - only from explicit CSV data
  const rawAlignment = item.alignment || item.Alignment || item.ALIGNMENT || 
                      item.image_alignment || item.imageAlignment || item['Image Alignment'];
  const rawFitting = item.fitting || item.Fitting || item.FITTING || 
                    item.object_fit || item.objectFit || item['Object Fit'] || 
                    item.image_fit || item.imageFit || item['Image Fit'];
  const rawScaling = item.scaling || item.Scaling || item.SCALING || 
                    item.image_scale || item.imageScale || item['Image Scale'] || 
                    item.scale || item.Scale;
  
  // FIXED: Return explicit config or null (for GLOBAL defaults)
  // Items get either their explicit CSV config OR global defaults (cover + center)
  // NEVER inherit from folder - folders only use inheritance for their own display
  
  const hasExplicitConfig = (rawAlignment && rawAlignment.trim() !== '') || 
                           (rawFitting && rawFitting.trim() !== '') || 
                           (rawScaling && rawScaling.trim() !== '');
  
  if (hasExplicitConfig) {
    console.log(`✅ EXPLICIT config found for ${item.title || item.key}`);
    return {
      alignment: (rawAlignment && rawAlignment.trim() !== '') ? rawAlignment : null,
      fitting: (rawFitting && rawFitting.trim() !== '') ? rawFitting : null,     
      scaling: (rawScaling && rawScaling.trim() !== '') ? rawScaling : null
    };
  } else {
    console.log(`🌍 GLOBAL defaults will apply for ${item.title || item.key}`);
    return {
      alignment: null, // Will get global default (center center)
      fitting: null,   // Will get global default (cover)
      scaling: null
    };
  }
}
getBackgroundPosition(alignment) {
  if (!alignment) return 'center center';
  
  const alignmentStr = String(alignment).trim();
  console.log(`🔍 Processing alignment: "${alignmentStr}"`);
  
  // STEP 1: Check if it's a valid CSS background-position value
  if (this.isValidCSSPosition(alignmentStr)) {
    console.log(`✅ Valid CSS position, using as-is: "${alignmentStr}"`);
    return alignmentStr;
  }
  
  // STEP 2: Handle keyword mappings (center, top-left, etc.)
  const keywordResult = this.getKeywordPosition(alignmentStr);
  if (keywordResult) {
    console.log(`🎯 Keyword mapping: "${alignmentStr}" → "${keywordResult}"`);
    return keywordResult;
  }
  
  // STEP 3: Fallback to center
  console.log(`⚠️ Unrecognized alignment "${alignmentStr}" → fallback to "center center"`);
  return 'center center';
}

// ADD this helper function - detects ANY valid CSS position:
isValidCSSPosition(value) {
  // Patterns that are valid CSS background-position values
  const validPatterns = [
    // Two values: percentage, pixel, keyword combinations
    /^-?\d+(\.\d+)?%\s+-?\d+(\.\d+)?%$/, // "33% 67%", "-10% 120%"
    /^-?\d+(\.\d+)?px\s+-?\d+(\.\d+)?px$/, // "150px 75px", "-200px -100px"
    /^-?\d+(\.\d+)?%\s+-?\d+(\.\d+)?px$/, // "33% 150px"
    /^-?\d+(\.\d+)?px\s+-?\d+(\.\d+)?%$/, // "150px 33%"
    
    // Single values: will be expanded to "value center"
    /^-?\d+(\.\d+)?%$/, // "33%", "-10%"
    /^-?\d+(\.\d+)?px$/, // "150px", "-200px"
    
    // Keyword + value combinations
    /^(left|right|center)\s+-?\d+(\.\d+)?(px|%)$/, // "left 20px", "center 33%"
    /^-?\d+(\.\d+)?(px|%)\s+(top|bottom|center)$/, // "20px top", "33% center"
    /^(top|bottom|center)\s+-?\d+(\.\d+)?(px|%)$/, // "top 20px", "center 33%"
    /^-?\d+(\.\d+)?(px|%)\s+(left|right|center)$/, // "20px left", "33% center"
    
    // Pure keywords (handled separately but included for completeness)
    /^(left|right|center|top|bottom)(\s+(left|right|center|top|bottom))?$/
  ];
  
  // Check if value matches any valid pattern
  const isValid = validPatterns.some(pattern => pattern.test(value));
  
  if (isValid) {
    // Special handling for single values - add center for missing axis
    if (/^-?\d+(\.\d+)?(px|%)$/.test(value)) {
      console.log(`🔧 Single value detected, expanding: "${value}" → "${value} center"`);
      return false; // Will be handled in expandSingleValue
    }
    return true;
  }
  
  return false;
}

// ADD this helper function - handles keyword mappings:
getKeywordPosition(alignmentStr) {
  const normalized = alignmentStr.toLowerCase().replace(/[_-]/g, '-');
  
  // COMPLETE keyword mapping including all edge cases
  const positionMap = {
    // Basic positions
    'center': 'center center',
    'middle': 'center center',
    'top': 'center top',
    'bottom': 'center bottom',
    'left': 'left center',
    'right': 'right center',
    
    // All corner combinations
    'top-left': 'left top', 'top_left': 'left top', 'topleft': 'left top',
    'left-top': 'left top', 'left_top': 'left top', 'lefttop': 'left top',
    'top-right': 'right top', 'top_right': 'right top', 'topright': 'right top',
    'right-top': 'right top', 'right_top': 'right top', 'righttop': 'right top',
    'bottom-left': 'left bottom', 'bottom_left': 'left bottom', 'bottomleft': 'left bottom',
    'left-bottom': 'left bottom', 'left_bottom': 'left bottom', 'leftbottom': 'left bottom',
    'bottom-right': 'right bottom', 'bottom_right': 'right bottom', 'bottomright': 'right bottom',
    'right-bottom': 'right bottom', 'right_bottom': 'right bottom', 'rightbottom': 'right bottom',
    
    // All edge center combinations
    'center-top': 'center top', 'center_top': 'center top', 'centertop': 'center top',
    'top-center': 'center top', 'top_center': 'center top', 'topcenter': 'center top',
    'middle-top': 'center top', 'middle_top': 'center top', 'middletop': 'center top',
    
    'center-bottom': 'center bottom', 'center_bottom': 'center bottom', 'centerbottom': 'center bottom',
    'bottom-center': 'center bottom', 'bottom_center': 'center bottom', 'bottomcenter': 'center bottom',
    'middle-bottom': 'center bottom', 'middle_bottom': 'center bottom', 'middlebottom': 'center bottom',
    
    'left-center': 'left center', 'left_center': 'left center', 'leftcenter': 'left center',
    'center-left': 'left center', 'center_left': 'left center', 'centerleft': 'left center',
    'middle-left': 'left center', 'middle_left': 'left center', 'middleleft': 'left center',
    
    'right-center': 'right center', 'right_center': 'right center', 'rightcenter': 'right center',
    'center-right': 'right center', 'center_right': 'right center', 'centerright': 'right center',
    'middle-right': 'right center', 'middle_right': 'right center', 'middleright': 'right center',
    
    // CSS logical properties
    'start': 'left center', 'end': 'right center',
    'start-start': 'left top', 'start-end': 'left bottom',
    'end-start': 'right top', 'end-end': 'right bottom',
    
    // Space-separated (native CSS format)
    'left top': 'left top', 'left center': 'left center', 'left bottom': 'left bottom',
    'center top': 'center top', 'center center': 'center center', 'center bottom': 'center bottom',
    'right top': 'right top', 'right center': 'right center', 'right bottom': 'right bottom'
  };
  
  // Handle single values that need expansion  
  if (/^-?\d+(\.\d+)?(px|%)$/.test(alignmentStr)) {
    const expandedValue = `${alignmentStr} center`;
    console.log(`🔧 Expanding single value: "${alignmentStr}" → "${expandedValue}"`);
    return expandedValue;
  }
  
  return positionMap[normalized] || null;
}
// 2. REPLACE the generateImageStyles function in public/script.js:
generateImageStyles(config) {
  console.log('🎯 Generating styles with config:', config);
  
  const styles = [];
  
  // Check if user wants background-image method
  const isBackgroundMethod = this.isBackgroundImageMethod(config.fitting);
  
  if (isBackgroundMethod) {
    console.log('🖼️ Using background-image method');
    return 'BACKGROUND_METHOD'; // Special flag for createCardHTML
  } else {
console.log('📐 Using standard img tag method');
    
    // FIXED: Apply explicit config OR let CSS apply global defaults
    // Never inherit folder config - each item is independent
    
    if (config.fitting && config.fitting.trim() !== '') {
      // Item has explicit fitting from CSV
      const fitMethod = this.normalizeFitMethod(config.fitting);
      styles.push(`object-fit: ${fitMethod}`);
      console.log(`🎯 Applied explicit fitting: ${fitMethod}`);
    } else {
      // Item has no explicit fitting - let CSS apply global default (cover)
      console.log(`🌍 Using global default fitting (cover) via CSS`);
    }

    if (config.alignment && config.alignment.trim() !== '') {
      // Item has explicit alignment from CSV
      const isCustomAlignment = this.isCustomAlignmentValue(config.alignment);
      if (isCustomAlignment) {
        const customPos = this.parseSmartAlignment(config.alignment);
        styles.push(`object-position: ${customPos}`);
      } else {
        const objectPosition = this.getObjectPosition(config.alignment);
        styles.push(`object-position: ${objectPosition}`);
      }
      console.log(`🎯 Applied explicit alignment: ${config.alignment}`);
    } else {
      // Item has no explicit alignment - let CSS apply global default (center center)
      console.log(`🌍 Using global default alignment (center center) via CSS`);
    }
    
    // Scaling (if provided) - keep this unchanged
    const scaleTransform = this.getScaleTransform(config.scaling);
    if (scaleTransform) {
      styles.push(`transform: ${scaleTransform}`);
      styles.push(`transform-origin: center`);
    }
  }
  
  // Base styles
// Base styles
  styles.push(`width: 100%`);
  styles.push(`height: 100%`);
  styles.push(`background: #ffffff`);
  styles.push(`transition: all var(--transition-smooth, 0.3s ease)`);
  
  // FIXED: Add !important to ensure inline styles override CSS
  const finalStyles = styles.join('; ').replace(/object-fit: ([^;]+)/, 'object-fit: $1 !important').replace(/object-position: ([^;]+)/, 'object-position: $1 !important');
  
  return finalStyles;
}

// ADD this new function AFTER generateImageStyles:
isBackgroundImageMethod(fitting) {
  if (!fitting) return false;
  
  const fittingStr = String(fitting).toLowerCase();
  
  // Triggers for background-image method
  const backgroundTriggers = [
    'natural',    // Most common
    'background', // Explicit
    'bg',        // Shorthand
    'overflow',  // Descriptive
    'window'     // Descriptive
  ];
  
  return backgroundTriggers.some(trigger => fittingStr.includes(trigger));
}

// ADD this new function for complete background-image implementation:
generateBackgroundImageStyles(imageSrc, config) {
  console.log('🖼️ Generating COMPLETE background-image styles:', config);
  
  const styles = [];
  
  // Set the background image
  styles.push(`background-image: url('${imageSrc}')`);
  
  // Support ALL fitting methods via background-size
  const backgroundSize = this.getBackgroundSize(config.fitting);
  styles.push(`background-size: ${backgroundSize}`);
  console.log('📐 Applied background-size:', backgroundSize);
  
  // Support ALL positioning methods
  const backgroundPosition = this.getBackgroundPosition(config.alignment);
  styles.push(`background-position: ${backgroundPosition}`);
  console.log('🎯 Applied background-position:', backgroundPosition);
  
  // Never repeat
  styles.push(`background-repeat: no-repeat`);
  
  // Base container styles
  styles.push(`width: 100%`);
  styles.push(`height: 100%`);
  styles.push(`background-color: #ffffff`);
  styles.push(`transition: all var(--transition-smooth, 0.3s ease)`);
  
  const finalStyles = styles.join('; ');
  console.log('🎨 Complete background styles:', finalStyles);
  
  return finalStyles;
}

// ADD this function for fitting to background-size conversion:
// REPLACE the getBackgroundSize function (around line 380) with this FIXED version:

getBackgroundSize(fitting) {

  const fittingStr = String(fitting).toLowerCase().trim();
  console.log(`🔍 Processing fitting: "${fittingStr}"`);
  
  // Handle "natural" combinations
  if (fittingStr.includes('natural')) {
    if (fittingStr.includes('cover')) {
      console.log('✅ Natural + Cover detected → cover');
      return 'cover';
    } else if (fittingStr.includes('contain')) {
      console.log('✅ Natural + Contain detected → contain');
      return 'contain';
    } else {
      // Pure "natural" = cover (your default behavior)
      console.log('✅ Pure Natural detected → cover');
      return 'cover';
    }
  }
  
  // Standard fit methods (unchanged behavior)
  const fitMap = {
    'cover': 'cover',
    'contain': 'contain', 
    'fit': 'contain',
    'fill': '100% 100%',
    'scale-down': 'contain', // Background doesn't have scale-down, use contain
    'auto': 'auto'
  };
  
  // Direct mapping
  if (fitMap[fittingStr]) {
    console.log(`✅ Direct mapping: "${fittingStr}" → "${fitMap[fittingStr]}"`);
    return fitMap[fittingStr];
  }
  
  // Partial matching for combined keywords
  for (const [key, value] of Object.entries(fitMap)) {
    if (fittingStr.includes(key)) {
      console.log(`✅ Partial match: "${fittingStr}" contains "${key}" → "${value}"`);
      return value;
    }
  }
}


isCustomAlignmentValue(alignment) {
  if (!alignment || alignment.trim() === '') {
    return false;
  }
  
  const alignmentStr = String(alignment).trim().toLowerCase();
  
  // ANY percentage or pixel pattern is considered custom for flexible handling
  const customPatterns = [
    /^-?\d+(\.\d+)?%(\s+-?\d+(\.\d+)?%)?$/, // Any percentage(s)
    /^-?\d+(\.\d+)?px(\s+-?\d+(\.\d+)?px)?$/, // Any pixel(s)  
    /^-?\d+(\.\d+)?(px|%)\s+-?\d+(\.\d+)?(px|%)$/, // Mixed px/% values
    /^(left|right|center)\s+-?\d+(\.\d+)?(px|%)$/, // Keyword + value
    /^-?\d+(\.\d+)?(px|%)\s+(top|bottom|center)$/, // Value + keyword
  ];
  
  return customPatterns.some(pattern => pattern.test(alignmentStr));
}

parseSmartAlignment(alignment) {
  if (!alignment) {
    return 'center center';
  }
  
  const alignmentStr = String(alignment).trim().toLowerCase();
  console.log('🔍 Parsing smart alignment:', alignmentStr);
  
  // Handle pixel values (e.g., "50px 30px", "-20px 0px")
  const pixelMatch = alignmentStr.match(/^(-?\d+px)\s+(-?\d+px)$/);
  if (pixelMatch) {
    const result = `${pixelMatch[1]} ${pixelMatch[2]}`;
    console.log('✅ Matched pixel pattern:', result);
    return result;
  }
  
  // Handle single pixel value (applies to both x and y)
  const singlePixelMatch = alignmentStr.match(/^(-?\d+px)$/);
  if (singlePixelMatch) {
    const result = `${singlePixelMatch[1]} ${singlePixelMatch[1]}`;
    console.log('✅ Matched single pixel pattern:', result);
    return result;
  }
  
  // Handle percentage values (e.g., "30% 70%")
  const percentMatch = alignmentStr.match(/^(-?\d+%)\s+(-?\d+%)$/);
  if (percentMatch) {
    const result = `${percentMatch[1]} ${percentMatch[2]}`;
    console.log('✅ Matched percentage pattern:', result);
    return result;
  }
  
  // Handle mixed values (e.g., "50px 30%", "center 20px")
  const mixedMatch = alignmentStr.match(/^(\S+)\s+(\S+)$/);
  if (mixedMatch) {
    const result = `${mixedMatch[1]} ${mixedMatch[2]}`;
    console.log('✅ Matched mixed pattern:', result);
    return result;
  }
  
  // Handle preset crop commands
  const presetMap = {
    'crop-top': 'center 0%',
    'crop-bottom': 'center 100%',
    'crop-left': '0% center',
    'crop-right': '100% center',
    'crop-top-left': '0% 0%',
    'crop-top-right': '100% 0%',
    'crop-bottom-left': '0% 100%',
    'crop-bottom-right': '100% 100%'
  };
  
  if (presetMap[alignmentStr]) {
    const result = presetMap[alignmentStr];
    console.log('✅ Matched crop preset:', result);
    return result;
  }
  
  // If no custom pattern matches, fall back to standard alignment
  console.log('⚠️ No custom pattern matched, using standard alignment');
  return this.getObjectPosition(alignment);
}
// ADD this NEW function to public/script.js (after generateCustomImageStyles):


/**
 * Normalize fit method values
 */
normalizeFitMethod(fitting) {
  // If no fitting specified, default to 'cover'
  if (!fitting || fitting.trim() === '') {
    return 'cover';
  }
  
  const fitMap = {
    'fit': 'contain',
    'fill': 'fill', 
    'contain': 'contain',
    'cover': 'cover',
    'scale-down': 'scale-down',
    'scale_down': 'scale-down'
  };
  
  const normalized = fitting.toLowerCase().replace(/[_-]/g, '-');
  return fitMap[normalized] || 'cover'; // Default to 'cover' for unrecognized values
}

/**
 * Convert alignment to CSS object-position
 */
getObjectPosition(alignment) {
  const positionMap = {
    // Basic positions
    'center': 'center center',
    'top': 'center top',
    'bottom': 'center bottom', 
    'left': 'left center',
    'right': 'right center',
    
    // Corner positions
    'top-left': 'left top',
    'top_left': 'left top',
    'topleft': 'left top',
    'top-right': 'right top', 
    'top_right': 'right top',
    'topright': 'right top',
    'bottom-left': 'left bottom',
    'bottom_left': 'left bottom', 
    'bottomleft': 'left bottom',
    'bottom-right': 'right bottom',
    'bottom_right': 'right bottom',
    'bottomright': 'right bottom',
    
    // Edge centers (the ones you asked about!)
    'center-top': 'center top',
    'center_top': 'center top',
    'centertop': 'center top',
    'center-bottom': 'center bottom',
    'center_bottom': 'center bottom', 
    'centerbottom': 'center bottom',
    'left-center': 'left center',
    'left_center': 'left center',
    'leftcenter': 'left center',
    'right-center': 'right center',
    'right_center': 'right center',
    'rightcenter': 'right center',
    
    // Alternative spellings
    'center top': 'center top',
    'center bottom': 'center bottom',
    'left center': 'left center', 
    'right center': 'right center',
    'top center': 'center top',
    'bottom center': 'center bottom'
  };
  
  const normalized = (alignment || '').toLowerCase().replace(/[_-]/g, '-');
  
  // Check direct mapping first
  if (positionMap[normalized]) {
    return positionMap[normalized];
  }
  
  // Check with spaces normalized
  const withSpaces = normalized.replace(/-/g, ' ');
  if (positionMap[withSpaces]) {
    return positionMap[withSpaces];
  }
  
  // Handle percentage values (e.g., "50% 100%", "center 30%")
  if (alignment.includes('%') || alignment.includes('center') || alignment.includes('left') || alignment.includes('right')) {
    return alignment; // Pass through as-is for percentage values
  }
  
  // Default fallback
  return 'center center';
}

/**
 * Generate CSS transform for scaling
 */
getScaleTransform(scaling) {
  if (!scaling) return null;
  
  const scalingStr = String(scaling).trim();
  
  // Handle percentage scaling (e.g., "120%", "80%")
  if (scalingStr.includes('%')) {
    const percentage = parseFloat(scalingStr);
    if (!isNaN(percentage) && percentage > 0) {
      const scaleValue = percentage / 100;
      return `scale(${scaleValue})`;
    }
  }
  
  // Handle pixel-based scaling (e.g., "300px", "150px")
  if (scalingStr.includes('px')) {
    const pixels = parseFloat(scalingStr);
    if (!isNaN(pixels) && pixels > 0) {
      // For pixel scaling, we'll use a base reference of 200px (typical card image size)
      const baseSize = 200;
      const scaleValue = pixels / baseSize;
      return `scale(${scaleValue})`;
    }
  }
  
  // Handle direct scale values (e.g., "1.2", "0.8")
  const directScale = parseFloat(scalingStr);
  if (!isNaN(directScale) && directScale > 0) {
    return `scale(${directScale})`;
  }
  
  return null;
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

  setupBrands() {
    const brandsGrid = document.getElementById('brandsGrid');
    if (!brandsGrid || !this.data.catalog?.tree) return;

    // Extract ONLY brands (not categories) from inside categories
    const brandMap = new Map();
    
    const extractBrands = (categoryNode, categoryName) => {
      // categoryNode.children contains the actual brands (Chanel, Gucci, etc.)
      for (const [brandKey, brandItem] of Object.entries(categoryNode.children || {})) {
        if (!brandItem.isProduct && brandItem.children) {
          const normalizedName = this.normalizeBrandName(brandKey);
          
          if (!brandMap.has(normalizedName)) {
            brandMap.set(normalizedName, {
              displayName: normalizedName,
              categories: new Map(),
              totalCount: 0,
              paths: [],
              thumbnail: brandItem.thumbnail || '' // Get from CSV Thumbs Path
            });
          }
          
          const brandData = brandMap.get(normalizedName);
          
          // Store category with its data
          if (!brandData.categories.has(categoryName)) {
            brandData.categories.set(categoryName, {
              count: 0,
              thumbnail: categoryNode.thumbnail || ''
            });
          }
          
          const catData = brandData.categories.get(categoryName);
          catData.count += brandItem.count || 0;
          
          brandData.totalCount += brandItem.count || 0;
          brandData.paths.push(`${categoryName}/${brandKey}`);
          
          // Use thumbnail from CSV if available, fallback to constructed path
          if (!brandData.thumbnail && brandItem.thumbnail) {
            brandData.thumbnail = brandItem.thumbnail;
          } else if (!brandData.thumbnail) {
            // Fallback to constructed path
            brandData.thumbnail = `/Cards/${normalizedName.replace(/\s+/g, '-')}.webp`;
          }
        }
      }
    };
    
    // Only iterate through top-level categories (BAGS, SHOES, etc.)
    for (const [categoryKey, categoryItem] of Object.entries(this.data.catalog.tree)) {
      if (!categoryItem.isProduct) {
        extractBrands(categoryItem, categoryKey);
      }
    }

    // Convert to array and sort by count
    const brands = Array.from(brandMap.entries())
      .map(([name, data]) => ({
        name,
        categories: data.categories,
        count: data.totalCount,
        paths: data.paths,
        thumbnail: data.thumbnail
      }))
      .sort((a, b) => b.count - a.count);

    // Homepage: Small logo on left + text (list style)
    brandsGrid.innerHTML = brands.map(brand => `
      <div class="brand-item" data-brand="${brand.name}" data-paths='${JSON.stringify(brand.paths)}' data-categories='${JSON.stringify(Array.from(brand.categories.entries()))}' role="button" tabindex="0">
        <div class="brand-logo-small">
          <img src="${brand.thumbnail}" alt="${brand.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="brand-logo-fallback" style="display: none;">${this.getEmojiForCategory('BAGS')}</div>
        </div>
        <div class="brand-info">
          <div class="brand-name-display">${brand.name}</div>
          <div class="brand-count">${brand.count} items</div>
        </div>
      </div>
    `).join('');

    // Add click handlers for brands
    document.querySelectorAll('.brand-item').forEach(item => {
      item.addEventListener('click', () => {
        const brandName = item.dataset.brand;
        const paths = JSON.parse(item.dataset.paths);
        const categories = new Map(JSON.parse(item.dataset.categories));
        this.showBrandView(brandName, paths, categories);
      });
    });
  }



  
  normalizeBrandName(name) {
    if (!name) return '';
    
    // Step 1: Remove ALL category/product type suffixes (case-insensitive)
    let normalized = name
      .replace(/\s+(bags?|handbags?|purses?)$/i, '')
      .replace(/\s+(shoes?|footwear|sneakers?)$/i, '')
      .replace(/\s+(accessories?|accessory)$/i, '')
      .replace(/\s+(clothing?|clothes|apparel)$/i, '')
      .replace(/\s+(watches?|timepieces?)$/i, '')
      .replace(/\s+(jewelry?|jewellery)$/i, '')
      .replace(/\s+(wallets?|wallet)$/i, '')
      .replace(/\s+(belts?)$/i, '')
      .replace(/\s+(glasses?|sunglasses?|eyewear)$/i, '')
      .replace(/\s+(hats?|caps?)$/i, '')
      .replace(/\s+(shirts?|dresses?)$/i, '')
      .trim();
    
    // Step 2: Normalize spacing and case
    normalized = normalized
      .replace(/\s+/g, ' ')  // Multiple spaces to single space
      .trim();
    
    // Step 3: Handle common typos and variations
    const typoMap = {
      'guccii': 'gucci',
      'chanell': 'chanel',
      'pradaa': 'prada',
      'diorr': 'dior',
      'fendii': 'fendi',
      'hermes': 'hermès',
      'louie vuitton': 'louis vuitton',
      'luis vuitton': 'louis vuitton',
      'saint laurent': 'yves saint laurent',
      'bottega': 'bottega veneta',
      'bottegaveneta': 'bottega veneta',
      'dolce gabbana': 'dolce & gabbana',
      'dolce and gabbana': 'dolce & gabbana',
      'd and g': 'dolce & gabbana',
      'bvlgari': 'bulgari',
      'bvulgari': 'bulgari'
    };
    
    const lowerNormalized = normalized.toLowerCase();
    for (const [typo, correct] of Object.entries(typoMap)) {
      if (lowerNormalized === typo) {
        normalized = correct;
        break;
      }
    }
    
    // Step 4: Handle special abbreviations
    const abbreviations = {
      'lv': 'Louis Vuitton',
      'ysl': 'Yves Saint Laurent',
      'd&g': 'Dolce & Gabbana',
      'mk': 'Michael Kors',
      'ck': 'Calvin Klein',
      'dg': 'Dolce & Gabbana',
      'mcm': 'MCM'
    };
    
    const upperNormalized = normalized.toUpperCase();
    if (abbreviations[lowerNormalized]) {
      return abbreviations[lowerNormalized];
    }
    
    // Step 5: Proper title case for multi-word brands
    const properCaseExceptions = {
      'louis vuitton': 'Louis Vuitton',
      'yves saint laurent': 'Yves Saint Laurent',
      'dolce & gabbana': 'Dolce & Gabbana',
      'bottega veneta': 'Bottega Veneta',
      'marc jacobs': 'Marc Jacobs',
      'tory burch': 'Tory Burch',
      'michael kors': 'Michael Kors',
      'jimmy choo': 'Jimmy Choo',
      'alexander mcqueen': 'Alexander McQueen',
      'ralph lauren': 'Ralph Lauren',
      'tom ford': 'Tom Ford',
      'calvin klein': 'Calvin Klein',
      'kate spade': 'Kate Spade',
      'coach': 'Coach',
      'mont blanc': 'Mont Blanc',
      'montblanc': 'Mont Blanc',
      'the marcus and jacob': 'The Marcus And Jacob'
    };
    
    const finalLower = normalized.toLowerCase();
    if (properCaseExceptions[finalLower]) {
      return properCaseExceptions[finalLower];
    }
    
    // Step 6: Default title case for remaining brands
    return normalized
      .split(' ')
      .map(word => {
        // Keep & as is
        if (word === '&') return '&';
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }
  showBrandView(brandName, paths, categories) {
    document.body.setAttribute('data-page-type', 'brand');
    this.resetScrollPosition();
    
    // Update hero for brand view
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    
    if (heroTitle) heroTitle.textContent = `${brandName} Collection`;
    if (heroSubtitle) {
      heroSubtitle.textContent = `Explore ${brandName} products across ${categories.size} ${categories.size === 1 ? 'category' : 'categories'}`;
      heroSubtitle.style.display = 'block';
    }
    
    // Add breadcrumb
    const hero = document.querySelector('.hero .hero-content');
    if (hero) {
      const existingBreadcrumbs = hero.querySelector('.breadcrumb-nav');
      if (existingBreadcrumbs) existingBreadcrumbs.remove();
      
      const breadcrumbNav = document.createElement('nav');
      breadcrumbNav.className = 'breadcrumb-nav';
      
      const homeLink = document.createElement('a');
      homeLink.href = '#';
      homeLink.textContent = 'Home';
      homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToHome();
      });
      
      breadcrumbNav.appendChild(homeLink);
      
      const separator = document.createElement('span');
      separator.textContent = ' / ';
      separator.style.color = 'var(--color-text-muted)';
      breadcrumbNav.appendChild(separator);
      
      const current = document.createElement('span');
      current.textContent = brandName;
      current.style.cssText = `
        font-weight: 600;
        color: var(--color-text-primary);
        padding: var(--space-1) var(--space-2);
        background: rgba(99, 102, 241, 0.1);
        border-radius: var(--radius-sm);
      `;
      breadcrumbNav.appendChild(current);
      
      if (heroSubtitle) {
        heroSubtitle.insertAdjacentElement('afterend', breadcrumbNav);
      } else if (heroTitle) {
        heroTitle.insertAdjacentElement('afterend', breadcrumbNav);
      }
    }
    
  // SHOW brands and slideshow sections on homepage
  this.updateSectionVisibility(true);
    
    // Create category cards
    // Create category cards
    const categoryCards = [];
    // Find the actual brand thumbnail from the first path
    let brandThumbnail = '';
    if (paths.length > 0) {
      const firstPath = paths[0].split('/');
      const categoryKey = firstPath[0];
      const brandKey = firstPath[1];
      if (this.data.catalog.tree[categoryKey]?.children?.[brandKey]?.thumbnail) {
        brandThumbnail = this.data.catalog.tree[categoryKey].children[brandKey].thumbnail;
      }
    }
    // Fallback to constructed path
    if (!brandThumbnail) {
      brandThumbnail = `/Cards/${brandName.replace(/\s+/g, '-')}.webp`;
    }
    
    categories.forEach((catData, categoryName) => {
      categoryCards.push({
        key: categoryName,
        title: `${brandName} ${categoryName}`,
        description: `${catData.count} ${brandName} products in ${categoryName}`,
        count: catData.count,
        thumbnail: brandThumbnail,
        isProduct: false,
        topOrder: 999,
        brandName: brandName,
        categoryName: categoryName,
        // Use contain for brand logo as cover
        alignment: 'center center',
        fitting: 'contain',
        scaling: ''
      });
    });
    
    // Sort by count
    categoryCards.sort((a, b) => b.count - a.count);
    
    // Render brand categories
    const container = document.getElementById('dynamicSections');
    if (!container) return;
    
    const gridClass = this.getGridClass(categoryCards.length);
    const containerId = `brand-categories-${Math.random().toString(36).substr(2, 9)}`;
    
    container.innerHTML = `
      <section class="content-section">
        <div class="container">
          <div class="cards-grid ${gridClass}" id="${containerId}">
            ${categoryCards.map(item => this.createBrandCategoryCardHTML(item)).join('')}
          </div>
        </div>
      </section>
    `;
    
    if (gridClass === 'grid-smart') {
      setTimeout(() => {
        const gridContainer = document.getElementById(containerId);
        if (gridContainer) this.addSmartCentering(gridContainer, categoryCards.length);
      }, 10);
    }
  }

navigateToBrandCategory(brandName, categoryName) {
    this.resetScrollPosition();
    
    // Find the path to this brand in this category
    const brandKey = Object.keys(this.data.catalog.tree[categoryName]?.children || {})
      .find(key => this.normalizeBrandName(key) === brandName);
    
    if (!brandKey) {
      this.showNotification(`${brandName} not found in ${categoryName}`);
      return;
    }
    
    const path = `${categoryName}/${brandKey}`;
    this.currentPath = path.split('/').filter(Boolean);
    
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('path', path);
    if (this.currentBrand) {
      params.set('brand', this.currentBrand);
    }
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ 
      path: this.currentPath, 
      brand: this.currentBrand 
    }, '', newURL);
    
    // Show category view
    this.showCategoryView();
  }

  
  createBrandCategoryCardHTML(item) {
    const imageSrc = item.thumbnail && item.thumbnail !== '' ? item.thumbnail : '';
    
    let imageContent = '';
    
    if (imageSrc) {
      // CRITICAL: Use contain fitting for brand logos on category cards
      // This ensures the full logo is visible without cropping
      imageContent = `<img src="${imageSrc}" alt="${item.title}" loading="lazy" 
           style="width: 100% !important; height: 100% !important; object-fit: contain !important; object-position: center center !important; background: #ffffff !important; padding: var(--space-4);" 
           class="card-image-brand-logo"
           onerror="this.parentElement.innerHTML='${this.getEmojiForCategory(item.categoryName)}'">`;
    } else {
      imageContent = this.getEmojiForCategory(item.categoryName);
    }

    return `
      <div class="content-card brand-category-card" data-brand="${item.brandName}" data-category="${item.categoryName}" role="button" tabindex="0">
        <div class="card-image card-image-container">
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

  setupReviewSlideshow() {
    const viewport = document.getElementById('slideshowViewport');
    const image = document.getElementById('slideshowImage');
    const counter = document.getElementById('slideshowCounter');
    const caption = document.getElementById('slideshowCaption');
    const prevBtn = document.getElementById('slideshowPrev');
    const nextBtn = document.getElementById('slideshowNext');
    
    if (!viewport || !image) return;
    
    const folders = ['Reviews', 'Payment', 'Delivered'];
    let allImages = [];
    let currentIndex = 0;
    let isLoading = false;
    
    // Preload 15 images (5 from each folder)
    const preloadImages = async () => {
      console.log('🎬 Preloading slideshow images...');
      viewport.classList.add('loading');
      
      for (const folder of folders) {
        for (let i = 1; i <= 5; i++) {
          const imgPath = `${folder}/image${i}.webp`;
          
          // Test if image exists
          const exists = await new Promise((resolve) => {
            const testImg = new Image();
            const timeout = setTimeout(() => resolve(false), 1000);
            
            testImg.onload = () => {
              clearTimeout(timeout);
              resolve(true);
            };
            testImg.onerror = () => {
              clearTimeout(timeout);
              resolve(false);
            };
            
            testImg.src = imgPath;
          });
          
          if (exists) {
            allImages.push({
              src: imgPath,
              caption: folder,
              index: allImages.length + 1
            });
          }
        }
      }
      
      viewport.classList.remove('loading');
      console.log(`✅ Preloaded ${allImages.length} images`);
      
      if (allImages.length > 0) {
        showImage(0);
      } else {
        image.src = 'data:image/svg+xml,' + encodeURIComponent(`
          <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8f9fa"/>
            <text x="50%" y="50%" font-family="Arial" font-size="18" fill="#666" text-anchor="middle">No images found</text>
          </svg>
        `);
      }
    };
    
    const loadMoreImages = async (startIndex) => {
      console.log(`📥 Loading more images from index ${startIndex}...`);
      
      for (const folder of folders) {
        for (let i = startIndex; i < startIndex + 5; i++) {
          const imgPath = `${folder}/image${i}.webp`;
          
          const exists = await new Promise((resolve) => {
            const testImg = new Image();
            const timeout = setTimeout(() => resolve(false), 1000);
            
            testImg.onload = () => {
              clearTimeout(timeout);
              resolve(true);
            };
            testImg.onerror = () => {
              clearTimeout(timeout);
              resolve(false);
            };
            
            testImg.src = imgPath;
          });
          
          if (exists) {
            allImages.push({
              src: imgPath,
              caption: folder,
              index: allImages.length + 1
            });
          }
        }
      }
      
      console.log(`✅ Now have ${allImages.length} total images`);
    };
    
    const showImage = (index) => {
      if (allImages.length === 0) return;
      
      currentIndex = (index + allImages.length) % allImages.length;
      const current = allImages[currentIndex];
      
      viewport.classList.add('loading');
      
      const newImg = new Image();
      newImg.onload = () => {
        image.src = current.src;
        if (counter) counter.textContent = `${currentIndex + 1} / ${allImages.length}`;
        if (caption) caption.textContent = current.caption;
        viewport.classList.remove('loading');
      };
      newImg.onerror = () => {
        viewport.classList.remove('loading');
      };
      newImg.src = current.src;
    };
    
    const showNext = async () => {
      if (isLoading) return;
      
      // If approaching end and not fully loaded, load more
      if (currentIndex >= allImages.length - 3 && allImages.length % 15 === 0) {
        isLoading = true;
        const nextBatch = Math.floor(allImages.length / 5) + 1;
        await loadMoreImages(nextBatch * 5 + 1);
        isLoading = false;
      }
      
      showImage(currentIndex + 1);
    };
    
    const showPrev = () => {
      showImage(currentIndex - 1);
    };
    
    // Event listeners
    if (prevBtn) prevBtn.addEventListener('click', showPrev);
    if (nextBtn) nextBtn.addEventListener('click', showNext);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (document.body.getAttribute('data-page-type') !== 'category') {
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
      }
    });
    
    // Touch swipe
    let touchStartX = 0;
    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    viewport.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;
      
      if (Math.abs(swipeDistance) > 50) {
        if (swipeDistance > 0) showNext();
        else showPrev();
      }
    }, { passive: true });
    
    // Initialize
    preloadImages();
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

  // Card clicks - UNIFIED PREVIEW
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.content-card, .taxonomy-item');
    if (!card) return;
    
    const app = window.catalogApp;
    if (!app) {
      console.warn('⚠️ App instance not available');
      return;
    }
    
    const brand = card.dataset.brand;
    const category = card.dataset.category;
    const isProduct = card.dataset.isProduct === 'true';
    const driveLink = card.dataset.driveLink;
    const searchPath = card.dataset.searchPath;
    
    console.log('🎯 Card clicked', { brand, category, isProduct, driveLink, searchPath });
    
    if (brand && category && !isProduct) {
      app.navigateToBrandCategory(brand, category);
      return;
    }
    
    if (isProduct && driveLink) {
      const productPath = searchPath || category;
      const productData = app.findProductByPath(productPath);
      const productTitle = card.querySelector('.card-title')?.textContent || category;
      
      console.log('🎬 Opening unified preview with priority order');
      
      if (productData) {
        const hasR2Video = productData?.videoPreview?.videos?.length > 0;
        const hasDrivePhotos = productData?.preview?.images?.length > 0;
        const hasDriveVideos = productData?.preview?.videos?.length > 0;
        
        if (hasR2Video || hasDrivePhotos || hasDriveVideos) {
          console.log('✅ Media available:', {
            r2Videos: hasR2Video ? productData.videoPreview.videos.length : 0,
            drivePhotos: hasDrivePhotos ? productData.preview.images.length : 0,
            driveVideos: hasDriveVideos ? productData.preview.videos.length : 0
          });
          
          app.openPreview(productData, productTitle);
        } else {
          console.log('⚠️ No media available, opening Drive');
          window.open(driveLink, '_blank', 'noopener,noreferrer');
        }
      } else {
        console.log('⚠️ Product data not found, opening Drive');
        window.open(driveLink, '_blank', 'noopener,noreferrer');
      }
    } else if (searchPath) {
      console.log('📁 Navigating to folder:', searchPath);
      app.navigateToPath(searchPath);
    } else {
      console.log('📂 Navigating to category:', category);
      app.navigateToCategory(category);
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

  // ============================================
  // 👇 Added: Touch/gesture prevention snippet
  // ============================================
  
  // FIXED: Prevent double-tap zoom with JavaScript backup
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
  
  // Prevent pinch zoom
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  });
}

  
// ADD this method after setupEventListeners():
setupScrollBehavior() {
  const header = document.querySelector('.header');
  if (!header) return;

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        this.updateHeaderVisibility();
        ticking = false;
      });
      ticking = true;
    }
  };

  // Throttled scroll listener
  window.addEventListener('scroll', handleScroll, { passive: true });
}

    findProductByPath(pathString) {
  if (!pathString || !this.data || !this.data.catalog) {
    console.log('❌ findProductByPath: invalid input', pathString);
    return null;
  }
  
  console.log('🔍 Finding product by path:', pathString);
  
  const segments = pathString.split('/').filter(Boolean);
  let current = this.data.catalog.tree;
  
  for (const seg of segments) {
    if (current[seg]) {
      if (current[seg].isProduct) {
        console.log('✅ Found product:', seg);
        return current[seg];
      }
      current = current[seg].children || {};
    } else {
      console.log('❌ Segment not found:', seg);
      return null;
    }
  }
  
  console.log('❌ Product not found at path:', pathString);
  return null;
}

// ADD this method after setupScrollBehavior():
updateHeaderVisibility() {
  const header = document.querySelector('.header');
  if (!header) return;

  const currentScrollY = window.pageYOffset;
  const scrollDelta = currentScrollY - this.lastScrollY;
  const pastThreshold = currentScrollY > this.scrollThreshold;

  // FIXED: More sensitive upward scroll detection
  // Show header on ANY upward movement (scrollDelta < 0)
  // But require at least 15px of movement to avoid false triggers
  const isScrollingUp = scrollDelta < -15; // 15px minimum upward movement
  const isScrollingDown = scrollDelta > 5; // 5px minimum downward movement

  if (pastThreshold && isScrollingDown && !this.isHeaderCollapsed) {
    // Scrolling down - hide header
    header.classList.add('collapsed');
    this.isHeaderCollapsed = true;
  } else if (isScrollingUp && this.isHeaderCollapsed) {
    // FIXED: Any clear upward scroll shows header (no threshold check)
    header.classList.remove('collapsed');
    this.isHeaderCollapsed = false;
  } else if (!pastThreshold) {
    // At top of page - always show header
    header.classList.remove('collapsed');
    this.isHeaderCollapsed = false;
  }

  this.lastScrollY = currentScrollY;
}

// ADD this method to reset scroll position:
resetScrollPosition() {
  // Reset header state
  const header = document.querySelector('.header');
  if (header) {
    header.classList.remove('collapsed');
  }
  this.isHeaderCollapsed = false;
  this.lastScrollY = 0;
  
  // Force scroll to top immediately
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'auto' // Instant scroll, no smooth animation
  });
  
  // Double-check scroll position after brief delay
  setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, 50);
}

  navigateToPath(path) {
  // FIXED: Reset scroll position first
  this.resetScrollPosition();
  
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


  openProduct(driveLink, product, productTitle) {
  console.log('🎯 openProduct called', { driveLink, hasProduct: !!product, productTitle });
  
  // If product has preview data, open modal
  if (product && product.preview && product.preview.images && product.preview.images.length > 0) {
    console.log('✅ Product has preview data, opening modal');
    this.openPreview(product, productTitle);
    return;
  }
  
  // Otherwise open Drive link
  console.log('📂 No preview, opening Drive link');
  this.showNotification('Opening product...');
  window.open(driveLink, '_blank', 'noopener,noreferrer');
}

  navigateToCategory(category) {
  // FIXED: Reset scroll position first
  this.resetScrollPosition();
  
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
  // Re-initialize from URL
  this.initializeFromURL();
  
  // FIXED: Reset scroll position for browser navigation
  this.resetScrollPosition();
  
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
  
  // FIXED: Map results with correct data structure
  const resultsHTML = results.map(result => ({
    key: result.name,
    title: result.name.replace(/_/g, ' '),
    description: result.isProduct ? 'Premium product' : `${result.count || 0} items`,
    count: result.count || (result.isProduct ? 1 : 0),
    thumbnail: result.thumbnail || this.getEmojiForCategory(result.name),
    isProduct: result.isProduct,
    fullPath: result.path, // FIXED: Use full path for proper navigation
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

  // HIDE brands and slideshow sections during search
  this.updateSectionVisibility(false);
}

// REPLACE THE ENTIRE setupFABFunctionality() method with this fixed version:

// COMPLETE REPLACEMENT - Replace entire setupFABFunctionality() method with this WORKING version:

// SUPER FAST REPLACEMENT - Replace entire setupFABFunctionality() method:

setupFABFunctionality() {
  const threeDotToggle = document.getElementById('threeDotToggle');
  const threeDotMenu = document.getElementById('threeDotMenu');
  const menuItems = document.querySelectorAll('.menu-item');

  // Simple state management
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

  // Menu functionality
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

// REPLACE the entire discoverWebPFiles function with this FIXED version:

// REPLACE the entire discoverWebPFiles function with this FASTER & MORE RELIABLE version:

const discoverWebPFiles = async (folderName) => {
  console.log(`🎯 FAST scanning ${folderName} for actual .webp files...`);
  
  // FASTEST METHOD: Try to load actual image data to verify it exists
  const testImageExists = async (imagePath) => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        resolve(false);
      }, 1000); // 1 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      img.src = imagePath;
    });
  };
  
  const foundImages = [];
  
  // PRIORITY 1: Your exact pattern (image1.webp, image2.webp...)
  console.log(`📋 Testing image*.webp files...`);
  
  // Create batch promises for parallel checking (batches of 10 for speed)
  const batchSize = 10;
  let consecutiveFailures = 0;
  
  for (let startIndex = 1; startIndex <= 50; startIndex += batchSize) {
    const endIndex = Math.min(startIndex + batchSize - 1, 50);
    const batch = [];
    
    // Create batch of promises
    for (let i = startIndex; i <= endIndex; i++) {
      const webpPath = `${folderName}/image${i}.webp`;
      batch.push(
        testImageExists(webpPath).then(exists => ({
          exists,
          path: webpPath,
          index: i,
          name: `image${i}`
        }))
      );
    }
    
    // Wait for batch to complete
    const results = await Promise.all(batch);
    let batchFoundAny = false;
    
    // Process batch results
    results.forEach(result => {
      if (result.exists) {
        foundImages.push({
          src: result.path,
          title: `${folderName} Image ${result.index}`,
          name: result.name,
          index: result.index
        });
        console.log(`✅ FOUND: ${result.name}.webp`);
        batchFoundAny = true;
        consecutiveFailures = 0;
      }
    });
    
    // If no files found in this batch, increment failure count
    if (!batchFoundAny) {
      consecutiveFailures++;
      
      // Stop if we've had 2 consecutive batches with no files (20 files checked)
      if (consecutiveFailures >= 2 && foundImages.length > 0) {
        console.log(`🛑 Stopping early - no files found in last ${consecutiveFailures * batchSize} attempts`);
        break;
      }
    }
  }
  
  if (foundImages.length > 0) {
    console.log(`🎯 SUCCESS: Found ${foundImages.length} valid image*.webp files`);
    return foundImages.sort((a, b) => a.index - b.index);
  }
  
  // PRIORITY 2: Try simple numbers (1.webp, 2.webp, etc.)
  console.log(`📋 No image*.webp found, testing number.webp pattern...`);
  
  const numberPromises = [];
  for (let i = 1; i <= 20; i++) {
    const webpPath = `${folderName}/${i}.webp`;
    numberPromises.push(
      testImageExists(webpPath).then(exists => 
        exists ? {
          src: webpPath,
          title: `${folderName} File ${i}`,
          name: `${i}`,
          index: i
        } : null
      )
    );
  }
  
  const numberResults = await Promise.all(numberPromises);
  const validNumbers = numberResults.filter(img => img !== null);
  
  if (validNumbers.length > 0) {
    console.log(`🎯 SUCCESS: Found ${validNumbers.length} number.webp files`);
    return validNumbers.sort((a, b) => a.index - b.index);
  }
  
  // PRIORITY 3: Try descriptive names
  console.log(`📋 Trying descriptive names...`);
  const descriptiveNames = [
    'proof', 'payment', 'review', 'delivered', 'customer', 'receipt',
    'photo', 'pic', 'screenshot', 'scan', 'document', 'file'
  ];
  
  const descriptivePromises = descriptiveNames.map((name, index) => {
    const webpPath = `${folderName}/${name}.webp`;
    return testImageExists(webpPath).then(exists =>
      exists ? {
        src: webpPath,
        title: `${folderName} - ${name}`,
        name: name,
        index: index + 1000
      } : null
    );
  });
  
  const descriptiveResults = await Promise.all(descriptivePromises);
  const validDescriptive = descriptiveResults.filter(img => img !== null);
  
  if (validDescriptive.length > 0) {
    console.log(`🎯 SUCCESS: Found ${validDescriptive.length} descriptive .webp files`);
    return validDescriptive.sort((a, b) => a.index - b.index);
  }
  
  // Nothing found
  console.log(`❌ No .webp files found in ${folderName}`);
  return [];
};
  // Image viewer functions
  const showCurrentImage = () => {
    if (currentImages.length === 0) return;
    
    const image = currentImages[currentImageIndex];
    if (viewerImage) viewerImage.src = image.src;
    if (viewerTitle) viewerTitle.textContent = image.title;
    if (viewerCounter) viewerCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
    preloadImages();

  };
    // Preload next/previous images for instant display
const preloadImages = () => {
  if (currentImages.length <= 1) return;
  
  const nextIndex = (currentImageIndex + 1) % currentImages.length;
  const prevIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
  
  // Preload next image
  const nextImg = new Image();
  nextImg.src = currentImages[nextIndex].src;
  
  // Preload previous image  
  const prevImg = new Image();
  prevImg.src = currentImages[prevIndex].src;
};
  
  const closeImageViewer = () => {
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  };

  const showNextImage = () => {
    if (currentImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    console.log(`Next: ${currentImageIndex + 1}/${currentImages.length}`);
    showCurrentImage();
  };

  const showPrevImage = () => {
    if (currentImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    console.log(`Prev: ${currentImageIndex + 1}/${currentImages.length}`);
    showCurrentImage();
  };

  // INSTANT menu click handlers
  const folderCache = new Map();
  menuItems.forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const folderName = item.dataset.folder;
      console.log(`🔄 INSTANT loading ${folderName}...`);
      
      // Show modal immediately
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      // Add caching for faster subsequent loads
      if (folderCache.has(folderName)) {
        const cachedImages = folderCache.get(folderName);
        console.log(`📦 Using cached images for ${folderName}`);
        currentImages = cachedImages;
        currentImageIndex = 0;
        showCurrentImage();
        if (threeDotMenu) threeDotMenu.classList.remove('expanded');
        return;
      }
      }
    
      // Show loading state
      if (viewerImage) {
        viewerImage.src = 'data:image/svg+xml,' + encodeURIComponent(`
          <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8f9fa"/>
            <circle cx="200" cy="150" r="25" fill="none" stroke="#6366f1" stroke-width="4">
              <animateTransform attributeName="transform" type="rotate" values="0 200 150;360 200 150" dur="0.8s" repeatCount="indefinite"/>
            </circle>
            <text x="50%" y="75%" font-family="Arial" font-size="16" fill="#6366f1" text-anchor="middle" font-weight="600">Scanning ${folderName}...</text>
          </svg>
        `);
      }
      if (viewerTitle) viewerTitle.textContent = `Scanning ${folderName}...`;
      if (viewerCounter) viewerCounter.textContent = 'Finding .webp files...';
      
      try {
        // INSTANT discovery
        const images = await discoverWebPFiles(folderName);
        
        if (images.length === 0) {
          console.log(`❌ No .webp files found in ${folderName}`);
          currentImages = [{
            src: 'data:image/svg+xml,' + encodeURIComponent(`
              <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#fff5f5"/>
                <text x="50%" y="40%" font-family="Arial" font-size="48" text-anchor="middle">📂</text>
                <text x="50%" y="60%" font-family="Arial" font-size="18" fill="#666666" text-anchor="middle" font-weight="600">No .webp files in ${folderName}</text>
                <text x="50%" y="75%" font-family="Arial" font-size="14" fill="#999999" text-anchor="middle">Add .webp images to public/${folderName}/</text>
              </svg>
            `),
            title: `No images in ${folderName}`
          }];
        } else {
          currentImages = images;
          console.log(`🎉 INSTANT SUCCESS: ${images.length} .webp files found in ${folderName}!`);
        }
        
        currentImageIndex = 0;
        showCurrentImage();
        
      } catch (error) {
        console.error(`💥 Error with ${folderName}:`, error);
        currentImages = [{
          src: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#fff0f0"/>
              <text x="50%" y="50%" font-family="Arial" font-size="18" fill="#ff4444" text-anchor="middle">Error loading ${folderName}</text>
            </svg>
          `),
          title: `Error: ${folderName}`
        }];
        currentImageIndex = 0;
        showCurrentImage();
      }
      
      if (threeDotMenu) threeDotMenu.classList.remove('expanded');
    });
  });

  // Event listeners - Simple and reliable
  if (viewerClose) {
    viewerClose.addEventListener('click', closeImageViewer);
  }
  
  if (viewerOverlay) {
    viewerOverlay.addEventListener('click', closeImageViewer);
  }
  
  if (viewerNext) {
    viewerNext.addEventListener('click', showNextImage);
  }
  
  if (viewerPrev) {
    viewerPrev.addEventListener('click', showPrevImage);
  }
  
  if (viewerImage) {
    viewerImage.addEventListener('click', showNextImage);
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!modal || !modal.classList.contains('active')) return;
    
    switch(e.key) {
      case 'Escape':
        closeImageViewer();
        break;
      case 'ArrowRight':
      case ' ':
        showNextImage();
        break;
      case 'ArrowLeft':
        showPrevImage();
        break;
    }
  });

  // Touch/swipe support
  let touchStartX = 0;
  
  if (modal) {
    modal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modal.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;
      
      if (Math.abs(swipeDistance) > 50) {
        if (swipeDistance > 0) {
          showNextImage(); // Swipe left = next
        } else {
          showPrevImage(); // Swipe right = previous  
        }
      }
    }, { passive: true });
  }

  console.log('🚀 INSTANT WebP scanner ready!');
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
window.catalogApp = null;
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
