// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, GeoPoint } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";

// Export GeoPoint for use in other files
export { GeoPoint };

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize the Vertex AI service
const vertexAI = getVertexAI(app);

// Initialize the generative model with Gemini
export const geminiModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
});

// Enable anonymous authentication as fallback
export const signInAnonymousUser = () => {
  return signInAnonymously(auth)
    .then((userCredential) => {
      console.log("Anonymous user signed in:", userCredential.user);
      return userCredential.user;
    })
    .catch((error) => {
      console.error("Error signing in anonymously:", error);
      throw error;
    });
};

// Listen to authentication state changes
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};
