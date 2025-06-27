#!/usr/bin/env node

const https = require('https');

// Test with curl-equivalent request
async function testAPI() {
  const apiKey = process.env.OPENROUTER_API_KEY || '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';
  
  console.log('🔑 Using API Key:', apiKey.substring(0, 20) + '...');
  
  const data = JSON.stringify({
    "model": "openai/gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  });

  const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/user/app', // Required by OpenRouter
      'X-Title': 'Test App', // Optional but recommended
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  console.log('\n📤 Sending request to OpenRouter...');
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log('📡 Status Code:', res.statusCode);
      console.log('📋 Headers:', JSON.stringify(res.headers, null, 2));
      
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('\n📥 Response Body:');
        console.log(body);
        
        try {
          const parsed = JSON.parse(body);
          if (parsed.choices && parsed.choices[0]) {
            console.log('\n✅ SUCCESS! AI says:', parsed.choices[0].message.content);
          } else if (parsed.error) {
            console.log('\n❌ Error:', parsed.error);
          }
        } catch (e) {
          console.log('\n❌ Failed to parse response');
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

// Also test with curl command for comparison
console.log('💡 You can also test with curl:');
console.log(`
curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer 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" \\
  -H "HTTP-Referer: https://github.com/user/app" \\
  -H "X-Title: Test" \\
  -d '{
    "model": "openai/gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
`);

console.log('\n🧪 Running API test...\n');
testAPI().catch(console.error);
