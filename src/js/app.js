import { initializeFirebase } from './config/firebase.config.js';
import authManager from './core/auth.manager.js';
import toastManager from './core/toast.manager.js';
import modalManager from './core/modal.manager.js';
import NavbarComponent from './components/navbar.component.js';
import DashboardModule from './modules/dashboard.module.js';
import ResourcesModule from './modules/resources.module.js';
import SurveysModule from './modules/surveys.module.js';
import OpinionsModule from './modules/opinions.module.js';
import ProfileModule from './modules/profile.module.js';

class App {
    constructor() {
        this.modules = {};
        this.navbar = null;
        this.isInitialized = false;
        this.currentSection = null;
    }
    async init() {
        try {
            this.showLoadingScreen();
            await this.initializeFirebase();
            await this.initializeAuth();
            this.initializeComponents();
            this.initializeModules();
            this.setupNavigation();
            this.setupGlobalListeners();
            await this.loadInitialSection();
            this.isInitialized = true;
            this.hideLoadingScreen();
            this.showWelcomeMessage();
        } catch (error) {
            this.handleInitError(error);
        }
    }

    async initializeFirebase() {
        try {
            await initializeFirebase();
        } catch (error) {
            throw new Error('Firebase initialization failed');
        }
    }

    async initializeAuth() {
        try {
            await authManager.init();
        } catch (error) {
            throw new Error('Authentication initialization failed');
        }
    }

    initializeComponents() {
        this.navbar = new NavbarComponent();
        this.navbar.init();
    }

    initializeModules() {
        this.modules = {
            dashboard: new DashboardModule(),
            resources: new ResourcesModule(),
            surveys: new SurveysModule(),
            opinions: new OpinionsModule(),
            profile: new ProfileModule()
        };

        Object.values(this.modules).forEach(module => {
            if (module.init) {
                module.init();
            }
        });
    }

    setupNavigation() {
        document.addEventListener('navigate', (e) => {
            const section = e.detail?.section;
            if (section) {
                this.navigateToSection(section);
            }
        });
    }

    setupGlobalListeners() {
        authManager.on('user-signed-in', (data) => {
            this.handleUserSignedIn(data.user);
        });

        authManager.on('user-signed-out', () => {
            this.handleUserSignedOut();
        });

        ['resources:error', 'surveys:error', 'opinions:error'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                this.handleModuleError(e.detail);
            });
        });

        window.addEventListener('online', () => {
            toastManager.success('Conexión restaurada');
        });

        window.addEventListener('offline', () => {
            toastManager.warning('Sin conexión a internet');
        });

        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    async navigateToSection(sectionName) {
        if (this.currentSection === sectionName) return;

        const module = this.modules[sectionName];
        if (!module) return;

        this.currentSection = sectionName;

        if (module.load) {
            try {
                await module.load();
            } catch (error) {
                toastManager.error(`Error al cargar ${sectionName}`);
            }
        }
    }

    async loadInitialSection() {
        const user = authManager.getCurrentUser();
        
        if (user) {
            // Agregar clase al body para usuario logueado
            document.body.classList.add('user-logged-in');
            
            // Usuario autenticado - mostrar dashboard con contenido
            this.showDashboardContent();
            const savedSection = localStorage.getItem('activeSection') || 'dashboard';
            await this.navigateToSection(savedSection);
        } else {
            // Remover clase si no hay usuario
            document.body.classList.remove('user-logged-in');
            
            // Usuario no autenticado - mostrar pantalla de bienvenida
            this.showWelcomeScreen();
        }
    }

    handleUserSignedIn(user) {
        // Agregar clase al body para estilos específicos de usuario logueado
        document.body.classList.add('user-logged-in');
        
        // Mostrar contenido del dashboard y navegación
        this.showDashboardContent();
        
        if (this.currentSection && this.modules[this.currentSection]) {
            const module = this.modules[this.currentSection];
            if (module.load) {
                module.load().catch(() => {});
            }
        }

        if (this.currentSection === 'dashboard') {
            this.modules.dashboard.load().catch(() => {});
        }
    }

    handleUserSignedOut() {
        // Remover clase del body
        document.body.classList.remove('user-logged-in');
        
        // Mostrar pantalla de bienvenida
        this.showWelcomeScreen();
        
        // Limpiar módulos
        Object.values(this.modules).forEach(module => {
            if (module.destroy) {
                module.destroy();
            }
        });

        // Reinicializar módulos
        this.initializeModules();
        
        // Navegar a dashboard (mostrará welcome hero)
        this.navigateToSection('dashboard');
    }
    handleModuleError(detail) {
        if (window.location.hostname === 'localhost') {
            //solo en desarrollo
        }
    }
    showLoadingScreen() {
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.style.display = 'flex';
            this.animateLoadingMessages();
        }
    }
    animateLoadingMessages() {
        const messageEl = document.getElementById('loadingMessage');
        if (!messageEl) return;

        const messages = [
            'Inicializando...',
            'Conectando con Firebase...',
            'Cargando módulos...',
            'Preparando interfaz...',
            '¡Casi listo!'
        ];
        let index = 0;
        const interval = setInterval(() => {
            if (index < messages.length && messageEl) {
                messageEl.textContent = messages[index];
                index++;
            } else {
                clearInterval(interval);
            }
        }, 400);

        this.loadingInterval = interval;
    }
    hideLoadingScreen() {
        const loader = document.getElementById('loadingScreen');
        
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }

        if (loader) {
            setTimeout(() => {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 300);
            }, 800);
        }
    }
    showWelcomeMessage() {
        const user = authManager.getCurrentUser();
        
        if (user) {
            setTimeout(() => {
                toastManager.success(`¡Bienvenido de vuelta, ${user.displayName}!`);
            }, 1200);
        } else {
            setTimeout(() => {
                toastManager.info('¡Bienvenido a EstudiaFácil!');
            }, 1200);
        }
    }

    showWelcomeScreen() {
        const welcomeHero = document.getElementById('welcomeHero');
        const dashboardContent = document.getElementById('dashboardContent');
        const contentNav = document.getElementById('contentNav');
        
        if (welcomeHero) welcomeHero.style.display = 'block';
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (contentNav) contentNav.style.display = 'none';
        
        // Ocultar todas las secciones excepto dashboard
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            dashboardSection.classList.add('active');
        }

        // Cargar estadísticas del footer incluso sin estar logueado
        this.loadFooterStatsInBackground();
    }

    // carga las estadísticas del footer en segundo plano
    async loadFooterStatsInBackground() {
        try {
            // Cargar recursos sin actualizar UI y sin mostrar errores (solo para estadísticas)
            await Promise.all([
                this.modules.resources.load(false, true).catch(() => {}),
                this.modules.surveys.load(false, true).catch(() => {}),
                this.modules.opinions.load(false, true).catch(() => {})
            ]);
        } catch (error) {
            // Fallar silenciosamente - las estadísticas del footer no son críticas
        }
    }

    showDashboardContent() {
        const welcomeHero = document.getElementById('welcomeHero');
        const dashboardContent = document.getElementById('dashboardContent');
        const contentNav = document.getElementById('contentNav');
        
        if (welcomeHero) welcomeHero.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
        if (contentNav) contentNav.style.display = 'flex';
    }
    handleInitError(error) {
        this.hideLoadingScreen();
        
        toastManager.error('Error al inicializar la aplicación');
        
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.innerHTML = `
                <div class="error-container" style="text-align: center; color: white;">
                    <div style="font-size: 48px; margin-bottom: 1rem;">⚠️</div>
                    <h2 style="margin-bottom: 0.5rem;">Error al cargar</h2>
                    <p style="margin-bottom: 1.5rem; opacity: 0.8;">No se pudo inicializar la aplicación</p>
                    <button onclick="location.reload()" style="
                        background: #00f5ff;
                        color: #0f172a;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    ">
                        Reintentar
                    </button>
                </div>
            `;
            loader.style.display = 'flex';
        }
    }

    cleanup() {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }

        Object.values(this.modules).forEach(module => {
            if (module.destroy) {
                module.destroy();
            }
        });

        if (this.navbar && this.navbar.destroy) {
            this.navbar.destroy();
        }
    }

    getModule(moduleName) {
        return this.modules[moduleName] || null;
    }

    isReady() {
        return this.isInitialized;
    }

    getCurrentUser() {
        return authManager.getCurrentUser();
    }

    isLoggedIn() {
        return authManager.isLoggedIn();
    }
}

const app = new App();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    app.init();
}

window.app = app;

export default App;
