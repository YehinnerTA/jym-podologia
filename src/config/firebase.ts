import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAILJOzuioe6Eiu2UcNSwjOZEe9hBQoQ5U",
    authDomain: "jym-podogologia-sac.firebaseapp.com",
    projectId: "jym-podogologia-sac",
    storageBucket: "jym-podogologia-sac.firebasestorage.app",
    messagingSenderId: "206671834050",
    appId: "1:206671834050:web:6ec2bcdc59cff6e4e2c45b",
    measurementId: "G-QDVFKESC8C"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);