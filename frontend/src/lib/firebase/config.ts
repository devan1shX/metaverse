import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDckK6rAhSrMrk7-nWGfgq_tSQpuwMcnGQ",
  authDomain: "remote-office-metaverse.firebaseapp.com",
  projectId: "remote-office-metaverse",
  storageBucket: "remote-office-metaverse.firebasestorage.app",
  messagingSenderId: "836212594440",
  appId: "1:836212594440:web:7ca9c7a0fe870945367ebd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app;