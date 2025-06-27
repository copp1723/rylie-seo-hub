#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// Get complete list of models
async function getAllModels() {
  const apiKey = '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';
  
  const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/rylie-seo-hub',
      'X-Title': 'Model List'
    }
  };

  console.log('📋 Fetching complete model list...\n');
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.data) {
            // Group models by provider
            const modelsByProvider = {};
            
            parsed.data.forEach(model => {
              const provider = model.id.split('/')[0];
              if (!modelsByProvider[provider]) {
                modelsByProvider[provider] = [];
              }
              modelsByProvider[provider].push({
                id: model.id,
                name: model.name,
                contextLength: model.context_length,
                pricing: model.pricing
              });
            });
            
            // Find specific models we're interested in
            console.log('🎯 Key Models for Your System:\n');
            
            // OpenAI models
            console.log('OpenAI Models:');
            const openaiModels = modelsByProvider['openai'] || [];
            openaiModels.filter(m => 
              m.id.includes('gpt-4') || 
              m.id.includes('o1') || 
              m.id.includes('o3')
            ).forEach(m => {
              console.log(`  - ${m.id} (${m.contextLength} tokens)`);
            });
            
            // Anthropic models
            console.log('\nAnthropic Models:');
            const anthropicModels = modelsByProvider['anthropic'] || [];
            anthropicModels.filter(m => 
              m.id.includes('claude')
            ).forEach(m => {
              console.log(`  - ${m.id} (${m.contextLength} tokens)`);
            });
            
            // Google models
            console.log('\nGoogle Models:');
            const googleModels = modelsByProvider['google'] || [];
            googleModels.filter(m => 
              m.id.includes('gemini')
            ).forEach(m => {
              console.log(`  - ${m.id} (${m.contextLength} tokens)`);
            });
            
            // DeepSeek models
            console.log('\nDeepSeek Models:');
            const deepseekModels = modelsByProvider['deepseek'] || [];
            deepseekModels.forEach(m => {
              console.log(`  - ${m.id} (${m.contextLength} tokens)`);
            });
            
            // Qwen models
            console.log('\nQwen Models:');
            const qwenModels = modelsByProvider['qwen'] || [];
            qwenModels.forEach(m => {
              console.log(`  - ${m.id} (${m.contextLength} tokens)`);
            });
            
            // Grok models
            console.log('\nX.AI (Grok) Models:');
            const xaiModels = modelsByProvider['x-ai'] || [];
            xaiModels.forEach(m => {
              console.log(`  - ${m.id} (${m.contextLength} tokens)`);
            });
            
            // MiniMax models
            console.log('\nMiniMax Models:');
            const minimaxModels = modelsByProvider['minimax'] || [];
            minimaxModels.forEach(m => {
              console.log(`  - ${m.id} (${m.contextLength} tokens)`);
            });
            
            // Save full list to file
            fs.writeFileSync('available-models.json', JSON.stringify(parsed.data, null, 2));
            console.log('\n✅ Full model list saved to available-models.json');
            
          } else {
            console.log('Response:', body);
          }
        } catch (e) {
          console.log('Error:', e.message);
        }
      });
    });

    req.on('error', console.error);
    req.end();
  });
}

getAllModels();
