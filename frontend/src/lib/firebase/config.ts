import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "",
  authDomain: "remote-office-metaverse.firebaseapp.com",
  projectId: "remote-office-metaverse",
  storageBucket: "remote-office-metaverse.firebasestorage.app",
  messagingSenderId: "",
  appId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);


export default app;
