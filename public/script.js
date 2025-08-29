/* ==========================================================================
   CSV Catalog App (with SPA navigation fix)
   ========================================================================== */

class CSVCatalogApp {
  constructor() {
    this.currentBrand = null;
    this.data = [];
  }

  async init() {
    console.log('🚀 Initializing CSV Catalog');
    await this.loadCSV();
    this.detectAndSetBrand();
    this.renderUI();
    this.setupEventListeners();

    /* --- open ?path=XYZ directly when the page loads --- */
    const firstPath = new URLSearchParams(window.location.search).get('path');
    if (firstPath) {
      this.navigateToCategory(firstPath, true);   // true ⇒ don’t push history again
    }

    console.log('✅ CSV catalog initialization complete!');
  }

  async loadCSV() {
    // Stub: Add your CSV loading logic here
    console.log('📥 CSV data loaded');
  }

  detectAndSetBrand() {
    const params = new URLSearchParams(location.search);
    this.currentBrand = params.get('brand') || this.pickRandomBrand();
    this.setupBrand(this.currentBrand);

    const firstCategory = params.get('path');
    if (firstCategory) {
      this.navigateToCategory(firstCategory, true);
    }
  }

  pickRandomBrand() {
    return 'DefaultBrand';
  }

  setupBrand(brand) {
    console.log(`🎨 Setup brand: ${brand}`);
  }

  renderUI() {
    console.log('🖼 Rendering UI');
  }

  setupEventListeners() {
    console.log('🎧 Setting up listeners');
  }

  /* ========== FIXED navigateToCategory ========== */
  navigateToCategory(category, skipHistory = false) {
    console.log('🔗 Navigate to category:', category);

    // hide every content card that is NOT in this category
    document.querySelectorAll('.content-card').forEach(card => {
      card.style.display = (card.dataset.category === category) ? '' : 'none';
    });

    // hide sections with no visible cards
    document.querySelectorAll('.content-section').forEach(section => {
      const visibleCards = section.querySelectorAll('.content-card:not([style*="display: none"])');
      section.style.display = visibleCards.length ? '' : 'none';
    });

    // update the address bar
    if (!skipHistory) {
      const params = new URLSearchParams(window.location.search);
      if (this.currentBrand) params.set('brand', this.currentBrand);
      params.set('path', category);
      history.pushState({ category }, '', `?${params.toString()}`);
    }
  }
}

/* ========== POPSTATE LISTENER ========== */
window.addEventListener('popstate', (e) => {
  if (window.catalogApp && e.state?.category) {
    window.catalogApp.navigateToCategory(e.state.category, true); // no extra history push
  } else if (window.catalogApp) {
    // No category in state → show all sections again
    document.querySelectorAll('.content-card').forEach(card => card.style.display = '');
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = '');
  }
});

/* ========== BOOTSTRAP ========== */
window.addEventListener('DOMContentLoaded', () => {
  window.catalogApp = new CSVCatalogApp();
  window.catalogApp.init();
});
