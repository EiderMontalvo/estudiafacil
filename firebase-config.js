import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔐 TU CONFIGURACIÓN FIREBASE - REEMPLAZA CON LA TUYA

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

// Configurar Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');
provider.setCustomParameters({
  prompt: 'select_account'
});

console.log('✅ Firebase inicializado correctamente');

// Exportar todo lo necesario
export { 
  app,
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
};