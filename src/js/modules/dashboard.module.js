import { formatDate, truncate, getElement } from '../core/utils.js';
import authManager from '../core/auth.manager.js';

class DashboardModule {
  constructor() {
    this.isLoaded = false;
    this.currentUser = null;
    this.allData = {
      resources: [],
      surveys: [],
      opinions: []
    };
  }

  // inicializa el módulo
  init() {
    this.currentUser = authManager.getCurrentUser();
    
    authManager.onAuthStateChanged((user) => {
      this.onAuthChanged(user);
    });

    // escuchar eventos de otros módulos
    document.addEventListener('resources:loaded', (e) => {
      this.allData.resources = e.detail.resources || [];
      if (this.isLoaded) {
        this.updateStats();
      } else {
        // Actualizar footer incluso si no está cargado el dashboard completo
        this.updateFooterStatsOnly();
      }
    });

    document.addEventListener('surveys:loaded', (e) => {
      this.allData.surveys = e.detail.surveys || [];
      if (this.isLoaded) {
        this.updateStats();
      } else {
        // Actualizar footer incluso si no está cargado el dashboard completo
        this.updateFooterStatsOnly();
      }
    });

    document.addEventListener('opinions:loaded', (e) => {
      this.allData.opinions = e.detail.opinions || [];
      if (this.isLoaded) {
        this.updateStats();
      } else {
        // Actualizar footer incluso si no está cargado el dashboard completo
        this.updateFooterStatsOnly();
      }
    });
  }

  // carga el dashboard
  async load() {
    if (!this.currentUser) {
      this.showWelcomeHero();
      // Actualizar solo las estadísticas del footer aunque no esté logueado
      this.updateFooterStatsOnly();
      return;
    }

    this.hideWelcomeHero();
    this.updateStats();
    this.loadRecentActivity();
    this.loadTopCategories();
    this.isLoaded = true;
  }

  // actualiza solo las estadísticas del footer (para cuando no hay usuario logueado)
  updateFooterStatsOnly() {
    const stats = {
      totalResources: this.allData.resources.length,
      totalSurveys: this.allData.surveys.length,
      totalOpinions: this.allData.opinions.length
    };

    // calcular usuarios únicos
    const uniqueUsers = new Set();
    [...this.allData.resources, ...this.allData.surveys, ...this.allData.opinions].forEach(item => {
      if (item.autorId) uniqueUsers.add(item.autorId);
    });
    stats.totalUsers = uniqueUsers.size;

    this.updateFooterStats(stats);
  }

  // muestra el hero de bienvenida
  showWelcomeHero() {
    const hero = getElement('#welcomeHero');
    const content = getElement('#dashboardContent');
    
    if (hero) hero.style.display = 'block';
    if (content) content.style.display = 'none';
  }

  // oculta el hero de bienvenida
  hideWelcomeHero() {
    const hero = getElement('#welcomeHero');
    const content = getElement('#dashboardContent');
    
    if (hero) hero.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  // actualiza las estadísticas
  updateStats() {
    const stats = {
      totalResources: this.allData.resources.length,
      totalSurveys: this.allData.surveys.length,
      totalOpinions: this.allData.opinions.length
    };

    // calcular usuarios únicos
    const uniqueUsers = new Set();
    [...this.allData.resources, ...this.allData.surveys, ...this.allData.opinions].forEach(item => {
      if (item.autorId) uniqueUsers.add(item.autorId);
    });
    stats.totalUsers = uniqueUsers.size;

    this.updateElement('totalResources', stats.totalResources);
    this.updateElement('totalSurveys', stats.totalSurveys);
    this.updateElement('totalOpinions', stats.totalOpinions);
    this.updateElement('totalUsers', stats.totalUsers);
    
    // Actualizar footer stats (siempre visible)
    this.updateFooterStats(stats);
  }

  // actualiza las estadísticas del footer (visible siempre)
  updateFooterStats(stats) {
    this.updateElement('footerResources', stats.totalResources);
    this.updateElement('footerSurveys', stats.totalSurveys);
    this.updateElement('footerUsers', stats.totalUsers);
  }

  updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  // carga actividad reciente
  loadRecentActivity() {
    const container = getElement('#recentActivity');
    if (!container) return;

    const activities = [
      ...this.allData.resources.map(i => ({ ...i, type: 'resource', icon: '📚' })),
      ...this.allData.surveys.map(i => ({ ...i, type: 'survey', icon: '📋' })),
      ...this.allData.opinions.map(i => ({ ...i, type: 'opinion', icon: '💭' }))
    ];

    // ordenar por fecha
    activities.sort((a, b) => {
      const dateA = this.getItemDate(a);
      const dateB = this.getItemDate(b);
      return dateB - dateA;
    });

    const recent = activities.slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="activity-placeholder">
          <div class="placeholder-icon">📊</div>
          <p>No hay actividad reciente</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-content">
          <h4>${truncate(activity.titulo, 40)}</h4>
          <p>
            <span class="activity-author">👤 ${activity.autorNombre || 'Anónimo'}</span>
            <span class="activity-separator">•</span>
            <span class="activity-date">🕐 ${formatDate(activity.timestamp || activity.fechaCreacion)}</span>
          </p>
        </div>
      </div>
    `).join('');
  }

  // obtiene la fecha de un item
  getItemDate(item) {
    const timestamp = item.timestamp || item.fechaCreacion;
    if (!timestamp) return new Date(0);
    
    try {
      if (timestamp.toDate) return timestamp.toDate();
      return new Date(timestamp);
    } catch {
      return new Date(0);
    }
  }

  // carga categorías populares
  loadTopCategories() {
    const container = getElement('#topCategories');
    if (!container) return;

    // contar recursos por categoría
    const categoryCount = {};
    this.allData.resources.forEach(resource => {
      const cat = resource.categoria || 'otros';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const sorted = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="activity-placeholder">
          <div class="placeholder-icon">📂</div>
          <p>No hay categorías disponibles</p>
        </div>
      `;
      return;
    }

    const categoryIcons = {
      apuntes: '📝',
      libros: '📚',
      examenes: '📊',
      proyectos: '🚀',
      otros: '📄'
    };

    const categoryNames = {
      apuntes: 'Apuntes',
      libros: 'Libros',
      examenes: 'Exámenes',
      proyectos: 'Proyectos',
      otros: 'Otros'
    };

    container.innerHTML = sorted.map(([cat, count]) => `
      <div class="category-item">
        <div class="category-info">
          <span class="category-icon">${categoryIcons[cat] || '📄'}</span>
          <span class="category-name">${categoryNames[cat] || cat}</span>
        </div>
        <span class="category-count">${count}</span>
      </div>
    `).join('');
  }

  // maneja cambios de autenticación
  onAuthChanged(user) {
    this.currentUser = user;
    
    if (this.isLoaded) {
      if (user) {
        this.load();
      } else {
        this.showWelcomeHero();
      }
    }
  }

  destroy() {
    this.isLoaded = false;
    this.allData = { resources: [], surveys: [], opinions: [] };
  }
}

export default DashboardModule;