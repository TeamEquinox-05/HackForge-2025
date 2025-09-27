const express = require('express');
const axios = require('axios');
const router = express.Router();

// Get forecast API URL from environment variables
const FORECAST_API_URL = process.env.FORECAST_API_URL || 'https://978f99f96b73.ngrok-free.app';

// Get general forecast (no specific product)
router.get('/forecast', async (req, res) => {
  try {
    console.log('Fetching general forecast from external API via POST...');
    
    const response = await axios.get(`${FORECAST_API_URL}/forecast`, {
      // Send any relevant data for forecasting
      timestamp: new Date().toISOString(),
      type: 'general_forecast'
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Add ngrok-skip-browser-warning header if needed
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 10000, // 10 second timeout
      maxRedirects: 5
    });

    console.log('Forecast API response:', response.data);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching forecast:', error.message);
    
    // Provide fallback data when external API fails
    const fallbackData = {
      message: 'External forecast API unavailable',
      forecast: 'Unable to generate forecast at this time. Please check if the external API is running.',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: false,
      message: 'External forecast API unavailable',
      data: fallbackData,
      error: error.message
    });
  }
});

// Get forecast for specific product/entity by ID
router.get('/forecast/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching forecast for ID: ${id} via POST`);
    
    const response = await axios.post(`${FORECAST_API_URL}/forecast`, {
      // Send the ID and relevant data for specific forecasting
      id: id,
      timestamp: new Date().toISOString(),
      type: 'specific_forecast'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 10000, // 10 second timeout
      maxRedirects: 5
    });

    console.log('Forecast API response:', response.data);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching forecast for ID:', error.message);
    
    // Provide fallback data when external API fails
    const fallbackData = {
      id: id,
      message: 'External forecast API unavailable',
      forecast: `Unable to generate forecast for ID ${id} at this time. Please check if the external API is running.`,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: false,
      message: `External forecast API unavailable for ID: ${id}`,
      data: fallbackData,
      error: error.message
    });
  }
});

// POST endpoint for advanced forecast requests
router.post('/forecast/predict', async (req, res) => {
  try {
    const { productId, timeframe, historical_data, forecast_type } = req.body;
    console.log('Sending POST request to forecast API with data:', req.body);
    
    const response = await axios.post(`${FORECAST_API_URL}/predict`, {
      productId: productId,
      timeframe: timeframe || '30days',
      historical_data: historical_data || [],
      forecast_type: forecast_type || 'demand',
      timestamp: new Date().toISOString(),
      source: 'stockpilot_backend'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 15000, // 15 second timeout for complex predictions
      maxRedirects: 5
    });

    console.log('Forecast API response:', response.data);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error with forecast prediction POST request:', error.message);
    
    // Provide fallback data when external API fails
    const fallbackData = {
      message: 'External forecast API unavailable',
      prediction: 'Unable to generate prediction at this time. Please check if the external API is running.',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: false,
      message: 'External forecast API unavailable',
      data: fallbackData,
      error: error.message
    });
  }
});

module.exports = router;