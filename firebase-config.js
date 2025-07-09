import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
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

// ✅ CONFIGURACIÓN COMPLETA Y REAL
const firebaseConfig = {
  apiKey: "AIzaSyA1BDDuOFETmU0WFVwzgSgsvk9oUG3ZLgo",
  authDomain: "estudiafacil-63064.firebaseapp.com",
  projectId: "estudiafacil-63064",
  storageBucket: "estudiafacil-63064.firebasestorage.app",
  messagingSenderId: "636431396126",
  appId: "1:636431396126:web:f05a9692e9c9a3edd16d0f"
};

console.log('🔥 EstudiaFácil v3.0 - Firebase Configuración Completa');
console.log('👤 Developer: EiderMontalvo');
console.log('🕒 UTC: 2025-07-09 21:34:25');
console.log('📱 Project: EstudiaFacil (' + firebaseConfig.projectId + ')');
console.log('🌐 Auth Domain: ' + firebaseConfig.authDomain);
console.log('🆔 App ID: ' + firebaseConfig.appId);

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar persistencia
setPersistence(auth, browserLocalPersistence).then(() => {
  console.log('✅ Persistencia configurada correctamente');
}).catch((error) => {
  console.warn('⚠️ Error configurando persistencia:', error);
});

// Google Provider optimizado para GitHub Pages
const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'online'
});

console.log('✅ Firebase y Google Auth configurados correctamente');
console.log('🚀 EstudiaFácil v3.0 listo para login');

export {
  auth,
  db,
  provider,
  signInWithPopup,
  signInWithRedirect,
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
};
