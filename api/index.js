// api/index.js
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serverless = require('serverless-http');

// Initialize Firebase Admin SDK with environment variables or service account
// Lazy loading to prevent cold start issues
let serviceAccount;

function getServiceAccount() {
  if (!serviceAccount) {
    try {
      // Try to use environment variables first
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        // Fall back to local file (not recommended for production)
        serviceAccount = require('../serviceAccountKey.json');
      }
    } catch (error) {
      console.error('Error loading Firebase credentials:', error);
      throw new Error(`Failed to load Firebase credentials: ${error.message}`);
    }
  }
  return serviceAccount;
}

// Initialize Firebase only once - with lazy loading
let firebaseApp;
let db;

// Helper function to initialize Firebase only when needed
function getFirebaseDb() {
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
}
const app = express();
app.use(bodyParser.json());

// Timeout middleware
app.use((req, res, next) => {
  // Set a timeout for all requests (10 seconds)
  req.setTimeout(10000, () => {
    res.status(503).json({
      error: 'Request timeout',
      message: 'The request is taking too long to process.'
    });
  });
  next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'API is working!' });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const db = getFirebaseDb();
    const testRef = db.ref('test');
    await testRef.set({ message: 'Firebase is working!', timestamp: Date.now() });
    res.status(200).json({ message: 'Firebase connection successful.' });
  } catch (error) {
    console.error('Firebase connection error:', error);
    res.status(500).json({ 
      error: 'Firebase connection failed.', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Save score endpoint
app.post('/api/save-score', async (req, res) => {
  const { address, score } = req.body;
  
  if (!address || score === undefined) {
    return res.status(400).json({ error: 'Address and score are required.' });
  }
  
  // Convert score to number if it's not already
  const scoreNumber = Number(score);
  if (isNaN(scoreNumber)) {
    return res.status(400).json({ error: 'Score must be a valid number.' });
  }

  try {
    const db = getFirebaseDb();
    const userRef = db.ref('scores').child(address);
    const snapshot = await userRef.once('value');
    const existingScore = snapshot.val();
    
    if (existingScore && existingScore > scoreNumber) {
      return res.status(200).json({ 
        message: 'There is a higher score present for you.',
        currentScore: existingScore,
        newScore: scoreNumber
      });
    }
    
    await userRef.set(scoreNumber);
    res.status(200).json({ 
      message: 'Score saved successfully.',
      address,
      score: scoreNumber 
    });
  } catch (error) {
    console.error('Save score error:', error);
    res.status(500).json({ 
      error: 'Something went wrong while saving score.', 
      details: error.message 
    });
  }
});

// Get top users endpoint
app.get('/api/top-users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const db = getFirebaseDb();
    const scoresRef = db.ref('scores');
    const snapshot = await scoresRef.orderByValue().limitToLast(limit).once('value');
    const scores = snapshot.val();
    
    if (!scores) {
      return res.status(200).json({ 
        message: 'No scores found.',
        scores: [] 
      });
    }
    
    const topUsers = Object.entries(scores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([address, score]) => ({ address, score }));
    
    res.status(200).json({
      count: topUsers.length,
      scores: topUsers
    });
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({ 
      error: 'Something went wrong while fetching top users.', 
      details: error.message 
    });
  }
});

// This is for local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the serverless handler for Vercel
module.exports = serverless(app);