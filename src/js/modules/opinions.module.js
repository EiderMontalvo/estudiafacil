import {
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, increment, serverTimestamp, query, orderBy
} from '../config/firebase.config.js';
import { getDbInstance } from '../config/firebase.config.js';
import authManager from '../core/auth.manager.js';
import toastManager from '../core/toast.manager.js';
import modalManager from '../core/modal.manager.js';
import { formatDate, truncate, getElement } from '../core/utils.js';

class OpinionsModule {
    constructor() {
        this.opinions = [];
        this.isLoaded = false;
        this.currentUser = null;
        this.categories = {
            experiencia: { name: 'Experiencia Personal', icon: '📖' },
            pregunta: { name: 'Pregunta Académica', icon: '❓' },
            consejo: { name: 'Consejo de Estudio', icon: '💡' },
            debate: { name: 'Tema de Debate', icon: '💬' }
        };
    }

    // inicializa el módulo
    init() {
        this.currentUser = authManager.getCurrentUser();
        this.setupEventListeners();
        authManager.onAuthStateChanged((user) => {
            this.onAuthChanged(user);
        });
    }

    // carga las opiniones
    async load(updateUI = true, silent = false) {
        try {
            if (!this.isLoaded && updateUI) {
                this.showLoading();
            }
            await this.loadOpinions();
            if (updateUI) {
                this.render();
                this.hideLoading();
            }
            this.isLoaded = true;
        } catch (error) {
            if (!silent) {
                toastManager.error('Error al cargar opiniones');
                this.handleError('load', error);
            }
            if (updateUI) {
                this.showError();
                this.hideLoading();
            }
        } finally {
            // Emitir evento SIEMPRE, incluso si hay error (para actualizar stats con datos disponibles)
            this.emit('opinions:loaded', { opinions: this.opinions });
        }
        return this.opinions;
    }

    async loadOpinions() {
        const db = getDbInstance();
        if (!db) throw new Error('Database not initialized');
        try {
            let snapshot;
            try {
                const q = query(collection(db, 'opiniones'), orderBy('timestamp', 'desc'));
                snapshot = await getDocs(q);
            } catch {
                snapshot = await getDocs(collection(db, 'opiniones'));
            }
            const opinions = [];
            snapshot.forEach(docSnap => {
                opinions.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });
            // ordenar por fecha
            opinions.sort((a, b) => {
                const dateA = this.getOpinionDate(a);
                const dateB = this.getOpinionDate(b);
                return dateB - dateA;
            });
            this.opinions = opinions;
            return opinions;
        } catch (error) {
            throw new Error(`Failed to load opinions: ${error.message}`);
        }
    }

    getOpinionDate(opinion) {
        if (!opinion.timestamp) return new Date(0);
        try {
            if (opinion.timestamp.toDate) {
                return opinion.timestamp.toDate();
            }
            return new Date(opinion.timestamp);
        } catch {
            return new Date(0);
        }
    }

    // renderiza la lista de opiniones
    render() {
        const container = getElement('#opinionsList');
        if (!container) return;
        container.innerHTML = '';
        if (this.opinions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💭</div>
                    <h3>No hay opiniones</h3>
                    <p>¡Comparte tu primera opinión!</p>
                    <button class="btn-primary" id="emptyCreateOpinion">
                        <span class="btn-icon">➕</span>
                        <span class="btn-text">Escribir Primera Opinión</span>
                    </button>
                </div>
            `;

            const emptyBtn = container.querySelector('#emptyCreateOpinion');
            if (emptyBtn) {
                emptyBtn.addEventListener('click', () => this.showOpinionForm());
            }

            return;
        }

        // renderizar cada opinión
        this.opinions.forEach(opinion => {
            const card = this.createOpinionCard(opinion);
            container.appendChild(card);
        });
    }

    // crea una card de opinión
    createOpinionCard(opinion) {
        const card = document.createElement('div');
        card.className = 'opinion-card';
        card.setAttribute('data-opinion-id', opinion.id);

        const isMine = this.currentUser && opinion.autorId === this.currentUser.uid;
        const likes = opinion.likes || 0;
        const isLiked = this.currentUser && opinion.likedBy && opinion.likedBy.includes(this.currentUser.uid);

        // header con avatar
        const header = document.createElement('div');
        header.className = 'opinion-header';

        const avatarUrl = opinion.autorAvatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(opinion.autorNombre || 'Usuario')}&background=00f5ff&color=fff&size=80`;

        header.innerHTML = `
            <img src="${avatarUrl}" alt="${opinion.autorNombre}" class="opinion-avatar">
            <div class="opinion-meta">
                <div class="opinion-author">
                    <span class="author-icon">👤</span>
                    ${opinion.autorNombre || 'Anónimo'}
                </div>
                <div class="opinion-date">
                    <span class="date-icon">🕐</span>
                    ${formatDate(opinion.timestamp)}
                </div>
            </div>
            <div class="opinion-category">
                <span class="category-icon">${this.getCategoryIcon(opinion.categoria)}</span>
                ${this.getCategoryName(opinion.categoria)}
            </div>
        `;

        // botón eliminar si es mío
        if (isMine) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-opinion';
            deleteBtn.title = 'Eliminar opinión';
            deleteBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            deleteBtn.addEventListener('click', () => this.confirmDelete(opinion));
            header.appendChild(deleteBtn);
        }

        card.appendChild(header);

        // título
        const title = document.createElement('h3');
        title.className = 'opinion-title';
        title.textContent = opinion.titulo || 'Sin título';
        card.appendChild(title);

        // contenido
        const content = document.createElement('p');
        content.className = 'opinion-content';
        content.textContent = opinion.contenido || '';
        card.appendChild(content);

        // materia (si existe)
        if (opinion.materia) {
            const subject = document.createElement('div');
            subject.className = 'opinion-subject';
            subject.innerHTML = `
                <span class="subject-icon">📚</span>
                ${opinion.materia}
            `;
            card.appendChild(subject);
        }

        // acciones
        const actions = document.createElement('div');
        actions.className = 'opinion-actions';

        const likeBtn = document.createElement('button');
        likeBtn.className = `opinion-action btn-like ${isLiked ? 'liked' : ''}`;
        likeBtn.innerHTML = `
            <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
            <span class="like-count">${likes}</span>
        `;
        likeBtn.addEventListener('click', () => this.toggleLike(opinion.id));

        actions.appendChild(likeBtn);
        card.appendChild(actions);

        return card;
    }

    // obtiene el ícono de categoría
    getCategoryIcon(categoria) {
        const config = this.categories[categoria];
        return config ? config.icon : '💬';
    }

    // obtiene el nombre de categoría
    getCategoryName(categoria) {
        const config = this.categories[categoria];
        return config ? config.name : 'General';
    }

    // configura event listeners
    setupEventListeners() {
        // botón "Nueva Opinión"
        const addBtn = getElement('#addOpinionBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showOpinionForm());
        }

        // formulario
        const form = getElement('#opinionFormElement');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // botones cerrar formulario
        ['cancelOpinion', 'cancelOpinionBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.hideOpinionForm());
            }
        });
    }

    // muestra el formulario de opinión
    showOpinionForm() {
        if (!this.currentUser) {
            toastManager.warning('Debes iniciar sesión para publicar opiniones');
            return;
        }

        const form = getElement('#opinionForm');
        if (form) {
            form.style.display = 'block';

            setTimeout(() => {
                const titleInput = getElement('#opinionTitle');
                if (titleInput) titleInput.focus();
            }, 100);
        }
    }

    // oculta el formulario de opinión
    hideOpinionForm() {
        const form = getElement('#opinionForm');
        if (form) {
            form.style.display = 'none';

            const formElement = getElement('#opinionFormElement');
            if (formElement) formElement.reset();
        }
    }

    // maneja el envío del formulario
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
                submitBtn.innerHTML = '<span>Publicando...</span>';
            }

            // obtener datos
            const titulo = getElement('#opinionTitle')?.value.trim() || '';
            const contenido = getElement('#opinionContent')?.value.trim() || '';
            const categoria = getElement('#opinionCategory')?.value || '';
            const materia = getElement('#opinionSubject')?.value.trim() || '';

            // validar
            if (!titulo) {
                toastManager.warning('El título es obligatorio');
                return;
            }

            if (!contenido) {
                toastManager.warning('El contenido es obligatorio');
                return;
            }

            // guardar opinión
            await this.saveOpinion({
                titulo,
                contenido,
                categoria,
                materia
            });

            this.hideOpinionForm();
            await this.load();

            toastManager.success('¡Opinión publicada exitosamente!');
        } catch (error) {
            this.handleError('save', error);
            toastManager.error('Error al publicar opinión');
        } finally {
            if (submitBtn && originalText) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    // guarda una opinión en Firestore
    async saveOpinion(data) {
        const db = getDbInstance();
        if (!db) throw new Error('Database not initialized');

        const opinionData = {
            ...data,
            timestamp: serverTimestamp(),
            autorId: this.currentUser.uid,
            autorNombre: this.currentUser.displayName || 'Usuario',
            autorEmail: this.currentUser.email,
            autorAvatar: this.currentUser.photoURL,
            likes: 0,
            likedBy: []
        };

        await addDoc(collection(db, 'opiniones'), opinionData);
    }

    // toggle like en una opinión
    async toggleLike(opinionId) {
        if (!this.currentUser) {
            toastManager.warning('Inicia sesión para dar like');
            return;
        }

        const db = getDbInstance();
        if (!db) return;

        try {
            const opinion = this.opinions.find(o => o.id === opinionId);
            if (!opinion) return;

            const likedBy = opinion.likedBy || [];
            const isLiked = likedBy.includes(this.currentUser.uid);

            const opinionRef = doc(db, 'opiniones', opinionId);

            if (isLiked) {
                // quitar like
                await updateDoc(opinionRef, {
                    likes: increment(-1),
                    likedBy: likedBy.filter(uid => uid !== this.currentUser.uid)
                });
            } else {
                // agregar like
                await updateDoc(opinionRef, {
                    likes: increment(1),
                    likedBy: [...likedBy, this.currentUser.uid]
                });
            }

            // recargar opiniones
            await this.load();
        } catch (error) {
            this.handleError('toggle-like', error);
            toastManager.error('Error al dar like');
        }
    }

    // confirma eliminación
    confirmDelete(opinion) {
        modalManager.confirm(
            'Eliminar Opinión',
            `¿Estás seguro de eliminar "${opinion.titulo}"?`,
            () => this.deleteOpinion(opinion.id),
            null
        );
    }

    // elimina una opinión
    async deleteOpinion(opinionId) {
        const db = getDbInstance();
        if (!db) return;

        try {
            await deleteDoc(doc(db, 'opiniones', opinionId));
            toastManager.success('Opinión eliminada');
            await this.load();
        } catch (error) {
            this.handleError('delete', error);
            toastManager.error('Error al eliminar opinión');
        }
    }

    // maneja cambios de autenticación
    onAuthChanged(user) {
        this.currentUser = user;
        if (this.isLoaded) this.render();
    }

    // muestra loading
    showLoading() {
        const container = getElement('#opinionsList');
        if (container) {
            container.innerHTML = '<div class="loading-placeholder">Cargando opiniones...</div>';
        }
    }

    hideLoading() {}

    // muestra error
    showError() {
        const container = getElement('#opinionsList');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Error al cargar opiniones</h3>
                    <p>Por favor, intenta de nuevo más tarde</p>
                </div>
            `;
        }
    }

    // maneja errores
    handleError(context, error) {
        this.emit('opinions:error', { context, error });
    }

    // emite eventos
    emit(eventName, detail = {}) {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    // limpia el módulo
    destroy() {
        this.opinions = [];
        this.isLoaded = false;
    }
}

export default OpinionsModule;