#!/usr/bin/env node

const https = require('https');

// List available models
async function listModels() {
  const apiKey = process.env.OPENROUTER_API_KEY || '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';
  
  const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/user/app',
      'X-Title': 'Test App'
    }
  };

  console.log('🔍 Fetching available models...\n');
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log('Status:', res.statusCode);
      
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.data) {
            console.log('Available models:');
            parsed.data.slice(0, 10).forEach(model => {
              console.log(`- ${model.id}: $${model.pricing?.prompt || 'N/A'} per 1K tokens`);
            });
            console.log(`\n... and ${parsed.data.length - 10} more models`);
          } else {
            console.log('Response:', body);
          }
        } catch (e) {
          console.log('Raw response:', body);
        }
      });
    });

    req.on('error', console.error);
    req.end();
  });
}

listModels();
