#!/usr/bin/env node

// Direct test with your API key
const https = require('https');

async function testAPI() {
  // Use the API key directly
  const apiKey = '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';
  
  console.log('🔑 Testing with API Key:', apiKey.substring(0, 30) + '...');
  console.log('🔍 Key length:', apiKey.length, 'characters');
  
  const data = JSON.stringify({
    "model": "openai/gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Say hello"}
    ]
  });

  const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/rylie-seo-hub',
      'X-Title': 'Rylie SEO Hub',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  console.log('\n📤 Request headers:', JSON.stringify(options.headers, null, 2));
  console.log('\n📤 Sending request...');
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log('\n📡 Status Code:', res.statusCode);
      
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('\n📥 Response:');
        try {
          const parsed = JSON.parse(body);
          console.log(JSON.stringify(parsed, null, 2));
          
          if (parsed.choices && parsed.choices[0]) {
            console.log('\n✅ SUCCESS! AI responded:', parsed.choices[0].message.content);
          }
        } catch (e) {
          console.log(body);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error);
    });

    req.write(data);
    req.end();
  });
}

// Also check environment
console.log('🔧 Environment check:');
console.log('OPENROUTER_API_KEY from env:', process.env.OPENROUTER_API_KEY ? 'Set (' + process.env.OPENROUTER_API_KEY.substring(0, 20) + '...)' : 'Not set');
console.log('Current directory:', process.cwd());
console.log('.env file exists:', require('fs').existsSync('.env'));

console.log('\n🧪 Running direct API test...\n');
testAPI().catch(console.error);
