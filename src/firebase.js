// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// --- UPDATED IMPORTS ---
// We need getAuth for user login, getFirestore for chat messages, and getDatabase for the real-time presence system.
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADaJANdCkp7mc-x1S1V6_OUpaxyC3ewA4",
  authDomain: "irysmail-c41e8.firebaseapp.com",
  projectId: "irysmail-c41e8",
  storageBucket: "irysmail-c41e8.firebasestorage.app",
  messagingSenderId: "975907054349",
  appId: "1:975907054349:web:b30f101b3451ae06f1c644",
  measurementId: "G-S5VVCSGZYW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// --- UPDATED EXPORTS ---
// Initialize and export the Firebase services so other parts of our app can use them.
export const auth = getAuth(app);         // For handling user authentication
export const db = getFirestore(app);      // For chat messages and user profiles
export const rtdb = getDatabase(app);     // For the real-time online/offline status