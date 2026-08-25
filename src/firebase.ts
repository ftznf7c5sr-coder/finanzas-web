import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
const firebaseConfig = {
  apiKey: "AIzaSyBmZprnaTDzoRfKzKOhMnyUE-QuAysUy94",
  authDomain: "finanzas-puchi.firebaseapp.com",
  projectId: "finanzas-puchi",
  storageBucket: "finanzas-puchi.firebasestorage.app",
  messagingSenderId: "644613134560",
  appId: "1:644613134560:web:ff2b1c25d3a68045695885"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })