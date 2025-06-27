#!/usr/bin/env node

// Enhanced test with better error handling
const https = require('https');

async function testOpenRouterAPI() {
  console.log('🧪 Testing OpenRouter API Connection...\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found in environment');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 20) + '...');
  
  const data = JSON.stringify({
    model: 'openai/gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Hello, AI is working!" if you can read this.' }
    ],
    temperature: 0.7,
    max_tokens: 100
  });

  const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/rylie-seo-hub',
      'X-Title': 'Multi-Agent Development System',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      console.log('📡 Response Status:', res.statusCode);
      console.log('📋 Response Headers:', res.headers);
      
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('\n📥 Raw Response:', body);
        
        try {
          const response = JSON.parse(body);
          
          if (response.error) {
            console.error('\n❌ API Error:', response.error);
            return;
          }
          
          if (response.choices && response.choices[0]) {
            console.log('\n✅ Success! AI Response:', response.choices[0].message.content);
            console.log('\n🎉 OpenRouter API is working correctly!');
          } else {
            console.log('\n⚠️  Unexpected response format:', response);
          }
        } catch (e) {
          console.error('\n❌ Failed to parse response:', e.message);
          console.log('Response body:', body);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('\n❌ Request failed:', error.message);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Run the test
testOpenRouterAPI().catch(console.error);
