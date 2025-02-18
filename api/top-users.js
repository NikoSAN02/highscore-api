// api/top-users.js
const { getScores } = require('../lib/firebase');

module.exports = async (req, res) => {
  try {
    // Get limit from query params or use default of 20 (smaller limit to avoid timeouts)
    const limit = parseInt(req.query.limit) || 20;
    
    // Enforce reasonable limits (1-100)
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    
    // Get scores
    const scores = await getScores(safeLimit);
    
    if (!scores || Object.keys(scores).length === 0) {
      return res.status(200).json({ 
        success: true,
        message: 'No scores found.',
        scores: [] 
      });
    }
    
    // Transform and sort scores
    const topUsers = Object.entries(scores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([address, score]) => ({ address, score }));
    
    res.status(200).json({
      success: true,
      count: topUsers.length,
      limit: safeLimit,
      scores: topUsers
    });
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Something went wrong while fetching top users.',
      details: error.message 
    });
  }
};