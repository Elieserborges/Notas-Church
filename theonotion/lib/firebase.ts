import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAa93nF9vMGRkQ3jeBUzl4llAdMN6rEsAU",
    authDomain: "notion-church.firebaseapp.com",
    projectId: "notion-church",
    storageBucket: "notion-church.firebasestorage.app",
    messagingSenderId: "128317489151",
    appId: "1:128317489151:web:3156e84663507bbc5f31ca",
    measurementId: "G-T87CV5BQJ8"
};

// Initialize Firebase
// Verifica se já existe uma instância para evitar recriar no hot-reload/server
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Analytics apenas no browser
let analytics;
if (typeof window !== 'undefined') {
    // import("firebase/analytics").then((isSupported) => { ... }) 
    // Simplificado para evitar erros no server por enquanto
}

export { app, auth, db };
