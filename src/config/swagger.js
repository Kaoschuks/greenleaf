const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// Auto-detect the server URL based on environment
const getServerUrl = () => {
  // Check for explicit environment variable first
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  
  // Check for PORT environment variable
  const port = process.env.PORT || 5000;
  const host = process.env.HOST || 'localhost';
  
  // Determine protocol based on environment
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  return `${protocol}://${host}:${port}`;
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Greenleaf Admin API Service',
      version: '1.0.0',
      description: 'API documentation',
    },
    servers: [
      {
        url: getServerUrl(),
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, './schemas.js')
  ], 
};

const specs = swaggerJsdoc(options);

// Function to get dynamic specs with current server URL
const getDynamicSpecs = (req) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  return {
    ...specs,
    servers: [
      { url: baseUrl },
    ],
  };
};

module.exports = { specs, swaggerUi, getDynamicSpecs, getServerUrl };