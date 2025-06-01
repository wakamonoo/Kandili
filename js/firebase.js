import { firebaseConfig } from './config.js';

// ━━━━━━━━━━━━━━━━━━ Initialize Firebase (Only Once) ━━━━━━━━━━━━━━━━━━ //
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ━━━━━━━━━━━━━━━━━━ Firebase Services Exports ━━━━━━━━━━━━━━━━━━ //
export const auth = firebase.auth();
export const db = firebase.firestore();
export const FieldValue = firebase.firestore.FieldValue; 
