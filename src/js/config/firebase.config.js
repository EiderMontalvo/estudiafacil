import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, 
  signOut as firebaseSignOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {getFirestore, collection, addDoc, getDocs, deleteDoc, doc, orderBy, query, where,
  serverTimestamp, updateDoc, increment, setDoc, getDoc, enableNetwork, disableNetwork
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// configuracion de firebase
const firebaseConfig = {
  apiKey: "AIzaSyA1BDDuOFETmU0WFVwzgSgsvk9oUG3ZLgo",
  authDomain: "estudiafacil-63064.firebaseapp.com",
  projectId: "estudiafacil-63064",
  storageBucket: "estudiafacil-63064.firebasestorage.app",
  messagingSenderId: "636431396126",
  appId: "1:636431396126:web:f05a9692e9c9a3edd16d0f"
};

let app = null;
let auth = null;
let db = null;
let provider = null;
let isInitialized = false;

async function initializeFirebase() {
  if (isInitialized) return true;

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    await setPersistence(auth, browserLocalPersistence);
    await enableNetwork(db);

    isInitialized = true;
    return true;
  } catch (error) {
    isInitialized = false;
    throw new Error(`Inicialización de firebase fallida: ${error.message}`);
  }
}

// verificar si firebase se inicializo
function isFirebaseReady() {
  return isInitialized && auth !== null && db !== null;
}

function getAuthInstance() {
  return auth;
}

function getDbInstance() {
  return db;
}

function getGoogleProvider() {
  return provider;
}

export {
  // instancias
  auth, db, provider,
  
  // funciones de inicializacion
  initializeFirebase, isFirebaseReady, getAuthInstance, getDbInstance, getGoogleProvider,
  
  // funciones de autenticacion
  signInWithPopup, signInWithRedirect, getRedirectResult, firebaseSignOut as signOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence,
  
  // funciones de firestore
  collection, addDoc, getDocs, deleteDoc, doc, orderBy, query, where,
  serverTimestamp, updateDoc, increment, setDoc, getDoc, enableNetwork, disableNetwork
};