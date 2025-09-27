const express = require('express');
const axios = require('axios');
const router = express.Router();

// Get forecast API URL from environment variables
const FORECAST_API_URL = process.env.FORECAST_API_URL || 'https://14693d563f84.ngrok-free.app';

// POST /api/chat - Handle chat messages
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }

    console.log('Sending chat message to external API:', message);

    // Send the message to the external forecast/chat API
    const response = await axios.post(`${FORECAST_API_URL}/chat`, {
      message: message,
      timestamp: new Date().toISOString(),
      source: 'stockpilot_backend'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 10000, // 10 second timeout
      maxRedirects: 5
    });

    console.log('External API response:', response.data);

    res.json({
      response: response.data.response || response.data.message || response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error.message);
    
    // Provide fallback response when external API fails
    res.json({
      response: 'Sorry, I\'m having trouble connecting to the AI service right now. Please try again later.',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;