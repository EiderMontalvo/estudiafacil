// importaciones
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
increment, serverTimestamp, query, orderBy } from '../config/firebase.config.js';
import { getDbInstance } from '../config/firebase.config.js';
import authManager, { AuthManager } from '../core/auth.manager.js';
import toastManager from '../core/toast.manager.js';
import modalManager from '../core/modal.manager.js';
import { formatDate, truncate, sanitizeHTML, debounce, extractUploadcareId,
getUploadcareOriginalUrl, getUploadcarePreviewUrl } from '../core/utils.js';

class ResourcesModule {
    constructor() {
        this.resources = [];
        this.filteredResources = [];
        this.displayedResources = [];
        this.uploadcareWidget = null;
        this.isLoaded = false;
        this.currentUser = null;

        // paginacion
        this.pageSize = 12; // recursos por página
        this.currentPage = 0;
        this.isLoadingMore = false;
        this.hasMoreResources = true;

        // configuracion de categorias y niveles
        this.categories = {
            apuntes: { name: 'Apuntes', icon: '📝'},
            libros: { name: 'Libros', icon: '📚'}
        };
        this.subjects = [
            'etp', 'matematicas', 'comunicacion', 'cyt',
            'ciencias sociales', 'arte', 'religion',
            'ingles', 'fisica', 'dpcc'
        ];
        // bind de metodos
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleSearch = debounce(this.handleSearch.bind(this), 300);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleScroll = debounce(this.handleScroll.bind(this), 200);
    }

    init() {
        this.currentUser = authManager.getCurrentUser();
        this.setupEventListeners();
        this.setupScrollListener();
        this.initUploadcare();
        authManager.onAuthStateChanged((user) => {
            this.onAuthStateChanged(user);
        });
    }

    // carga de recursos
    async load(updateUI = true, silent = false) {
        try {
            if (!this.isLoaded && updateUI) {
                this.showLoading();
            }
            await this.loadResources();
            if (updateUI) {
                this.render();
                this.hideLoading();
            }
            this.isLoaded = true;
        } catch (error) {
            if (!silent) {
                toastManager.error('Error al cargar los recursos');
                this.handleError('load', error);
            }
            if (updateUI) {
                this.showError();
                this.hideLoading();
            }
        } finally {
            // Emitir evento SIEMPRE, incluso si hay error (para actualizar stats con datos disponibles)
            this.emit('resources:loaded', { resources: this.resources });
        }
        return this.resources;
    }

    // cargar recursos desde firestore
    async loadResources() {
        const db = getDbInstance();
        if (!db) throw new Error('Base de datos no inicializada');
        try {
            let firestoreResources = [];
            try {
                const q = query(collection(db, 'recursos'), orderBy('timestamp', 'desc'));
                const snapshot = await getDocs(q);
                snapshot.forEach(docSnap => {
                    firestoreResources.push({id: docSnap.id, ...docSnap.data(), source: 'firestore'});
                });
            } catch (orderError) {
                try {
                    const snapshot = await getDocs(collection(db, 'recursos'));
                    snapshot.forEach(docSnap => {
                        firestoreResources.push({id: docSnap.id, ...docSnap.data(), source: 'firestore'});
                    });
                } catch (permissionError) {
                    // Continuar con recursos vacíos de Firestore
                }
            }
            
            // usar solo recursos de firestore
            const allResources = [...firestoreResources];
            
            // ordenar por fecha
            allResources.sort((a, b) => {
                const dateA = this.getResourceDate(a);
                const dateB = this.getResourceDate(b);
                return dateB - dateA;
            });
            this.resources = allResources;
            this.filteredResources = [...allResources];
            return allResources;
        } catch (error) {
            throw new Error(`Fallo al cargar recursos: ${error.message}`);
        }
    }

    // obtiene la fecha de un recurso
    getResourceDate(resource) {
        if (!resource.timestamp) return new Date(0); 
        try {
            if (resource.timestamp.toDate) {
                return resource.timestamp.toDate();
            }
            return new Date(resource.timestamp);
        } catch {
            return new Date(0);
        }
    }

    // renderiza la lista de recursos
    render() {
        const container = document.getElementById('listaRecursos');
        const emptyState = document.getElementById('emptyState');
        if (!container) return;
        
        // Limpiar y resetear paginación
        container.innerHTML = '';
        this.currentPage = 0;
        this.displayedResources = [];
        this.hasMoreResources = true;
        
        if (this.filteredResources.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        // Cargar primera página
        this.loadMoreResources();
    }

    // carga más recursos (scroll infinito)
    loadMoreResources() {
        if (this.isLoadingMore || !this.hasMoreResources) return;
        
        this.isLoadingMore = true;
        
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        const nextBatch = this.filteredResources.slice(start, end);
        
        if (nextBatch.length === 0) {
            this.hasMoreResources = false;
            this.hideLoadingIndicator();
            this.isLoadingMore = false;
            return;
        }
        
        // Simular pequeño delay para suavidad
        setTimeout(() => {
            const container = document.getElementById('listaRecursos');
            if (!container) {
                this.isLoadingMore = false;
                return;
            }
            
            nextBatch.forEach(resource => {
                const card = this.createResourceCard(resource);
                container.appendChild(card);
                this.displayedResources.push(resource);
            });
            
            this.currentPage++;
            this.hasMoreResources = end < this.filteredResources.length;
            
            if (!this.hasMoreResources) {
                this.hideLoadingIndicator();
            }
            
            this.isLoadingMore = false;
        }, 300);
    }

    // crea un card de recurso
    createResourceCard(resource) {
        const card = document.createElement('article');
        card.className = 'resource-card';
        card.setAttribute('data-resource-id', resource.id);
        card.setAttribute('data-category', resource.categoria || 'otros');
        const isMine = this.currentUser && resource.autorId === this.currentUser.uid;
        if (isMine) card.classList.add('my-resource');
        // header
        const header = this.createCardHeader(resource, isMine);
        card.appendChild(header);
        const title = document.createElement('h3');
        title.className = 'resource-title';
        title.textContent = resource.titulo || 'Sin título';
        card.appendChild(title);
        if (resource.archivo || resource.enlace) {
            const preview = this.createPreview(resource);
            card.appendChild(preview);
        }
        const meta = this.createCardMeta(resource);
        card.appendChild(meta);
        if (resource.descripcion) {
            const desc = document.createElement('p');
            desc.className = 'resource-description';
            desc.textContent = truncate(resource.descripcion, 120);
            card.appendChild(desc);
        }
        const actions = this.createCardActions(resource, isMine);
        card.appendChild(actions);
        return card;
    }

    createCardHeader(resource, isMine) {
        const header = document.createElement('div');
        header.className = 'resource-header';
        // categoria
        const category = document.createElement('span');
        category.className = `resource-category category-${resource.categoria || 'otros'}`;
        const categoryConfig = this.categories[resource.categoria] || { name: 'Otros', icon: '📄' };
        category.innerHTML = `${categoryConfig.icon} ${categoryConfig.name}`;
        header.appendChild(category);
        if (isMine) {
            const badge = document.createElement('span');
            badge.className = 'my-resource-badge';
            badge.textContent = 'Mío';
            header.appendChild(badge);
        }
        return header;
    }

    createPreview(resource) {
        const container = document.createElement('div');
        container.className = 'resource-preview';
        const url = resource.archivo || resource.enlace;
        const fileId = extractUploadcareId(url);
        if (fileId) {
            // es un archivo de uploadcare
            const previewUrl = getUploadcarePreviewUrl(fileId, 400, 300);
            const originalUrl = getUploadcareOriginalUrl(fileId);
            const img = document.createElement('img');
            img.src = previewUrl;
            img.alt = 'preview';
            img.loading = 'lazy';
            img.setAttribute('data-file-id', fileId);
            img.setAttribute('data-original-url', originalUrl);
            img.onerror = () => this.handleImageError(img, fileId, originalUrl);
            img.onload = () => this.handleImageLoad(img);
            container.appendChild(img);
        } else {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'resource-link-preview';
            link.innerHTML = `
                <span class="link-icon">🔗</span>
                <span class="link-text">Ver recurso</span>
            `;
            container.appendChild(link);
        }
        return container;
    }

    // manejo de error de carga de imagen
    handleImageError(img, fileId, originalUrl) {
        const attempts = parseInt(img.getAttribute('data-attempts') || '0') + 1;
        img.setAttribute('data-attempts', attempts.toString());
        const alternativeUrls = [
            `https://ucarecdn.com/${fileId}/-/preview/400x300/`,
            `https://ucarecdn.com/${fileId}/-/resize/400x/`,
            `https://ucarecdn.com/${fileId}/`,
            originalUrl
        ];
        if (attempts <= alternativeUrls.length) {
            img.src = alternativeUrls[attempts - 1];
        } else {
            img.replaceWith(this.createLinkPlaceholder(originalUrl));
        }
    }

    // manejo de carga exitosa de imagen
    handleImageLoad(img) {
        img.classList.add('loaded');
    }

    // crea un placeholder para enlaces
    createLinkPlaceholder(url) {
        const placeholder = document.createElement('a');
        placeholder.href = url;
        placeholder.target = '_blank';
        placeholder.rel = 'noopener noreferrer';
        placeholder.className = 'resource-link-preview';
        placeholder.innerHTML = `
            <span class="link-icon">📎</span>
            <span class="link-text">Abrir archivo</span>
        `;
        return placeholder;
    }

    createCardMeta(resource) {
        const meta = document.createElement('div');
        meta.className = 'resource-meta';
        const items = [];
        // materia
        if (resource.materia) {
            items.push(`<span class="meta-item"><span class="meta-icon">📚</span>${resource.materia}</span>`);
        }
        // nivel
        if (resource.nivel) {
            items.push(`<span class="meta-item"><span class="meta-icon">🎓</span>${resource.nivel}</span>`);
        }
        // autor
        items.push(`<span class="meta-item"><span class="meta-icon">👤</span>${resource.autorNombre || 'Anónimo'}</span>`);
        // fecha
        items.push(`<span class="meta-item"><span class="meta-icon">📅</span>${formatDate(resource.timestamp)}</span>`);
        meta.innerHTML = items.join('');
        return meta;
    }

    createCardActions(resource, isMine) {
        const actions = document.createElement('div');
        actions.className = 'resource-actions';

        // Botón descargar/ver
        const downloadBtn = document.createElement('a');
        downloadBtn.href = resource.archivo || resource.enlace || '#';
        downloadBtn.target = '_blank';
        downloadBtn.rel = 'noopener noreferrer';
        downloadBtn.className = 'btn-download';
        downloadBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Ver recurso</span>
        `;

        // Incrementar descargas al hacer click
        downloadBtn.addEventListener('click', () => {
            if (resource.source === 'firestore') {
                this.incrementDownloads(resource.id);
            }
        });
        actions.appendChild(downloadBtn);

        if (isMine && resource.source === 'firestore') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.title = 'Eliminar recurso';
            deleteBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            deleteBtn.addEventListener('click', () => {
                this.confirmDelete(resource);
            });
            actions.appendChild(deleteBtn);
        }

        if (resource.descargas !== undefined) {
            const counter = document.createElement('span');
            counter.className = 'download-count';
            counter.textContent = `⬇️ ${resource.descargas || 0}`;
            actions.appendChild(counter);
        } 
        return actions;
    }

    // configurar scroll listener
    setupScrollListener() {
        window.addEventListener('scroll', this.handleScroll);
    
        // También intentar con el main-container por si tiene overflow
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.addEventListener('scroll', this.handleScroll);
        }
    }

    // manejar evento de scroll
    handleScroll(e) {
        if (!this.hasMoreResources || this.isLoadingMore) return;
        // Obtener la sección de recursos
        const resourcesSection = document.getElementById('resourcesSection');
        if (!resourcesSection || !resourcesSection.classList.contains('active')) return;
        
        // Calcular posición del scroll
        const scrollPosition = window.innerHeight + window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;
        
        // Si está cerca del fondo (80% del scroll), cargar más
        if (scrollPosition >= pageHeight * 0.8) {
            this.showLoadingIndicator();
            this.loadMoreResources();
        }
    }

    // mostrar indicador de carga
    showLoadingIndicator() {
        let indicator = document.getElementById('resourcesLoadingIndicator');
        if (!indicator) {
            const container = document.getElementById('listaRecursos');
            if (!container) return;
            
            indicator = document.createElement('div');
            indicator.id = 'resourcesLoadingIndicator';
            indicator.className = 'loading-indicator';
            indicator.innerHTML = `
                <div class="spinner"></div>
                <p>Cargando más recursos...</p>
            `;
            container.parentElement.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }

    // ocultar indicador de carga
    hideLoadingIndicator() {
        const indicator = document.getElementById('resourcesLoadingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // configurar event listeners
    setupEventListeners() {
        const addBtn = document.getElementById('addResourceBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openUploadModal());
        }
        // form de subida
        const form = document.getElementById('uploadForm');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit);
        }
        // btns de cerrar el modal
        const closeButtons = ['closeUploadModal', 'cancelUpload'];
        closeButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.closeUploadModal());
            }
        });
        // busqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch);
        }
        // filtros
        const filterCategoria = document.getElementById('filterCategoria');
        if (filterCategoria) {
            filterCategoria.addEventListener('change', this.handleFilterChange);
        }
    }

    // abre el modal de subida
    openUploadModal() {
        if (!this.currentUser) {
            toastManager.warning('Debes iniciar sesión para subir recursos');
            return;
        }
        modalManager.open('uploadModal');
        setTimeout(() => {
            this.setupUploadFormSelectors();
            const titleInput = document.getElementById('titulo');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    // cierra el modal de subida
    closeUploadModal() {
        modalManager.close('uploadModal');
        const form = document.getElementById('uploadForm');
        if (form) form.reset();
        if (this.uploadcareWidget) {
            try {
                this.uploadcareWidget.value(null);
            } catch (e) {}
        }
    }

    setupUploadFormSelectors() {
        const categoriaSelect = document.getElementById('categoria');
        if (categoriaSelect) {
            categoriaSelect.innerHTML = '<option value="">Seleccionar categoría</option>' + 
                Object.entries(this.categories).map(([key, {name, icon}]) =>
                `<option value="${key}">${icon} ${name}</option>`
            ).join('');
        }
        const materiaSelect = document.getElementById('materia');
        if (materiaSelect) {
            if (materiaSelect.tagName.toLowerCase() === 'input') {
                const select = document.createElement('select');
                select.id = 'materia';
                select.name = 'materia';
                select.className = materiaSelect.className;
                select.required = materiaSelect.required;
                materiaSelect.parentNode.replaceChild(select, materiaSelect);
            }
            const selectElement = document.getElementById('materia');
            if (selectElement) {
                selectElement.innerHTML = '<option value="">Seleccionar materia</option>' +
                    this.subjects.map(subject => 
                        `<option value="${subject}">${subject.charAt(0).toUpperCase() + subject.slice(1)}</option>`
                    ).join('');
            }
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        if (!this.currentUser) {
            toastManager.error('Debes iniciar sesión');
            return;
        }
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Guardando...</span>';
            }
            const formData = this.getFormData();
            if (!this.validateFormData(formData)) {
                return;
            }
            const fileData = await this.getUploadcareFile();
            if (!fileData) {
                toastManager.warning('Por favor selecciona un archivo');
                return;
            }
            await this.saveResource({...formData, ...fileData});
            // cerrar modal y recargar
            this.closeUploadModal();
            await this.load();
            toastManager.success('¡Recurso guardado exitosamente!');
        } catch (error) {
            this.handleError('save', error);
            toastManager.error('Error al guardar recurso');
        } finally {
            if (submitBtn && originalText) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    // obtener datos del formulario
    getFormData() {
        return {
            titulo: document.getElementById('titulo')?.value.trim() || '',
            categoria: document.getElementById('categoria')?.value || '',
            materia: document.getElementById('materia')?.value || '',
            nivel: document.getElementById('nivel')?.value || 'secundaria',
            descripcion: document.getElementById('descripcion')?.value.trim() || ''
        };
    }

    // validar datos
    validateFormData(data) {
        if (!data.titulo) {
            toastManager.warning('El título es obligatorio');
            return false;
        }
        if (!data.categoria) {
            toastManager.warning('Selecciona una categoría');
            return false;
        }
        if (!data.materia) {
            toastManager.warning('Selecciona una materia');
            return false;
        }
        return true;
    }

    async getUploadcareFile() {
        if (!this.uploadcareWidget) return null;
        try {
            const file = this.uploadcareWidget.value();
            if (!file) return null;
            if (file.then) {
                const fileInfo = await file;
                return {
                    archivo: fileInfo.cdnUrl,
                    nombreArchivo: fileInfo.name,
                    tamanoArchivo: fileInfo.size,
                    tipoMime: fileInfo.mimeType
                };
            }
            if (file.cdnUrl) {
                return {
                    archivo: file.cdnUrl,
                    nombreArchivo: file.name || 'archivo',
                    tamanoArchivo: file.size || 0,
                    tipoMime: file.mimeType || 'application/octet-stream'
                };
            }
            return null;
        } catch (error) {
            throw new Error('Error al obtener el archivo de Uploadcare');
        }
    }

    // guardar recurso en firestore
    async saveResource(data) {
        const db = getDbInstance();
        if (!db) throw new Error('Base de datos no inicializada');
        const resourceData = {
            ...data,
            timestamp: serverTimestamp(),
            autorId: this.currentUser.uid,
            autorNombre: this.currentUser.displayName || 'Usuario',
            autorEmail: this.currentUser.email,
            autorAvatar: this.currentUser.photoURL,
            descargas: 0
        };
        await addDoc(collection(db, 'recursos'), resourceData);
    }

    // confirma la eliminacion de un recurso
    confirmDelete(resource) {
        modalManager.confirm(
            'Eliminar Recurso', 
            `¿Estás seguro de eliminar "${resource.titulo}"?`, 
            () => this.deleteResource(resource.id), 
            null
        );
    }

    // elimina un recurso
    async deleteResource(resourceId) {
        const db = getDbInstance();
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'recursos', resourceId));
            toastManager.success('Recurso eliminado');
            await this.load();
        } catch (error) {
            this.handleError('delete', error);
            toastManager.error('Error al eliminar recurso');
        }
    }

    async incrementDownloads(resourceId) {
        const db = getDbInstance();
        if (!db) return;
        try {
            await updateDoc(doc(db, 'recursos', resourceId), {
                descargas: increment(1)
            });
        } catch (error) {}
    }

    // manejo de busqueda
    handleSearch(e) {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput?.value.trim().toLowerCase() || '';
        this.applyFilters(searchTerm);
    }

    handleFilterChange() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput?.value.trim().toLowerCase() || '';
        this.applyFilters(searchTerm);
    }

    applyFilters(searchTerm = '') {
        const categoria = document.getElementById('filterCategoria')?.value || '';
        this.filteredResources = this.resources.filter(resource => {
            if (searchTerm) {
                const searchableFields = [
                    resource.titulo,
                    resource.materia,
                    resource.descripcion,
                    resource.autorNombre
                ];
                const matchesSearch = searchableFields.some(field => (
                    field && field.toLowerCase().includes(searchTerm)
                ));
                if (!matchesSearch) return false;
            }
            if (categoria && resource.categoria !== categoria) {
                return false;
            }
            return true;
        });
        this.render();
        if (this.filteredResources.length === 0 && (searchTerm || categoria)) {
            toastManager.info('No se encontraron recursos con esos filtros');
        }
    }

    // inicializa el widget de uploadcare
    initUploadcare() {
        let attempts = 0;
        const maxAttempts = 10;
        const checkUploadcare = () => {
            attempts++;
            if (typeof uploadcare !== 'undefined') {
                try {
                    const input = document.getElementById('archivo');
                    if (!input) {
                        if (attempts < maxAttempts) {
                            setTimeout(checkUploadcare, 1000);
                        }
                        return;
                    }
                    this.uploadcareWidget = uploadcare.Widget('#archivo');

                    this.uploadcareWidget.onUploadComplete((fileInfo) => {
                        toastManager.success('Archivo cargado correctamente');
                    });

                    this.uploadcareWidget.onChange((file) => {
                        if (file) {
                            toastManager.info('Archivo seleccionado');
                        }
                    });
                } catch (error) {
                    if (attempts < maxAttempts) {
                        setTimeout(checkUploadcare, 2000);
                    }
                }
            } else if (attempts < maxAttempts) {
                setTimeout(checkUploadcare, 1000);
            }
        };
        setTimeout(checkUploadcare, 2000);
    }

    onAuthStateChanged(user) {
        this.currentUser = user;
        if (this.isLoaded) {
            this.render();
        }
    }

    showLoading() {
        const container = document.getElementById('listaRecursos');
        if (container) {
            container.innerHTML = '<div class="loading-placeholder">Cargando recursos...</div>';
        }
    }

    hideLoading() {}

    showError() {
        const container = document.getElementById('listaRecursos');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Error al cargar recursos</h3>
                    <p>Por favor, intenta de nuevo más tarde</p>
                    <button class="btn-retry" onclick="window.app.getModule('resources').load()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    handleError(context, error) {
        this.emit('resources:error', {context, error});
    }

    emit(eventName, detail = {}) {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    destroy() {
       // Remover listeners
        window.removeEventListener('scroll', this.handleScroll);
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.removeEventListener('scroll', this.handleScroll);
        }
        
        this.resources = [];
        this.filteredResources = [];
        this.displayedResources = [];
        this.isLoaded = false;
    }
}

export default ResourcesModule;