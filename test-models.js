#!/usr/bin/env node

const https = require('https');

// Test with the correct model identifiers
async function testModels() {
  const apiKey = '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';
  
  // Models to test (we'll find the correct identifiers)
  const modelsToTest = [
    'openai/gpt-4-turbo-preview',    // This might work
    'anthropic/claude-3.5-sonnet',   // This might work
    'google/gemini-flash-1.5',       // Common Gemini identifier
    'deepseek/deepseek-chat',        // Common DeepSeek identifier
    'openai/gpt-4o-mini',            // We know this doesn't work
  ];
  
  console.log('🧪 Testing model availability...\n');
  
  for (const model of modelsToTest) {
    const data = JSON.stringify({
      "model": model,
      "messages": [{"role": "user", "content": "Say 'hello' if you work"}],
      "max_tokens": 10
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/rylie-seo-hub',
        'X-Title': 'Model Test',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    await new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (response.choices && response.choices[0]) {
              console.log(`✅ ${model} - WORKS!`);
            } else if (response.error) {
              console.log(`❌ ${model} - ${response.error.message}`);
            }
          } catch (e) {
            console.log(`❌ ${model} - Failed to parse response`);
          }
          resolve();
        });
      });

      req.on('error', (error) => {
        console.log(`❌ ${model} - Request failed: ${error.message}`);
        resolve();
      });

      req.write(data);
      req.end();
    });
  }
  
  console.log('\n💡 Use the working models above in your configuration!');
}

testModels();
