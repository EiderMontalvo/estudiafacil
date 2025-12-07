import { 
    initializeFirebase, getAuthInstance, getGoogleProvider, signInWithPopup, 
    signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, 
    onAuthStateChanged, setPersistence, browserLocalPersistence
} from '../config/firebase.config.js';
import toastManager from './toast.manager.js';
import modalManager from './modal.manager.js';
import { getLocalStorage, setLocalStorage, removeLocalStorage, isLocalhost } from './utils.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.loginInProgress = false;
        this.redirectTimeout = null;
        this.authStateCallbacks = [];
    }

    // inicializar el sistema de autenticacion
    async init() {
        if (this.isInitialized) return true;
        try {
            await initializeFirebase();
            await this.setupPersistence();
            const redirectUser = await this.checkRedirectResult();
            
            this.setupAuthObserver();
            
            // Si no hubo redirect, restaurar sesión
            if (!redirectUser) {
                this.restoreSession();
            }
            
            this.setupEventListeners();
            this.isInitialized = true;
            this.emit('auth-initialized');
            return true;
        } catch (error) {
            this.handleError('inicialización fallida', error);
            return false;
        }
    }

    async setupPersistence() {
        const auth = getAuthInstance();
        if (!auth) throw new Error('Auth no inicializado');
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (error) {
            throw new Error('Error al establecer la persistencia');
        }
    }

    setupAuthObserver() {
        const auth = getAuthInstance();
        if (!auth) return;
        onAuthStateChanged(auth, (user) => {
            // Solo actualizar UI si no estamos en medio de un redirect
            const wasRedirecting = getLocalStorage('auth_redirecting', false);
            
            if (user) {
                this.handleUserSignIn(user, wasRedirecting === 'true' || wasRedirecting === true);
            } else {
                this.handleUserSignOut();
            }
            this.authStateCallbacks.forEach(callback => {
                try {
                    callback(user);
                } catch (error) {}
            });
        });
    }

    onAuthStateChanged(callback) {
        if (typeof callback === 'function') {
            this.authStateCallbacks.push(callback);
        }
    }

    handleUserSignIn(user, fromRedirect = false) {
        this.currentUser = user;
        this.saveUserToStorage(user);
        this.clearRedirectState();
        this.updateUI(user);
        
        // Solo navegar si viene de un redirect o es un login nuevo
        if (fromRedirect) {
            this.navigateAfterLogin();
        }
        
        this.emit('user-signed-in', { user });
    }

    handleUserSignOut() {
        this.currentUser = null;
        this.clearUserStorage();
        this.updateUI(null);
        this.emit('user-signed-out');
    }

    // Navegar al dashboard después del login
    navigateAfterLogin() {
        const currentPath = window.location.pathname;
        const isHomePage = currentPath === '/' || 
                          currentPath === '/index.html' || 
                          currentPath.endsWith('/');
        
        if (isHomePage) {
            // Inmediatamente ocultar el hero y mostrar dashboard
            const welcomeHero = document.getElementById('welcomeHero');
            const dashboardContent = document.getElementById('dashboardContent');
            
            if (welcomeHero) welcomeHero.style.display = 'none';
            if (dashboardContent) {
                dashboardContent.style.display = 'block';
                
                // Scroll suave después de un pequeño delay
                setTimeout(() => {
                    dashboardContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    }

    async signInWithGoogle() {
        if (this.loginInProgress) {
            toastManager.warning('Inicio de sesión en progreso...');
            return null;
        }

        try {
            this.loginInProgress = true;
            this.clearRedirectState();

            const auth = getAuthInstance();
            const provider = getGoogleProvider();

            if (!auth || !provider) {
                throw new Error('Auth or provider not initialized');
            }

            toastManager.info('Conectando con Google...');
            
            // Usar siempre popup ya que es más confiable en todos los entornos
            // El popup funciona bien en escritorio y móviles modernos
            return await this.signInWithPopupMethod(auth, provider);
        } catch (error) {
            this.handleErrorLogin(error);
            return null;
        } finally {
            this.loginInProgress = false;
        }
    }

    // login con popup
    async signInWithPopupMethod(auth, provider) {
        try {
            const result = await signInWithPopup(auth, provider);
            this.clearRedirectState();
            this.saveUserToStorage(result.user);
            toastManager.success(`¡Bienvenido, ${result.user.displayName}!`);
            
            // En popup, navegar inmediatamente
            this.navigateAfterLogin();
            
            return result.user;
        } catch (error) {
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                toastManager.warning('Popup bloqueado, redirigiendo...');
                await this.signInWithRedirectMethod(auth, provider);
                return null;
            }
            throw error;
        }
    }

    async signInWithRedirectMethod(auth, provider) {
        try {
            const redirectTime = Date.now();
            setLocalStorage('auth_redirecting', 'true');
            setLocalStorage('auth_redirect_time', redirectTime.toString());
            
            // Ocultar el hero ANTES de redirigir
            const welcomeHero = document.getElementById('welcomeHero');
            if (welcomeHero) {
                welcomeHero.style.display = 'none';
            }
            
            toastManager.info('Redirigiendo a Google...');
            
            // Pequeño delay para que el usuario vea el mensaje
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await signInWithRedirect(auth, provider);
        } catch (error) {
            this.clearRedirectState();
            // Mostrar el hero de nuevo si hay error
            const welcomeHero = document.getElementById('welcomeHero');
            if (welcomeHero && !this.isLoggedIn()) {
                welcomeHero.style.display = 'block';
            }
            throw error;
        }
    }

    async checkRedirectResult() {
        const auth = getAuthInstance();
        if (!auth) return null;
        
        const wasRedirecting = getLocalStorage('auth_redirecting', false);
        
        try {
            const result = await getRedirectResult(auth);
            
            if (result && result.user) {
                this.clearRedirectState();
                this.saveUserToStorage(result.user);
                toastManager.success(`¡Bienvenido, ${result.user.displayName}!`);
                
                // Navegar inmediatamente después del redirect
                this.navigateAfterLogin();
                
                this.emit('login-success', { user: result.user });
                return result.user;
            } else if (wasRedirecting === 'true' || wasRedirecting === true) {
                const redirectTime = parseInt(getLocalStorage('auth_redirect_time', '0'));
                const elapsed = Date.now() - redirectTime;
                
                // Si pasó mucho tiempo, limpiar el estado
                if (elapsed > 45000) {
                    this.handleRedirectTimeout();
                }
            }
            
            return null;
        } catch (error) {
            this.clearRedirectState();
            if (error.code !== 'auth/null-user') {
                this.handleError('Redirect result error', error);
            }
            return null;
        }
    }

    // maneja timeout de redirect
    handleRedirectTimeout() {
        this.clearRedirectState();
        toastManager.error('Tiempo de espera agotado. Intenta de nuevo.');
        
        // Mostrar el hero de nuevo
        const welcomeHero = document.getElementById('welcomeHero');
        if (welcomeHero && !this.isLoggedIn()) {
            welcomeHero.style.display = 'block';
        }
    }

    // cierra sesion
    async signOut(showMessage = true) {
        const auth = getAuthInstance();
        if (!auth) return false;
        try {
            if (showMessage) {
                toastManager.info('Cerrando sesión...');
            }
            this.clearRedirectState();
            await firebaseSignOut(auth);
            this.clearUserStorage();
            this.currentUser = null;
            if (showMessage) {
                toastManager.success('Sesión cerrada exitosamente');
            }
            
            // Redirigir a la página de inicio/registro
            const welcomeHero = document.getElementById('welcomeHero');
            const dashboardContent = document.getElementById('dashboardContent');
            if (welcomeHero) welcomeHero.style.display = 'block';
            if (dashboardContent) dashboardContent.style.display = 'none';
            
            this.emit('logout-success');
            return true;
        } catch (error) {
            this.handleError('Sign out failed', error);
            toastManager.error('Error al cerrar la sesión');
            return false;
        }
    }

    // obtener usuario actual
    getCurrentUser() {
        const auth = getAuthInstance();
        return auth?.currentUser || this.currentUser;
    }

    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    // guardar el usuario en localStorage
    saveUserToStorage(user) {
        if (!user) return;
        try {
            const userData = {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                loginTime: new Date().toISOString()
            };
            setLocalStorage('user_data', userData);
            setLocalStorage('user_logged', true);
        } catch (error) {}
    }

    // limpiar datos del usuario del localStorage
    clearUserStorage() {
        removeLocalStorage('user_data');
        removeLocalStorage('user_logged');
    }

    clearRedirectState() {
        removeLocalStorage('auth_redirecting');
        removeLocalStorage('auth_redirect_time');
        if (this.redirectTimeout) {
            clearTimeout(this.redirectTimeout);
            this.redirectTimeout = null;
        }
        this.loginInProgress = false;
    }

    // restaurar sesion desde localStorage
    restoreSession() {
        const isLogged = getLocalStorage('user_logged', false);
        const userData = getLocalStorage('user_data', null);
        
        if (isLogged && userData) {
            if (userData.loginTime) {
                const loginTime = new Date(userData.loginTime);
                const daysSinceLogin = (Date.now() - loginTime.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceLogin > 30) {
                    this.clearUserStorage();
                    return;
                }
            }
            
            // Si hay sesión guardada, asegurarse de que el UI esté correcto
            const auth = getAuthInstance();
            if (auth?.currentUser) {
                this.updateUI(auth.currentUser);
            }
        }
    }

    // actualizar UI segun el estado de autenticacion
    updateUI(user) {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');
        const contentNav = document.getElementById('contentNav');
        const welcomeHero = document.getElementById('welcomeHero');
        const dashboardContent = document.getElementById('dashboardContent');

        if (user) {
            // usuario logueado
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (contentNav) contentNav.style.display = 'block';
            if (welcomeHero) welcomeHero.style.display = 'none';
            if (dashboardContent) dashboardContent.style.display = 'block';

            this.updateUserInfo(user);
        } else {
            // usuario no logueado
            if (loginBtn) loginBtn.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
            if (contentNav) contentNav.style.display = 'none';
            if (welcomeHero) welcomeHero.style.display = 'block';
            if (dashboardContent) dashboardContent.style.display = 'none';
        }
        this.emit('auth-ui-updated', { user });
    }

    // actualizar info del usuario en el dom
    updateUserInfo(user) {
        const avatarUrl = user.photoURL || this.generateAvatarUrl(user.displayName);
        const displayName = user.displayName || 'Usuario';

        // Actualizar elementos del DOM
        const elements = [
            { id: 'userAvatar', prop: 'src', value: avatarUrl },
            { id: 'userName', prop: 'textContent', value: displayName },
            { id: 'profileAvatar', prop: 'src', value: avatarUrl },
            { id: 'profileName', prop: 'textContent', value: displayName },
            { id: 'profileEmail', prop: 'textContent', value: user.email || '' }
        ];

        elements.forEach(({ id, prop, value }) => {
            const element = document.getElementById(id);
            if (element && value) {
                element[prop] = value;
                // Fallback para avatares que fallen al cargar
                if (prop === 'src' && element.tagName === 'IMG') {
                    element.onerror = () => {
                        element.src = this.generateAvatarUrl(displayName);
                    };
                }
            }
        });
    }

    // generar url de avatar
    generateAvatarUrl(name = 'Usuario') {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00f5ff&color=fff&size=120&bold=true`;
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signInWithGoogle();
            });
        }

        const heroLoginBtn = document.getElementById('heroLoginBtn');
        if (heroLoginBtn) {
            heroLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signInWithGoogle();
            });
        }

        const logoutButtons = document.querySelectorAll('#logoutBtn, #profileLogoutBtn');
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                this.signOut();
            });
        });
    }

    handleErrorLogin(error) {
        this.clearRedirectState();
        const errorMessages = {
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
            'auth/popup-blocked': 'Popup bloqueado. Permite popups para este sitio.',
            'auth/popup-closed-by-user': 'Popup cerrado. Intenta de nuevo.',
            'auth/unauthorized-domain': 'Dominio no autorizado en Firebase.',
            'auth/operation-not-allowed': 'Login con Google no habilitado.',
            'auth/cancelled-popup-request': 'Solicitud cancelada.',
            'auth/account-exists-with-different-credential': 'Esta cuenta ya existe con otro método.'
        };
        const message = errorMessages[error.code] || 'Error al iniciar sesión';
        toastManager.error(message);
        this.emit('login-error', { error });
    }

    handleError(context, error) {
        this.emit('auth-error', { context, error });
    }

    emit(eventName, detail = {}) {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    on(eventName, callback) {
        document.addEventListener(eventName, (e) => {
            callback(e.detail);
        });
    }

    destroy() {
        this.clearRedirectState();
        this.authStateCallbacks = [];
        this.currentUser = null;
        this.isInitialized = false;
    }
}

// crear instancia
const authManager = new AuthManager();

// exportar instancia y clase
export default authManager;
export { AuthManager };