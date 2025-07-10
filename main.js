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

// Referencias DOM dinámicas
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

// Utilidades de autenticación
class AuthUtils {
  static showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Forzar estilos oscuros
    const colorMap = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    
    toast.style.backgroundColor = colorMap[type] || '#1e293b';
    toast.style.color = '#ffffff';
    toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    
    toast.innerHTML = `
      <div class="toast-icon"></div>
      <span class="toast-message" style="color: #ffffff;">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
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
      return true;
    } catch (error) {
      console.error('Error guardando usuario:', error);
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
        // Silenciar errores
      }
    });
  }
  
  static hasStoredSession() {
    return localStorage.getItem('estudiaFacil_logged') === 'true';
  }
  
  static getStoredUser() {
    try {
      const userData = localStorage.getItem('estudiaFacil_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
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
  }
  
  static isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
}

// Gestor de autenticación
class AuthManager {
  static async initializePersistence() {
    try {
      await setPersistence(auth, browserLocalPersistence);
      return true;
    } catch (error) {
      console.error('Error configurando persistencia:', error);
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
      AuthUtils.clearRedirectState();
      
      const persistenceOk = await this.initializePersistence();
      if (!persistenceOk) {
        throw new Error('No se pudo configurar la persistencia');
      }
      
      this.updateLoginButton('Conectando...', true);
      AuthUtils.showToast('Conectando con Google...', 'info');
      
      if (AuthUtils.isLocalhost()) {
        await this.loginWithPopup();
      } else {
        await this.loginWithRedirect();
      }
      
    } catch (error) {
      console.error('Error en login:', error);
      this.handleLoginError(error);
    }
  }
  
  static async loginWithPopup() {
    try {
      const result = await signInWithPopup(auth, provider);
      
      AuthUtils.clearRedirectState();
      AuthUtils.saveUserToStorage(result.user);
      
      this.updateUI(result.user);
      
      AuthUtils.showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
      
      await this.saveUserToFirestore(result.user);
      
      return result.user;
      
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user') {
        
        AuthUtils.showToast('Popup bloqueado, probando redirect...', 'warning');
        await this.loginWithRedirect();
      } else {
        throw error;
      }
    }
  }
  
  static async loginWithRedirect() {
    try {
      const redirectTime = Date.now();
      localStorage.setItem('estudiaFacil_redirecting', 'true');
      localStorage.setItem('estudiaFacil_redirectTime', redirectTime.toString());
      
      this.updateLoginButton('Redirigiendo...', true);
      AuthUtils.showToast('Redirigiendo a Google...', 'info');
      
      redirectTimeout = setTimeout(() => {
        AuthManager.handleRedirectTimeout();
      }, 30000);
      
      setTimeout(async () => {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error('Error en redirect:', redirectError);
          AuthManager.handleLoginError(redirectError);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error en redirect setup:', error);
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
    } catch (error) {
      console.error('No se pudo guardar en Firestore:', error);
    }
  }
  
  static handleRedirectTimeout() {
    AuthUtils.clearRedirectState();
    AuthUtils.showToast('Timeout. Reintentando...', 'warning');
    
    this.updateLoginButton('Iniciar Sesión', false);
    
    setTimeout(() => {
      if (!currentUser && !loginInProgress) {
        AuthManager.signInWithGoogle();
      }
    }, 3000);
  }
  
  static handleLoginError(error) {
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
      const result = await getRedirectResult(auth);
      
      if (result) {
        AuthUtils.clearRedirectState();
        AuthUtils.saveUserToStorage(result.user);
        
        this.updateUI(result.user);
        
        AuthUtils.showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
        
        await this.saveUserToFirestore(result.user);
        
        return result.user;
        
      } else {
        const wasRedirecting = localStorage.getItem('estudiaFacil_redirecting');
        if (wasRedirecting === 'true') {
          const redirectTime = parseInt(localStorage.getItem('estudiaFacil_redirectTime')) || 0;
          const elapsed = Date.now() - redirectTime;
          
          if (elapsed > 45000) {
            this.handleRedirectTimeout();
          }
        }
      }
    } catch (error) {
      console.error('Error en checkRedirectResult:', error);
      
      AuthUtils.clearRedirectState();
      
      if (error.code !== 'auth/null-user') {
        AuthUtils.showToast('Error al procesar autenticación', 'error');
        this.updateLoginButton('Iniciar Sesión', false);
      }
    }
    
    return null;
  }
  
  // Logout con redirección al inicio
  static async signOutUser(redirectToHome = false) {
    try {
      AuthUtils.showToast('Cerrando sesión...', 'info');
      
      AuthUtils.clearRedirectState();
      
      await signOut(auth);
      
      AuthUtils.clearUserStorage();
      currentUser = null;
      
      AuthUtils.showToast('Sesión cerrada exitosamente', 'success');
      
      this.updateUI(null);
      
      // Redirección al inicio si se solicita
      if (redirectToHome) {
        setTimeout(() => {
          if (window.navigateToSection) {
            window.navigateToSection('dashboard');
          }
          
          const welcomeHero = document.getElementById('welcomeHero');
          const dashboardContent = document.getElementById('dashboardContent');
          
          if (welcomeHero) {
            welcomeHero.style.display = 'block';
          }
          
          if (dashboardContent) {
            dashboardContent.style.display = 'none';
          }
          
          setTimeout(() => {
            AuthUtils.showToast('¡Inicia sesión para acceder a todas las funciones!', 'info');
          }, 1000);
          
        }, 500);
      }
      
      setTimeout(() => {
        AuthManager.setupLoginButton();
      }, 500);
      
    } catch (error) {
      console.error('Error en logout:', error);
      AuthUtils.showToast('Error al cerrar sesión', 'error');
    }
  }
  
  // Logout desde perfil con redirección
  static async logoutFromProfile() {
    await this.signOutUser(true);
  }
  
  // Logout desde navbar sin redirección
  static async logoutFromNavbar() {
    await this.signOutUser(false);
  }

  static updateUI(user) {
    currentUser = user;
    
    const loginBtn = getLoginBtn();
    const userProfile = getUserProfile();
    const contentNav = getContentNav();
    const userName = getUserName();
    const userAvatar = getUserAvatar();
    const profileName = getProfileName();
    const profileEmail = getProfileEmail();
    const profileAvatar = getProfileAvatar();
    
    if (user) {
      // Ocultar botón de login
      if (loginBtn) {
        loginBtn.style.display = 'none';
      }
      
      // Mostrar perfil de usuario
      if (userProfile) {
        userProfile.style.display = 'flex';
      }
      
      // Mostrar navegación de contenido
      if (contentNav) {
        contentNav.style.display = 'block';
      }
      
      // Actualizar nombre en header
      if (userName) {
        userName.textContent = user.displayName || 'Usuario';
      }
      
      // Actualizar avatar en header
      if (userAvatar) {
        const avatarUrl = user.photoURL || this.generateAvatarUrl(user.displayName);
        userAvatar.src = avatarUrl;
        userAvatar.alt = user.displayName || 'Avatar';
        
        userAvatar.onerror = () => {
          userAvatar.src = AuthManager.generateAvatarUrl(user.displayName || 'Usuario');
        };
      }
      
      // Actualizar perfil
      if (profileName) {
        profileName.textContent = user.displayName || 'Usuario';
      }
      
      if (profileEmail) {
        profileEmail.textContent = user.email || '';
      }
      
      if (profileAvatar) {
        const avatarUrl = user.photoURL || this.generateAvatarUrl(user.displayName);
        profileAvatar.src = avatarUrl;
        profileAvatar.alt = user.displayName || 'Avatar';
        
        profileAvatar.onerror = () => {
          profileAvatar.src = AuthManager.generateAvatarUrl(user.displayName || 'Usuario');
        };
      }
      
      // Notificar a otros sistemas
      if (window.toggleSectionsForAuth) {
        window.toggleSectionsForAuth(true);
      }
      
      if (window.updateAuthStatus) {
        window.updateAuthStatus(`Conectado como ${user.displayName}`);
      }
      
    } else {
      // Mostrar botón de login
      if (loginBtn) {
        loginBtn.style.display = 'flex';
        this.updateLoginButton('Iniciar Sesión', false);
      }
      
      // Ocultar perfil de usuario
      if (userProfile) {
        userProfile.style.display = 'none';
      }
      
      // Ocultar navegación de contenido
      if (contentNav) {
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
        window.toggleSectionsForAuth(false);
      }
      
      if (window.updateAuthStatus) {
        window.updateAuthStatus('Sin autenticar');
      }
    }
  }
  
  static updateLoginButton(text, disabled) {
    const loginBtn = getLoginBtn();
    if (!loginBtn) return;
    
    loginBtn.disabled = disabled;
    
    if (disabled) {
      loginBtn.innerHTML = `
        <div class="btn-icon animate-spin">⏳</div>
        <span class="btn-text">${text}</span>
      `;
      loginBtn.style.opacity = '0.7';
    } else {
      loginBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="btn-text">${text}</span>
      `;
      loginBtn.style.opacity = '1';
    }
  }
  
  static generateAvatarUrl(name) {
    const encodedName = encodeURIComponent(name || 'Usuario');
    return `https://ui-avatars.com/api/?name=${encodedName}&background=00f5ff&color=fff&size=120&bold=true`;
  }
  
  static setupLoginButton() {
    const loginBtn = getLoginBtn();
    if (!loginBtn) {
      return;
    }
    
    loginBtn.disabled = false;
    loginBtn.style.opacity = '1';
    
    window.doLogin = async () => {
      if (loginInProgress) {
        AuthUtils.showToast('Login en progreso...', 'warning');
        return;
      }
      
      AuthUtils.clearRedirectState();
      
      try {
        await AuthManager.signInWithGoogle();
      } catch (error) {
        console.error('Error en login global:', error);
        AuthManager.handleLoginError(error);
      }
    };
  }
  
  static forceUpdateUI() {
    const firebaseUser = auth.currentUser;
    
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

// Monitor de conexión Firestore
function monitorearConexionFirestore() {
  let timeoutConexion = setTimeout(() => {
    console.warn('⚠️ Timeout de conexión Firestore');
    if (window.showToast) {
      window.showToast('Problemas de conectividad. Verificando conexión...', 'warning');
    }
  }, 8000);
  
  // Limpiar timeout cuando se establezca conexión
  window.conexionEstablecida = () => {
    if (timeoutConexion) {
      clearTimeout(timeoutConexion);
      timeoutConexion = null;
      console.log('✅ Conexión Firestore establecida');
    }
  };
}

// Inicialización de la aplicación
async function initializeApp() {
  try {    
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }
    
    AuthUtils.clearRedirectState();
    
    // Agregar monitor de conexión
    monitorearConexionFirestore();
    
    await AuthManager.initializePersistence();
    AuthManager.setupLoginButton();
    await AuthManager.checkRedirectResult();
    
    // Observer de autenticación
    onAuthStateChanged(auth, (user) => {
      if (!isAuthInitialized) {
        isAuthInitialized = true;
        
        if (user) {
          AuthUtils.saveUserToStorage(user);
          AuthUtils.clearRedirectState();
        }
      }
      
      AuthManager.updateUI(user);
      
      if (user && (!currentUser || currentUser.uid !== user.uid)) {
        if (window.DashboardManager) {
          setTimeout(() => {
            window.DashboardManager.loadDashboard();
          }, 1000);
        }
      }
    });
    
    // Verificación UI cada 2 segundos
    let uiChecks = 0;
    const maxUIChecks = 5;
    
    const uiCheckInterval = setInterval(() => {
      uiChecks++;
      
      const firebaseUser = auth.currentUser;
      const loginBtn = getLoginBtn();
      const userProfile = getUserProfile();
      
      if (firebaseUser && loginBtn && loginBtn.style.display !== 'none') {
        AuthManager.forceUpdateUI();
      }
      
      if (!firebaseUser && userProfile && userProfile.style.display !== 'none') {
        AuthManager.forceUpdateUI();
      }
      
      if (uiChecks >= maxUIChecks) {
        clearInterval(uiCheckInterval);
      }
    }, 2000);
    
    // Verificación de redirect cada 5 segundos
    let redirectChecks = 0;
    const maxChecks = 24;
    
    const checkInterval = setInterval(() => {
      redirectChecks++;
      
      const wasRedirecting = localStorage.getItem('estudiaFacil_redirecting');
      if (wasRedirecting === 'true' && !currentUser) {
        AuthManager.checkRedirectResult();
      } else {
        clearInterval(checkInterval);
      }
      
      if (redirectChecks >= maxChecks) {
        AuthUtils.clearRedirectState();
        AuthManager.updateLoginButton('Iniciar Sesión', false);
        clearInterval(checkInterval);
      }
    }, 5000);
    
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
    }, 2500);
    
    setTimeout(() => {
      if (!currentUser) {
        AuthUtils.showToast('¡Bienvenido a EstudiaFácil!', 'info');
      }
    }, 4000);
    
  } catch (error) {
    console.error('Error crítico:', error);
    AuthUtils.showToast('Error crítico. Recarga la página.', 'error');
    
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }
}

// Configurar botones de logout
function setupLogoutButtons() {
  const logoutBtn = getLogoutBtn();
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      AuthManager.logoutFromNavbar();
    });
  }
  
  const profileLogoutBtn = getProfileLogoutBtn();
  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      AuthManager.logoutFromProfile();
    });
  }
  
  const profileLogoutAlt = document.getElementById('profileLogoutBtn');
  if (profileLogoutAlt && profileLogoutAlt !== profileLogoutBtn) {
    profileLogoutAlt.addEventListener('click', (e) => {
      e.preventDefault();
      AuthManager.logoutFromProfile();
    });
  }
}

// CSS adicional para animaciones y vistas previas mejoradas
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
    gap: 0.75rem;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }
  
  .toast.show {
    transform: translateX(0);
    opacity: 1;
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
  
  .toast-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0 0.5rem;
  }
  
  /* Estilos mejorados para cards de recursos */
  .resource-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    color: white;
  }
  
  .resource-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
  
  .resource-preview-container {
    width: 100%;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    margin: 1rem 0;
    position: relative;
  }
  
  .resource-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
    transition: transform 0.3s ease;
  }
  
  .resource-image:hover {
    transform: scale(1.05);
  }
  
  .file-link-preview {
    background: rgba(255, 255, 255, 0.1);
    border: 2px dashed rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    min-height: 120px;
    justify-content: center;
  }
  
  .file-icon {
    font-size: 3rem;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .file-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .file-name {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
    font-size: 1.1rem;
  }
  
  .file-view-link {
    color: #00f5ff;
    text-decoration: none;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border: 1px solid #00f5ff;
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .file-view-link:hover {
    background: #00f5ff;
    color: #1a1a2e;
    text-decoration: none;
  }
  
  .file-placeholder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1rem;
    min-height: 120px;
    text-align: center;
  }
  
  /* Imagen con efecto de carga */
  .resource-image[data-loading="true"] {
    opacity: 0.5;
    filter: blur(2px);
  }
  
  .resource-image[data-loading="false"] {
    opacity: 1;
    filter: none;
  }
  
  /* Loader para imágenes */
  .image-loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(255, 255, 255, 0.7);
    font-size: 2rem;
    z-index: 1;
  }
  
  @keyframes imageLoad {
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  .resource-image.loaded {
    animation: imageLoad 0.3s ease-in-out;
  }
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// ✅ FUNCIÓN CORREGIDA PARA OBTENER URL DE UPLOADCARE
async function getUploadcareUrl() {
  const archivoInput = document.getElementById('archivo');
  
  if (!archivoInput) {
    throw new Error('Campo de archivo no encontrado');
  }
  
  let url = archivoInput.value?.trim();
  
  if (!url) {
    throw new Error('Debes seleccionar un archivo');
  }
  
  // Si es una URL completa, usarla directamente
  if (url.startsWith('http')) {
    console.log('✅ URL completa detectada:', url);
    return url;
  }
  
  // Si parece ser un ID de Uploadcare, construir la URL
  if (url.match(/^[a-zA-Z0-9-_]+$/)) {
    const constructedUrl = `https://ucarecdn.com/${url}/`;
    console.log('🔧 URL construida desde ID:', constructedUrl);
    return constructedUrl;
  }
  
  // Si no se puede determinar el formato, intentar usar como está
  console.log('⚠️ Formato de archivo no reconocido, usando como está:', url);
  return url;
}

// ✅ EVENT LISTENER DEL FORMULARIO CORREGIDO
document.addEventListener('DOMContentLoaded', function() {
  const uploadForm = document.getElementById('uploadForm');
  const uploadModal = document.getElementById('uploadModal');
  
  if (uploadForm) {
    uploadForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = uploadForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      try {
        // Mostrar loading
        submitBtn.innerHTML = '<span class="btn-text">Guardando...</span>';
        submitBtn.disabled = true;
        
        // Verificar autenticación
        const currentUser = window.getCurrentUser();
        if (!currentUser) {
          throw new Error('Debes iniciar sesión para subir recursos');
        }
        
        // Obtener URL del archivo
        let archivoUrl;
        try {
          archivoUrl = await getUploadcareUrl();
        } catch (error) {
          // Fallback: intentar obtener directamente del input
          archivoUrl = document.getElementById('archivo').value.trim();
          if (!archivoUrl) {
            throw new Error('Debes seleccionar un archivo');
          }
        }
        
        // Validar otros campos requeridos
        const titulo = document.getElementById('titulo').value.trim();
        if (!titulo) {
          throw new Error('El título es obligatorio');
        }
        
        // Obtener datos del formulario
        const formData = {
          titulo: titulo,
          categoria: document.getElementById('categoria').value,
          materia: document.getElementById('materia').value.trim(),
          nivel: document.getElementById('nivel').value,
          descripcion: document.getElementById('descripcion').value.trim(),
          archivo: archivoUrl,
          autorId: currentUser.uid,
          autorNombre: currentUser.displayName,
          autorEmail: currentUser.email,
          fechaCreacion: serverTimestamp(),
          descargas: 0
        };
        
        console.log('📋 Datos del formulario:', formData);
        
        // Guardar en Firestore con protección de timeout
        const savePromise = addDoc(collection(db, 'recursos'), formData);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar')), 15000)
        );
        
        await Promise.race([savePromise, timeoutPromise]);
        
        // ✅ ÉXITO
        showToast('¡Recurso guardado exitosamente! 🎉', 'success');
        
        // Cerrar modal y limpiar
        if (uploadModal) uploadModal.style.display = 'none';
        uploadForm.reset();
        
        // Recargar lista de recursos
        if (window.cargarRecursos) {
          setTimeout(window.cargarRecursos, 500);
        }
        
      } catch (error) {
        console.error('❌ Error al guardar recurso:', error);
        
        // Mostrar error específico
        let errorMessage = 'Error al guardar recurso';
        
        if (error.code) {
          const firebaseErrors = {
            'permission-denied': 'Sin permisos para guardar. Verifica tu sesión.',
            'unavailable': 'Servicio no disponible. Intenta más tarde.',
            'deadline-exceeded': 'Tiempo de espera agotado.',
            'resource-exhausted': 'Límite de operaciones alcanzado.'
          };
          errorMessage = firebaseErrors[error.code] || `Error Firebase (${error.code})`;
        } else {
          errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
        
      } finally {
        // Restaurar botón siempre
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
});

// Función para mostrar toasts mejorada
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto-remove después de 4 segundos
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
  
  // Mostrar con animación
  setTimeout(() => toast.classList.add('show'), 100);
}

function getToastIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 350px;
  `;
  document.body.appendChild(container);
  return container;
}

// ✅ FUNCIÓN CARGAR RECURSOS MEJORADA CON TIMEOUT
async function cargarRecursos() {
  try {
    console.log('📚 Cargando recursos...');
    
    const listaRecursos = document.getElementById('listaRecursos');
    const emptyState = document.getElementById('emptyState');
    
    if (!listaRecursos) {
      console.error('❌ No se encontró el contenedor de recursos');
      return;
    }
    
    // Mostrar loading
    listaRecursos.innerHTML = `
      <div class="loading-resources">
        <div class="spinner"></div>
        <p>Cargando recursos...</p>
      </div>
    `;
    
    // Verificar servicios de Firebase
    if (!db || !collection || !getDocs) {
      throw new Error('Servicios de Firebase no disponibles');
    }
    
    // Obtener recursos con timeout
    const recursosRef = collection(db, 'recursos');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Tiempo de espera agotado al cargar recursos')), 10000)
    );
    
    const querySnapshot = await Promise.race([
      getDocs(recursosRef),
      timeoutPromise
    ]);
    
    const recursos = [];
    querySnapshot.forEach((doc) => {
      recursos.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('✅ Recursos cargados:', recursos.length);
    
    // Notificar conexión establecida
    if (window.conexionEstablecida) {
      window.conexionEstablecida();
    }
    
    // Mostrar recursos o estado vacío
    if (recursos.length === 0) {
      listaRecursos.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      
      // Ordenar por fecha (más recientes primero)
      recursos.sort((a, b) => {
        const fechaA = a.fechaCreacion?.toDate?.() || new Date(a.fechaCreacion);
        const fechaB = b.fechaCreacion?.toDate?.() || new Date(b.fechaCreacion);
        return fechaB - fechaA;
      });
      
      // Renderizar recursos
      listaRecursos.innerHTML = recursos.map(recurso => createResourceCard(recurso)).join('');
    }
    
  } catch (error) {
    console.error('❌ Error al cargar recursos:', error);
    
    // Manejo de errores mejorado
    let errorMessage = 'Error al cargar recursos';
    
    if (error.code) {
      const errorMessages = {
        'unavailable': 'Servicio no disponible. Verifica tu conexión.',
        'permission-denied': 'Sin permisos para acceder a los datos.',
        'deadline-exceeded': 'Tiempo de espera agotado.',
        'failed-precondition': 'Error de configuración de Firestore.'
      };
      errorMessage = errorMessages[error.code] || `Error Firestore (${error.code}): ${error.message}`;
    } else if (error.message.includes('Tiempo de espera')) {
      errorMessage = 'La carga está tardando más de lo normal. Reintentando...';
    }
    
    const listaRecursos = document.getElementById('listaRecursos');
    if (listaRecursos) {
      listaRecursos.innerHTML = `
        <div class="error-loading">
          <p>❌ ${errorMessage}</p>
          <button onclick="cargarRecursos()" class="btn-retry">Reintentar</button>
        </div>
      `;
    }
    
    if (window.showToast) {
      window.showToast(errorMessage, 'error');
    }
  }
}

// Función para crear card de recurso
function createResourceCard(recurso) {
  const currentUser = getCurrentUser();
  const isMyResource = recurso.autorId === currentUser?.uid;
  
  // Formatear fecha
  let fechaStr = 'Fecha no disponible';
  try {
    const fecha = recurso.fechaCreacion?.toDate?.() || new Date(recurso.fechaCreacion);
    fechaStr = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    console.warn('Error al formatear fecha:', e);
  }
  
  return `
    <div class="resource-card ${isMyResource ? 'my-resource' : ''}" data-id="${recurso.id}">
      <div class="resource-header">
        <span class="resource-category category-${recurso.categoria}">
          ${getCategoryIcon(recurso.categoria)} ${recurso.categoria}
        </span>
        ${isMyResource ? '<span class="my-resource-badge">Mío</span>' : ''}
      </div>
      
      <h3 class="resource-title">${recurso.titulo}</h3>
      
      <!-- Vista previa del archivo -->
      <div class="resource-preview">
        ${getFilePreview(recurso.archivo)}
      </div>
      
      <div class="resource-meta">
        <div class="resource-info">
          <span class="resource-subject">📚 ${recurso.materia}</span>
          <span class="resource-level">🎓 ${capitalize(recurso.nivel)}</span>
        </div>
        <div class="resource-author">
          <span>👤 ${recurso.autorNombre || 'Usuario'}</span>
        </div>
        <div class="resource-date">
          <span>📅 ${fechaStr}</span>
        </div>
      </div>
      
      ${recurso.descripcion ? `<p class="resource-description">${recurso.descripcion}</p>` : ''}
      
      <div class="resource-actions">
        <a href="${recurso.archivo}" target="_blank" class="btn-download" onclick="incrementarDescargas('${recurso.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Descargar
        </a>
        
        ${isMyResource ? `
          <button class="btn-delete" onclick="eliminarRecurso('${recurso.id}')" title="Eliminar recurso">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        ` : ''}
        
        <span class="download-count">⬇️ ${recurso.descargas || 0}</span>
      </div>
    </div>
  `;
}

// Funciones helper
function getCategoryIcon(categoria) {
  const icons = {
    'apuntes': '📝',
    'examenes': '📊', 
    'proyectos': '🚀',
    'libros': '📚'
  };
  return icons[categoria] || '📄';
}

// ✅ FUNCIÓN GETFILEPREVIEW COMPLETAMENTE MEJORADA
function getFilePreview(url) {
  if (!url) return '<span class="file-placeholder">📄 Sin archivo</span>';
  
  console.log('🔍 Procesando URL:', url);
  
  let fileId = '';
  let processedUrl = url;
  
  // Detectar y procesar URLs de Uploadcare
  if (url.includes('ucarecdn.com') || url.includes('uploadcare.com') || url.includes('2kupnha500.ucarecdn.net')) {
    
    // Extraer file ID de diferentes formatos
    if (url.includes('ucarecdn.com/')) {
      fileId = url.split('ucarecdn.com/')[1].split('/')[0];
      processedUrl = `https://ucarecdn.com/${fileId}/`;
    } else if (url.includes('2kupnha500.ucarecdn.net/')) {
      fileId = url.split('2kupnha500.ucarecdn.net/')[1].split('/')[0];
      processedUrl = `https://ucarecdn.com/${fileId}/`;
    } else {
      // Si es solo el ID
      fileId = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      processedUrl = `https://ucarecdn.com/${fileId}/`;
    }
    
    console.log('📎 File ID extraído:', fileId);
    console.log('🔧 URL procesada:', processedUrl);
    
    // Construir URL optimizada para vista previa
    const previewUrl = `https://ucarecdn.com/${fileId}/-/preview/400x300/-/format/auto/-/quality/smart/`;
    
    return `
      <div class="resource-preview-container">
        <div class="image-loader">⏳</div>
        <img src="${previewUrl}" 
             alt="Vista previa de ${fileId}" 
             class="resource-image" 
             loading="lazy" 
             data-loading="true"
             data-original-url="${processedUrl}"
             data-file-id="${fileId}"
             onerror="handleImageError(this, '${processedUrl}', '${fileId}')"
             onload="handleImageLoad(this)">
      </div>
    `;
  }
  
  // Para otras URLs, detectar por extensión
  const ext = url.split('.').pop()?.toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  
  if (imageExts.includes(ext)) {
    return `
      <div class="resource-preview-container">
        <div class="image-loader">⏳</div>
        <img src="${url}" 
             alt="Vista previa" 
             class="resource-image" 
             loading="lazy" 
             data-loading="true"
             onerror="showFileLink(this, '${url}')"
             onload="handleImageLoad(this)">
      </div>
    `;
  }
  
  // Para archivos no imagen
  return showFileLink(null, url);
}

// ✅ FUNCIÓN MEJORADA PARA MANEJAR ERRORES DE IMAGEN
function handleImageError(img, originalUrl, fileId = null) {
  console.warn('❌ Error cargando imagen:', originalUrl);
  
  if (fileId) {
    // Lista de URLs alternativas para Uploadcare
    const currentSrc = img.src;
    const alternativeUrls = [
      `https://ucarecdn.com/${fileId}/-/preview/400x300/`,
      `https://ucarecdn.com/${fileId}/-/resize/400x300/`,
      `https://ucarecdn.com/${fileId}/-/format/auto/`,
      `https://ucarecdn.com/${fileId}/`,
      `https://2kupnha500.ucarecdn.net/${fileId}/`,
      `https://2kupnha500.ucarecdn.net/${fileId}/-/preview/`
    ];
    
    // Encontrar el siguiente intento
    let currentIndex = -1;
    for (let i = 0; i < alternativeUrls.length; i++) {
      if (currentSrc.includes(alternativeUrls[i].split('/-/')[0])) {
        currentIndex = i;
        break;
      }
    }
    
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < alternativeUrls.length) {
      console.log(`🔄 Intentando URL ${nextIndex + 1}:`, alternativeUrls[nextIndex]);
      img.src = alternativeUrls[nextIndex];
      return;
    }
  }
  
  // Si todos los intentos fallan, mostrar enlace
  showFileLink(img, originalUrl);
}

// ✅ FUNCIÓN PARA MANEJAR CARGA EXITOSA DE IMAGEN
function handleImageLoad(img) {
  console.log('✅ Imagen cargada correctamente:', img.src);
  
  // Remover loader
  const loader = img.parentElement.querySelector('.image-loader');
  if (loader) {
    loader.remove();
  }
  
  // Actualizar atributos
  img.setAttribute('data-loading', 'false');
  img.classList.add('loaded');
}

// ✅ FUNCIÓN MEJORADA PARA MOSTRAR ENLACE DE ARCHIVO
function showFileLink(img, originalUrl) {
  const linkHtml = `
    <div class="file-link-preview">
      <div class="file-icon">📎</div>
      <div class="file-info">
        <span class="file-name">Ver archivo</span>
        <a href="${originalUrl}" target="_blank" class="file-view-link">Abrir archivo</a>
      </div>
    </div>
  `;
  
  if (img && img.parentElement) {
    // Remover loader si existe
    const loader = img.parentElement.querySelector('.image-loader');
    if (loader) loader.remove();
    
    img.parentElement.innerHTML = linkHtml;
  } else {
    return linkHtml;
  }
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Función para incrementar descargas
async function incrementarDescargas(recursoId) {
  try {
    if (doc && updateDoc && increment && db) {
      const recursoRef = doc(db, 'recursos', recursoId);
      await updateDoc(recursoRef, {
        descargas: increment(1)
      });
      console.log('✅ Descarga registrada');
    }
  } catch (error) {
    console.error('❌ Error al registrar descarga:', error);
  }
}

// Función para eliminar recurso
async function eliminarRecurso(recursoId) {
  if (!confirm('¿Estás seguro de eliminar este recurso?')) return;
  
  try {
    if (doc && deleteDoc && db) {
      await deleteDoc(doc(db, 'recursos', recursoId));
      showToast('Recurso eliminado', 'success');
      cargarRecursos(); // Recargar lista
    }
  } catch (error) {
    console.error('❌ Error al eliminar:', error);
    showToast('Error al eliminar recurso', 'error');
  }
}

// Función de diagnóstico para URLs
function diagnosticarURL(url) {
  console.log('🔍 Diagnóstico de URL:', url);
  
  if (!url) {
    console.log('❌ URL vacía');
    return false;
  }
  
  // Probar si la URL es accesible
  const img = new Image();
  
  img.onload = () => {
    console.log('✅ URL accesible:', url);
  };
  
  img.onerror = () => {
    console.log('❌ URL no accesible:', url);
    
    // Si es Uploadcare, sugerir alternativas
    if (url.includes('ucarecdn.com') || url.includes('uploadcare.com')) {
      console.log('💡 Sugerencias para Uploadcare:');
      console.log('- Verificar que el archivo no haya sido eliminado');
      console.log('- Comprobar configuración de privacidad');
      console.log('- Intentar agregar transformaciones: /-/preview/');
    }
  };
  
  img.src = url;
}

// Limpieza de recursos
window.addEventListener('beforeunload', () => {
  // Limpiar timeouts pendientes
  if (redirectTimeout) {
    clearTimeout(redirectTimeout);
  }
  
  // Limpiar estado de autenticación
  AuthUtils.clearRedirectState();
  
  console.log('🧹 Recursos limpiados antes de salir');
});

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

// Cargar recursos cuando se cambie a la sección
document.addEventListener('DOMContentLoaded', function() {
  // Cargar recursos al inicio si estamos en la sección
  const currentSection = localStorage.getItem('activeSection');
  if (currentSection === 'resources') {
    setTimeout(cargarRecursos, 1000);
  }
  
  // Cargar recursos cuando se navegue a la sección
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.dataset.section === 'resources') {
      item.addEventListener('click', () => {
        setTimeout(cargarRecursos, 100);
      });
    }
  });
});

// Exportaciones
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

// Exportación global
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

// Exportar funciones globalmente
window.showToast = showToast;
window.cargarRecursos = cargarRecursos;
window.incrementarDescargas = incrementarDescargas;
window.eliminarRecurso = eliminarRecurso;
window.handleImageError = handleImageError;
window.handleImageLoad = handleImageLoad;
window.showFileLink = showFileLink;
window.diagnosticarURL = diagnosticarURL;
window.doLogin = window.doLogin || (() => AuthManager.signInWithGoogle());

console.log('✅ EstudiaFácil main.js cargado completamente - Versión optimizada para imágenes');
function solucionarVisualizacionImagenes() {
  // 1. Función mejorada para extraer IDs de Uploadcare de manera más robusta
  window.extraerIdUploadcare = function(url) {
    if (!url) return null;
    
    console.log('🔍 Analizando URL para extraer ID:', url);
    
    // Patrones comunes de Uploadcare
    const patrones = [
      /ucarecdn\.com\/([a-zA-Z0-9-_]+)\/?/,
      /2kupnha500\.ucarecdn\.net\/([a-zA-Z0-9-_]+)\/?/,
      /uploadcare\.com\/[^\/]+\/([a-zA-Z0-9-_]+)\/?/,
      /^([a-zA-Z0-9-_]{36})$/  // UUID directo
    ];
    
    for (const patron of patrones) {
      const match = url.match(patron);
      if (match && match[1]) {
        console.log('✅ ID extraído correctamente:', match[1]);
        return match[1];
      }
    }
    
    console.warn('⚠️ No se pudo extraer ID de Uploadcare de:', url);
    return null;
  };
  
  // 2. Función mejorada para construir URLs seguras de Uploadcare
  window.construirUrlUploadcare = function(fileId, tipo = 'preview') {
    if (!fileId) return null;
    
    const opciones = {
      preview: `https://ucarecdn.com/${fileId}/-/preview/400x300/-/format/auto/-/quality/smart/`,
      original: `https://ucarecdn.com/${fileId}/`,
      thumbnail: `https://ucarecdn.com/${fileId}/-/scale_crop/200x200/center/-/format/auto/`,
      alternativo: `https://2kupnha500.ucarecdn.net/${fileId}/`,
    };
    
    return opciones[tipo] || opciones.original;
  };
  
  // 3. Reemplazar getFilePreview con versión mejorada
  window.getFilePreview = function(url) {
    if (!url) return '<span class="file-placeholder">📄 Sin archivo</span>';
    
    console.log('🔍 Procesando URL para vista previa:', url);
    
    // Extraer ID de Uploadcare
    const fileId = window.extraerIdUploadcare(url);
    
    if (fileId) {
      // Si tenemos ID de Uploadcare, crear una vista previa con múltiples fallbacks
      const previewUrl = window.construirUrlUploadcare(fileId, 'preview');
      const originalUrl = window.construirUrlUploadcare(fileId, 'original');
      const alternativoUrl = window.construirUrlUploadcare(fileId, 'alternativo');
      
      return `
        <div class="resource-preview-container">
          <div class="image-loader">⏳</div>
          <img src="${previewUrl}" 
               alt="Vista previa" 
               class="resource-image" 
               loading="lazy" 
               data-loading="true"
               data-file-id="${fileId}"
               data-original-url="${originalUrl}"
               data-alt-url="${alternativoUrl}"
               data-attempts="0"
               onerror="mejorarImagenError(this)"
               onload="mejorarImagenCargada(this)">
        </div>
      `;
    }
    
    // Para URLs que no son de Uploadcare, intentar detectar si es imagen
    const ext = url.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];
    
    if (imageExts.includes(ext)) {
      return `
        <div class="resource-preview-container">
          <div class="image-loader">⏳</div>
          <img src="${url}" 
               alt="Vista previa" 
               class="resource-image" 
               loading="lazy" 
               data-loading="true"
               onerror="window.showFileLink(this, '${url}')"
               onload="mejorarImagenCargada(this)">
        </div>
      `;
    }
    
    // Para archivos no imagen
    return window.showFileLink(null, url);
  };
  
  // 4. Manejador mejorado para errores de imagen
  window.mejorarImagenError = function(img) {
    // Obtener datos
    const fileId = img.dataset.fileId;
    const originalUrl = img.dataset.originalUrl || img.src;
    const altUrl = img.dataset.altUrl;
    const attempts = parseInt(img.dataset.attempts || '0') + 1;
    
    console.warn(`⚠️ Error cargando imagen (intento ${attempts}):`, img.src);
    
    // Actualizar contador de intentos
    img.dataset.attempts = attempts.toString();
    
    // Si tenemos fileId de Uploadcare
    if (fileId) {
      // Lista de URLs alternativas para probar
      const urlsAlternativas = [
        `https://ucarecdn.com/${fileId}/-/preview/400x300/-/format/auto/`,
        `https://ucarecdn.com/${fileId}/-/resize/400x/-/quality/lightest/`,
        `https://2kupnha500.ucarecdn.net/${fileId}/`,
        `https://ucarecdn.com/${fileId}/`,
        `https://ucarecdn.com/${fileId}/-/scale_crop/400x300/center/`,
        // Opción para forzar HTTP (por si hay problemas con HTTPS)
        `http://ucarecdn.com/${fileId}/-/preview/400x300/`
      ];
      
      // Limitar intentos
      if (attempts <= urlsAlternativas.length) {
        const nextUrl = urlsAlternativas[attempts - 1];
        console.log(`🔄 Probando URL alternativa ${attempts}:`, nextUrl);
        img.src = nextUrl;
        return;
      }
    }
    
    // Si llegamos aquí, mostrar enlace al archivo original
    console.warn('❌ No se pudo cargar la imagen después de múltiples intentos');
    window.showFileLink(img, originalUrl);
  };
  
  // 5. Manejador mejorado para carga exitosa
  window.mejorarImagenCargada = function(img) {
    console.log('✅ Imagen cargada correctamente:', img.src);
    
    // Remover loader
    const loader = img.parentElement.querySelector('.image-loader');
    if (loader) loader.remove();
    
    // Actualizar atributos
    img.setAttribute('data-loading', 'false');
    img.classList.add('loaded');
    
    // Añadir clase de animación suave
    img.classList.add('fade-in');
    
    // Añadir zoom al hover
    img.parentElement.classList.add('zoom-container');
  };
  
  // 6. Estilos adicionales para mejorar visualización
  const estilos = document.createElement('style');
  estilos.textContent = `
    .resource-preview-container {
      position: relative;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .resource-image {
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .resource-image.fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .zoom-container .resource-image:hover {
      transform: scale(1.05);
    }
    
    .image-loader {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
      font-size: 2rem;
      animation: spin 1.5s linear infinite;
    }
    
    @keyframes spin {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `;
  document.head.appendChild(estilos);
  
  console.log('✅ Mejoras de visualización de imágenes aplicadas');
}

// 7. Función para diagnosticar y arreglar problemas específicos
function diagnosticarProblemasImagenes() {
  console.log('🔍 Iniciando diagnóstico de problemas de imágenes...');
  
  // Verificar CORS
  const corsTest = new Image();
  corsTest.onload = () => console.log('✅ CORS: OK para Uploadcare');
  corsTest.onerror = () => console.warn('⚠️ CORS: Posibles problemas con Uploadcare');
  corsTest.src = 'https://ucarecdn.com/assets/images/favicon.ico';
  
  // Probar conexión a Uploadcare
  fetch('https://ucarecdn.com/assets/images/favicon.ico')
    .then(r => r.ok ? console.log('✅ Conexión a Uploadcare: OK') : console.warn('⚠️ Conexión a Uploadcare: Problemas'))
    .catch(e => console.error('❌ Error de conexión a Uploadcare:', e));
    
  // Buscar imágenes actuales y verificar estado
  setTimeout(() => {
    const imagenes = document.querySelectorAll('.resource-image');
    console.log(`🔍 Encontradas ${imagenes.length} imágenes en la página`);
    
    imagenes.forEach((img, i) => {
      console.log(`Imagen ${i+1}:`, {
        src: img.src,
        isLoaded: !img.complete ? 'cargando' : img.naturalWidth === 0 ? 'error' : 'ok',
        fileId: img.dataset.fileId || 'N/A'
      });
    });
  }, 2000);
  
  console.log('✅ Diagnóstico de imágenes completado');
}

// Ejecutar las mejoras
document.addEventListener('DOMContentLoaded', () => {
  solucionarVisualizacionImagenes();
  
  // Agregar botón de diagnóstico
  const botonDiagnostico = document.createElement('button');
  botonDiagnostico.textContent = 'Diagnosticar Imágenes';
  botonDiagnostico.className = 'btn-diagnostico';
  botonDiagnostico.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #00f5ff; color: #000; padding: 8px 16px; border-radius: 4px; display: none;';
  botonDiagnostico.onclick = diagnosticarProblemasImagenes;
  document.body.appendChild(botonDiagnostico);
  
  // Mostrar botón solo en desarrollo (puedes activarlo con la consola: document.querySelector('.btn-diagnostico').style.display = 'block')
  
  // Reemplazar funciones existentes con las mejoradas
  window.handleImageError = window.mejorarImagenError;
  window.handleImageLoad = window.mejorarImagenCargada;
  
  console.log('🔧 Sistema de imágenes mejorado instalado');
});