// api/save-score.js
const { saveScore } = require('../lib/firebase');

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, score } = req.body;
    
    // Input validation
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }
    
    // Convert score to number
    const scoreNumber = Number(score);
    if (isNaN(scoreNumber)) {
      return res.status(400).json({ error: 'Score must be a valid number' });
    }
    
    // Save the score
    const result = await saveScore(address, scoreNumber);
    
    if (result.updated) {
      res.status(200).json({ 
        success: true,
        message: 'Score saved successfully.',
        address,
        score: scoreNumber 
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'There is a higher score present for you.',
        currentScore: result.currentScore,
        newScore: scoreNumber
      });
    }
  } catch (error) {
    console.error('Save score error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Something went wrong while saving score.',
      details: error.message 
    });
  }
};