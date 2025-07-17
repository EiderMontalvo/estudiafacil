// firebase-config.js - Versión corregida con exportaciones completas
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import * as authModule from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import * as firestoreModule from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Acceso rápido a funciones necesarias
const {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut: firebaseSignOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} = authModule;

const {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, orderBy, query, where,
  serverTimestamp, updateDoc, increment, setDoc, getDoc, enableNetwork, disableNetwork, terminate
} = firestoreModule;

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA1BDDuOFETmU0WFVwzgSgsvk9oUG3ZLgo",
  authDomain: "estudiafacil-63064.firebaseapp.com",
  projectId: "estudiafacil-63064",
  storageBucket: "estudiafacil-63064.firebasestorage.app",
  messagingSenderId: "636431396126",
  appId: "1:636431396126:web:f05a9692e9c9a3edd16d0f"
};

// Variables globales
let app, auth, db;
let isInitialized = false;
let isConnected = true;

// Inicialización
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Configuración silenciosa
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  enableNetwork(db).catch(() => {});
  
  isInitialized = true;
} catch (error) {
  console.error('Firebase init error:', error);
}

// Configurar Google Provider
const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({ prompt: 'select_account' });

// Funciones principales
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    
    if (window.toggleSectionsForAuth) {
      window.toggleSectionsForAuth(true);
    }
    
    setTimeout(() => {
      if (window.setActiveSection) {
        window.setActiveSection('dashboard');
      }
    }, 100);
    
    return result.user;
  } catch (error) {
    const messages = {
      'auth/popup-blocked': 'Popup bloqueado. Permite popups para este sitio.',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet.'
    };
    
    if (window.Utils?.showToast) {
      window.Utils.showToast(messages[error.code] || 'Error al iniciar sesión', 'error');
    }
    throw error;
  }
};

const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    
    if (window.toggleSectionsForAuth) {
      window.toggleSectionsForAuth(false);
    }
    
    if (window.setActiveSection) {
      window.setActiveSection('dashboard');
    }
  } catch (error) {
    if (window.Utils?.showToast) {
      window.Utils.showToast('Error al cerrar sesión', 'error');
    }
    throw error;
  }
};

const getCurrentUser = () => auth?.currentUser || null;
const isUserLoggedIn = () => !!getCurrentUser();

// Verificación de conexión simple
const checkFirestoreConnection = async () => {
  if (!db || !isConnected) return false;
  try {
    const testRef = doc(db, '_test', 'connection');
    await getDoc(testRef);
    return true;
  } catch {
    isConnected = false;
    return false;
  }
};

const reconnectFirestore = async () => {
  if (!db) return false;
  try {
    await enableNetwork(db);
    isConnected = await checkFirestoreConnection();
    return isConnected;
  } catch {
    return false;
  }
};

// Observer de autenticación
if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      updateUserProfile(user);
      if (window.toggleSectionsForAuth) {
        window.toggleSectionsForAuth(true);
      }
    } else {
      if (window.toggleSectionsForAuth) {
        window.toggleSectionsForAuth(false);
      }
    }
  });
}

// Actualizar perfil
function updateUserProfile(user) {
  const elements = [
    { id: 'userAvatar', prop: 'src', value: user.photoURL },
    { id: 'userName', prop: 'textContent', value: user.displayName || 'Usuario' },
    { id: 'profileAvatar', prop: 'src', value: user.photoURL },
    { id: 'profileName', prop: 'textContent', value: user.displayName || 'Usuario' }
  ];
  
  elements.forEach(({ id, prop, value }) => {
    const element = document.getElementById(id);
    if (element && value) {
      element[prop] = value;
    }
  });
  
  const profileEmail = document.getElementById('profileEmail');
  if (profileEmail) {
    const emailSpan = profileEmail.querySelector('svg')?.nextSibling;
    if (emailSpan) {
      emailSpan.textContent = user.email || 'email@ejemplo.com';
    }
  }
  
  if (window.ProfileManager?.update) {
    window.ProfileManager.update(user);
  }
}

// Verificar redirect
setTimeout(() => {
  if (auth) {
    getRedirectResult(auth).then((result) => {
      if (result?.user && window.setActiveSection) {
        window.setActiveSection('dashboard');
      }
    }).catch(() => {});
  }
}, 500);

// Listeners de red
window.addEventListener('online', () => {
  isConnected = true;
  reconnectFirestore();
});

window.addEventListener('offline', () => {
  isConnected = false;
  if (db) disableNetwork(db).catch(() => {});
});

// Cleanup
window.addEventListener('beforeunload', () => {
  if (db) terminate(db).catch(() => {});
});

// Exportaciones globales
export {
  auth,
  db,
  provider,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  isUserLoggedIn,
  checkFirestoreConnection,
  reconnectFirestore,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  getDoc,
  enableNetwork,
  disableNetwork
};