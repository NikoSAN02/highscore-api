// api/test-db.js
const { testConnection } = require('../lib/firebase');

module.exports = async (req, res) => {
  try {
    await testConnection();
    res.status(200).json({ 
      success: true,
      message: 'Firebase connection successful.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Firebase connection failed.',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};