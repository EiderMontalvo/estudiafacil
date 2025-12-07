import authManager from '../core/auth.manager.js';
import { formatDate, truncate, getElement } from '../core/utils.js';

class ProfileModule {
    constructor() {
        this.isLoaded = false;
        this.currentUser = null;
        this.userActivity = [];
    }

    //inicializa el módulo
    init() {
        this.currentUser = authManager.getCurrentUser();
        authManager.onAuthStateChanged((user) => {
            this.onAuthChanged(user);
        });
        document.addEventListener('resources:loaded', (e) => {
            if (this.isLoaded) this.updateStats(e.detail.resources, 'resources');
        });
        document.addEventListener('surveys:loaded', (e) => {
            if (this.isLoaded) this.updateStats(e.detail.surveys, 'surveys');
        });
        document.addEventListener('opinions:loaded', (e) => {
            if (this.isLoaded) this.updateStats(e.detail.opinions, 'opinions');
        });
    }

    //carga el perfil
    async load() {
        if (!this.currentUser) {
            this.showLoginMessage();
            return;
        }
        this.updateUserInfo();
        this.isLoaded = true;
    }
    //muestra mensaje de login
    showLoginMessage() {
        const container = getElement('#userActivity');
        if (container) {
            container.innerHTML = `
                <div class="activity-placeholder">
                    <div class="placeholder-icon">🔒</div>
                    <p>Inicia sesión para ver tu perfil</p>
                </div>
            `;
        }
    }
    //actualiza información del usuario
    updateUserInfo() {
        if (!this.currentUser) return;

        const avatarUrl = this.currentUser.photoURL || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.displayName || 'Usuario')}&background=00f5ff&color=fff&size=120`;

        //actualizar elementos
        const updates = [
            { id: 'profileAvatar', prop: 'src', value: avatarUrl },
            { id: 'profileName', prop: 'textContent', value: this.currentUser.displayName || 'Usuario' },
            { id: 'profileEmail', prop: 'textContent', value: this.currentUser.email || '' }
        ];
        updates.forEach(({ id, prop, value }) => {
            const el = document.getElementById(id);
            if (el && value) {
                el[prop] = value;
                if (prop === 'src' && el.tagName === 'IMG') {
                    el.onerror = () => {
                        el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.displayName || 'Usuario')}&background=00f5ff&color=fff&size=120`;
                    };
                }
            }
        });
    }

    //actualiza estadísticas de perfil
    updateStats(items, type) {
        if (!this.currentUser || !items) return;
        const userItems = items.filter(item => item.autorId === this.currentUser.uid);
        const statMapping = {
            resources: 'profileResources',
            surveys: 'profileSurveys',
            opinions: 'profileOpinions'
        };
        const elementId = statMapping[type];
        if (elementId) {
            const el = document.getElementById(elementId);
            if (el) el.textContent = userItems.length;
        }
        this.loadActivity();
    }
    //carga la actividad del usuario
    loadActivity() {
        if (!this.currentUser) return;
        const container = getElement('#userActivity');
        if (!container) return;
        const allActivity = [];
        document.dispatchEvent(new CustomEvent('profile:request-activity'));
        if (allActivity.length === 0) {
            container.innerHTML = `
                <div class="activity-placeholder">
                    <div class="placeholder-icon">📊</div>
                    <p>Tu actividad aparecerá aquí</p>
                </div>
            `;
            return;
        }
        this.renderActivity(allActivity);
    }
    //renderiza la actividad
    renderActivity(activities) {
        const container = getElement('#userActivity');
        if (!container) return;
        const sorted = activities
            .sort((a, b) => {
                const dateA = this.getActivityDate(a);
                const dateB = this.getActivityDate(b);
                return dateB - dateA;
            })
            .slice(0, 10);
        container.innerHTML = sorted.map(activity => {
            const icon = this.getActivityIcon(activity.type);
            const action = this.getActivityAction(activity.type);
            return `
                <div class="timeline-item">
                    <div class="timeline-icon">${icon}</div>
                    <div class="timeline-content">
                        <h5>${action}</h5>
                        <p>${truncate(activity.titulo, 50)}</p>
                        <div class="timeline-date">
                            <span class="date-icon">🕐</span>
                            ${formatDate(activity.timestamp)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    //obtiene la fecha de actividad
    getActivityDate(activity) {
        if (!activity.timestamp) return new Date(0);
        try {
            if (activity.timestamp.toDate) {
                return activity.timestamp.toDate();
            }
            return new Date(activity.timestamp);
        } catch {
            return new Date(0);
        }
    }
    //obtiene el ícono según tipo
    getActivityIcon(type) {
        const icons = {
            resource: '📚',
            survey: '📋',
            opinion: '💭'
        };
        return icons[type] || '📄';
    }
    //obtiene la acción según tipo
    getActivityAction(type) {
        const actions = {
            resource: 'Subió un recurso',
            survey: 'Creó una encuesta',
            opinion: 'Publicó una opinión'
        };
        return actions[type] || 'Actividad';
    }
    //maneja cambios de autenticación
    onAuthChanged(user) {
        this.currentUser = user;
        if (this.isLoaded) {
            if (user) {
                this.load();
            } else {
                this.showLoginMessage();
            }
        }
    }
    //limpia el módulo
    destroy() {
        this.isLoaded = false;
        this.userActivity = [];
    }
}

export default ProfileModule;
