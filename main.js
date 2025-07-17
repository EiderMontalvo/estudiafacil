// main.js - Versión completa corregida con mejor manejo de conectividad
import { 
  auth, db, provider, signInWithRedirect, signInWithPopup, getRedirectResult, signOut, onAuthStateChanged,
  setPersistence, browserLocalPersistence, collection, addDoc, getDocs, deleteDoc, doc, orderBy,
  query, where, serverTimestamp, updateDoc, increment, setDoc, getDoc
} from './firebase-config.js';

// Variables globales
let currentUser = null, isAuthInitialized = false, loginInProgress = false, redirectTimeout = null;
window.toastTimeouts = window.toastTimeouts || [];
window.wasDisconnected = false;

// Referencias DOM dinámicas compactas
const getDOMRef = (id) => document.getElementById(id);
const getElements = () => ({
  loginBtn: getDOMRef('loginBtn'), logoutBtn: getDOMRef('logoutBtn'), profileLogoutBtn: getDOMRef('profileLogoutBtn'),
  userProfile: getDOMRef('userProfile'), contentNav: getDOMRef('contentNav'), userName: getDOMRef('userName'),
  userAvatar: getDOMRef('userAvatar'), profileName: getDOMRef('profileName'), profileEmail: getDOMRef('profileEmail'),
  profileAvatar: getDOMRef('profileAvatar')
});

// ✅ FUNCIÓN UNIFICADA PARA TOASTS
function showToast(message, type = 'info', duration = 4000) {
  // Limpiar toasts antiguos si hay más de 3
  const existingToasts = document.querySelectorAll('.toast');
  if (existingToasts.length >= 3) {
    existingToasts[0].remove();
  }
  
  let container = getDOMRef('toastContainer');
  if (!container) {
    container = createToastContainer();
  }
  
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Aplicar estilos directamente
  Object.assign(toast.style, {
    backgroundColor: colors[type] || '#1e293b',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    marginBottom: '8px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transform: 'translateX(100%)',
    opacity: '0',
    transition: 'all 0.3s ease',
    fontWeight: '500',
    fontSize: '14px',
    maxWidth: '100%',
    wordWrap: 'break-word',
    pointerEvents: 'auto'
  });
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message" style="flex: 1; color: #ffffff;">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()" style="background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 18px; padding: 0; margin-left: auto; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background-color 0.2s;">×</button>
  `;
  
  container.appendChild(toast);
  
  // ✅ MOSTRAR CON ANIMACIÓN
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 100);
  
  // Auto-remove con timeout
  const timeout = setTimeout(() => {
    if (toast.parentElement) {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
  
  window.toastTimeouts.push(timeout);
  window.toastTimeouts = window.toastTimeouts.filter(t => t === timeout);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '10000',
    maxWidth: '350px',
    pointerEvents: 'none'
  });
  document.body.appendChild(container);
  return container;
}

// ✅ FUNCIÓN PARA LIMPIAR TOASTS DE CONECTIVIDAD
function limpiarToastsConectividad() {
  const toastsConectividad = document.querySelectorAll('.toast');
  toastsConectividad.forEach(toast => {
    const mensaje = toast.querySelector('.toast-message');
    if (mensaje) {
      const texto = mensaje.textContent.toLowerCase();
      if (texto.includes('conectividad') || 
          texto.includes('verificando conexión') || 
          texto.includes('problemas de conectividad')) {
        toast.remove();
      }
    }
  });
}

// Utilidades compactas
class AuthUtils {
  static showToast = showToast; // ✅ Usar la función unificada
  
  static saveUserToStorage(user) {
    try {
      const userData = { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL, emailVerified: user.emailVerified, loginTime: new Date().toISOString() };
      localStorage.setItem('estudiaFacil_user', JSON.stringify(userData));
      localStorage.setItem('estudiaFacil_logged', 'true');
      return true;
    } catch { return false; }
  }
  
  static clearUserStorage() {
    ['estudiaFacil_user', 'estudiaFacil_logged', 'estudiaFacil_redirecting', 'estudiaFacil_redirectTime'].forEach(key => {
      try { localStorage.removeItem(key); } catch {}
    });
  }
  
  static hasStoredSession() { return localStorage.getItem('estudiaFacil_logged') === 'true'; }
  static getStoredUser() { try { return JSON.parse(localStorage.getItem('estudiaFacil_user')); } catch { return null; } }
  static clearRedirectState() { 
    localStorage.removeItem('estudiaFacil_redirecting'); 
    localStorage.removeItem('estudiaFacil_redirectTime'); 
    loginInProgress = false; 
    if (redirectTimeout) { clearTimeout(redirectTimeout); redirectTimeout = null; }
  }
  static isLocalhost() { return ['localhost', '127.0.0.1'].includes(window.location.hostname); }
}

// Gestor de autenticación compacto
class AuthManager {
  static async initializePersistence() {
    try { await setPersistence(auth, browserLocalPersistence); return true; }
    catch { showToast('Error al configurar persistencia', 'error'); return false; }
  }
  
  static async signInWithGoogle() {
    if (loginInProgress) { showToast('Login en progreso...', 'warning'); return; }
    
    try {
      loginInProgress = true;
      AuthUtils.clearRedirectState();
      
      if (!(await this.initializePersistence())) throw new Error('No se pudo configurar la persistencia');
      
      this.updateLoginButton('Conectando...', true);
      showToast('Conectando con Google...', 'info');
      
      AuthUtils.isLocalhost() ? await this.loginWithPopup() : await this.loginWithRedirect();
    } catch (error) { this.handleLoginError(error); }
  }
  
  static async loginWithPopup() {
    try {
      const result = await signInWithPopup(auth, provider);
      AuthUtils.clearRedirectState();
      AuthUtils.saveUserToStorage(result.user);
      this.updateUI(result.user);
      showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
      await this.saveUserToFirestore(result.user);
      return result.user;
    } catch (error) {
      if (['auth/popup-blocked', 'auth/popup-closed-by-user'].includes(error.code)) {
        showToast('Popup bloqueado, probando redirect...', 'warning');
        await this.loginWithRedirect();
      } else throw error;
    }
  }
  
  static async loginWithRedirect() {
    try {
      const redirectTime = Date.now();
      localStorage.setItem('estudiaFacil_redirecting', 'true');
      localStorage.setItem('estudiaFacil_redirectTime', redirectTime.toString());
      
      this.updateLoginButton('Redirigiendo...', true);
      showToast('Redirigiendo a Google...', 'info');
      
      redirectTimeout = setTimeout(() => this.handleRedirectTimeout(), 30000);
      setTimeout(() => signInWithRedirect(auth, provider).catch(this.handleLoginError), 1000);
    } catch (error) { throw error; }
  }
  
  static async saveUserToFirestore(user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        uid: user.uid, displayName: user.displayName, email: user.email, 
        photoURL: user.photoURL, lastLogin: serverTimestamp() 
      }, { merge: true });
    } catch {}
  }
  
  static handleRedirectTimeout() {
    AuthUtils.clearRedirectState();
    showToast('Timeout. Reintentando...', 'warning');
    this.updateLoginButton('Iniciar Sesión', false);
    setTimeout(() => { if (!currentUser && !loginInProgress) this.signInWithGoogle(); }, 3000);
  }
  
  static handleLoginError(error) {
    AuthUtils.clearRedirectState();
    const errorMessages = {
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
      'auth/unauthorized-domain': 'Dominio no autorizado',
      'auth/popup-blocked': 'Popup bloqueado',
      'auth/operation-not-allowed': 'Login con Google no habilitado'
    };
    showToast(errorMessages[error.code] || 'Error de autenticación', 'error');
    this.updateLoginButton('Iniciar Sesión', false);
  }
  
  static async checkRedirectResult() {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        AuthUtils.clearRedirectState();
        AuthUtils.saveUserToStorage(result.user);
        this.updateUI(result.user);
        showToast(`¡Bienvenido, ${result.user.displayName}!`, 'success');
        await this.saveUserToFirestore(result.user);
        return result.user;
      } else {
        const wasRedirecting = localStorage.getItem('estudiaFacil_redirecting');
        if (wasRedirecting === 'true') {
          const redirectTime = parseInt(localStorage.getItem('estudiaFacil_redirectTime')) || 0;
          if (Date.now() - redirectTime > 45000) this.handleRedirectTimeout();
        }
      }
    } catch (error) {
      AuthUtils.clearRedirectState();
      if (error.code !== 'auth/null-user') {
        showToast('Error al procesar autenticación', 'error');
        this.updateLoginButton('Iniciar Sesión', false);
      }
    }
    return null;
  }
  
  static async signOutUser(redirectToHome = false) {
    try {
      showToast('Cerrando sesión...', 'info');
      AuthUtils.clearRedirectState();
      await signOut(auth);
      AuthUtils.clearUserStorage();
      currentUser = null;
      showToast('Sesión cerrada exitosamente', 'success');
      this.updateUI(null);
      
      if (redirectToHome) {
        setTimeout(() => {
          if (window.navigateToSection) window.navigateToSection('dashboard');
          const welcomeHero = getDOMRef('welcomeHero'), dashboardContent = getDOMRef('dashboardContent');
          if (welcomeHero) welcomeHero.style.display = 'block';
          if (dashboardContent) dashboardContent.style.display = 'none';
          setTimeout(() => showToast('¡Inicia sesión para acceder a todas las funciones!', 'info'), 1000);
        }, 500);
      }
      
      setTimeout(() => this.setupLoginButton(), 500);
    } catch (error) { showToast('Error al cerrar sesión', 'error'); }
  }
  
  static async logoutFromProfile() { await this.signOutUser(true); }
  static async logoutFromNavbar() { await this.signOutUser(false); }

  static updateUI(user) {
    currentUser = user;
    const elements = getElements();
    
    if (user) {
      if (elements.loginBtn) elements.loginBtn.style.display = 'none';
      if (elements.userProfile) elements.userProfile.style.display = 'flex';
      if (elements.contentNav) elements.contentNav.style.display = 'block';
      if (elements.userName) elements.userName.textContent = user.displayName || 'Usuario';
      
      const avatarUrl = user.photoURL || this.generateAvatarUrl(user.displayName);
      if (elements.userAvatar) {
        elements.userAvatar.src = avatarUrl;
        elements.userAvatar.alt = user.displayName || 'Avatar';
        elements.userAvatar.onerror = () => elements.userAvatar.src = this.generateAvatarUrl(user.displayName || 'Usuario');
      }
      
      if (elements.profileName) elements.profileName.textContent = user.displayName || 'Usuario';
      if (elements.profileEmail) elements.profileEmail.textContent = user.email || '';
      if (elements.profileAvatar) {
        elements.profileAvatar.src = avatarUrl;
        elements.profileAvatar.alt = user.displayName || 'Avatar';
        elements.profileAvatar.onerror = () => elements.profileAvatar.src = this.generateAvatarUrl(user.displayName || 'Usuario');
      }
      
      if (window.toggleSectionsForAuth) window.toggleSectionsForAuth(true);
      if (window.updateAuthStatus) window.updateAuthStatus(`Conectado como ${user.displayName}`);
    } else {
      if (elements.loginBtn) {
        elements.loginBtn.style.display = 'flex';
        this.updateLoginButton('Iniciar Sesión', false);
      }
      if (elements.userProfile) elements.userProfile.style.display = 'none';
      if (elements.contentNav) elements.contentNav.style.display = 'none';
      
      if (elements.profileName) elements.profileName.textContent = 'Nombre del Usuario';
      if (elements.profileEmail) elements.profileEmail.textContent = 'email@ejemplo.com';
      if (elements.profileAvatar) {
        elements.profileAvatar.src = this.generateAvatarUrl('Usuario');
        elements.profileAvatar.alt = 'Avatar por defecto';
      }
      
      if (window.toggleSectionsForAuth) window.toggleSectionsForAuth(false);
      if (window.updateAuthStatus) window.updateAuthStatus('Sin autenticar');
    }
  }
  
  static updateLoginButton(text, disabled) {
    const loginBtn = getElements().loginBtn;
    if (!loginBtn) return;
    
    loginBtn.disabled = disabled;
    loginBtn.style.opacity = disabled ? '0.7' : '1';
    loginBtn.innerHTML = disabled ? 
      `<div class="btn-icon animate-spin">⏳</div><span class="btn-text">${text}</span>` :
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="btn-text">${text}</span>`;
  }
  
  static generateAvatarUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Usuario')}&background=00f5ff&color=fff&size=120&bold=true`;
  }
  
  static setupLoginButton() {
    const loginBtn = getElements().loginBtn;
    if (!loginBtn) return;
    loginBtn.disabled = false;
    loginBtn.style.opacity = '1';
    window.doLogin = async () => {
      if (loginInProgress) { showToast('Login en progreso...', 'warning'); return; }
      AuthUtils.clearRedirectState();
      try { await this.signInWithGoogle(); } catch (error) { this.handleLoginError(error); }
    };
  }
  
  static forceUpdateUI() {
    const firebaseUser = auth.currentUser;
    this.updateUI(firebaseUser);
  }
}

// Funciones principales compactas
const getCurrentUser = () => currentUser;
const isUserLoggedIn = () => currentUser !== null;
const getStoredUserData = () => AuthUtils.getStoredUser();

// ✅ MONITOR DE CONEXIÓN CORREGIDO
function monitorearConexionFirestore() {
  let timeoutConexion = null;
  let connectionChecked = false;
  
  // Función para verificar conexión real
  const verificarConexionReal = async () => {
    try {
      if (!db) return false;
      
      // Intentar una operación simple pero real
      const testRef = doc(db, '_connection_test', 'ping');
      await getDoc(testRef);
      
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Configurar timeout de conexión
  timeoutConexion = setTimeout(async () => {
    if (connectionChecked) return; // Ya se verificó la conexión
    
    const isConnected = await verificarConexionReal();
    
    if (!isConnected) {
      showToast('Problemas de conectividad. Verificando conexión...', 'warning', 6000);
    } else {
      // Si hay conexión, llamar conexionEstablecida
      if (window.conexionEstablecida) {
        window.conexionEstablecida();
      }
    }
  }, 10000); // Aumentar a 10 segundos para dar más tiempo
  
  window.conexionEstablecida = () => {
    connectionChecked = true;
    
    if (timeoutConexion) { 
      clearTimeout(timeoutConexion);
      timeoutConexion = null;
    }
    
    // Limpiar toasts de conectividad existentes
    limpiarToastsConectividad();
    
    // Solo mostrar si no es la primera conexión
    if (window.wasDisconnected) {
      showToast('Conexión restaurada', 'success', 2000);
      window.wasDisconnected = false;
    }
  };
  
  // Marcar cuando hay problemas de conexión
  window.marcarDesconexion = () => {
    window.wasDisconnected = true;
  };
}

// Inicialización compacta
async function initializeApp() {
  try {
    const loadingScreen = getDOMRef('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'flex';
    
    AuthUtils.clearRedirectState();
    monitorearConexionFirestore();
    
    await AuthManager.initializePersistence();
    AuthManager.setupLoginButton();
    await AuthManager.checkRedirectResult();
    
    onAuthStateChanged(auth, (user) => {
      if (!isAuthInitialized) {
        isAuthInitialized = true;
        if (user) { AuthUtils.saveUserToStorage(user); AuthUtils.clearRedirectState(); }
      }
      
      AuthManager.updateUI(user);
      
      if (user && (!currentUser || currentUser.uid !== user.uid)) {
        if (window.DashboardManager) setTimeout(() => window.DashboardManager.loadDashboard(), 1000);
      }
    });
    
    // ✅ VERIFICACIÓN TEMPRANA DE CONEXIÓN
    setTimeout(async () => {
      try {
        if (db && auth.currentUser) {
          // Intentar una operación simple para verificar conexión
          const testRef = doc(db, '_ping', 'test');
          await getDoc(testRef);
          
          // Si llegamos aquí, hay conexión
          if (window.conexionEstablecida) {
            window.conexionEstablecida();
          }
        }
      } catch (error) {
        // No hacer nada, el timeout normal manejará esto
      }
    }, 2000); // Verificar después de 2 segundos
    
    // Verificación UI simplificada
    let uiChecks = 0;
    const uiCheckInterval = setInterval(() => {
      uiChecks++;
      const firebaseUser = auth.currentUser;
      const elements = getElements();
      
      if (firebaseUser && elements.loginBtn && elements.loginBtn.style.display !== 'none') AuthManager.forceUpdateUI();
      if (!firebaseUser && elements.userProfile && elements.userProfile.style.display !== 'none') AuthManager.forceUpdateUI();
      
      if (uiChecks >= 5) clearInterval(uiCheckInterval);
    }, 2000);
    
    // Verificación de redirect simplificada
    let redirectChecks = 0;
    const checkInterval = setInterval(() => {
      redirectChecks++;
      const wasRedirecting = localStorage.getItem('estudiaFacil_redirecting');
      if (wasRedirecting === 'true' && !currentUser) { AuthManager.checkRedirectResult(); } 
      else { clearInterval(checkInterval); }
      
      if (redirectChecks >= 24) {
        AuthUtils.clearRedirectState();
        AuthManager.updateLoginButton('Iniciar Sesión', false);
        clearInterval(checkInterval);
      }
    }, 5000);
    
    setTimeout(() => { if (loadingScreen) loadingScreen.classList.add('hidden'); }, 2500);
    setTimeout(() => { if (!currentUser) showToast('¡Bienvenido a EstudiaFácil!', 'info'); }, 4000);

    // Cargar automáticamente los datos de la sección visible al iniciar
    setTimeout(() => {
      const activeSection = document.querySelector('.content-section.active');
      if (!activeSection) return;
      const id = activeSection.id || '';
      if (window.ResourcesManager && id === 'resourcesSection') window.ResourcesManager.loadResources();
      if (window.SurveysManager && id === 'surveysSection') window.SurveysManager.loadSurveys();
      if (window.OpinionsManager && id === 'opinionsSection') window.OpinionsManager.loadOpinions();
      if (window.DashboardManager && id === 'dashboardSection') window.DashboardManager.loadDashboard();
      if (window.ProfileManager && id === 'profileSection') window.ProfileManager.loadProfile();
    }, 1000);
    
  } catch (error) {
    showToast('Error crítico. Recarga la página.', 'error');
    const loadingScreen = getDOMRef('loadingScreen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
  }
}

// Configurar botones logout
function setupLogoutButtons() {
  const elements = getElements();
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', (e) => { e.preventDefault(); AuthManager.logoutFromNavbar(); });
  if (elements.profileLogoutBtn) elements.profileLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); AuthManager.logoutFromProfile(); });
  
  const profileLogoutAlt = getDOMRef('profileLogoutBtn');
  if (profileLogoutAlt && profileLogoutAlt !== elements.profileLogoutBtn) {
    profileLogoutAlt.addEventListener('click', (e) => { e.preventDefault(); AuthManager.logoutFromProfile(); });
  }
}

// CSS compacto actualizado
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .animate-spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  .toast-container{pointer-events:none}.toast{pointer-events:auto}
  .toast-warning .toast-close:hover{background-color:rgba(255,255,255,0.3)!important;transform:scale(1.1)}
  .toast-connectivity{animation:pulseWarning 2s infinite}
  @keyframes pulseWarning{0%,100%{opacity:1}50%{opacity:0.7}}
  .btn-clear-toasts{position:fixed;bottom:20px;left:20px;background:#ef4444;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:12px;z-index:9999;display:none}
  .resource-card{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;padding:1.5rem;margin-bottom:1rem;border:1px solid rgba(255,255,255,.1);transition:transform .2s ease,box-shadow .2s ease;color:white}
  .resource-card:hover{transform:translateY(-2px);box-shadow:0 10px 25px rgba(0,0,0,.2)}
  .resource-preview-container{width:100%;height:200px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1);border-radius:8px;overflow:hidden;margin:1rem 0;position:relative}
  .resource-image{width:100%;height:100%;object-fit:cover;border-radius:6px;transition:transform .3s ease}.resource-image:hover{transform:scale(1.05)}
  .file-link-preview{background:rgba(255,255,255,.1);border:2px dashed rgba(255,255,255,.3);border-radius:8px;padding:2rem;text-align:center;margin:1rem 0;display:flex;flex-direction:column;align-items:center;gap:1rem;min-height:120px;justify-content:center}
  .file-icon{font-size:3rem;color:rgba(255,255,255,.7)}.file-info{display:flex;flex-direction:column;align-items:center;gap:.5rem}
  .file-name{color:rgba(255,255,255,.9);font-weight:600;font-size:1.1rem}
  .file-view-link{color:#00f5ff;text-decoration:none;font-weight:600;padding:.5rem 1rem;border:1px solid #00f5ff;border-radius:6px;transition:all .2s ease}
  .file-view-link:hover{background:#00f5ff;color:#1a1a2e;text-decoration:none}
  .file-placeholder{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:2rem;background:rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.7);font-size:1rem;min-height:120px;text-align:center}
  .image-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:rgba(255,255,255,.7);font-size:2rem;z-index:1}
  @keyframes imageLoad{0%{opacity:0;transform:scale(.9)}100%{opacity:1;transform:scale(1)}}.resource-image.loaded{animation:imageLoad .3s ease-in-out}
`;
document.head.appendChild(styleSheet);

// Función compacta para obtener URL Uploadcare
async function getUploadcareUrl() {
  const archivoInput = getDOMRef('archivo');
  if (!archivoInput) throw new Error('Campo de archivo no encontrado');
  
  let url = archivoInput.value?.trim();
  if (!url) throw new Error('Debes seleccionar un archivo');
  
  if (url.startsWith('http')) return url;
  if (url.match(/^[a-zA-Z0-9-_]+$/)) return `https://ucarecdn.com/${url}/`;
  return url;
}

// Event listener formulario compacto
document.addEventListener('DOMContentLoaded', function() {
  const uploadForm = getDOMRef('uploadForm'), uploadModal = getDOMRef('uploadModal');
  
  if (uploadForm) {
    uploadForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const submitBtn = uploadForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      try {
        submitBtn.innerHTML = '<span class="btn-text">Guardando...</span>';
        submitBtn.disabled = true;
        
        const currentUser = window.getCurrentUser();
        if (!currentUser) throw new Error('Debes iniciar sesión para subir recursos');
        
        const archivoUrl = await getUploadcareUrl();
        const titulo = getDOMRef('titulo').value.trim();
        if (!titulo) throw new Error('El título es obligatorio');
        
        const formData = {
          titulo, categoria: getDOMRef('categoria').value, materia: getDOMRef('materia').value.trim(),
          nivel: getDOMRef('nivel').value, descripcion: getDOMRef('descripcion').value.trim(),
          archivo: archivoUrl, autorId: currentUser.uid, autorNombre: currentUser.displayName,
          autorEmail: currentUser.email, fechaCreacion: serverTimestamp(), descargas: 0
        };
        
        const savePromise = addDoc(collection(db, 'recursos'), formData);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
        await Promise.race([savePromise, timeoutPromise]);
        
        showToast('¡Recurso guardado exitosamente! 🎉', 'success');
        if (uploadModal) uploadModal.style.display = 'none';
        uploadForm.reset();
        // ...el resto del código permanece igual...
        
      } catch (error) {
        const errorMessages = {
          'permission-denied': 'Sin permisos para guardar. Verifica tu sesión.',
          'unavailable': 'Servicio no disponible. Intenta más tarde.',
          'deadline-exceeded': 'Tiempo de espera agotado.',
          'resource-exhausted': 'Límite de operaciones alcanzado.'
        };
        const errorMessage = errorMessages[error.code] || error.message || 'Error al guardar recurso';
        showToast(errorMessage, 'error');
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
});

// ✅ CARGAR RECURSOS MEJORADO CON MEJOR MANEJO DE CONEXIÓN

// Crear card compacta
function createResourceCard(recurso) {
  const currentUser = getCurrentUser();
  const isMyResource = recurso.autorId === currentUser?.uid;
  
  let fechaStr = 'Fecha no disponible';
  try {
    const fecha = recurso.fechaCreacion?.toDate?.() || new Date(recurso.fechaCreacion);
    fechaStr = fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {}
  
  const getCategoryIcon = (cat) => ({ apuntes: '📝', examenes: '📊', proyectos: '🚀', libros: '📚' }[cat] || '📄');
  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  
  return `
    <div class="resource-card ${isMyResource ? 'my-resource' : ''}" data-id="${recurso.id}">
      <div class="resource-header">
        <span class="resource-category category-${recurso.categoria}">${getCategoryIcon(recurso.categoria)} ${recurso.categoria}</span>
        ${isMyResource ? '<span class="my-resource-badge">Mío</span>' : ''}
      </div>
      <h3 class="resource-title">${recurso.titulo}</h3>
      <div class="resource-preview">${getFilePreview(recurso.archivo)}</div>
      <div class="resource-meta">
        <div class="resource-info">
          <span class="resource-subject">📚 ${recurso.materia}</span>
          <span class="resource-level">🎓 ${capitalize(recurso.nivel)}</span>
        </div>
        <div class="resource-author"><span>👤 ${recurso.autorNombre || 'Usuario'}</span></div>
        <div class="resource-date"><span>📅 ${fechaStr}</span></div>
      </div>
      ${recurso.descripcion ? `<p class="resource-description">${recurso.descripcion}</p>` : ''}
      <div class="resource-actions">
        <a href="${recurso.archivo}" target="_blank" class="btn-download" onclick="incrementarDescargas('${recurso.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Descargar
        </a>
        ${isMyResource ? `<button class="btn-delete" onclick="eliminarRecurso('${recurso.id}')" title="Eliminar recurso"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
        <span class="download-count">⬇️ ${recurso.descargas || 0}</span>
      </div>
    </div>
  `;
}

// Funciones de preview y utilidades compactas
function getFilePreview(url) {
  if (!url) return '<span class="file-placeholder">📄 Sin archivo</span>';
  
  const extraerIdUploadcare = (url) => {
    const patrones = [/ucarecdn\.com\/([a-zA-Z0-9-_]+)\/?/, /2kupnha500\.ucarecdn\.net\/([a-zA-Z0-9-_]+)\/?/, /^([a-zA-Z0-9-_]{36})$/];
    for (const patron of patrones) {
      const match = url.match(patron);
      if (match && match[1]) return match[1];
    }
    return null;
  };
  
  const fileId = extraerIdUploadcare(url);
  
  if (fileId) {
    const previewUrl = `https://ucarecdn.com/${fileId}/-/preview/400x300/-/format/auto/-/quality/smart/`;
    const originalUrl = `https://ucarecdn.com/${fileId}/`;
    
    return `
      <div class="resource-preview-container">
        <div class="image-loader">⏳</div>
        <img src="${previewUrl}" alt="Vista previa" class="resource-image" loading="lazy" data-loading="true" data-file-id="${fileId}" data-original-url="${originalUrl}" onerror="handleImageError(this)" onload="handleImageLoad(this)">
      </div>
    `;
  }
  
  const ext = url.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) {
    return `
      <div class="resource-preview-container">
        <div class="image-loader">⏳</div>
        <img src="${url}" alt="Vista previa" class="resource-image" loading="lazy" data-loading="true" onerror="showFileLink(this, '${url}')" onload="handleImageLoad(this)">
      </div>
    `;
  }
  
  return showFileLink(null, url);
}

function handleImageError(img) {
  const fileId = img.dataset.fileId;
  const originalUrl = img.dataset.originalUrl || img.src;
  const attempts = parseInt(img.dataset.attempts || '0') + 1;
  img.dataset.attempts = attempts.toString();
  
  if (fileId && attempts <= 6) {
    const urlsAlternativas = [
      `https://ucarecdn.com/${fileId}/-/preview/400x300/-/format/auto/`,
      `https://ucarecdn.com/${fileId}/-/resize/400x/-/quality/lightest/`,
      `https://2kupnha500.ucarecdn.net/${fileId}/`,
      `https://ucarecdn.com/${fileId}/`,
      `https://ucarecdn.com/${fileId}/-/scale_crop/400x300/center/`,
      `http://ucarecdn.com/${fileId}/-/preview/400x300/`
    ];
    
    if (attempts <= urlsAlternativas.length) {
      img.src = urlsAlternativas[attempts - 1];
      return;
    }
  }
  
  showFileLink(img, originalUrl);
}

function handleImageLoad(img) {
  const loader = img.parentElement.querySelector('.image-loader');
  if (loader) loader.remove();
  img.setAttribute('data-loading', 'false');
  img.classList.add('loaded');
}

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
    const loader = img.parentElement.querySelector('.image-loader');
    if (loader) loader.remove();
    img.parentElement.innerHTML = linkHtml;
  } else {
    return linkHtml;
  }
}

// Funciones de operaciones compactas
async function incrementarDescargas(recursoId) {
  try {
    if (doc && updateDoc && increment && db) {
      await updateDoc(doc(db, 'recursos', recursoId), { descargas: increment(1) });
    }
  } catch {}
}

async function eliminarRecurso(recursoId) {
  if (!confirm('¿Estás seguro de eliminar este recurso?')) return;
  try {
    if (doc && deleteDoc && db) {
      await deleteDoc(doc(db, 'recursos', recursoId));
      showToast('Recurso eliminado', 'success');
      // ...el resto del código permanece igual...
    }
  } catch { showToast('Error al eliminar recurso', 'error'); }
}

// Cleanup compacto
window.addEventListener('beforeunload', () => {
  if (redirectTimeout) clearTimeout(redirectTimeout);
  if (window.toastTimeouts) window.toastTimeouts.forEach(timeout => clearTimeout(timeout));
  AuthUtils.clearRedirectState();
});

// Inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initializeApp(); setupLogoutButtons(); });
} else { initializeApp(); setupLogoutButtons(); }

// Configurar carga de recursos en navegación
// Ahora la carga de recursos la gestiona modules.js (ResourcesManager)

// Exportaciones compactas
export { 
  auth, db, collection, addDoc, getDocs, deleteDoc, doc, orderBy, query, where, 
  serverTimestamp, updateDoc, increment, setDoc, getDoc, getCurrentUser, isUserLoggedIn, getStoredUserData
};

// Exportaciones globales compactas
Object.assign(window, {
  EstudiaFacilAuth: {
    auth, db, collection, addDoc, getDocs, deleteDoc, doc, orderBy, query, where, serverTimestamp,
    updateDoc, increment, setDoc, getDoc, getCurrentUser, isUserLoggedIn, AuthManager, AuthUtils,
    login: () => AuthManager.signInWithGoogle(), logout: () => AuthManager.signOutUser(),
    logoutFromProfile: () => AuthManager.logoutFromProfile(), logoutFromNavbar: () => AuthManager.logoutFromNavbar(),
    showToast, forceUpdateUI: () => AuthManager.forceUpdateUI()
  },
  showToast, incrementarDescargas, eliminarRecurso, handleImageError, handleImageLoad, showFileLink,
  limpiarToastsConectividad, doLogin: window.doLogin || (() => AuthManager.signInWithGoogle())
});