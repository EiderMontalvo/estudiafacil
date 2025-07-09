/* ===== MAIN.JS MODERNIZADO COMPLETO ===== */
/* Actualizado: 2025-07-09 20:31:42 UTC - EiderMontalvo */
/* Con logout mejorado, iconos SVG y colores unificados */

import { 
  auth, 
  db, 
  provider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
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
  getDoc
} from './firebase-config.js';

// Variables globales
let currentUser = null;
let isAuthInitialized = false;
let loginInProgress = false;
let redirectTimeout = null;

// SVG Icons - Centralizados y reutilizables
const SVGIcons = {
  success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="17" r="1" fill="currentColor"/>
  </svg>`,
  
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
    <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  login: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  loading: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9.5L12 2l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  rocket: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M15 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
};

// Referencias DOM - OBTENER DINÁMICAMENTE
function getLoginBtn() { return document.getElementById('loginBtn'); }
function getLogoutBtn() { return document.getElementById('logoutBtn'); }
function getProfileLogoutBtn() { return document.getElementById('profileLogoutBtn'); }
function getUserProfile() { return document.getElementById('userProfile'); }
function getContentNav() { return document.getElementById('contentNav'); }
function getUserName() { return document.getElementById('userName'); }
function getUserAvatar() { return document.getElementById('userAvatar'); }
function getProfileName() { return document.getElementById('profileName'); }
function getProfileEmail() { return document.getElementById('profileEmail'); }
function getProfileAvatar() { return document.getElementById('profileAvatar'); }

// Utilidades mejoradas con iconos SVG
class AuthUtils {
  static showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      console.log(`Toast [${type}]: ${message}`);
      return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = SVGIcons[type] || SVGIcons.info;
    
    toast.innerHTML = `
      <div class="toast-icon" style="color: var(--neon-cyan);">
        ${icon}
      </div>
      <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animación de entrada
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 100);
    
    // Remover después de 4 segundos
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 4000);
  }
  
  static saveUserToStorage(user) {
    const userData = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      loginTime: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('estudiaFacil_user', JSON.stringify(userData));
      localStorage.setItem('estudiaFacil_logged', 'true');
      
      console.log('💾 Usuario guardado:', user.displayName);
      return true;
    } catch (error) {
      console.error('❌ Error guardando usuario:', error);
      return false;
    }
  }
  
  static clearUserStorage() {
    const keys = [
      'estudiaFacil_user',
      'estudiaFacil_logged',
      'estudiaFacil_redirecting',
      'estudiaFacil_redirectTime'
    ];
    
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`No se pudo eliminar ${key}`);
      }
    });
    
    console.log('🧹 LocalStorage limpiado');
  }
  
  static hasStoredSession() {
    return localStorage.getItem('estudiaFacil_logged') === 'true';
  }
  
  static getStoredUser() {
    try {
      const userData = localStorage.getItem('estudiaFacil_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error al obtener usuario guardado:', error);
      return null;
    }
  }
  
  static clearRedirectState() {
    localStorage.removeItem('estudiaFacil_redirecting');
    localStorage.removeItem('estudiaFacil_redirectTime');
    loginInProgress = false;
    
    if (redirectTimeout) {
      clearTimeout(redirectTimeout);
      redirectTimeout = null;
    }
    
    console.log('🧹 Estado de redirect limpiado');
  }
  
  static isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  
  static logWithIcon(message, type = 'info') {
    const icons = {
      success: '✅',
      error: '❌', 
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳',
      user: '👤',
      storage: '💾',
      rocket: '🚀',
      home: '🏠',
      logout: '🚪'
    };
    
    console.log(`${icons[type] || icons.info} ${message}`);
  }
}

// Gestor de Autenticación mejorado
class AuthManager {
  static async initializePersistence() {
    try {
      console.log('🔒 Configurando persistencia...');
      await setPersistence(auth, browserLocalPersistence);
      AuthUtils.logWithIcon('Persistencia configurada', 'success');
      return true;
    } catch (error) {
      console.error('❌ Error configurando persistencia:', error);
      AuthUtils.showToast('Error al configurar persistencia', 'error');
      return false;
    }
  }
  
  static async signInWithGoogle() {
    if (loginInProgress) {
      AuthUtils.showToast('Login en progreso...', 'warning');
      return;
    }
    
    try {
      loginInProgress = true;
      AuthUtils.logWithIcon('INICIANDO LOGIN', 'rocket');
      AuthUtils.logWithIcon(`UTC: ${new Date().toISOString()}`, 'info');
      AuthUtils.logWithIcon('Usuario: EiderMontalvo', 'user');
      AuthUtils.logWithIcon(`Dominio: ${window.location.hostname}`, 'info');
      
      AuthUtils.clearRedirectState();
      
      const persistenceOk = await this.initializePersistence();
      if (!persistenceOk) {
        throw new Error('No se pudo configurar la persistencia');
      }
      
      this.updateLoginButton('Conectando...', true);
      AuthUtils.showToast('Conectando con Google...', 'info');
      
      // Decidir método según el entorno
      if (AuthUtils.isLocalhost()) {
        await this.loginWithPopup();
      } else {
        await this.loginWithRedirect();
      }
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      this.handleLoginError(error);
    }
  }
  
  static async loginWithPopup() {
    try {
      AuthUtils.logWithIcon('Login con popup...', 'loading');
      
      const result = await signInWithPopup(auth, provider);
      
      AuthUtils.logWithIcon('LOGIN POPUP EXITOSO', 'success');
      AuthUtils.logWithIcon(`Usuario: ${result.user.displayName}`, 'user');
      AuthUtils.logWithIcon(`Email: ${result.user.email}`, 'info');
      AuthUtils.logWithIcon(`UID: ${result.user.uid}`, 'info');
      
      // Forzar actualización inmediata
      AuthUtils.clearRedirectState();
      AuthUtils.saveUserToStorage(result.user);
      
      // Actualizar UI inmediatamente
      this.updateUI(result.user);
      
      AuthUtils.showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
      
      await this.saveUserToFirestore(result.user);
      
      return result.user;
      
    } catch (error) {
      console.error('❌ Error en popup:', error);
      
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user') {
        
        AuthUtils.logWithIcon('Popup bloqueado, probando redirect...', 'warning');
        AuthUtils.showToast('Popup bloqueado, probando redirect...', 'warning');
        
        await this.loginWithRedirect();
      } else {
        throw error;
      }
    }
  }
  
  static async loginWithRedirect() {
    try {
      AuthUtils.logWithIcon('Login con redirect...', 'loading');
      
      const redirectTime = Date.now();
      localStorage.setItem('estudiaFacil_redirecting', 'true');
      localStorage.setItem('estudiaFacil_redirectTime', redirectTime.toString());
      
      this.updateLoginButton('Redirigiendo...', true);
      AuthUtils.showToast('Redirigiendo a Google...', 'info');
      
      // Timeout de seguridad
      redirectTimeout = setTimeout(() => {
        AuthUtils.logWithIcon('TIMEOUT: Redirect demorado', 'warning');
        AuthManager.handleRedirectTimeout();
      }, 30000);
      
      setTimeout(async () => {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error('❌ Error en redirect:', redirectError);
          AuthManager.handleLoginError(redirectError);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error en redirect setup:', error);
      throw error;
    }
  }
  
  static async saveUserToFirestore(user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userData = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
      };
      
      await setDoc(userRef, userData, { merge: true });
      AuthUtils.logWithIcon('Usuario guardado en Firestore', 'success');
    } catch (error) {
      console.error('⚠️ No se pudo guardar en Firestore:', error);
    }
  }
  
  static handleRedirectTimeout() {
    AuthUtils.logWithIcon('TIMEOUT DE REDIRECT', 'warning');
    
    AuthUtils.clearRedirectState();
    AuthUtils.showToast('Timeout. Reintentando...', 'warning');
    
    this.updateLoginButton('Iniciar Sesión', false);
    
    // Reintentar una vez
    setTimeout(() => {
      if (!currentUser && !loginInProgress) {
        AuthUtils.logWithIcon('Reintentando automáticamente...', 'loading');
        AuthManager.signInWithGoogle();
      }
    }, 3000);
  }
  
  static handleLoginError(error) {
    AuthUtils.logWithIcon(`ERROR EN LOGIN: ${error.message}`, 'error');
    
    AuthUtils.clearRedirectState();
    
    let message = 'Error de autenticación';
    
    const errorMessages = {
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
      'auth/unauthorized-domain': 'Dominio no autorizado',
      'auth/popup-blocked': 'Popup bloqueado',
      'auth/operation-not-allowed': 'Login con Google no habilitado'
    };
    
    message = errorMessages[error.code] || message;
    
    AuthUtils.showToast(message, 'error');
    this.updateLoginButton('Iniciar Sesión', false);
  }
  
  static async checkRedirectResult() {
    try {
      AuthUtils.logWithIcon('VERIFICANDO REDIRECT', 'loading');
      
      const result = await getRedirectResult(auth);
      
      if (result) {
        AuthUtils.logWithIcon('LOGIN REDIRECT EXITOSO', 'success');
        AuthUtils.logWithIcon(`Usuario: ${result.user.displayName}`, 'user');
        
        // Forzar actualización inmediata
        AuthUtils.clearRedirectState();
        AuthUtils.saveUserToStorage(result.user);
        
        // Actualizar UI inmediatamente
        this.updateUI(result.user);
        
        AuthUtils.showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
        
        await this.saveUserToFirestore(result.user);
        
        return result.user;
        
      } else {
        const wasRedirecting = localStorage.getItem('estudiaFacil_redirecting');
        if (wasRedirecting === 'true') {
          const redirectTime = parseInt(localStorage.getItem('estudiaFacil_redirectTime')) || 0;
          const elapsed = Date.now() - redirectTime;
          
          console.log(`⏳ Esperando redirect... (${Math.round(elapsed / 1000)}s)`);
          
          if (elapsed > 45000) {
            AuthUtils.logWithIcon('TIMEOUT CRÍTICO', 'error');
            this.handleRedirectTimeout();
          }
        }
      }
    } catch (error) {
      console.error('❌ Error en checkRedirectResult:', error);
      
      AuthUtils.clearRedirectState();
      
      if (error.code !== 'auth/null-user') {
        AuthUtils.showToast('Error al procesar autenticación', 'error');
        this.updateLoginButton('Iniciar Sesión', false);
      }
    }
    
    return null;
  }
  
  // ===== LOGOUT MEJORADO CON REDIRECCIÓN =====
  static async signOutUser(redirectToHome = false) {
    try {
      AuthUtils.logWithIcon('LOGOUT INICIADO', 'logout');
      AuthUtils.showToast('Cerrando sesión...', 'info');
      
      AuthUtils.clearRedirectState();
      
      await signOut(auth);
      
      AuthUtils.clearUserStorage();
      currentUser = null;
      
      AuthUtils.showToast('Sesión cerrada exitosamente', 'success');
      
      // Actualizar UI inmediatamente
      this.updateUI(null);
      
      // Si se solicita redirección al inicio
      if (redirectToHome) {
        AuthUtils.logWithIcon('Redirigiendo al inicio...', 'home');
        
        // Navegar al dashboard/inicio
        setTimeout(() => {
          if (window.navigateToSection) {
            window.navigateToSection('dashboard');
          }
          
          // Mostrar welcome hero
          const welcomeHero = document.getElementById('welcomeHero');
          const dashboardContent = document.getElementById('dashboardContent');
          
          if (welcomeHero) {
            welcomeHero.style.display = 'block';
            AuthUtils.logWithIcon('Welcome hero mostrado', 'success');
          }
          
          if (dashboardContent) {
            dashboardContent.style.display = 'none';
          }
          
          // Mensaje de bienvenida después del logout
          setTimeout(() => {
            AuthUtils.showToast('¡Inicia sesión para acceder a todas las funciones!', 'info');
          }, 1000);
          
        }, 500);
      }
      
      setTimeout(() => {
        AuthManager.setupLoginButton();
      }, 500);
      
    } catch (error) {
      console.error('❌ Error en logout:', error);
      AuthUtils.showToast('Error al cerrar sesión', 'error');
    }
  }
  
  // Función específica para logout desde perfil
  static async logoutFromProfile() {
    AuthUtils.logWithIcon('LOGOUT DESDE PERFIL', 'logout');
    await this.signOutUser(true); // true = redirigir al inicio
  }
  
  // Función para logout desde navbar (si lo necesitas)
  static async logoutFromNavbar() {
    AuthUtils.logWithIcon('LOGOUT DESDE NAVBAR', 'logout');
    await this.signOutUser(false); // false = no redirigir
  }

  // Función updateUI completamente reescrita con iconos SVG
  static updateUI(user) {
    AuthUtils.logWithIcon('ACTUALIZANDO UI', 'info');
    console.log('👤 Usuario recibido:', user ? user.displayName : 'null');
    
    // Actualizar variable global inmediatamente
    currentUser = user;
    
    // Obtener elementos dinámicamente
    const loginBtn = getLoginBtn();
    const userProfile = getUserProfile();
    const contentNav = getContentNav();
    const userName = getUserName();
    const userAvatar = getUserAvatar();
    const profileName = getProfileName();
    const profileEmail = getProfileEmail();
    const profileAvatar = getProfileAvatar();
    
    if (user) {
      AuthUtils.logWithIcon('MOSTRANDO UI DE USUARIO LOGUEADO', 'user');
      console.log('👤 Nombre:', user.displayName);
      console.log('📧 Email:', user.email);
      
      // Ocultar botón de login
      if (loginBtn) {
        console.log('🔧 Ocultando botón de login');
        loginBtn.style.display = 'none';
      }
      
      // Mostrar perfil de usuario
      if (userProfile) {
        console.log('🔧 Mostrando perfil de usuario');
        userProfile.style.display = 'flex';
      }
      
      // Mostrar navegación de contenido
      if (contentNav) {
        console.log('🔧 Mostrando navegación de contenido');
        contentNav.style.display = 'block';
      }
      
      // Actualizar nombre en header
      if (userName) {
        console.log('🔧 Actualizando nombre en header');
        userName.textContent = user.displayName || 'Usuario';
      }
      
      // Actualizar avatar en header
      if (userAvatar) {
        console.log('🔧 Actualizando avatar en header');
        const avatarUrl = user.photoURL || this.generateAvatarUrl(user.displayName);
        userAvatar.src = avatarUrl;
        userAvatar.alt = user.displayName || 'Avatar';
        
        userAvatar.onerror = () => {
          userAvatar.src = AuthManager.generateAvatarUrl(user.displayName || 'Usuario');
        };
      }
      
      // Actualizar perfil
      if (profileName) {
        console.log('🔧 Actualizando nombre en perfil');
        profileName.textContent = user.displayName || 'Usuario';
      }
      
      if (profileEmail) {
        console.log('🔧 Actualizando email en perfil');
        profileEmail.textContent = user.email || '';
      }
      
      if (profileAvatar) {
        console.log('🔧 Actualizando avatar en perfil');
        const avatarUrl = user.photoURL || this.generateAvatarUrl(user.displayName);
        profileAvatar.src = avatarUrl;
        profileAvatar.alt = user.displayName || 'Avatar';
        
        profileAvatar.onerror = () => {
          profileAvatar.src = AuthManager.generateAvatarUrl(user.displayName || 'Usuario');
        };
      }
      
      // Notificar a otros sistemas
      if (window.toggleSectionsForAuth) {
        console.log('🔧 Notificando a toggleSectionsForAuth');
        window.toggleSectionsForAuth(true);
      }
      
      if (window.updateAuthStatus) {
        console.log('🔧 Actualizando estado en footer');
        window.updateAuthStatus(`Conectado como ${user.displayName}`);
      }
      
      AuthUtils.logWithIcon('UI de usuario logueado actualizada completamente', 'success');
      
    } else {
      AuthUtils.logWithIcon('MOSTRANDO UI DE USUARIO NO LOGUEADO', 'info');
      
      // Mostrar botón de login
      if (loginBtn) {
        console.log('🔧 Mostrando botón de login');
        loginBtn.style.display = 'flex';
        this.updateLoginButton('Iniciar Sesión', false);
      }
      
      // Ocultar perfil de usuario
      if (userProfile) {
        console.log('🔧 Ocultando perfil de usuario');
        userProfile.style.display = 'none';
      }
      
      // Ocultar navegación de contenido
      if (contentNav) {
        console.log('🔧 Ocultando navegación de contenido');
        contentNav.style.display = 'none';
      }
      
      // Limpiar perfil
      if (profileName) profileName.textContent = 'Nombre del Usuario';
      if (profileEmail) profileEmail.textContent = 'email@ejemplo.com';
      if (profileAvatar) {
        profileAvatar.src = this.generateAvatarUrl('Usuario');
        profileAvatar.alt = 'Avatar por defecto';
      }
      
      // Notificar a otros sistemas
      if (window.toggleSectionsForAuth) {
        console.log('🔧 Notificando a toggleSectionsForAuth - usuario no logueado');
        window.toggleSectionsForAuth(false);
      }
      
      if (window.updateAuthStatus) {
        console.log('🔧 Actualizando estado en footer - sin autenticar');
        window.updateAuthStatus('Sin autenticar');
      }
      
      AuthUtils.logWithIcon('UI de usuario no logueado actualizada completamente', 'success');
    }
  }
  
  static updateLoginButton(text, disabled) {
    const loginBtn = getLoginBtn();
    if (!loginBtn) return;
    
    console.log('🔧 Actualizando botón login:', text, disabled ? 'DISABLED' : 'ENABLED');
    
    loginBtn.disabled = disabled;
    
    const icon = disabled ? SVGIcons.loading : SVGIcons.login;
    const iconClass = disabled ? 'animate-spin' : '';
    
    if (disabled) {
      loginBtn.innerHTML = `
        <div class="btn-icon ${iconClass}" style="color: var(--neon-cyan);">
          ${icon}
        </div>
        <span class="btn-text">${text}</span>
      `;
      loginBtn.style.opacity = '0.7';
    } else {
      loginBtn.innerHTML = `
        <div class="btn-icon" style="color: var(--neon-cyan);">
          ${icon}
        </div>
        <span class="btn-text">${text}</span>
      `;
      loginBtn.style.opacity = '1';
    }
  }
  
  static generateAvatarUrl(name) {
    const encodedName = encodeURIComponent(name || 'Usuario');
    // Usar colores del tema (neon cyan y pink)
    return `https://ui-avatars.com/api/?name=${encodedName}&background=00f5ff&color=fff&size=120&bold=true`;
  }
  
  static setupLoginButton() {
    const loginBtn = getLoginBtn();
    if (!loginBtn) {
      console.warn('⚠️ Botón de login no encontrado');
      return;
    }
    
    AuthUtils.logWithIcon('CONFIGURANDO BOTÓN LOGIN', 'loading');
    
    // Remover listeners previos
    const newBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newBtn, loginBtn);
    
    newBtn.disabled = false;
    newBtn.innerHTML = `
      <div class="btn-icon" style="color: var(--neon-cyan);">
        ${SVGIcons.login}
      </div>
      <span class="btn-text">Iniciar Sesión</span>
    `;
    newBtn.style.opacity = '1';
    
    // Nuevo listener
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      AuthUtils.logWithIcon('CLICK EN LOGIN', 'user');
      
      if (loginInProgress) {
        AuthUtils.showToast('Login en progreso...', 'warning');
        return;
      }
      
      AuthUtils.clearRedirectState();
      
      newBtn.disabled = true;
      newBtn.innerHTML = `
        <div class="btn-icon animate-spin" style="color: var(--neon-cyan);">
          ${SVGIcons.loading}
        </div>
        <span class="btn-text">Conectando...</span>
      `;
      
      AuthManager.signInWithGoogle().catch((error) => {
        console.error('❌ Error en click de login:', error);
        AuthManager.handleLoginError(error);
      });
    });
    
    AuthUtils.logWithIcon('Botón login configurado', 'success');
  }
  
  // Nueva función: forzar actualización UI
  static forceUpdateUI() {
    AuthUtils.logWithIcon('FORZANDO ACTUALIZACIÓN UI', 'loading');
    
    // Verificar si hay usuario actual en Firebase
    const firebaseUser = auth.currentUser;
    console.log('🔧 Usuario en Firebase:', firebaseUser ? firebaseUser.displayName : 'null');
    
    if (firebaseUser) {
      this.updateUI(firebaseUser);
    } else {
      this.updateUI(null);
    }
  }
}

// Funciones para exportar
function getCurrentUser() {
  return currentUser;
}

function isUserLoggedIn() {
  return currentUser !== null;
}

function getStoredUserData() {
  return AuthUtils.getStoredUser();
}

// Inicialización mejorada
async function initializeApp() {
  try {    
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }
    
    AuthUtils.clearRedirectState();
    
    await AuthManager.initializePersistence();
    AuthManager.setupLoginButton();
    await AuthManager.checkRedirectResult();
    
    // Observer mejorado con forzado de actualización
    onAuthStateChanged(auth, (user) => {
      AuthUtils.logWithIcon('AUTH STATE CHANGE', 'info');
      console.log('👤 Usuario Firebase:', user ? `${user.displayName} (${user.email})` : 'null');
      console.log('🕒 Timestamp:', new Date().toISOString());
      
      if (!isAuthInitialized) {
        isAuthInitialized = true;
        AuthUtils.logWithIcon('Autenticación inicializada por primera vez', 'success');
        
        if (user) {
          AuthUtils.logWithIcon('Usuario ya autenticado al cargar', 'user');
          AuthUtils.saveUserToStorage(user);
          AuthUtils.clearRedirectState();
        }
      }
      
      // Actualizar UI inmediatamente
      AuthManager.updateUI(user);
      
      // Cargar dashboard si hay usuario
      if (user && (!currentUser || currentUser.uid !== user.uid)) {
        AuthUtils.logWithIcon('Cargando datos del usuario...', 'loading');
        
        if (window.DashboardManager) {
          setTimeout(() => {
            window.DashboardManager.loadDashboard();
          }, 1000);
        }
      }
    });
    
    // Verificación adicional cada 2 segundos los primeros 10 segundos
    let uiChecks = 0;
    const maxUIChecks = 5;
    
    const uiCheckInterval = setInterval(() => {
      uiChecks++;
      
      console.log(`🔧 Verificación UI #${uiChecks}`);
      
      const firebaseUser = auth.currentUser;
      const loginBtn = getLoginBtn();
      const userProfile = getUserProfile();
      
      // Si hay usuario pero el botón aún está visible, forzar actualización
      if (firebaseUser && loginBtn && loginBtn.style.display !== 'none') {
        AuthUtils.logWithIcon('DETECTADO DESAJUSTE UI - FORZANDO ACTUALIZACIÓN', 'warning');
        AuthManager.forceUpdateUI();
      }
      
      // Si no hay usuario pero el perfil está visible, forzar actualización
      if (!firebaseUser && userProfile && userProfile.style.display !== 'none') {
        AuthUtils.logWithIcon('DETECTADO DESAJUSTE UI INVERSO - FORZANDO ACTUALIZACIÓN', 'warning');
        AuthManager.forceUpdateUI();
      }
      
      if (uiChecks >= maxUIChecks) {
        AuthUtils.logWithIcon('Verificaciones UI completadas', 'success');
        clearInterval(uiCheckInterval);
      }
    }, 2000);
    
    // Verificación periódica cada 5 segundos para redirect
    let redirectChecks = 0;
    const maxChecks = 24;
    
    const checkInterval = setInterval(() => {
      redirectChecks++;
      
      const wasRedirecting = localStorage.getItem('estudiaFacil_redirecting');
      if (wasRedirecting === 'true' && !currentUser) {
        console.log(`🔍 Verificación redirect ${redirectChecks}/${maxChecks}`);
        AuthManager.checkRedirectResult();
      } else {
        clearInterval(checkInterval);
      }
      
      if (redirectChecks >= maxChecks) {
        AuthUtils.logWithIcon('Timeout final de redirect', 'warning');
        AuthUtils.clearRedirectState();
        AuthManager.updateLoginButton('Iniciar Sesión', false);
        clearInterval(checkInterval);
      }
    }, 5000);
    
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        AuthUtils.logWithIcon('Loading screen ocultado', 'success');
      }
    }, 2500);
    
    setTimeout(() => {
      if (!currentUser) {
        AuthUtils.showToast('¡Bienvenido a EstudiaFácil v3.0!', 'info');
      }
    }, 4000);
    
    AuthUtils.logWithIcon('EstudiaFácil v3.0 INICIALIZADO', 'rocket');
    
  } catch (error) {
    AuthUtils.logWithIcon(`ERROR CRÍTICO: ${error.message}`, 'error');
    AuthUtils.showToast('Error crítico. Recarga la página.', 'error');
    
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }
}

// Configurar logout buttons con referencia dinámica MEJORADO
function setupLogoutButtons() {
  // Logout button en navbar (si existe)
  const logoutBtn = getLogoutBtn();
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      AuthUtils.logWithIcon('Click en logout navbar', 'logout');
      AuthManager.logoutFromNavbar();
    });
  }
  
  // Logout button en perfil - CON REDIRECCIÓN AL INICIO
  const profileLogoutBtn = getProfileLogoutBtn();
  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      AuthUtils.logWithIcon('Click en logout perfil - redirigiendo al inicio', 'logout');
      AuthManager.logoutFromProfile();
    });
  }
  
  // También manejarlo desde modules.js si existe
  const profileLogoutAlt = document.getElementById('profileLogoutBtn');
  if (profileLogoutAlt && profileLogoutAlt !== profileLogoutBtn) {
    profileLogoutAlt.addEventListener('click', (e) => {
      e.preventDefault();
      AuthUtils.logWithIcon('Click en logout perfil alternativo', 'logout');
      AuthManager.logoutFromProfile();
    });
  }
  
  AuthUtils.logWithIcon('Logout buttons configurados', 'success');
}

// CSS adicional para animaciones de iconos
const additionalCSS = `
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
  }
  
  .toast-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .toast-message {
    flex: 1;
    font-weight: 600;
  }
  
  @keyframes slideOut {
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;

// Inyectar CSS adicional
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupLogoutButtons();
  });
} else {
  initializeApp();
  setupLogoutButtons();
}

// Exportaciones simples
export { 
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
  isUserLoggedIn,
  getStoredUserData
};

// Exportación global ACTUALIZADA
window.EstudiaFacilAuth = {
  auth: auth,
  db: db,
  collection: collection,
  addDoc: addDoc,
  getDocs: getDocs,
  deleteDoc: deleteDoc,
  doc: doc,
  orderBy: orderBy,
  query: query,
  where: where,
  serverTimestamp: serverTimestamp,
  updateDoc: updateDoc,
  increment: increment,
  setDoc: setDoc,
  getDoc: getDoc,
  getCurrentUser: getCurrentUser,
  isUserLoggedIn: isUserLoggedIn,
  AuthManager: AuthManager,
  AuthUtils: AuthUtils,
  login: () => AuthManager.signInWithGoogle(),
  logout: () => AuthManager.signOutUser(),
  logoutFromProfile: () => AuthManager.logoutFromProfile(),
  logoutFromNavbar: () => AuthManager.logoutFromNavbar(),
  showToast: (msg, type) => AuthUtils.showToast(msg, type),
  forceUpdateUI: () => AuthManager.forceUpdateUI()
};

// Debug utilities mejoradas para localhost
if (AuthUtils.isLocalhost()) {
  window.EstudiaFacilDebug = {
    AuthManager: AuthManager,
    AuthUtils: AuthUtils,
    user: getCurrentUser,
    firebaseUser: () => auth.currentUser,
    login: () => AuthManager.signInWithGoogle(),
    logout: () => AuthManager.signOutUser(),
    logoutFromProfile: () => AuthManager.logoutFromProfile(),
    clearRedirectState: () => AuthUtils.clearRedirectState(),
    clearStorage: () => AuthUtils.clearUserStorage(),
    forceUpdateUI: () => AuthManager.forceUpdateUI(),
    
    status: () => ({
      currentUser: currentUser ? currentUser.displayName : 'none',
      firebaseUser: auth.currentUser ? auth.currentUser.displayName : 'none',
      isAuthInitialized: isAuthInitialized,
      loginInProgress: loginInProgress,
      redirecting: localStorage.getItem('estudiaFacil_redirecting') === 'true',
      timestamp: new Date().toISOString(),
      loginBtnVisible: getLoginBtn() ? getLoginBtn().style.display !== 'none' : 'not found',
      userProfileVisible: getUserProfile() ? getUserProfile().style.display !== 'none' : 'not found'
    }),
    
    emergencyReset: () => {
      AuthUtils.logWithIcon('RESET DE EMERGENCIA', 'warning');
      
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
        redirectTimeout = null;
      }
      
      AuthUtils.clearRedirectState();
      AuthUtils.clearUserStorage();
      loginInProgress = false;
      currentUser = null;
      
      AuthManager.updateLoginButton('Iniciar Sesión', false);
      AuthManager.updateUI(null);
      
      setTimeout(() => {
        AuthManager.setupLoginButton();
      }, 500);
      
      AuthUtils.logWithIcon('Reset completado', 'success');
      AuthUtils.showToast('Reset completado', 'info');
    },
    
    // Nueva: Función para diagnosticar UI
    diagnoseUI: () => {
      const firebaseUser = auth.currentUser;
      const loginBtn = getLoginBtn();
      const userProfile = getUserProfile();
      
      console.log('=== DIAGNÓSTICO UI ===');
      console.log('Firebase User:', firebaseUser ? firebaseUser.displayName : 'null');
      console.log('Current User:', currentUser ? currentUser.displayName : 'null');
      console.log('Login Button Display:', loginBtn ? loginBtn.style.display : 'not found');
      console.log('User Profile Display:', userProfile ? userProfile.style.display : 'not found');
      console.log('Login In Progress:', loginInProgress);
      console.log('Auth Initialized:', isAuthInitialized);
      console.log('===================');
      
      if (firebaseUser && (!loginBtn || loginBtn.style.display !== 'none')) {
        AuthUtils.logWithIcon('PROBLEMA DETECTADO: Usuario logueado pero botón login visible', 'warning');
        AuthUtils.logWithIcon('Ejecutando forceUpdateUI...', 'loading');
        AuthManager.forceUpdateUI();
      }
    },
    
    // Nueva: Test logout desde perfil
    testProfileLogout: () => {
      AuthUtils.logWithIcon('PROBANDO LOGOUT DESDE PERFIL', 'logout');
      AuthManager.logoutFromProfile();
    }
  };
  
  AuthUtils.logWithIcon('DEBUG MEJORADO DISPONIBLE', 'rocket');
  console.log('🔧 EstudiaFacilDebug.status() - Estado completo');
  console.log('🔧 EstudiaFacilDebug.diagnoseUI() - Diagnosticar UI');
  console.log('🔧 EstudiaFacilDebug.forceUpdateUI() - Forzar actualización UI');
  console.log('🔧 EstudiaFacilDebug.testProfileLogout() - Probar logout desde perfil');
  console.log('🔧 EstudiaFacilDebug.emergencyReset() - Reset total');
}

AuthUtils.logWithIcon('EstudiaFácil v3.0 - LISTO', 'rocket');

/* ===== FIN DEL ARCHIVO MAIN.JS COMPLETO ===== */