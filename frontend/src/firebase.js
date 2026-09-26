// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjInmQgWHWEq47tFNPhJVwOPMiwRmApkk",
  authDomain: "control-de-jornadas-1a06f.firebaseapp.com",
  projectId: "control-de-jornadas-1a06f",
  storageBucket: "control-de-jornadas-1a06f.firebasestorage.app",
  messagingSenderId: "326301347551",
  appId: "1:326301347551:web:1f5736d5ef025b0f27836a",
  measurementId: "G-99ZTCC1KBQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);