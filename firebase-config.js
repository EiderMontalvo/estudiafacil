import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import {
  getFirestore,
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
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA1BDDuOFETmU0WFVwzgSgsvk9oUG3ZLgo",
  authDomain: "estudiafacil-63064.firebaseapp.com",
  projectId: "estudiafacil-63064",
  storageBucket: "estudiafacil-63064.firebasestorage.app",
  messagingSenderId: "636431396126",
  appId: "1:636431396126:web:f05a9692e9c9a3edd16d0f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar persistencia
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error configurando persistencia:', error);
});

// Configurar Google Provider
const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'online'
});

// CREAR LAS FUNCIONES ANTES DE EXPORTARLAS
const signInWithGoogle = async () => {
  try {
    console.log('🔑 Iniciando login con Google...');
    const result = await signInWithPopup(auth, provider);
    console.log('✅ Login exitoso:', result.user);
    
    // Actualizar UI inmediatamente
    if (window.toggleSectionsForAuth) {
      window.toggleSectionsForAuth(true);
    }
    
    // Navegar al dashboard
    setTimeout(() => {
      if (window.setActiveSection) {
        window.setActiveSection('dashboard');
      }
    }, 100);
    
    return result.user;
  } catch (error) {
    console.error('❌ Error en login:', error);
    
    // Mostrar error al usuario
    if (window.showToast) {
      window.showToast('Error al iniciar sesión. Intenta de nuevo.', 'error');
    }
    
    throw error;
  }
};

const signOut = async () => {
  try {
    console.log('🚪 Cerrando sesión...');
    await firebaseSignOut(auth);
    console.log('✅ Logout exitoso');
    
    // Actualizar UI
    if (window.toggleSectionsForAuth) {
      window.toggleSectionsForAuth(false);
    }
    
    // Volver al dashboard (hero)
    if (window.setActiveSection) {
      window.setActiveSection('dashboard');
    }
    
  } catch (error) {
    console.error('❌ Error en logout:', error);
    if (window.showToast) {
      window.showToast('Error al cerrar sesión', 'error');
    }
    throw error;
  }
};

const getCurrentUser = () => {
  return auth.currentUser;
};

// EXPORTAR FUNCIONES AL WINDOW (AHORA SÍ ESTÁN DEFINIDAS)
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.auth = auth;
window.db = db;

// También exportar funciones para módulos ES6
export {
  auth,
  db,
  provider,
  signInWithGoogle,
  signOut,
  getCurrentUser,
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
  getDoc
};

console.log('🔥 Firebase initialized and functions exported:', {
  signInWithGoogle: !!window.signInWithGoogle,
  signOut: !!window.signOut,
  getCurrentUser: !!window.getCurrentUser,
  auth: !!window.auth
});

// Observer de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('👤 Usuario logueado:', user.displayName || user.email);
    
    // Actualizar perfil de usuario en navbar
    updateUserProfile(user);
    
    // Mostrar secciones de usuario autenticado
    if (window.toggleSectionsForAuth) {
      window.toggleSectionsForAuth(true);
    }
    
  } else {
    console.log('👤 Usuario no logueado');
    
    // Ocultar secciones de usuario
    if (window.toggleSectionsForAuth) {
      window.toggleSectionsForAuth(false);
    }
  }
});

// Función para actualizar perfil de usuario en UI
function updateUserProfile(user) {
  // Actualizar navbar
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  
  if (userAvatar && user.photoURL) {
    userAvatar.src = user.photoURL;
    userAvatar.alt = user.displayName || 'Usuario';
  }
  
  if (userName) {
    userName.textContent = user.displayName || 'Usuario';
  }
  
  // Actualizar perfil
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  
  if (profileAvatar && user.photoURL) {
    profileAvatar.src = user.photoURL;
  }
  
  if (profileName) {
    profileName.textContent = user.displayName || 'Usuario';
  }
  
  if (profileEmail) {
    const emailSpan = profileEmail.querySelector('svg').nextSibling;
    if (emailSpan) {
      emailSpan.textContent = user.email || 'email@ejemplo.com';
    }
  }
}

// Verificar resultado de redirect al cargar
getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      console.log('✅ Login por redirect exitoso:', result.user);
      if (window.setActiveSection) {
        window.setActiveSection('dashboard');
      }
    }
  })
  .catch((error) => {
    console.error('❌ Error en redirect result:', error);
  });

console.log('🚀 Firebase config loaded successfully');
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.doc = doc;
window.deleteDoc = deleteDoc;
window.updateDoc = updateDoc;
window.query = query;
window.where = where;
window.orderBy = orderBy;
window.serverTimestamp = serverTimestamp;

console.log('🔥 Firestore functions exported:', {
  collection: !!window.collection,
  addDoc: !!window.addDoc,
  getDocs: !!window.getDocs
});