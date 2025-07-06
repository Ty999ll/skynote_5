// Nicole: Setting up Firebase auth integration - Week 3 Day 4
// This replaces our custom JWT system with Firebase for better scalability
import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, signOut, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// Nicole: Login with Google redirect - cleaner than popup for mobile
export const loginWithGoogle = () => {
  return signInWithRedirect(auth, provider);
};

// Nicole: Handle redirect result after Google auth
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const user = result.user;
      // Tyrell: Should we store additional user data here?
      // Nicole: Yes, we'll sync with our backend user system
      return user;
    }
    return null;
  } catch (error) {
    console.error("Firebase redirect error:", error);
    throw error;
  }
};

// Nicole: Logout function
export const logout = () => {
  return signOut(auth);
};

// Nicole: Auth state listener
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};