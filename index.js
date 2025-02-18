const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://highscore-api-default-rtdb.europe-west1.firebasedatabase.app/' // Replace with your database URL
});

const db = admin.database();
const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.get('/test-db', async (req, res) => {
    try {
      const testRef = db.ref('test');
      await testRef.set({ message: 'Firebase is working!' });
      res.status(200).json({ message: 'Firebase connection successful.' });
    } catch (error) {
      res.status(500).json({ error: 'Firebase connection failed.', details: error.message });
    }
  });


// Endpoint to save/update score
app.post('/save-score', async (req, res) => {
  const { address, score } = req.body;

  if (!address || !score) {
    return res.status(400).json({ error: 'Address and score are required.' });
  }

  try {
    const userRef = db.ref('scores').child(address);
    const snapshot = await userRef.once('value');
    const existingScore = snapshot.val();

    if (existingScore && existingScore > score) {
      return res.status(200).json({ message: 'There is a higher score present for you.' });
    }

    await userRef.set(score);
    res.status(200).json({ message: 'Score saved successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong.', details: error.message });
  }
});

// Endpoint to get top 100 users
app.get('/top-users', async (req, res) => {
  try {
    const scoresRef = db.ref('scores');
    const snapshot = await scoresRef.orderByValue().limitToLast(100).once('value');
    const scores = snapshot.val();

    if (!scores) {
      return res.status(200).json({ message: 'No scores found.' });
    }

    const topUsers = Object.entries(scores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([address, score]) => ({ address, score }));

    res.status(200).json(topUsers);
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong.', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});