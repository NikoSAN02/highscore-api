// lib/firebase.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK only once
let firebaseApp;
let db;
let serviceAccount;

function getServiceAccount() {
  if (!serviceAccount) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else if (process.env.NODE_ENV !== 'production') {
        // Only try local file in development
        serviceAccount = require('../serviceAccountKey.json');
      } else {
        throw new Error('Firebase credentials not found');
      }
    } catch (error) {
      console.error('Error loading Firebase credentials:', error);
      throw new Error(`Failed to load Firebase credentials: ${error.message}`);
    }
  }
  return serviceAccount;
}

function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      const credentials = getServiceAccount();
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://highscore-api-default-rtdb.europe-west1.firebasedatabase.app/'
      });
    } else {
      firebaseApp = admin.app();
    }
    
    if (!db) {
      db = admin.database();
    }
    
    return db;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw new Error(`Firebase initialization failed: ${error.message}`);
  }
}

// Simplified database operations with error handling
async function getScores(limit = 100) {
  try {
    const db = initializeFirebase();
    const scoresRef = db.ref('scores');
    const snapshot = await scoresRef.orderByValue().limitToLast(limit).once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error getting scores:', error);
    throw error;
  }
}

async function saveScore(address, score) {
  try {
    const db = initializeFirebase();
    const userRef = db.ref('scores').child(address);
    const snapshot = await userRef.once('value');
    const existingScore = snapshot.val();
    
    if (existingScore && existingScore > score) {
      return { 
        updated: false,
        message: 'Higher score exists',
        currentScore: existingScore, 
        newScore: score 
      };
    }
    
    await userRef.set(score);
    return { 
      updated: true,
      message: 'Score updated',
      score 
    };
  } catch (error) {
    console.error('Error saving score:', error);
    throw error;
  }
}

async function testConnection() {
  try {
    const db = initializeFirebase();
    const testRef = db.ref('test');
    await testRef.set({ 
      message: 'Firebase is working!', 
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'unknown'
    });
    return true;
  } catch (error) {
    console.error('Test connection error:', error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  getScores,
  saveScore,
  testConnection
};