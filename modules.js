const getEstudiaFacilCore = () => {
  if (window.EstudiaFacilAuth) {
    return window.EstudiaFacilAuth;
  }
  
  if (window.EstudiaFacilCore) {
    return window.EstudiaFacilCore;
  }
  
  console.error('Sistema de autenticación no disponible');
  return null;
};

const core = getEstudiaFacilCore();
if (!core) {
  console.error('No se pudo cargar EstudiaFácil Core');
}

const {
  auth,
  db,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  where,
  serverTimestamp,
  updateDoc,
  increment,
  setDoc,
  getDoc,
  getCurrentUser,
  isUserLoggedIn
} = core || {};

// Variables globales
let allResources = [];
let allSurveys = [];
let allOpinions = [];
let uploadcareWidget = null;

// SVG Icons modernos y centralizados
const ModuleIcons = {
  // Recursos
  document: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  // Encuestas
  survey: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM21 11h-4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  // Opiniones
  heart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  heartFilled: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`,
  
  comment: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  // Generales
  user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  clock: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  book: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  activity: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
};

// Utilidades mejoradas
class Utils {
  static showToast(message, type = 'success') {
    if (window.EstudiaFacilAuth?.showToast) {
      return window.EstudiaFacilAuth.showToast(message, type);
    }
    
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      console.log(`Toast [${type}]: ${message}`);
      return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
      success: '#00f5ff',
      error: '#ff1493', 
      info: '#00f5ff',
      warning: '#ff6b6b'
    };
    
    const iconSvg = type === 'success' ? ModuleIcons.heart : 
                   type === 'error' ? ModuleIcons.trash :
                   type === 'warning' ? ModuleIcons.clock : ModuleIcons.activity;
    
    toast.innerHTML = `
      <div class="toast-icon" style="color: ${iconMap[type] || '#00f5ff'};">
        ${iconSvg}
      </div>
      <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }
  
  static formatDate(timestamp) {
    if (!timestamp) return 'Sin fecha';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const diff = Math.abs(new Date() - date);
      const mins = Math.ceil(diff / (1000 * 60));
      const hours = Math.ceil(diff / (1000 * 60 * 60));
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      if (mins < 60) return `Hace ${mins} min`;
      if (hours < 24) return `Hace ${hours}h`;
      if (days < 7) return `Hace ${days} días`;
      
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Sin fecha';
    }
  }
  
  static truncate(text, max = 100) {
    return !text || text.length <= max ? text || '' : text.substring(0, max) + '...';
  }
  
  static getCategoryIcon(cat) {
    const iconMap = {
      apuntes: ModuleIcons.edit,
      examenes: ModuleIcons.survey,
      proyectos: ModuleIcons.activity,
      libros: ModuleIcons.book,
      otros: ModuleIcons.document
    };
    return iconMap[cat] || ModuleIcons.document;
  }
  
  static confirm(title, msg, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const cancel = document.getElementById('confirmCancel');
    const ok = document.getElementById('confirmOk');
    
    if (!modal) return;
    
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
      if (cancel) cancel.focus();
    }, 100);
    
    const handleCancel = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      
      if (cancel) cancel.removeEventListener('click', handleCancel);
      if (ok) ok.removeEventListener('click', handleOk);
    };
    
    const handleOk = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
      
      if (cancel) cancel.removeEventListener('click', handleCancel);
      if (ok) ok.removeEventListener('click', handleOk);
    };
    
    if (cancel) cancel.addEventListener('click', handleCancel);
    if (ok) ok.addEventListener('click', handleOk);
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
  }
  
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Dashboard Manager optimizado
class DashboardManager {
  static async loadDashboard() {
    try {
      const user = getCurrentUser();
      if (!user) {
        this.showWelcomeMessage();
        return;
      }
      
      this.hideWelcomeMessage();
      
      await Promise.all([
        ResourcesManager.loadResources(false),
        SurveysManager.loadSurveys(false),
        OpinionsManager.loadOpinions(false)
      ]);
      
      this.updateStats();
      this.loadRecent();
      this.loadCategories();
      
    } catch (e) {
      console.error('Error cargando dashboard:', e);
      Utils.showToast('Error al cargar el dashboard', 'error');
    }
  }
  
  static showWelcomeMessage() {
    const welcomeHero = document.getElementById('welcomeHero');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (welcomeHero) welcomeHero.style.display = 'block';
    if (dashboardContent) dashboardContent.style.display = 'none';
  }
  
  static hideWelcomeMessage() {
    const welcomeHero = document.getElementById('welcomeHero');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (welcomeHero) welcomeHero.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';
  }
  
  static updateStats() {
    const stats = {
      totalResources: allResources.length,
      totalSurveys: allSurveys.length,
      totalOpinions: allOpinions.length
    };
    
    const users = new Set([
      ...allResources,
      ...allSurveys,
      ...allOpinions
    ].map(i => i.autorId).filter(Boolean));
    
    stats.totalUsers = users.size;
    
    Object.entries(stats).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (element) {
        element.textContent = value;
      }
    });
    
    // Footer stats
    const footerElements = [
      { id: 'footerResources', value: allResources.length },
      { id: 'footerSurveys', value: allSurveys.length },
      { id: 'footerUsers', value: users.size }
    ];
    
    footerElements.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }
  
  static loadRecent() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    const activities = [
      ...allResources.map(i => ({ ...i, type: 'resource' })),
      ...allSurveys.map(i => ({ ...i, type: 'survey' })),
      ...allOpinions.map(i => ({ ...i, type: 'opinion' }))
    ];
    
    activities.sort((a, b) => {
      const dateA = a.timestamp ? 
        (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : 
        new Date(0);
      const dateB = b.timestamp ? 
        (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : 
        new Date(0);
      return dateB - dateA;
    });
    
    const recent = activities.slice(0, 5);
    
    if (recent.length === 0) {
      container.innerHTML = `
        <div class="activity-placeholder">
          <div class="placeholder-icon" style="color: var(--neon-cyan);">
            ${ModuleIcons.activity}
          </div>
          <p>No hay actividad reciente</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = recent.map(activity => {
      const iconMap = {
        resource: ModuleIcons.document,
        survey: ModuleIcons.survey,
        opinion: ModuleIcons.comment
      };
      
      return `
        <div class="activity-item">
          <div class="activity-icon" style="color: var(--neon-cyan);">
            ${iconMap[activity.type] || ModuleIcons.activity}
          </div>
          <div class="activity-content">
            <h4>${Utils.truncate(activity.titulo, 30)}</h4>
            <p>
              <span style="color: var(--neon-cyan);">${ModuleIcons.user}</span>
              ${activity.autorNombre || 'Anónimo'} • 
              <span style="color: var(--neon-pink);">${ModuleIcons.clock}</span>
              ${Utils.formatDate(activity.timestamp)}
            </p>
          </div>
        </div>
      `;
    }).join('');
  }
  
  static loadCategories() {
    const container = document.getElementById('topCategories');
    if (!container) return;
    
    const catCount = {};
    allResources.forEach(resource => {
      const cat = resource.categoria || 'otros';
      catCount[cat] = (catCount[cat] || 0) + 1;
    });
    
    const sorted = Object.entries(catCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="activity-placeholder">
          <div class="placeholder-icon" style="color: var(--neon-cyan);">
            ${ModuleIcons.survey}
          </div>
          <p>No hay categorías disponibles</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = sorted.map(([cat, count]) => `
      <div class="category-item">
        <div class="category-info">
          <span class="category-icon" style="color: var(--neon-cyan);">
            ${Utils.getCategoryIcon(cat)}
          </span>
          <span class="category-name">${ResourcesManager.getCategoryName(cat)}</span>
        </div>
        <span class="category-count">${count}</span>
      </div>
    `).join('');
  }
}

// Resources Manager mejorado
class ResourcesManager {
  static openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      setTimeout(() => {
        const titleInput = document.getElementById('titulo');
        if (titleInput) {
          titleInput.focus();
        }
      }, 100);
    }
  }
  
  static closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      
      const form = document.getElementById('uploadForm');
      if (form) form.reset();
      
      if (window.uploadcareWidget) {
        try {
          window.uploadcareWidget.value(null);
        } catch (e) {
          // Widget no disponible
        }
      }
    }
  }
  
  static async saveResource(data) {
    try {
      Utils.showToast('Guardando recurso...', 'info');
      
      const user = getCurrentUser();
      if (!user) {
        Utils.showToast('Debes iniciar sesión para guardar recursos', 'error');
        return;
      }
      
      let fileData = {};
      if (window.uploadcareWidget) {
        try {
          const file = window.uploadcareWidget.value();
          if (file && file.then) {
            const fileInfo = await file;
            fileData = {
              archivo: fileInfo.cdnUrl,
              nombreArchivo: fileInfo.name,
              tamanoArchivo: fileInfo.size,
              tipoMime: fileInfo.mimeType
            };
          } else if (file && file.cdnUrl) {
            fileData = {
              archivo: file.cdnUrl,
              nombreArchivo: file.name || 'archivo',
              tamanoArchivo: file.size || 0,
              tipoMime: file.mimeType || 'application/octet-stream'
            };
          }
        } catch (e) {
          console.error('Error obteniendo archivo de Uploadcare:', e);
          Utils.showToast('Error al procesar el archivo', 'error');
          return;
        }
      }
      
      if (!fileData.archivo) {
        Utils.showToast('Por favor selecciona un archivo', 'warning');
        return;
      }
      
      const resourceData = {
        ...data,
        ...fileData,
        timestamp: serverTimestamp(),
        autorId: user.uid,
        autorNombre: user.displayName || 'Usuario',
        autorEmail: user.email,
        autorAvatar: user.photoURL
      };
      
      await addDoc(collection(db, 'recursos'), resourceData);
      
      Utils.showToast('Recurso guardado exitosamente', 'success');
      
      this.closeUploadModal();
      await this.loadResources();
      DashboardManager.loadDashboard();
      
    } catch (e) {
      console.error('Error al guardar recurso:', e);
      Utils.showToast('Error al guardar recurso', 'error');
    }
  }
  
  static async loadResources(updateUI = true) {
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, 'recursos'), orderBy('timestamp', 'desc')));
      } catch {
        snap = await getDocs(collection(db, 'recursos'));
      }
      
      const resources = [];
      snap.forEach(d => {
        resources.push({ id: d.id, ...d.data() });
      });
      
      resources.sort((a, b) => {
        const dateA = a.timestamp ? 
          (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : 
          new Date(0);
        const dateB = b.timestamp ? 
          (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : 
          new Date(0);
        return dateB - dateA;
      });
      
      allResources = resources;
      
      if (updateUI) {
        this.displayResources(resources);
      }
      
    } catch (e) {
      console.error('Error al cargar recursos:', e);
      Utils.showToast('Error al cargar recursos', 'error');
    }
  }
  
  static displayResources(resources) {
    const list = document.getElementById('listaRecursos');
    const empty = document.getElementById('emptyState');
    
    if (!list) return;
    
    if (!resources?.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    
    if (empty) empty.style.display = 'none';
    
    const user = getCurrentUser();
    
    list.innerHTML = resources.map(resource => {
      const isMine = user && resource.autorId === user.uid;
      
      let url = resource.archivo || resource.enlace;
      if (url?.includes('-/preview/')) {
        url = url.replace('-/preview/', '');
      }
      
      return `
        <article class="resource-card ${isMine ? 'my-resource' : ''}" data-category="${resource.categoria || 'otros'}">
          <div class="resource-header">
            <span class="resource-category">
              <span style="color: var(--neon-cyan);">${Utils.getCategoryIcon(resource.categoria)}</span>
              ${this.getCategoryName(resource.categoria)}
            </span>
            ${isMine ? `
              <div class="resource-actions-menu">
                <button class="resource-menu-btn" onclick="ResourcesManager.toggleMenu('${resource.id}')">
                  <span style="color: var(--neon-pink);">${ModuleIcons.trash}</span>
                </button>
                <div class="resource-menu" id="menu-${resource.id}">
                  <button onclick="ResourcesManager.deleteResource('${resource.id}', '${(resource.titulo || '').replace(/'/g, "\\'")}')">
                    <span style="color: var(--error);">${ModuleIcons.trash}</span>
                    Eliminar
                  </button>
                </div>
              </div>
            ` : `
              <span class="file-type-icon" style="color: var(--neon-cyan);">
                ${ModuleIcons.document}
              </span>
            `}
          </div>
          
          <h3 class="resource-title">${resource.titulo || 'Sin título'}</h3>
          
          <div class="resource-meta">
            <div class="resource-subject">
              <span style="color: var(--neon-cyan);">${ModuleIcons.book}</span>
              ${resource.materia || 'Sin materia'}
            </div>
            ${resource.nivel ? `
              <div class="resource-level">
                <span style="color: var(--neon-pink);">${ModuleIcons.activity}</span>
                ${this.getLevelName(resource.nivel)}
              </div>
            ` : ''}
            <div class="resource-author">
              <span style="color: var(--neon-cyan);">${ModuleIcons.user}</span>
              Por ${resource.autorNombre || 'Anónimo'} • 
              <span style="color: var(--neon-pink);">${ModuleIcons.clock}</span>
              ${Utils.formatDate(resource.timestamp)}
            </div>
          </div>
          
          ${resource.descripcion ? `<p class="resource-description">${Utils.truncate(resource.descripcion, 120)}</p>` : ''}
          
          <div class="resource-actions">
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="btn-download">
              <span style="color: var(--neon-cyan);">${ModuleIcons.download}</span>
              Ver recurso
            </a>
          </div>
        </article>
      `;
    }).join('');
  }
  
  static getCategoryName(cat) {
    const names = {
      apuntes: 'Apuntes',
      examenes: 'Exámenes',
      proyectos: 'Proyectos',
      libros: 'Libros',
      otros: 'Otros'
    };
    return names[cat] || 'Sin categoría';
  }
  
  static getLevelName(level) {
    const levels = {
      primaria: 'Primaria',
      secundaria: 'Secundaria',
      universidad: 'Universidad'
    };
    return levels[level] || level;
  }
  
  static filterResources() {
    const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const cat = document.getElementById('filterCategoria')?.value || '';
    const level = document.getElementById('filterNivel')?.value || '';
    
    let filtered = allResources;
    
    if (search) {
      filtered = filtered.filter(resource => {
        const searchFields = [
          resource.titulo,
          resource.materia,
          resource.descripcion,
          resource.autorNombre
        ];
        
        return searchFields.some(field => 
          (field || '').toLowerCase().includes(search)
        );
      });
    }
    
    if (cat) {
      filtered = filtered.filter(resource => resource.categoria === cat);
    }
    
    if (level) {
      filtered = filtered.filter(resource => resource.nivel === level);
    }
    
    this.displayResources(filtered);
  }
  
  static showMyResources() {
    const user = getCurrentUser();
    if (!user) {
      Utils.showToast('Inicia sesión para ver tus recursos', 'warning');
      return;
    }
    
    const mine = allResources.filter(resource => resource.autorId === user.uid);
    this.displayResources(mine);
    Utils.showToast(`Mostrando ${mine.length} de tus recursos`, 'info');
  }
  
  static toggleMenu(id) {
    const menu = document.getElementById(`menu-${id}`);
    if (!menu) return;
    
    document.querySelectorAll('.resource-menu').forEach(m => {
      if (m.id !== `menu-${id}`) {
        m.classList.remove('show');
      }
    });
    
    menu.classList.toggle('show');
    
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove('show');
        document.removeEventListener('click', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }
  
  static deleteResource(id, title) {
    Utils.confirm('Eliminar Recurso', `¿Eliminar "${title}"?`, async () => {
      try {
        await deleteDoc(doc(db, 'recursos', id));
        Utils.showToast('Recurso eliminado', 'success');
        
        await this.loadResources();
        DashboardManager.loadDashboard();
        
      } catch (e) {
        console.error('Error al eliminar recurso:', e);
        Utils.showToast('Error al eliminar', 'error');
      }
    });
  }
}

// Surveys Manager optimizado
class SurveysManager {
  static openSurveyModal() {
    const modal = document.getElementById('surveyModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      this.clearQuestions();
      this.addQuestion();
      
      setTimeout(() => {
        const titleInput = document.getElementById('surveyTitle');
        if (titleInput) {
          titleInput.focus();
        }
      }, 100);
    }
  }
  
  static closeSurveyModal() {
    const modal = document.getElementById('surveyModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      
      const form = document.getElementById('surveyForm');
      if (form) form.reset();
      
      this.clearQuestions();
    }
  }
  
  static async loadSurveys(updateUI = true) {
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, 'encuestas'), orderBy('timestamp', 'desc')));
      } catch {
        snap = await getDocs(collection(db, 'encuestas'));
      }
      
      const surveys = [];
      snap.forEach(d => {
        surveys.push({ id: d.id, ...d.data() });
      });
      
      surveys.sort((a, b) => {
        const dateA = a.timestamp ? 
          (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : 
          new Date(0);
        const dateB = b.timestamp ? 
          (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : 
          new Date(0);
        return dateB - dateA;
      });
      
      allSurveys = surveys;
      
      if (updateUI) {
        this.displaySurveys(surveys);
      }
      
    } catch (e) {
      console.error('Error al cargar encuestas:', e);
      Utils.showToast('Error al cargar encuestas', 'error');
    }
  }
  
  static displaySurveys(surveys) {
    const list = document.getElementById('surveysList');
    if (!list) return;
    
    if (!surveys?.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon" style="color: var(--neon-cyan);">
            ${ModuleIcons.survey}
          </div>
          <h3>No hay encuestas</h3>
          <p>¡Sé el primero en crear una!</p>
          <button class="btn-primary" onclick="SurveysManager.openSurveyModal()">
            <span style="color: var(--neon-cyan);">${ModuleIcons.plus}</span>
            <span class="btn-text">Crear Primera Encuesta</span>
          </button>
        </div>
      `;
      return;
    }
    
    const user = getCurrentUser();
    
    list.innerHTML = surveys.map(survey => {
      const isMine = user && survey.autorId === user.uid;
      
      return `
        <div class="survey-card">
          <div class="survey-header">
            <span class="survey-category">
              <span style="color: var(--neon-cyan);">${ModuleIcons.survey}</span>
              ${this.getCategoryName(survey.categoria)}
            </span>
            ${isMine ? `
              <button class="resource-menu-btn" onclick="SurveysManager.deleteSurvey('${survey.id}', '${(survey.titulo || '').replace(/'/g, "\\'")}')">
                <span style="color: var(--error);">${ModuleIcons.trash}</span>
              </button>
            ` : ''}
          </div>
          
          <h3 class="survey-title">${survey.titulo}</h3>
          
          ${survey.descripcion ? `<p class="survey-description">${Utils.truncate(survey.descripcion, 100)}</p>` : ''}
          
          <div class="survey-meta">
            <div>
              <span style="color: var(--neon-cyan);">${ModuleIcons.user}</span>
              Por ${survey.autorNombre} • 
              <span style="color: var(--neon-pink);">${ModuleIcons.clock}</span>
              ${Utils.formatDate(survey.timestamp)}
            </div>
            <div class="survey-stats">
              <span class="survey-stat">
                <span style="color: var(--neon-cyan);">${ModuleIcons.edit}</span>
                <span>${survey.preguntas?.length || 0} preguntas</span>
              </span>
              <span class="survey-stat">
                <span style="color: var(--neon-pink);">${ModuleIcons.user}</span>
                <span>${survey.respuestas || 0} respuestas</span>
              </span>
            </div>
          </div>
          
          <div class="survey-actions">
            <button class="btn-participate" onclick="SurveysManager.participate('${survey.id}')">
              <span style="color: var(--neon-cyan);">${ModuleIcons.edit}</span>
              Participar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  static getCategoryName(cat) {
    const categories = {
      estudio: 'Métodos de Estudio',
      materias: 'Materias',
      tecnologia: 'Tecnología',
      general: 'General'
    };
    return categories[cat] || 'General';
  }
  
  static addQuestion() {
    const container = document.getElementById('questionsList');
    if (!container) return;
    
    const count = container.children.length + 1;
    const id = Utils.generateId();
    
    container.insertAdjacentHTML('beforeend', `
      <div class="question-item" data-question-id="${id}">
        <div class="question-header">
          <span class="question-number">${count}</span>
          <select class="question-type" onchange="SurveysManager.changeType('${id}', this.value)">
            <option value="multiple">Opción múltiple</option>
            <option value="text">Respuesta abierta</option>
            <option value="rating">Calificación (1-5)</option>
          </select>
          <button type="button" onclick="SurveysManager.removeQuestion('${id}')" class="btn-secondary btn-small">
            <span style="color: var(--error);">${ModuleIcons.trash}</span>
          </button>
        </div>
        
        <div class="form-group">
          <input type="text" class="question-text" placeholder="Escribe tu pregunta..." required>
        </div>
        
        <div class="question-options" id="options-${id}">
          <div class="question-option">
            <input type="text" placeholder="Opción 1" class="option-text">
          </div>
          <div class="question-option">
            <input type="text" placeholder="Opción 2" class="option-text">
          </div>
          <button type="button" onclick="SurveysManager.addOption('${id}')" class="btn-outline btn-small">
            <span style="color: var(--neon-cyan);">${ModuleIcons.plus}</span>
            Agregar opción
          </button>
        </div>
      </div>
    `);
  }
  
  static removeQuestion(id) {
    const question = document.querySelector(`[data-question-id="${id}"]`);
    if (question) {
      question.remove();
      this.updateNumbers();
    }
  }
  
  static updateNumbers() {
    document.querySelectorAll('.question-item').forEach((question, index) => {
      const numberEl = question.querySelector('.question-number');
      if (numberEl) {
        numberEl.textContent = index + 1;
      }
    });
  }
  
  static addOption(id) {
    const container = document.getElementById(`options-${id}`);
    if (!container) return;
    
    const count = container.querySelectorAll('.question-option').length + 1;
    const button = container.querySelector('button');
    
    button.insertAdjacentHTML('beforebegin', `
      <div class="question-option">
        <input type="text" placeholder="Opción ${count}" class="option-text">
        <button type="button" onclick="this.parentElement.remove()" class="btn-danger btn-small">
          <span style="color: var(--error);">${ModuleIcons.trash}</span>
        </button>
      </div>
    `);
  }
  
  static changeType(id, type) {
    const container = document.getElementById(`options-${id}`);
    if (!container) return;
    
    if (type === 'text') {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px; background: var(--bg-secondary); border-radius: var(--radius); border: 1px solid var(--border);">Respuesta libre</p>';
    } else if (type === 'rating') {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px; background: var(--bg-secondary); border-radius: var(--radius); border: 1px solid var(--border);">Calificación 1-5 estrellas</p>';
    } else {
      container.innerHTML = `
        <div class="question-option">
          <input type="text" placeholder="Opción 1" class="option-text">
        </div>
        <div class="question-option">
          <input type="text" placeholder="Opción 2" class="option-text">
        </div>
        <button type="button" onclick="SurveysManager.addOption('${id}')" class="btn-outline btn-small">
          <span style="color: var(--neon-cyan);">${ModuleIcons.plus}</span>
          Agregar opción
        </button>
      `;
    }
  }
  
  static clearQuestions() {
    const container = document.getElementById('questionsList');
    if (container) {
      container.innerHTML = '';
    }
  }
  
  static collectQuestions() {
    const questions = [];
    
    document.querySelectorAll('.question-item').forEach((item, index) => {
      const text = item.querySelector('.question-text').value.trim();
      const type = item.querySelector('.question-type').value;
      
      if (!text) return;
      
      const question = {
        id: item.dataset.questionId,
        numero: index + 1,
        texto: text,
        tipo: type,
        opciones: []
      };
      
      if (type === 'multiple') {
        item.querySelectorAll('.option-text').forEach(option => {
          const value = option.value.trim();
          if (value) {
            question.opciones.push(value);
          }
        });
      }
      
      questions.push(question);
    });
    
    return questions;
  }
  
  static async saveSurvey(data) {
    try {
      Utils.showToast('Guardando encuesta...', 'info');
      
      const user = getCurrentUser();
      if (!user) {
        Utils.showToast('Debes iniciar sesión para crear encuestas', 'error');
        return;
      }
      
      const surveyData = {
        ...data,
        timestamp: serverTimestamp(),
        autorId: user.uid,
        autorNombre: user.displayName,
        autorEmail: user.email,
        respuestas: 0
      };
      
      await addDoc(collection(db, 'encuestas'), surveyData);
      
      Utils.showToast('Encuesta creada exitosamente', 'success');
      
      this.closeSurveyModal();
      await this.loadSurveys();
      DashboardManager.loadDashboard();
      
    } catch (e) {
      console.error('Error al guardar encuesta:', e);
      Utils.showToast('Error al crear encuesta', 'error');
    }
  }
  
  static participate(id) {
    Utils.showToast('Funcionalidad próximamente', 'info');
  }
  
  static deleteSurvey(id, title) {
    Utils.confirm('Eliminar Encuesta', `¿Eliminar "${title}"?`, async () => {
      try {
        await deleteDoc(doc(db, 'encuestas', id));
        Utils.showToast('Encuesta eliminada', 'success');
        
        await this.loadSurveys();
        DashboardManager.loadDashboard();
        
      } catch (e) {
        console.error('Error al eliminar encuesta:', e);
        Utils.showToast('Error al eliminar', 'error');
      }
    });
  }
}

// Opinions Manager modernizado
class OpinionsManager {
  static async loadOpinions(updateUI = true) {
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, 'opiniones'), orderBy('timestamp', 'desc')));
      } catch {
        snap = await getDocs(collection(db, 'opiniones'));
      }
      
      const opinions = [];
      snap.forEach(d => {
        opinions.push({ id: d.id, ...d.data() });
      });
      
      opinions.sort((a, b) => {
        const dateA = a.timestamp ? 
          (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : 
          new Date(0);
        const dateB = b.timestamp ? 
          (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : 
          new Date(0);
        return dateB - dateA;
      });
      
      allOpinions = opinions;
      
      if (updateUI) {
        this.displayOpinions(opinions);
      }
      
    } catch (e) {
      console.error('Error al cargar opiniones:', e);
      Utils.showToast('Error al cargar opiniones', 'error');
    }
  }
  
  static displayOpinions(opinions) {
    const list = document.getElementById('opinionsList');
    if (!list) return;
    
    if (!opinions?.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon" style="color: var(--neon-cyan);">
            ${ModuleIcons.comment}
          </div>
          <h3>No hay opiniones</h3>
          <p>¡Comparte tu primera opinión!</p>
          <button class="btn-primary" onclick="OpinionsManager.showOpinionForm()">
            <span style="color: var(--neon-cyan);">${ModuleIcons.plus}</span>
            <span class="btn-text">Escribir Primera Opinión</span>
          </button>
        </div>
      `;
      return;
    }
    
    const user = getCurrentUser();
    
    list.innerHTML = opinions.map(opinion => {
      const isMine = user && opinion.autorId === user.uid;
      const likes = opinion.likes || 0;
      const isLiked = opinion.likedBy && user && opinion.likedBy.includes(user.uid);
      
      return `
        <div class="opinion-card">
          <div class="opinion-header">
            <img src="${opinion.autorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(opinion.autorNombre || 'Usuario')}&background=00f5ff&color=fff&size=80`}" 
                 alt="${opinion.autorNombre}" 
                 class="opinion-avatar">
            
            <div class="opinion-meta">
              <div class="opinion-author">
                <span style="color: var(--neon-cyan);">${ModuleIcons.user}</span>
                ${opinion.autorNombre}
              </div>
              <div class="opinion-date">
                <span style="color: var(--neon-pink);">${ModuleIcons.clock}</span>
                ${Utils.formatDate(opinion.timestamp)}
              </div>
            </div>
            
            <div class="opinion-category">
              <span style="color: var(--neon-cyan);">${ModuleIcons.comment}</span>
              ${this.getCategoryName(opinion.categoria)}
            </div>
            
            ${isMine ? `
              <button class="resource-menu-btn" onclick="OpinionsManager.deleteOpinion('${opinion.id}', '${(opinion.titulo || '').replace(/'/g, "\\'")}')">
                <span style="color: var(--error);">${ModuleIcons.trash}</span>
              </button>
            ` : ''}
          </div>
          
          <h3 class="opinion-title">${opinion.titulo}</h3>
          <p class="opinion-content">${opinion.contenido}</p>
          
          ${opinion.materia ? `
            <div class="opinion-subject">
              <span style="color: var(--neon-cyan);">${ModuleIcons.book}</span>
              ${opinion.materia}
            </div>
          ` : ''}
          
          <div class="opinion-actions">
            <button class="opinion-action ${isLiked ? 'liked' : ''}" onclick="OpinionsManager.toggleLike('${opinion.id}')">
              <span style="color: ${isLiked ? 'var(--error)' : 'var(--neon-pink)'};">
                ${isLiked ? ModuleIcons.heartFilled : ModuleIcons.heart}
              </span>
              <span>${likes}</span>
            </button>
            <button class="opinion-action">
              <span style="color: var(--neon-cyan);">${ModuleIcons.comment}</span>
              <span>Comentar</span>
            </button>
            <button class="opinion-action">
              <span style="color: var(--neon-pink);">${ModuleIcons.share}</span>
              <span>Compartir</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  static getCategoryName(cat) {
    const categories = {
      experiencia: 'Experiencia',
      pregunta: 'Pregunta',
      consejo: 'Consejo',
      debate: 'Debate',
      general: 'General'
    };
    return categories[cat] || 'General';
  }
  
  static showOpinionForm() {
    const form = document.getElementById('opinionForm');
    if (form) {
      form.style.display = 'block';
      
      const title = document.getElementById('opinionTitle');
      if (title) {
        setTimeout(() => title.focus(), 100);
      }
    }
  }
  
  static hideOpinionForm() {
    const form = document.getElementById('opinionForm');
    if (form) {
      form.style.display = 'none';
      
      const formElement = document.getElementById('opinionFormElement');
      if (formElement) {
        formElement.reset();
      }
    }
  }
  
  static async saveOpinion(data) {
    try {
      Utils.showToast('Publicando opinión...', 'info');
      
      const user = getCurrentUser();
      if (!user) {
        Utils.showToast('Debes iniciar sesión para publicar opiniones', 'error');
        return;
      }
      
      const opinionData = {
        ...data,
        timestamp: serverTimestamp(),
        autorId: user.uid,
        autorNombre: user.displayName,
        autorEmail: user.email,
        autorAvatar: user.photoURL,
        likes: 0,
        likedBy: []
      };
      
      await addDoc(collection(db, 'opiniones'), opinionData);
      
      Utils.showToast('Opinión publicada exitosamente', 'success');
      
      this.hideOpinionForm();
      await this.loadOpinions();
      DashboardManager.loadDashboard();
      
    } catch (e) {
      console.error('Error al guardar opinión:', e);
      Utils.showToast('Error al publicar opinión', 'error');
    }
  }
  
  static async toggleLike(id) {
    const user = getCurrentUser();
    if (!user) {
      Utils.showToast('Inicia sesión para dar like', 'warning');
      return;
    }
    
    try {
      const ref = doc(db, 'opiniones', id);
      const opinion = allOpinions.find(o => o.id === id);
      
      if (!opinion) return;
      
      const likedBy = opinion.likedBy || [];
      const isLiked = likedBy.includes(user.uid);
      
      if (isLiked) {
        await updateDoc(ref, {
          likes: increment(-1),
          likedBy: likedBy.filter(uid => uid !== user.uid)
        });
      } else {
        await updateDoc(ref, {
          likes: increment(1),
          likedBy: [...likedBy, user.uid]
        });
      }
      
      await this.loadOpinions();
      
    } catch (e) {
      console.error('Error al dar like:', e);
      Utils.showToast('Error al dar like', 'error');
    }
  }
  
  static deleteOpinion(id, title) {
    Utils.confirm('Eliminar Opinión', `¿Eliminar "${title}"?`, async () => {
      try {
        await deleteDoc(doc(db, 'opiniones', id));
        Utils.showToast('Opinión eliminada', 'success');
        
        await this.loadOpinions();
        DashboardManager.loadDashboard();
        
      } catch (e) {
        console.error('Error al eliminar opinión:', e);
        Utils.showToast('Error al eliminar', 'error');
      }
    });
  }
}

// Profile Manager simplificado
class ProfileManager {
  static update(user) {
    const avatar = document.getElementById('profileAvatar');
    const name = document.getElementById('profileName');
    const email = document.getElementById('profileEmail');
    
    if (avatar) {
      avatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Usuario')}&background=00f5ff&color=fff&size=120`;
    }
    
    if (name) {
      name.textContent = user.displayName || 'Usuario';
    }
    
    if (email) {
      email.textContent = user.email || '';
    }
  }
  
  static loadProfile() {
    const user = getCurrentUser();
    if (!user) return;
    
    const userResources = allResources.filter(r => r.autorId === user.uid);
    const userSurveys = allSurveys.filter(s => s.autorId === user.uid);
    const userOpinions = allOpinions.filter(o => o.autorId === user.uid);
    
    const profileStats = [
      { id: 'profileResources', value: userResources.length },
      { id: 'profileSurveys', value: userSurveys.length },
      { id: 'profileOpinions', value: userOpinions.length }
    ];
    
    profileStats.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
    
    this.loadActivity([...userResources, ...userSurveys, ...userOpinions]);
  }
  
  static loadActivity(activities) {
    const container = document.getElementById('userActivity');
    if (!container) return;
    
    const sorted = activities.sort((a, b) => {
      const dateA = a.timestamp ? 
        (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : 
        new Date(0);
      const dateB = b.timestamp ? 
        (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : 
        new Date(0);
      return dateB - dateA;
    }).slice(0, 10);
    
    if (!sorted.length) {
      container.innerHTML = `
        <div class="activity-placeholder">
          <div class="placeholder-icon" style="color: var(--neon-cyan);">
            ${ModuleIcons.activity}
          </div>
          <p>No tienes actividad reciente</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = sorted.map(activity => {
      let icon = ModuleIcons.document;
      let action = 'Subió un recurso';
      
      if (activity.preguntas) {
        icon = ModuleIcons.survey;
        action = 'Creó una encuesta';
      } else if (activity.contenido) {
        icon = ModuleIcons.comment;
        action = 'Publicó una opinión';
      }
      
      return `
        <div class="timeline-item">
          <div class="timeline-icon" style="color: var(--neon-cyan);">
            ${icon}
          </div>
          <div class="timeline-content">
            <h5>${action}</h5>
            <p>${Utils.truncate(activity.titulo, 50)}</p>
            <div class="timeline-date">
              <span style="color: var(--neon-pink);">${ModuleIcons.clock}</span>
              ${Utils.formatDate(activity.timestamp)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Uploadcare initialization optimizada
function initUploadcare() {
  let attempts = 0;
  const maxAttempts = 10;
  
  const checkUploadcare = () => {
    attempts++;
    
    if (typeof uploadcare !== 'undefined') {
      try {
        const archivoElement = document.getElementById('archivo');
        if (!archivoElement) {
          if (attempts < maxAttempts) {
            setTimeout(checkUploadcare, 1000);
          }
          return;
        }
        
        uploadcareWidget = uploadcare.Widget('#archivo');
        
        uploadcareWidget.onUploadComplete(info => {
          Utils.showToast('Archivo cargado', 'success');
        });
        
        uploadcareWidget.onChange(file => {
          if (file) {
            Utils.showToast('Archivo seleccionado', 'info');
          }
        });
        
      } catch (error) {
        console.error('Error inicializando Uploadcare:', error);
        
        if (attempts < maxAttempts) {
          setTimeout(checkUploadcare, 2000);
        }
      }
    } else if (attempts < maxAttempts) {
      setTimeout(checkUploadcare, 1000);
    }
  };
  
  checkUploadcare();
}

// Navegación y Event Listeners
function navigateToSection(sectionName) {
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  
  const targetSection = document.getElementById(sectionName + 'Section');
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeButton = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
  
  // Cargar contenido específico
  switch (sectionName) {
    case 'dashboard':
      DashboardManager.loadDashboard();
      break;
    case 'resources':
      ResourcesManager.loadResources();
      break;
    case 'surveys':
      SurveysManager.loadSurveys();
      break;
    case 'opinions':
      OpinionsManager.loadOpinions();
      break;
    case 'profile':
      ProfileManager.loadProfile();
      break;
  }
}

function setupEventListeners() {
  // Navegación principal
  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const section = button.getAttribute('data-section');
      if (section) {
        navigateToSection(section);
      }
    });
  });
  
  // Botones principales
  const buttonMappings = [
    { id: 'addResourceBtn', action: () => ResourcesManager.openUploadModal(), requireAuth: true },
    { id: 'addSurveyBtn', action: () => SurveysManager.openSurveyModal(), requireAuth: true },
    { id: 'addOpinionBtn', action: () => OpinionsManager.showOpinionForm(), requireAuth: true },
    { id: 'myResourcesBtn', action: () => ResourcesManager.showMyResources(), requireAuth: true }
  ];
  
  buttonMappings.forEach(({ id, action, requireAuth }) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        if (requireAuth && !getCurrentUser()) {
          Utils.showToast('Inicia sesión para usar esta función', 'warning');
          return;
        }
        action();
      });
    }
  });
  
  // Formularios
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const data = {
        titulo: document.getElementById('titulo')?.value,
        categoria: document.getElementById('categoria')?.value,
        materia: document.getElementById('materia')?.value,
        nivel: document.getElementById('nivel')?.value,
        descripcion: document.getElementById('descripcion')?.value
      };
      
      if (!data.titulo || !data.categoria || !data.materia) {
        Utils.showToast('Completa los campos obligatorios', 'warning');
        return;
      }
      
      ResourcesManager.saveResource(data);
    });
  }
  
  const surveyForm = document.getElementById('surveyForm');
  if (surveyForm) {
    surveyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const data = {
        titulo: document.getElementById('surveyTitle')?.value,
        descripcion: document.getElementById('surveyDescription')?.value,
        categoria: document.getElementById('surveyCategory')?.value,
        preguntas: SurveysManager.collectQuestions()
      };
      
      if (!data.titulo || !data.categoria) {
        Utils.showToast('Completa los campos obligatorios', 'warning');
        return;
      }
      
      if (data.preguntas.length === 0) {
        Utils.showToast('Agrega al menos una pregunta', 'warning');
        return;
      }
      
      SurveysManager.saveSurvey(data);
    });
  }
  
  const opinionForm = document.getElementById('opinionFormElement');
  if (opinionForm) {
    opinionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const data = {
        titulo: document.getElementById('opinionTitle')?.value,
        contenido: document.getElementById('opinionContent')?.value,
        categoria: document.getElementById('opinionCategory')?.value,
        materia: document.getElementById('opinionSubject')?.value
      };
      
      if (!data.titulo || !data.contenido) {
        Utils.showToast('Completa los campos obligatorios', 'warning');
        return;
      }
      
      OpinionsManager.saveOpinion(data);
    });
  }
  
  // Filtros
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        ResourcesManager.filterResources();
      }, 300);
    });
  }
  
  const filterCategoria = document.getElementById('filterCategoria');
  if (filterCategoria) {
    filterCategoria.addEventListener('change', () => {
      ResourcesManager.filterResources();
    });
  }
  
  const filterNivel = document.getElementById('filterNivel');
  if (filterNivel) {
    filterNivel.addEventListener('change', () => {
      ResourcesManager.filterResources();
    });
  }
  
  // Botones de cerrar modales
  const closeButtons = [
    { id: 'closeUploadModal', action: () => ResourcesManager.closeUploadModal() },
    { id: 'cancelUpload', action: () => ResourcesManager.closeUploadModal() },
    { id: 'closeSurveyModal', action: () => SurveysManager.closeSurveyModal() },
    { id: 'cancelSurvey', action: () => SurveysManager.closeSurveyModal() },
    { id: 'cancelOpinion', action: () => OpinionsManager.hideOpinionForm() },
    { id: 'cancelOpinionBtn', action: () => OpinionsManager.hideOpinionForm() }
  ];
  
  closeButtons.forEach(({ id, action }) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', action);
    }
  });
  
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', () => SurveysManager.addQuestion());
  }
  
  // Cerrar modales con overlay
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      const modal = e.target.parentElement;
      if (modal.id === 'uploadModal') {
        ResourcesManager.closeUploadModal();
      } else if (modal.id === 'surveyModal') {
        SurveysManager.closeSurveyModal();
      }
    }
  });
}

// Hacer funciones globales
window.DashboardManager = DashboardManager;
window.ResourcesManager = ResourcesManager;
window.SurveysManager = SurveysManager;
window.OpinionsManager = OpinionsManager;
window.ProfileManager = ProfileManager;
window.navigateToSection = navigateToSection;

// Inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setTimeout(initUploadcare, 2000);
  });
} else {
  setupEventListeners();
  setTimeout(initUploadcare, 2000);
}

console.log('EstudiaFácil Modules v3.0 - Optimizado y modernizado');