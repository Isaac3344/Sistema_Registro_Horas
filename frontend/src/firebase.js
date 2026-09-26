// Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCJinmQgWHWEq47tFNPhJVwOPMiWRApkk",
  authDomain: "control-de-jornadas-1a06f.firebaseapp.com",
  projectId: "control-de-jornadas-1a06f",
  storageBucket: "control-de-jornadas-1a06f.firebasestorage.app",
  messagingSenderId: "326301347551",
  appId: "1:326301347551:web:1f5736d5ef025b0f27836a",
  measurementId: "G-99ZTCC1KBQ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);

export default app;