const getEstudiaFacilCore = () => {
  if (window.EstudiaFacilAuth) return window.EstudiaFacilAuth;
  if (window.EstudiaFacilCore) return window.EstudiaFacilCore;
  console.error('Sistema de autenticación no disponible');
  return null;
};

const core = getEstudiaFacilCore();
if (!core) console.error('No se pudo cargar EstudiaFácil Core');

const {
  auth, db, collection, addDoc, getDocs, deleteDoc, doc, orderBy, query, where,
  serverTimestamp, updateDoc, increment, setDoc, getDoc, getCurrentUser, isUserLoggedIn
} = core || {};

// Variables globales
let allResources = [], allSurveys = [], allOpinions = [], uploadcareWidget = null;

// SVG Icons centralizados
const ModuleIcons = {
  document: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  survey: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM21 11h-4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  heart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  heartFilled: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  comment: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clock: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  book: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  activity: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

// Utilidades optimizadas
class Utils {
  static showToast(message, type = 'success') {
    if (window.EstudiaFacilAuth?.showToast) return window.EstudiaFacilAuth.showToast(message, type);
    
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `background: var(--surface, #1e293b) !important; color: var(--text, #ffffff) !important; border: 1px solid var(--border, rgba(255, 255, 255, 0.1)) !important; display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; opacity: 1; transform: translateX(0);`;
    
    const colorMap = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
    toast.innerHTML = `<div class="toast-icon" style="color: ${colorMap[type] || '#00f5ff'};">${type === 'success' ? ModuleIcons.heart : ModuleIcons.activity}</div><span class="toast-message" style="color: var(--text, #ffffff) !important;">${message}</span>`;
    
    toastContainer.appendChild(toast);
    setTimeout(() => toast.parentNode && toast.remove(), 3000);
  }
  
  static formatDate(timestamp) {
    if (!timestamp) return 'Sin fecha';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const diff = Math.abs(new Date() - date);
      const mins = Math.ceil(diff / (1000 * 60)), hours = Math.ceil(diff / (1000 * 60 * 60)), days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      if (mins < 60) return `Hace ${mins} min`;
      if (hours < 24) return `Hace ${hours}h`;
      if (days < 7) return `Hace ${days} días`;
      
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Sin fecha'; }
  }
  
  static truncate(text, max = 100) { return !text || text.length <= max ? text || '' : text.substring(0, max) + '...'; }
  
  static getCategoryIcon(cat) {
    const iconMap = { apuntes: ModuleIcons.edit, examenes: ModuleIcons.survey, proyectos: ModuleIcons.activity, libros: ModuleIcons.book, otros: ModuleIcons.document };
    return iconMap[cat] || ModuleIcons.document;
  }
  
  static confirm(title, msg, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle'), msgEl = document.getElementById('confirmMessage');
    const cancel = document.getElementById('confirmCancel'), ok = document.getElementById('confirmOk');
    
    if (!modal) return;
    
    modal.style.cssText = `display: flex !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8) !important; z-index: 9999; align-items: center; justify-content: center;`;
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.style.cssText = `background: var(--surface, #1e293b) !important; color: var(--text, #ffffff) !important; border: 1px solid var(--border, rgba(255, 255, 255, 0.1)) !important; padding: 2rem; border-radius: 12px; max-width: 400px; width: 90%;`;
    
    if (titleEl) { titleEl.textContent = title; titleEl.style.color = 'var(--text, #ffffff) !important'; }
    if (msgEl) { msgEl.textContent = msg; msgEl.style.color = 'var(--text-muted, #94a3b8) !important'; }
    
    document.body.style.overflow = 'hidden';
    setTimeout(() => cancel && cancel.focus(), 100);
    
    const handleCancel = () => {
      modal.style.display = 'none'; document.body.style.overflow = '';
      if (cancel) cancel.removeEventListener('click', handleCancel);
      if (ok) ok.removeEventListener('click', handleOk);
    };
    
    const handleOk = () => {
      modal.style.display = 'none'; document.body.style.overflow = '';
      if (typeof onConfirm === 'function') onConfirm();
      if (cancel) cancel.removeEventListener('click', handleCancel);
      if (ok) ok.removeEventListener('click', handleOk);
    };
    
    if (cancel) cancel.addEventListener('click', handleCancel);
    if (ok) ok.addEventListener('click', handleOk);
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') { handleCancel(); document.removeEventListener('keydown', handleEscape); }
    };
    document.addEventListener('keydown', handleEscape);
  }
  
  static generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
}

// Dashboard Manager optimizado
class DashboardManager {
  static async loadDashboard() {
    try {
      const user = getCurrentUser();
      if (!user) { this.showWelcomeMessage(); return; }
      
      this.hideWelcomeMessage();
      await Promise.all([ResourcesManager.loadResources(false), SurveysManager.loadSurveys(false), OpinionsManager.loadOpinions(false)]);
      this.updateStats(); this.loadRecent(); this.loadCategories();
    } catch (e) { console.error('Error cargando dashboard:', e); Utils.showToast('Error al cargar el dashboard', 'error'); }
  }
  
  static showWelcomeMessage() {
    const welcomeHero = document.getElementById('welcomeHero'), dashboardContent = document.getElementById('dashboardContent');
    if (welcomeHero) welcomeHero.style.display = 'block';
    if (dashboardContent) dashboardContent.style.display = 'none';
  }
  
  static hideWelcomeMessage() {
    const welcomeHero = document.getElementById('welcomeHero'), dashboardContent = document.getElementById('dashboardContent');
    if (welcomeHero) welcomeHero.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';
  }
  
  static updateStats() {
    const stats = { totalResources: allResources.length, totalSurveys: allSurveys.length, totalOpinions: allOpinions.length };
    const users = new Set([...allResources, ...allSurveys, ...allOpinions].map(i => i.autorId).filter(Boolean));
    stats.totalUsers = users.size;
    
    Object.entries(stats).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (element) element.textContent = value;
    });
    
    [{ id: 'footerResources', value: allResources.length }, { id: 'footerSurveys', value: allSurveys.length }, { id: 'footerUsers', value: users.size }].forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }
  
  static loadRecent() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    const activities = [...allResources.map(i => ({ ...i, type: 'resource' })), ...allSurveys.map(i => ({ ...i, type: 'survey' })), ...allOpinions.map(i => ({ ...i, type: 'opinion' }))];
    activities.sort((a, b) => {
      const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
      const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
      return dateB - dateA;
    });
    
    const recent = activities.slice(0, 5);
    if (recent.length === 0) {
      container.innerHTML = `<div class="activity-placeholder"><div class="placeholder-icon">${ModuleIcons.activity}</div><p>No hay actividad reciente</p></div>`;
      return;
    }
    
    const iconMap = { resource: ModuleIcons.document, survey: ModuleIcons.survey, opinion: ModuleIcons.comment };
    container.innerHTML = recent.map(activity => `<div class="activity-item"><div class="activity-icon">${iconMap[activity.type] || ModuleIcons.activity}</div><div class="activity-content"><h4>${Utils.truncate(activity.titulo, 30)}</h4><p><span>${ModuleIcons.user}</span>${activity.autorNombre || 'Anónimo'} • <span>${ModuleIcons.clock}</span>${Utils.formatDate(activity.timestamp)}</p></div></div>`).join('');
  }
  
  static loadCategories() {
    const container = document.getElementById('topCategories');
    if (!container) return;
    
    const catCount = {};
    allResources.forEach(resource => {
      const cat = resource.categoria || 'otros';
      catCount[cat] = (catCount[cat] || 0) + 1;
    });
    
    const sorted = Object.entries(catCount).sort(([, a], [, b]) => b - a).slice(0, 5);
    if (sorted.length === 0) {
      container.innerHTML = `<div class="activity-placeholder"><div class="placeholder-icon">${ModuleIcons.survey}</div><p>No hay categorías disponibles</p></div>`;
      return;
    }
    
    container.innerHTML = sorted.map(([cat, count]) => `<div class="category-item"><div class="category-info"><span class="category-icon">${Utils.getCategoryIcon(cat)}</span><span class="category-name">${ResourcesManager.getCategoryName(cat)}</span></div><span class="category-count">${count}</span></div>`).join('');
  }
}

// Resources Manager optimizado
class ResourcesManager {
  static openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
      modal.style.display = 'flex'; document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const titleInput = document.getElementById('titulo');
        if (titleInput) titleInput.focus();
        // Limitar categorías a 'libros' y 'apuntes'
        const catInput = document.getElementById('categoria');
        if (catInput) {
          catInput.innerHTML = '<option value="libros">Libros</option><option value="apuntes">Apuntes</option>';
        }
        // Limitar materias a las definidas y asegurar que sea un <select>
        const materias = ['etp','matematicas','comunicacion','cyt','ciencias sociales','arte','religion','ingles','fisica','dpcc'];
        let materiaInput = document.getElementById('materia');
        if (materiaInput) {
          // Si no es un <select>, reemplazarlo
          if (materiaInput.tagName.toLowerCase() !== 'select') {
            const select = document.createElement('select');
            select.id = 'materia';
            select.name = 'materia';
            select.className = 'enhanced-select'; // mismo estilo que categorías
            materiaInput.parentNode.replaceChild(select, materiaInput);
            materiaInput = select;
          } else {
            materiaInput.className = 'enhanced-select'; // asegurar el estilo
          }
          materiaInput.innerHTML = materias.map(m => `<option value="${m}">${m.charAt(0).toUpperCase() + m.slice(1)}</option>`).join('');
        }
      }, 100);
    }
  }
  
  static closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
      modal.style.display = 'none'; document.body.style.overflow = '';
      const form = document.getElementById('uploadForm');
      if (form) form.reset();
      if (window.uploadcareWidget) { try { window.uploadcareWidget.value(null); } catch (e) {} }
    }
  }
  
  static async saveResource(data) {
    try {
      Utils.showToast('Guardando recurso...', 'info');
      const user = getCurrentUser();
      if (!user) { Utils.showToast('Debes iniciar sesión para guardar recursos', 'error'); return; }
      
      let fileData = {};
      if (window.uploadcareWidget) {
        try {
          const file = window.uploadcareWidget.value();
          if (file && file.then) {
            const fileInfo = await file;
            fileData = { archivo: fileInfo.cdnUrl, nombreArchivo: fileInfo.name, tamanoArchivo: fileInfo.size, tipoMime: fileInfo.mimeType };
          } else if (file && file.cdnUrl) {
            fileData = { archivo: file.cdnUrl, nombreArchivo: file.name || 'archivo', tamanoArchivo: file.size || 0, tipoMime: file.mimeType || 'application/octet-stream' };
          }
        } catch (e) { console.error('Error obteniendo archivo de Uploadcare:', e); Utils.showToast('Error al procesar el archivo', 'error'); return; }
      }
      
      if (!fileData.archivo) { Utils.showToast('Por favor selecciona un archivo', 'warning'); return; }
      
      const resourceData = { ...data, ...fileData, timestamp: serverTimestamp(), autorId: user.uid, autorNombre: user.displayName || 'Usuario', autorEmail: user.email, autorAvatar: user.photoURL };
      await addDoc(collection(db, 'recursos'), resourceData);
      Utils.showToast('Recurso guardado exitosamente', 'success');
      this.closeUploadModal(); await this.loadResources(); DashboardManager.loadDashboard();
    } catch (e) { console.error('Error al guardar recurso:', e); Utils.showToast('Error al guardar recurso', 'error'); }
  }
  
  static async loadResources(updateUI = true) {
    try {
      // Consulta SIN orderBy para descartar problemas de ordenamiento
      const snap = await getDocs(collection(db, 'recursos'));
      const resources = [];
      snap.forEach(d => {
        let data = { id: d.id, ...d.data() };
        // Si no tiene timestamp pero sí fechaCreacion, normalizar
        if (!data.timestamp && data.fechaCreacion) {
          try {
            const fecha = new Date(Date.parse(data.fechaCreacion.replace(/\u202f|\u200e/g, '')));
            if (!isNaN(fecha.getTime())) data.timestamp = fecha;
          } catch {}
        }
        resources.push(data);
      });
      // Cargar PDFs del JSON estático y combinarlos
      let pdfs = [];
      try {
        const response = await fetch('recursos/recursos.json');
        if (response.ok) {
          pdfs = await response.json();
          pdfs = pdfs.map(pdf => ({
            ...pdf,
            id: 'pdf-' + (pdf.titulo || Math.random().toString(36).substr(2)),
            archivo: pdf.archivo,
            categoria: pdf.categoria || 'otros',
            autorNombre: pdf.autorNombre || 'Recursos PDF',
            timestamp: pdf.timestamp || null,
            esPDF: true
          }));
        }
      } catch (e) {
        pdfs = [];
      }
      // Unir ambos arrays y ordenar por fecha si es posible
      const all = [...resources, ...pdfs];
      all.sort((a, b) => {
        const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
        const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
        return dateB - dateA;
      });
      allResources = all;
      if (updateUI) this.displayResources(all);
    } catch (e) { console.error('Error al cargar recursos:', e); Utils.showToast('Error al cargar recursos', 'error'); }
  }
  
  static displayResources(resources) {
    const list = document.getElementById('listaRecursos'), empty = document.getElementById('emptyState');
    if (!list) return;
    
    if (!resources?.length) {
      list.innerHTML = ''; if (empty) empty.style.display = 'block'; return;
    }
    if (empty) empty.style.display = 'none';
    
    const user = getCurrentUser();
    list.innerHTML = resources.map(resource => {
      const isMine = user && resource.autorId === user.uid;
      let url = resource.archivo || resource.enlace;
      if (url?.includes('-/preview/')) url = url.replace('-/preview/', '');
      
      return `
        <article class="resource-card ${isMine ? 'my-resource' : ''}" data-category="${resource.categoria || 'otros'}">
          <div class="resource-header">
            <span class="resource-category"><span class="resource-category-icon">${Utils.getCategoryIcon(resource.categoria)}</span>${this.getCategoryName(resource.categoria)}</span>
            ${isMine ? `<div class="resource-actions-menu"><button class="resource-menu-btn" onclick="ResourcesManager.toggleMenu('${resource.id}')"><span class="resource-menu-icon">${ModuleIcons.trash}</span></button><div class="resource-menu" id="menu-${resource.id}"><button onclick="ResourcesManager.deleteResource('${resource.id}', '${(resource.titulo || '').replace(/'/g, "\\'")}')"><span class="resource-delete-icon">${ModuleIcons.trash}</span>Eliminar</button></div></div>` : `<span class="file-type-icon">${ModuleIcons.document}</span>`}
          </div>
          <h3 class="resource-title">${resource.titulo || 'Sin título'}</h3>
          <div class="resource-meta">
            <div class="resource-subject"><span class="resource-subject-icon">${ModuleIcons.book}</span>${resource.materia || 'Sin materia'}</div>
            ${resource.nivel ? `<div class="resource-level"><span class="resource-level-icon">${ModuleIcons.activity}</span>${this.getLevelName(resource.nivel)}</div>` : ''}
            <div class="resource-author"><span class="resource-author-icon">${ModuleIcons.user}</span>Por ${resource.autorNombre || 'Anónimo'} • <span class="resource-date-icon">${ModuleIcons.clock}</span>${Utils.formatDate(resource.timestamp)}</div>
          </div>
          ${resource.descripcion ? `<p class="resource-description">${Utils.truncate(resource.descripcion, 120)}</p>` : ''}
          <div class="resource-actions"><a href="${url}" target="_blank" rel="noopener noreferrer" class="btn-download"><span class="download-icon">${ModuleIcons.download}</span>Ver recurso</a></div>
        </article>`;
    }).join('');
  }
  
  // getCategoryName y getLevelName solo aquí, no duplicar en otros managers.
  static getCategoryName(cat) {
    // Solo permitir 'libros' y 'apuntes'
    const categories = {
      apuntes: 'Apuntes',
      libros: 'Libros'
    };
    return categories[cat] || cat || 'Sin categoría';
  }

  static getLevelName(level) {
    // Personaliza los nombres de niveles según tus necesidades
    const levels = {
      primaria: 'Primaria',
      secundaria: 'Secundaria',
      preparatoria: 'Preparatoria',
      universidad: 'Universidad',
      otro: 'Otro'
    };
    return levels[level] || level || 'Sin nivel';
  }
  
  static filterResources() {
    const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const cat = document.getElementById('filterCategoria')?.value || '';
    const level = document.getElementById('filterNivel')?.value || '';
    let filtered = allResources;
    if (search) {
      filtered = filtered.filter(resource => {
        // Asegurar que los campos existen y son string
        const searchFields = [resource.titulo, resource.materia, resource.descripcion, resource.autorNombre];
        return searchFields.some(field => (field || '').toString().toLowerCase().includes(search));
      });
    }
    if (cat) filtered = filtered.filter(resource => (resource.categoria || '').toString() === cat);
    if (level) filtered = filtered.filter(resource => (resource.nivel || '').toString() === level);
    this.displayResources(filtered);
  }
  
  static showMyResources() {
    const user = getCurrentUser();
    if (!user) { Utils.showToast('Inicia sesión para ver tus recursos', 'warning'); return; }
    const mine = allResources.filter(resource => resource.autorId === user.uid);
    this.displayResources(mine); Utils.showToast(`Mostrando ${mine.length} de tus recursos`, 'info');
  }
  
  static toggleMenu(id) {
    const menu = document.getElementById(`menu-${id}`);
    if (!menu) return;
    document.querySelectorAll('.resource-menu').forEach(m => { if (m.id !== `menu-${id}`) m.classList.remove('show'); });
    menu.classList.toggle('show');
    const closeHandler = (e) => { if (!menu.contains(e.target)) { menu.classList.remove('show'); document.removeEventListener('click', closeHandler); } };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
  }
  
  static deleteResource(id, title) {
    Utils.confirm('Eliminar Recurso', `¿Eliminar "${title}"?`, async () => {
      try {
        await deleteDoc(doc(db, 'recursos', id)); Utils.showToast('Recurso eliminado', 'success');
        await this.loadResources(); DashboardManager.loadDashboard();
      } catch (e) { console.error('Error al eliminar recurso:', e); Utils.showToast('Error al eliminar', 'error'); }
    });
  }
}

// Surveys Manager MEJORADO
class SurveysManager {
  static openSurveyModal() {
    const modal = document.getElementById('surveyModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      this.clearQuestions();
      // UI simplificada: solo una pregunta por defecto, menos texto, más directo
      this.addQuestion();
      // Simplificar títulos y placeholders
      const titleInput = document.getElementById('surveyTitle');
      if (titleInput) {
        titleInput.placeholder = 'Título claro de la encuesta (ej: ¿Qué materia te gusta más?)';
        titleInput.focus();
      }
      const descInput = document.getElementById('surveyDescription');
      if (descInput) descInput.placeholder = 'Descripción breve (opcional)';
      const catInput = document.getElementById('surveyCategory');
      if (catInput) catInput.title = 'Selecciona una categoría';
      // Ocultar textos de ayuda extensos
      document.querySelectorAll('.form-hint, .options-description, .question-settings, .btn-help').forEach(el => { if (el) el.style.display = 'none'; });
      // Dejar solo lo esencial visible
      document.querySelectorAll('.options-header').forEach(el => { if (el) el.style.display = 'none'; });
      // Ocultar encabezado de preguntas y botón de agregar si ya hay 1 pregunta
      const addBtn = document.getElementById('addQuestionBtn');
      if (addBtn) addBtn.querySelector('.btn-text').textContent = 'Agregar otra pregunta';
      const questionsList = document.getElementById('questionsList');
      if (questionsList && questionsList.children.length === 1 && addBtn) addBtn.style.display = 'none';
      else if (addBtn) addBtn.style.display = '';
    }
  }
  
  static closeSurveyModal() {
    const modal = document.getElementById('surveyModal');
    if (modal) {
      modal.style.display = 'none'; document.body.style.overflow = '';
      const form = document.getElementById('surveyForm'); if (form) form.reset();
      this.clearQuestions();
    }
  }
  
  static async loadSurveys(updateUI = true) {
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, 'encuestas'), orderBy('timestamp', 'desc')));
      } catch { snap = await getDocs(collection(db, 'encuestas')); }
      
      const surveys = [];
      snap.forEach(d => { surveys.push({ id: d.id, ...d.data() }); });
      surveys.sort((a, b) => {
        const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
        const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
        return dateB - dateA;
      });
      
      allSurveys = surveys;
      if (updateUI) this.displaySurveys(surveys);
    } catch (e) { console.error('Error al cargar encuestas:', e); Utils.showToast('Error al cargar encuestas', 'error'); }
  }
  
  static displaySurveys(surveys) {
    const list = document.getElementById('surveysList');
    if (!list) return;
    
    if (!surveys?.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">${ModuleIcons.survey}</div><h3>No hay encuestas</h3><p>¡Sé el primero en crear una!</p><button class="btn-primary" onclick="SurveysManager.openSurveyModal()"><span class="btn-icon">${ModuleIcons.plus}</span><span class="btn-text">Crear Primera Encuesta</span></button></div>`;
      return;
    }
    
    const user = getCurrentUser();
    list.innerHTML = surveys.map(survey => {
      const isMine = user && survey.autorId === user.uid;
      return `
        <div class="survey-card">
          <div class="survey-header">
            <span class="survey-category"><span class="survey-category-icon">${ModuleIcons.survey}</span>${this.getCategoryName(survey.categoria)}</span>
            ${isMine ? `<button class="resource-menu-btn" onclick="SurveysManager.deleteSurvey('${survey.id}', '${(survey.titulo || '').replace(/'/g, "\\'")}')"><span class="survey-delete-icon">${ModuleIcons.trash}</span></button>` : ''}
          </div>
          <h3 class="survey-title">${survey.titulo}</h3>
          ${survey.descripcion ? `<p class="survey-description">${Utils.truncate(survey.descripcion, 100)}</p>` : ''}
          <div class="survey-meta">
            <div><span class="survey-author-icon">${ModuleIcons.user}</span>Por ${survey.autorNombre} • <span class="survey-date-icon">${ModuleIcons.clock}</span>${Utils.formatDate(survey.timestamp)}</div>
            <div class="survey-stats">
              <span class="survey-stat"><span class="survey-questions-icon">${ModuleIcons.edit}</span><span>${survey.preguntas?.length || 0} preguntas</span></span>
              <span class="survey-stat"><span class="survey-responses-icon">${ModuleIcons.user}</span><span>${survey.respuestas || 0} respuestas</span></span>
            </div>
          </div>
          <div class="survey-actions"><button class="btn-participate" onclick="SurveysManager.participate('${survey.id}')"><span class="participate-icon">${ModuleIcons.edit}</span>Participar</button></div>
        </div>`;
    }).join('');
  }
  
  // getCategoryName solo aquí, no duplicar en otros managers.
  static getCategoryName(cat) {
    // Puedes personalizar los nombres de categorías según tus necesidades
    const categories = {
      general: 'General',
      satisfaccion: 'Satisfacción',
      sugerencias: 'Sugerencias',
      experiencia: 'Experiencia',
      otro: 'Otro'
    };
    return categories[cat] || cat || 'Sin categoría';
  }
  
  // MÉTODO MEJORADO addQuestion
  static addQuestion() {
    const container = document.getElementById('questionsList');
    if (!container) return;
    
    const count = container.children.length + 1;
    const id = Utils.generateId();
    
    container.insertAdjacentHTML('beforeend', `
      <div class="question-item enhanced" data-question-id="${id}">
        <div class="question-header">
          <div class="question-number-badge"><span class="question-number">${count}</span></div>
          <div class="question-type-wrapper">
            <label class="type-label">Tipo de pregunta:</label>
            <select class="question-type enhanced-select" onchange="SurveysManager.changeType('${id}', this.value)">
              <option value="multiple">📋 Opción múltiple</option>
              <option value="text">✏️ Respuesta abierta</option>
              <option value="rating">⭐ Calificación (1-5)</option>
            </select>
          </div>
          <button type="button" onclick="SurveysManager.removeQuestion('${id}')" class="btn-remove-question" title="Eliminar pregunta">
            <span class="remove-icon">${ModuleIcons.trash}</span>
          </button>
        </div>
        
        <div class="question-content">
          <div class="form-group-enhanced">
            <label for="question-${id}" class="question-label">
              <span class="label-icon">❓</span>
              Texto de la pregunta <span class="required">*</span>
            </label>
            <div class="input-wrapper">
              <input type="text" id="question-${id}" class="question-text enhanced-input" placeholder="Ej: ¿Qué tan satisfecho estás con nuestro servicio al cliente?" required>
              <div class="input-border"></div>
            </div>
            <small class="form-hint">
              <span class="hint-icon">💡</span>
              Escribe una pregunta clara y específica para obtener mejores respuestas
            </small>
          </div>
          
          <div class="question-options enhanced-options" id="options-${id}">
            <div class="options-header">
              <h4 class="options-title"><span class="options-icon">📝</span>Opciones de respuesta</h4>
              <p class="options-description">Define las opciones que los participantes podrán seleccionar</p>
            </div>
            
            <div class="options-list">
              <div class="question-option enhanced-option">
                <div class="option-indicator">A</div>
                <div class="option-input-wrapper">
                  <input type="text" placeholder="Ej: Muy satisfecho - Superó mis expectativas" class="option-text enhanced-option-input">
                  <div class="input-border"></div>
                </div>
                <button type="button" class="btn-remove-option" title="Eliminar opción" onclick="SurveysManager.removeOption(this)">
                  <span>${ModuleIcons.trash}</span>
                </button>
              </div>
              
              <div class="question-option enhanced-option">
                <div class="option-indicator">B</div>
                <div class="option-input-wrapper">
                  <input type="text" placeholder="Ej: Satisfecho - Cumplió mis expectativas" class="option-text enhanced-option-input">
                  <div class="input-border"></div>
                </div>
                <button type="button" class="btn-remove-option" title="Eliminar opción" onclick="SurveysManager.removeOption(this)">
                  <span>${ModuleIcons.trash}</span>
                </button>
              </div>
              
              <div class="question-option enhanced-option">
                <div class="option-indicator">C</div>
                <div class="option-input-wrapper">
                  <input type="text" placeholder="Ej: Neutral - No tengo una opinión definida" class="option-text enhanced-option-input">
                  <div class="input-border"></div>
                </div>
                <button type="button" class="btn-remove-option" title="Eliminar opción" onclick="SurveysManager.removeOption(this)">
                  <span>${ModuleIcons.trash}</span>
                </button>
              </div>
            </div>
            
            <button type="button" onclick="SurveysManager.addOption('${id}')" class="btn-add-option">
              <span class="add-icon">${ModuleIcons.plus}</span>
              <span class="btn-text">Agregar nueva opción</span>
            </button>
          </div>
          
          <div class="question-settings">
            <div class="settings-row">
              <label class="checkbox-enhanced">
                <input type="checkbox" class="required-checkbox">
                <span class="checkbox-custom"></span>
                <span class="checkbox-label"><span class="checkbox-icon">⚠️</span>Pregunta obligatoria</span>
              </label>
              <button type="button" class="btn-help" title="Consejos para crear mejores preguntas">
                <span class="help-icon">❓</span><span class="btn-text">Ayuda</span>
              </button>
            </div>
          </div>
        </div>
      </div>`);
    
    // Animación de entrada
    const newQuestion = container.lastElementChild;
    newQuestion.style.opacity = '0'; newQuestion.style.transform = 'translateY(20px)';
    setTimeout(() => {
      newQuestion.style.transition = 'all 0.3s ease'; newQuestion.style.opacity = '1'; newQuestion.style.transform = 'translateY(0)';
    }, 100);
  }
  
  // MÉTODO MEJORADO changeType
  static changeType(id, type) {
    const container = document.getElementById(`options-${id}`);
    if (!container) return;
    
    container.style.transition = 'all 0.3s ease'; container.style.opacity = '0.5';
    
    setTimeout(() => {
      if (type === 'text') {
        container.innerHTML = `
          <div class="options-header">
            <h4 class="options-title"><span class="options-icon">✏️</span>Configuración de respuesta abierta</h4>
            <p class="options-description">Los participantes podrán escribir una respuesta en texto libre</p>
          </div>
          <div class="text-response-config">
            <div class="config-card">
              <div class="config-header"><span class="config-icon">📝</span><h5>Personalizar campo de texto</h5></div>
              <div class="form-group-enhanced">
                <label for="placeholder-${id}">Texto de ayuda (placeholder):</label>
                <div class="input-wrapper">
                  <input type="text" id="placeholder-${id}" class="enhanced-input" placeholder="Ej: Comparte tu experiencia detallada aquí...">
                  <div class="input-border"></div>
                </div>
              </div>
              <div class="form-group-enhanced">
                <label for="rows-${id}">Altura del campo:</label>
                <select id="rows-${id}" class="enhanced-select">
                  <option value="3">Pequeño (3 líneas)</option>
                  <option value="5" selected>Mediano (5 líneas)</option>
                  <option value="8">Grande (8 líneas)</option>
                </select>
              </div>
            </div>
            <div class="preview-card">
              <h6>Vista previa:</h6>
              <textarea class="preview-textarea" placeholder="Comparte tu experiencia detallada aquí..." rows="3" disabled></textarea>
            </div>
          </div>`;
      } else if (type === 'rating') {
        container.innerHTML = `
          <div class="options-header">
            <h4 class="options-title"><span class="options-icon">⭐</span>Configuración de calificación</h4>
            <p class="options-description">Los participantes calificarán usando una escala de 1 a 5 estrellas</p>
          </div>
          <div class="rating-config">
            <div class="config-card">
              <div class="config-header"><span class="config-icon">⭐</span><h5>Personalizar escala</h5></div>
              <div class="rating-preview-enhanced">
                <div class="rating-scale">
                  <div class="rating-endpoint">
                    <span class="rating-number">1</span>
                    <div class="stars">⭐</div>
                    <input type="text" class="rating-label-input" placeholder="Ej: Muy malo" id="rating-min-${id}">
                  </div>
                  <div class="rating-middle"><span class="rating-dots">••••</span></div>
                  <div class="rating-endpoint">
                    <span class="rating-number">5</span>
                    <div class="stars">⭐⭐⭐⭐⭐</div>
                    <input type="text" class="rating-label-input" placeholder="Ej: Excelente" id="rating-max-${id}">
                  </div>
                </div>
              </div>
            </div>
            <div class="preview-card">
              <h6>Vista previa:</h6>
              <div class="rating-preview-demo">
                <div class="rating-stars">
                  <span class="star active">⭐</span><span class="star active">⭐</span><span class="star active">⭐</span>
                  <span class="star">⭐</span><span class="star">⭐</span>
                </div>
                <span class="rating-text">3 de 5 estrellas</span>
              </div>
            </div>
          </div>`;
      } else {
        this.renderMultipleChoiceOptions(container, id);
      }
      container.style.opacity = '1';
    }, 150);
  }
  
  static renderMultipleChoiceOptions(container, id) {
    container.innerHTML = `
      <div class="options-header">
        <h4 class="options-title"><span class="options-icon">📋</span>Opciones de respuesta múltiple</h4>
        <p class="options-description">Los participantes seleccionarán una de estas opciones</p>
      </div>
      <div class="options-list">
        <div class="question-option enhanced-option">
          <div class="option-indicator">A</div>
          <div class="option-input-wrapper">
            <input type="text" placeholder="Ej: Muy satisfecho - Superó mis expectativas" class="option-text enhanced-option-input">
            <div class="input-border"></div>
          </div>
          <button type="button" class="btn-remove-option" title="Eliminar opción" onclick="SurveysManager.removeOption(this)">
            <span>${ModuleIcons.trash}</span>
          </button>
        </div>
        <div class="question-option enhanced-option">
          <div class="option-indicator">B</div>
          <div class="option-input-wrapper">
            <input type="text" placeholder="Ej: Satisfecho - Cumplió mis expectativas" class="option-text enhanced-option-input">
            <div class="input-border"></div>
          </div>
          <button type="button" class="btn-remove-option" title="Eliminar opción" onclick="SurveysManager.removeOption(this)">
            <span>${ModuleIcons.trash}</span>
          </button>
        </div>
        <div class="question-option enhanced-option">
          <div class="option-indicator">C</div>
          <div class="option-input-wrapper">
            <input type="text" placeholder="Ej: Neutral - No tengo una opinión definida" class="option-text enhanced-option-input">
            <div class="input-border"></div>
          </div>
          <button type="button" class="btn-remove-option" title="Eliminar opción" onclick="SurveysManager.removeOption(this)">
            <span>${ModuleIcons.trash}</span>
          </button>
        </div>
      </div>
      <button type="button" onclick="SurveysManager.addOption('${id}')" class="btn-add-option">
        <span class="add-icon">${ModuleIcons.plus}</span>
        <span class="btn-text">Agregar nueva opción</span>
      </button>`;
  }
  
  // MÉTODO MEJORADO addOption
  static addOption(id) {
    const container = document.getElementById(`options-${id}`);
    if (!container) return;
    
    const optionsList = container.querySelector('.options-list');
    if (!optionsList) return;
    
    const count = optionsList.querySelectorAll('.question-option').length;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const letter = letters[count] || (count + 1);
    
    const advancedPlaceholders = [
      "Ej: Excelente - Definitivamente lo recomendaría", "Ej: Muy bueno - Superó la mayoría de expectativas", 
      "Ej: Bueno - Cumplió con lo esperado", "Ej: Regular - Algunas cosas podrían mejorar",
      "Ej: Malo - No cumplió las expectativas", "Ej: Muy malo - Definitivamente no lo recomendaría",
      "Ej: No aplica - Esta opción no me corresponde", "Ej: Prefiero no responder",
      "Ej: Otro (especificar)", "Ej: No tengo suficiente información"
    ];
    
    const placeholder = advancedPlaceholders[count] || `Opción ${letter}`;
    
    const newOption = document.createElement('div');
    newOption.className = 'question-option enhanced-option';
    newOption.style.opacity = '0'; newOption.style.transform = 'translateX(-20px)';
    
    newOption.innerHTML = `
      <div class="option-indicator">${letter}</div>
      <div class="option-input-wrapper">
        <input type="text" placeholder="${placeholder}" class="option-text enhanced-option-input">
        <div class="input-border"></div>
      </div>
      <button type="button" class="btn-remove-option" title="Eliminar opción" onclick="SurveysManager.removeOption(this)">
        <span>${ModuleIcons.trash}</span>
      </button>`;
    
    optionsList.appendChild(newOption);
    
    setTimeout(() => {
      newOption.style.transition = 'all 0.3s ease'; newOption.style.opacity = '1'; newOption.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      const input = newOption.querySelector('.option-text');
      if (input) input.focus();
    }, 400);
  }
  
  // NUEVOS MÉTODOS
  static removeOption(button) {
    const option = button.closest('.question-option');
    if (!option) return;
    
    const optionsList = option.parentElement;
    const remainingOptions = optionsList.querySelectorAll('.question-option');
    
    if (remainingOptions.length <= 2) {
      Utils.showToast('Debe haber al menos 2 opciones', 'warning'); return;
    }
    
    option.style.transition = 'all 0.3s ease'; option.style.opacity = '0'; option.style.transform = 'translateX(-20px)';
    setTimeout(() => { option.remove(); this.reorderOptions(optionsList); }, 300);
  }
  
  static reorderOptions(optionsList) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const options = optionsList.querySelectorAll('.question-option');
    options.forEach((option, index) => {
      const indicator = option.querySelector('.option-indicator');
      if (indicator) indicator.textContent = letters[index] || (index + 1);
    });
  }
  
  static removeQuestion(id) {
    const question = document.querySelector(`[data-question-id="${id}"]`);
    if (question) { question.remove(); this.updateNumbers(); }
  }
  
  // updateNumbers no es necesario, el orden se actualiza al agregar/eliminar preguntas.
  
  static clearQuestions() {
    const container = document.getElementById('questionsList');
    if (container) container.innerHTML = '';
  }
  
  static collectQuestions() {
    const questions = [];
    document.querySelectorAll('.question-item').forEach((item, index) => {
      const text = item.querySelector('.question-text').value.trim();
      const type = item.querySelector('.question-type').value;
      if (!text) return;
      
      const question = { id: item.dataset.questionId, numero: index + 1, texto: text, tipo: type, opciones: [] };
      
      if (type === 'multiple') {
        item.querySelectorAll('.option-text').forEach(option => {
          const value = option.value.trim();
          if (value) question.opciones.push(value);
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
      if (!user) { Utils.showToast('Debes iniciar sesión para crear encuestas', 'error'); return; }
      
      const surveyData = { ...data, timestamp: serverTimestamp(), autorId: user.uid, autorNombre: user.displayName, autorEmail: user.email, respuestas: 0 };
      await addDoc(collection(db, 'encuestas'), surveyData);
      Utils.showToast('Encuesta creada exitosamente', 'success');
      this.closeSurveyModal(); await this.loadSurveys(); DashboardManager.loadDashboard();
    } catch (e) { console.error('Error al guardar encuesta:', e); Utils.showToast('Error al crear encuesta', 'error'); }
  }
  
  static async participate(id) {
    const survey = allSurveys.find(s => s.id === id);
    if (!survey) { Utils.showToast('Encuesta no encontrada', 'error'); return; }
    const user = getCurrentUser();
    if (!user) { Utils.showToast('Debes iniciar sesión para participar', 'error'); return; }
    const participationSection = document.getElementById('surveyParticipationSection');
    if (!participationSection) { Utils.showToast('Sección de participación no disponible', 'error'); return; }
    document.querySelectorAll('.content-section').forEach(section => { section.classList.remove('active'); });
    participationSection.classList.add('active');
    // Buscar si el usuario ya votó
    let userResponse = null;
    try {
      const q = query(collection(db, 'respuestas_encuestas'), where('encuestaId', '==', id), where('participanteId', '==', user.uid));
      const snap = await getDocs(q);
      snap.forEach(d => { userResponse = { id: d.id, ...d.data() }; });
    } catch (e) { userResponse = null; }
    if (userResponse) {
      await this.loadSurveyResults(survey, userResponse);
    } else {
      this.loadSurveyForParticipation(survey);
    }
  }
  
  static loadSurveyForParticipation(survey) {
    const titleEl = document.getElementById('surveyParticipationTitle'), descEl = document.getElementById('surveyParticipationDesc');
    const infoTitle = document.getElementById('surveyInfoTitle'), infoDesc = document.getElementById('surveyInfoDescription');
    const infoAuthor = document.getElementById('surveyInfoAuthor'), infoQuestions = document.getElementById('surveyInfoQuestions');
    
    if (titleEl) titleEl.textContent = survey.titulo || 'Encuesta';
    if (descEl) descEl.textContent = 'Responde las preguntas de la encuesta';
    if (infoTitle) infoTitle.textContent = survey.titulo || 'Sin título';
    if (infoDesc) infoDesc.textContent = survey.descripcion || 'Sin descripción';
    if (infoAuthor) infoAuthor.textContent = `Por: ${survey.autorNombre || 'Anónimo'}`;
    if (infoQuestions) infoQuestions.textContent = `Preguntas: ${survey.preguntas?.length || 0}`;
    
    const questionsContainer = document.getElementById('surveyQuestionsContainer');
    if (!questionsContainer || !survey.preguntas) return;
    
    questionsContainer.innerHTML = survey.preguntas.map((question, index) => {
      let optionsHtml = '';
      
      if (question.tipo === 'multiple') {
        optionsHtml = question.opciones.map(option => `<label class="survey-option"><input type="radio" name="question-${question.id}" value="${option}"><span class="option-text">${option}</span></label>`).join('');
      } else if (question.tipo === 'text') {
        optionsHtml = `<textarea name="question-${question.id}" class="survey-text-response" placeholder="Escribe tu respuesta..." rows="3"></textarea>`;
      } else if (question.tipo === 'rating') {
        optionsHtml = `<div class="rating-options">${[1, 2, 3, 4, 5].map(num => `<label class="rating-option"><input type="radio" name="question-${question.id}" value="${num}"><span class="rating-star">⭐</span><span class="rating-number">${num}</span></label>`).join('')}</div>`;
      }
      
      return `<div class="survey-question-card" data-question-id="${question.id}"><div class="question-header"><span class="question-number">${index + 1}</span><h4 class="question-text">${question.texto}</h4></div><div class="question-options">${optionsHtml}</div></div>`;
    }).join('');
    
    const backBtn = document.getElementById('backToSurveysBtn');
    if (backBtn) {
      backBtn.onclick = () => {
        document.querySelectorAll('.content-section').forEach(section => { section.classList.remove('active'); });
        document.getElementById('surveysSection').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(nav => { nav.classList.remove('active'); });
        document.querySelector('[data-section="surveys"]').classList.add('active');
      };
    }
    
    const form = document.getElementById('surveyParticipationForm');
    if (form) {
      let submitBtn = form.querySelector('button[type="submit"]');
      if (!submitBtn) {
        submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn-primary';
        submitBtn.innerHTML = '<span class="participate-icon">' + ModuleIcons.edit + '</span>Enviar respuesta';
        form.appendChild(submitBtn);
      } else {
        submitBtn.disabled = false;
        submitBtn.style.display = '';
      }
      form.onsubmit = (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Enviando...';
        this.submitSurveyResponse(survey).finally(() => {
          submitBtn.innerHTML = '<span class="participate-icon">' + ModuleIcons.edit + '</span>Enviar respuesta';
          submitBtn.disabled = true;
          submitBtn.style.display = 'none';
        });
      };
    }
    
    const cancelBtn = document.getElementById('cancelParticipation');
    if (cancelBtn) { cancelBtn.onclick = () => { document.getElementById('backToSurveysBtn').click(); }; }
  }
  
  static async submitSurveyResponse(survey) {
    try {
      const user = getCurrentUser();
      if (!user) { Utils.showToast('Debes iniciar sesión para participar', 'error'); return; }
      // Verificar si ya votó
      let alreadyVoted = false;
      try {
        const q = query(collection(db, 'respuestas_encuestas'), where('encuestaId', '==', survey.id), where('participanteId', '==', user.uid));
        const snap = await getDocs(q);
        alreadyVoted = !snap.empty;
      } catch (e) { alreadyVoted = false; }
      if (alreadyVoted) {
        Utils.showToast('Ya has respondido esta encuesta', 'warning');
        this.participate(survey.id);
        return;
      }
      const responses = {}; let allAnswered = true;
      survey.preguntas.forEach(question => {
        let value = null;
        if (question.tipo === 'multiple' || question.tipo === 'rating') {
          const checked = document.querySelector(`[name="question-${question.id}"]:checked`);
          if (checked) value = checked.value; else allAnswered = false;
        } else if (question.tipo === 'text') {
          const textarea = document.querySelector(`[name="question-${question.id}"]`);
          if (textarea && textarea.value.trim()) value = textarea.value.trim(); else allAnswered = false;
        }
        responses[question.id] = value;
      });
      if (!allAnswered) { Utils.showToast('Por favor responde todas las preguntas', 'warning'); return; }
      Utils.showToast('Enviando respuestas...', 'info');
      const responseData = { encuestaId: survey.id, encuestaTitulo: survey.titulo, respuestas: responses, timestamp: serverTimestamp(), participanteId: user.uid, participanteNombre: user.displayName, participanteEmail: user.email };
      await addDoc(collection(db, 'respuestas_encuestas'), responseData);
      const surveyRef = doc(db, 'encuestas', survey.id);
      await updateDoc(surveyRef, { respuestas: increment(1) });
      Utils.showToast('¡Respuesta enviada exitosamente!', 'success');
      // Mostrar resultados en tiempo real
      setTimeout(() => { this.participate(survey.id); }, 1000);
    } catch (e) { console.error('Error al enviar respuesta:', e); Utils.showToast('Error al enviar respuesta', 'error'); }
  }
  // Mostrar resultados de la encuesta tras votar o si ya votó
  static async loadSurveyResults(survey, userResponse) {
    const titleEl = document.getElementById('surveyParticipationTitle'), descEl = document.getElementById('surveyParticipationDesc');
    const infoTitle = document.getElementById('surveyInfoTitle'), infoDesc = document.getElementById('surveyInfoDescription');
    const infoAuthor = document.getElementById('surveyInfoAuthor'), infoQuestions = document.getElementById('surveyInfoQuestions');
    if (titleEl) titleEl.textContent = survey.titulo || 'Encuesta';
    if (descEl) descEl.textContent = 'Resultados de la encuesta';
    if (infoTitle) infoTitle.textContent = survey.titulo || 'Sin título';
    if (infoDesc) infoDesc.textContent = survey.descripcion || 'Sin descripción';
    if (infoAuthor) infoAuthor.textContent = `Por: ${survey.autorNombre || 'Anónimo'}`;
    if (infoQuestions) infoQuestions.textContent = `Preguntas: ${survey.preguntas?.length || 0}`;
    const questionsContainer = document.getElementById('surveyQuestionsContainer');
    if (!questionsContainer || !survey.preguntas) return;
    // Obtener todas las respuestas de la encuesta
    let allResponses = [];
    try {
      const q = query(collection(db, 'respuestas_encuestas'), where('encuestaId', '==', survey.id));
      const snap = await getDocs(q);
      snap.forEach(d => { allResponses.push(d.data()); });
    } catch (e) { allResponses = []; }
    // Calcular resultados por pregunta
    const results = survey.preguntas.map(q => {
      const res = { ...q, conteo: {}, total: 0, respuestasTexto: [], suma: 0 };
      if (q.tipo === 'multiple' || q.tipo === 'rating') {
        q.opciones?.forEach(opt => { res.conteo[opt] = 0; });
        if (q.tipo === 'rating') {
          for (let i = 1; i <= 5; i++) res.conteo[i] = 0;
        }
      }
      allResponses.forEach(r => {
        const val = r.respuestas?.[q.id];
        if (q.tipo === 'multiple' && val) { res.conteo[val] = (res.conteo[val] || 0) + 1; res.total++; }
        else if (q.tipo === 'rating' && val) { res.conteo[val] = (res.conteo[val] || 0) + 1; res.suma += Number(val); res.total++; }
        else if (q.tipo === 'text' && val) { res.respuestasTexto.push(val); res.total++; }
      });
      return res;
    });
    // Renderizar resultados
    questionsContainer.innerHTML = results.map((q, idx) => {
      let html = `<div class="survey-question-card"><div class="question-header"><span class="question-number">${idx + 1}</span><h4 class="question-text">${q.texto}</h4></div>`;
      if (q.tipo === 'multiple') {
        const total = q.total || 1;
        html += '<div class="survey-results">';
        q.opciones.forEach(opt => {
          const count = q.conteo[opt] || 0;
          const percent = Math.round((count / total) * 100);
          const voted = userResponse.respuestas?.[q.id] === opt;
          html += `<div class="result-bar-row${voted ? ' voted' : ''}"><span class="result-option">${opt}</span><div class="result-bar" style="width: ${percent}%; background: #10b981;">${percent}%</div><span class="result-count">${count} voto${count === 1 ? '' : 's'}</span></div>`;
        });
        html += '</div>';
      } else if (q.tipo === 'rating') {
        const total = q.total || 1;
        html += '<div class="survey-results">';
        for (let i = 1; i <= 5; i++) {
          const count = q.conteo[i] || 0;
          const percent = Math.round((count / total) * 100);
          const voted = userResponse.respuestas?.[q.id] == i;
          html += `<div class="result-bar-row${voted ? ' voted' : ''}"><span class="result-option">${i} ⭐</span><div class="result-bar" style="width: ${percent}%; background: #3b82f6;">${percent}%</div><span class="result-count">${count} voto${count === 1 ? '' : 's'}</span></div>`;
        }
        const promedio = q.total ? (q.suma / q.total).toFixed(2) : '0.00';
        html += `<div class="result-average">Promedio: <b>${promedio}</b> / 5</div>`;
        html += '</div>';
      } else if (q.tipo === 'text') {
        html += '<div class="survey-results-text">';
        if (q.respuestasTexto.length) {
          html += q.respuestasTexto.map((txt, i) => `<div class="result-text-item">${txt}</div>`).join('');
        } else {
          html += '<div class="result-text-item">Sin respuestas</div>';
        }
        html += '</div>';
      }
      html += '</div>';
      return html;
    }).join('');
    // Botón volver
    const backBtn = document.getElementById('backToSurveysBtn');
    if (backBtn) {
      backBtn.onclick = () => {
        document.querySelectorAll('.content-section').forEach(section => { section.classList.remove('active'); });
        document.getElementById('surveysSection').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(nav => { nav.classList.remove('active'); });
        document.querySelector('[data-section="surveys"]').classList.add('active');
      };
    }
    // Ocultar el formulario de participación si existe
    const form = document.getElementById('surveyParticipationForm');
    if (form) form.onsubmit = null;
    const cancelBtn = document.getElementById('cancelParticipation');
    if (cancelBtn) cancelBtn.onclick = () => { document.getElementById('backToSurveysBtn').click(); };
  }
  
  static deleteSurvey(id, title) {
    Utils.confirm('Eliminar Encuesta', `¿Eliminar "${title}"?`, async () => {
      try {
        await deleteDoc(doc(db, 'encuestas', id)); Utils.showToast('Encuesta eliminada', 'success');
        await this.loadSurveys(); DashboardManager.loadDashboard();
      } catch (e) { console.error('Error al eliminar encuesta:', e); Utils.showToast('Error al eliminar', 'error'); }
    });
  }
}

// Resto de clases comprimidas...
class OpinionsManager {
  static async loadOpinions(updateUI = true) {
    try {
      let snap; try { snap = await getDocs(query(collection(db, 'opiniones'), orderBy('timestamp', 'desc'))); } catch { snap = await getDocs(collection(db, 'opiniones')); }
      const opinions = []; snap.forEach(d => { opinions.push({ id: d.id, ...d.data() }); });
      opinions.sort((a, b) => {
        const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
        const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
        return dateB - dateA;
      });
      allOpinions = opinions; if (updateUI) this.displayOpinions(opinions);
    } catch (e) { console.error('Error al cargar opiniones:', e); Utils.showToast('Error al cargar opiniones', 'error'); }
  }
  
  static displayOpinions(opinions) {
    const list = document.getElementById('opinionsList');
    if (!list) return;
    
    if (!opinions?.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">${ModuleIcons.comment}</div><h3>No hay opiniones</h3><p>¡Comparte tu primera opinión!</p><button class="btn-primary" onclick="OpinionsManager.showOpinionForm()"><span class="btn-icon">${ModuleIcons.plus}</span><span class="btn-text">Escribir Primera Opinión</span></button></div>`;
      return;
    }
    
    const user = getCurrentUser();
    list.innerHTML = opinions.map(opinion => {
      const isMine = user && opinion.autorId === user.uid;
      const likes = opinion.likes || 0; const isLiked = opinion.likedBy && user && opinion.likedBy.includes(user.uid);
      
      return `<div class="opinion-card"><div class="opinion-header"><img src="${opinion.autorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(opinion.autorNombre || 'Usuario')}&background=00f5ff&color=fff&size=80`}" alt="${opinion.autorNombre}" class="opinion-avatar"><div class="opinion-meta"><div class="opinion-author"><span class="opinion-author-icon">${ModuleIcons.user}</span>${opinion.autorNombre}</div><div class="opinion-date"><span class="opinion-date-icon">${ModuleIcons.clock}</span>${Utils.formatDate(opinion.timestamp)}</div></div><div class="opinion-category"><span class="opinion-category-icon">${ModuleIcons.comment}</span>${this.getCategoryName(opinion.categoria)}</div>${isMine ? `<button class="resource-menu-btn" onclick="OpinionsManager.deleteOpinion('${opinion.id}', '${(opinion.titulo || '').replace(/'/g, "\\'")}")"><span class="opinion-delete-icon">${ModuleIcons.trash}</span></button>` : ''}</div><h3 class="opinion-title">${opinion.titulo}</h3><p class="opinion-content">${opinion.contenido}</p>${opinion.materia ? `<div class="opinion-subject"><span class="opinion-subject-icon">${ModuleIcons.book}</span>${opinion.materia}</div>` : ''}<div class="opinion-actions"><button class="opinion-action ${isLiked ? 'liked' : ''}" onclick="OpinionsManager.toggleLike('${opinion.id}')"><span class="like-icon">${isLiked ? ModuleIcons.heartFilled : ModuleIcons.heart}</span><span>${likes}</span></button></div></div>`;
    }).join('');
  }
  
  // getCategoryName solo aquí, no duplicar en otros managers.
  static getCategoryName(cat) {
    // Personaliza los nombres de categorías de opiniones según tus necesidades
    const categories = {
      general: 'General',
      sugerencia: 'Sugerencia',
      critica: 'Crítica',
      experiencia: 'Experiencia',
      otro: 'Otro'
    };
    return categories[cat] || cat || 'Sin categoría';
  }
  
  static showOpinionForm() { const form = document.getElementById('opinionForm'); if (form) { form.style.display = 'block'; const title = document.getElementById('opinionTitle'); if (title) setTimeout(() => title.focus(), 100); } }
  static hideOpinionForm() { const form = document.getElementById('opinionForm'); if (form) { form.style.display = 'none'; const formElement = document.getElementById('opinionFormElement'); if (formElement) formElement.reset(); } }
  
  static async saveOpinion(data) {
    try {
      Utils.showToast('Publicando opinión...', 'info'); const user = getCurrentUser();
      if (!user) { Utils.showToast('Debes iniciar sesión para publicar opiniones', 'error'); return; }
      const opinionData = { ...data, timestamp: serverTimestamp(), autorId: user.uid, autorNombre: user.displayName, autorEmail: user.email, autorAvatar: user.photoURL, likes: 0, likedBy: [] };
      await addDoc(collection(db, 'opiniones'), opinionData); Utils.showToast('Opinión publicada exitosamente', 'success');
      this.hideOpinionForm(); await this.loadOpinions(); DashboardManager.loadDashboard();
    } catch (e) { console.error('Error al guardar opinión:', e); Utils.showToast('Error al publicar opinión', 'error'); }
  }
  
  static async toggleLike(id) {
    const user = getCurrentUser(); if (!user) { Utils.showToast('Inicia sesión para dar like', 'warning'); return; }
    try {
      const ref = doc(db, 'opiniones', id); const opinion = allOpinions.find(o => o.id === id); if (!opinion) return;
      const likedBy = opinion.likedBy || []; const isLiked = likedBy.includes(user.uid);
      if (isLiked) await updateDoc(ref, { likes: increment(-1), likedBy: likedBy.filter(uid => uid !== user.uid) });
      else await updateDoc(ref, { likes: increment(1), likedBy: [...likedBy, user.uid] });
      await this.loadOpinions();
    } catch (e) { console.error('Error al dar like:', e); Utils.showToast('Error al dar like', 'error'); }
  }
  
  static deleteOpinion(id, title) {
    Utils.confirm('Eliminar Opinión', `¿Eliminar "${title}"?`, async () => {
      try { await deleteDoc(doc(db, 'opiniones', id)); Utils.showToast('Opinión eliminada', 'success'); await this.loadOpinions(); DashboardManager.loadDashboard(); }
      catch (e) { console.error('Error al eliminar opinión:', e); Utils.showToast('Error al eliminar', 'error'); }
    });
  }
}

class ProfileManager {
  static update(user) {
    const avatar = document.getElementById('profileAvatar'), name = document.getElementById('profileName'), email = document.getElementById('profileEmail');
    if (avatar) avatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Usuario')}&background=00f5ff&color=fff&size=120`;
    if (name) name.textContent = user.displayName || 'Usuario';
    if (email) email.textContent = user.email || '';
  }
  
  static loadProfile() {
    const user = getCurrentUser(); if (!user) return;
    const userResources = allResources.filter(r => r.autorId === user.uid);
    const userSurveys = allSurveys.filter(s => s.autorId === user.uid);
    const userOpinions = allOpinions.filter(o => o.autorId === user.uid);
    
    [{ id: 'profileResources', value: userResources.length }, { id: 'profileSurveys', value: userSurveys.length }, { id: 'profileOpinions', value: userOpinions.length }].forEach(({ id, value }) => {
      const element = document.getElementById(id); if (element) element.textContent = value;
    });
    this.loadActivity([...userResources, ...userSurveys, ...userOpinions]);
  }
  
  static loadActivity(activities) {
    const container = document.getElementById('userActivity'); if (!container) return;
    const sorted = activities.sort((a, b) => {
      const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
      const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
      return dateB - dateA;
    }).slice(0, 10);
    
    if (!sorted.length) { container.innerHTML = `<div class="activity-placeholder"><div class="placeholder-icon">${ModuleIcons.activity}</div><p>No tienes actividad reciente</p></div>`; return; }
    
    container.innerHTML = sorted.map(activity => {
      let icon = ModuleIcons.document, action = 'Subió un recurso';
      if (activity.preguntas) { icon = ModuleIcons.survey; action = 'Creó una encuesta'; }
      else if (activity.contenido) { icon = ModuleIcons.comment; action = 'Publicó una opinión'; }
      
      return `<div class="timeline-item"><div class="timeline-icon">${icon}</div><div class="timeline-content"><h5>${action}</h5><p>${Utils.truncate(activity.titulo, 50)}</p><div class="timeline-date"><span class="timeline-date-icon">${ModuleIcons.clock}</span>${Utils.formatDate(activity.timestamp)}</div></div></div>`;
    }).join('');
  }
}

function initUploadcare() {
  let attempts = 0; const maxAttempts = 10;
  const checkUploadcare = () => {
    attempts++;
    if (typeof uploadcare !== 'undefined') {
      try {
        const archivoElement = document.getElementById('archivo');
        if (!archivoElement) { if (attempts < maxAttempts) setTimeout(checkUploadcare, 1000); return; }
        uploadcareWidget = uploadcare.Widget('#archivo');
        uploadcareWidget.onUploadComplete(info => { Utils.showToast('Archivo cargado', 'success'); });
        uploadcareWidget.onChange(file => { if (file) Utils.showToast('Archivo seleccionado', 'info'); });
      } catch (error) { console.error('Error inicializando Uploadcare:', error); if (attempts < maxAttempts) setTimeout(checkUploadcare, 2000); }
    } else if (attempts < maxAttempts) setTimeout(checkUploadcare, 1000);
  };
  checkUploadcare();
}

function navigateToSection(sectionName) {
  document.querySelectorAll('.content-section').forEach(section => { section.classList.remove('active'); });
  const targetSection = document.getElementById(sectionName + 'Section');
  if (targetSection) targetSection.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn => { btn.classList.remove('active'); });
  const activeButton = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeButton) activeButton.classList.add('active');
  
  switch (sectionName) {
    case 'dashboard': DashboardManager.loadDashboard(); break;
    case 'resources': ResourcesManager.loadResources(); break;
    case 'surveys': SurveysManager.loadSurveys(); break;
    case 'opinions': OpinionsManager.loadOpinions(); break;
    case 'profile': ProfileManager.loadProfile(); break;
  }
}

function setupEventListeners() {
  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', (e) => { e.preventDefault(); const section = button.getAttribute('data-section'); if (section) navigateToSection(section); });
  });
  
  [{ id: 'addResourceBtn', action: () => ResourcesManager.openUploadModal(), requireAuth: true }, { id: 'addSurveyBtn', action: () => SurveysManager.openSurveyModal(), requireAuth: true }, { id: 'addOpinionBtn', action: () => OpinionsManager.showOpinionForm(), requireAuth: true }].forEach(({ id, action, requireAuth }) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault(); if (requireAuth && !getCurrentUser()) { Utils.showToast('Inicia sesión para usar esta función', 'warning'); return; }
        action();
      });
    }
  });
  
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = { titulo: document.getElementById('titulo')?.value, categoria: document.getElementById('categoria')?.value, materia: document.getElementById('materia')?.value, nivel: document.getElementById('nivel')?.value, descripcion: document.getElementById('descripcion')?.value };
      if (!data.titulo || !data.categoria || !data.materia) { Utils.showToast('Completa los campos obligatorios', 'warning'); return; }
      ResourcesManager.saveResource(data);
    });
  }
  
  const surveyForm = document.getElementById('surveyForm');
  if (surveyForm) {
    surveyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = { titulo: document.getElementById('surveyTitle')?.value, descripcion: document.getElementById('surveyDescription')?.value, categoria: document.getElementById('surveyCategory')?.value, preguntas: SurveysManager.collectQuestions() };
      if (!data.titulo || !data.categoria) { Utils.showToast('Completa los campos obligatorios', 'warning'); return; }
      if (data.preguntas.length === 0) { Utils.showToast('Agrega al menos una pregunta', 'warning'); return; }
      SurveysManager.saveSurvey(data);
    });
  }
  
  const opinionForm = document.getElementById('opinionFormElement');
  if (opinionForm) {
    opinionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = { titulo: document.getElementById('opinionTitle')?.value, contenido: document.getElementById('opinionContent')?.value, categoria: document.getElementById('opinionCategory')?.value, materia: document.getElementById('opinionSubject')?.value };
      if (!data.titulo || !data.contenido) { Utils.showToast('Completa los campos obligatorios', 'warning'); return; }
      OpinionsManager.saveOpinion(data);
    });
  }
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { ResourcesManager.filterResources(); }, 300); });
  }
  
  const filterCategoria = document.getElementById('filterCategoria');
  if (filterCategoria) {
    // Solo dejar 'Libros' y 'Apuntes'
    filterCategoria.innerHTML = '<option value="libros">Libros</option><option value="apuntes">Apuntes</option>';
    filterCategoria.addEventListener('change', () => { ResourcesManager.filterResources(); });
  }
  // Eliminar el filtro de nivel y dejar solo secundaria como texto fijo
  const filterNivel = document.getElementById('filterNivel');
  if (filterNivel) {
    filterNivel.parentElement.innerHTML = '<span class="nivel-fijo">Secundaria</span>';
  }
  
  [{ id: 'closeUploadModal', action: () => ResourcesManager.closeUploadModal() }, { id: 'cancelUpload', action: () => ResourcesManager.closeUploadModal() }, { id: 'closeSurveyModal', action: () => SurveysManager.closeSurveyModal() }, { id: 'cancelSurvey', action: () => SurveysManager.closeSurveyModal() }, { id: 'cancelOpinion', action: () => OpinionsManager.hideOpinionForm() }, { id: 'cancelOpinionBtn', action: () => OpinionsManager.hideOpinionForm() }].forEach(({ id, action }) => {
    const button = document.getElementById(id); if (button) button.addEventListener('click', action);
  });
  
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  if (addQuestionBtn) addQuestionBtn.addEventListener('click', () => SurveysManager.addQuestion());
  
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      const modal = e.target.parentElement;
      if (modal.id === 'uploadModal') ResourcesManager.closeUploadModal();
      else if (modal.id === 'surveyModal') SurveysManager.closeSurveyModal();
    }
  });
}

window.DashboardManager = DashboardManager; window.ResourcesManager = ResourcesManager; window.SurveysManager = SurveysManager; window.OpinionsManager = OpinionsManager; window.ProfileManager = ProfileManager; window.navigateToSection = navigateToSection;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { setupEventListeners(); setTimeout(initUploadcare, 2000); });
} else { setupEventListeners(); setTimeout(initUploadcare, 2000); }