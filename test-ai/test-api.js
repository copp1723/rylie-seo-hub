#!/usr/bin/env node

// Quick test to verify OpenRouter API is working
const AIAgentEngine = require('../ai-agent-engine');

async function testAI() {
  console.log('🧪 Testing OpenRouter API Connection...\n');
  
  try {
    const engine = new AIAgentEngine();
    
    // Simple test
    const response = await engine.callOpenRouter([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Hello, AI is working!" if you can read this.' }
    ], 'openai/gpt-3.5-turbo');
    
    console.log('✅ API Response:', response);
    console.log('\n🎉 OpenRouter API is working correctly!');
    
    // Test available models
    console.log('\n📋 Available model configs:');
    console.log(JSON.stringify(engine.modelConfig, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nPlease make sure:');
    console.log('1. You have set OPENROUTER_API_KEY in your .env file');
    console.log('2. You have run: export OPENROUTER_API_KEY="your-key"');
    console.log('3. Your API key is valid');
  }
}

testAI();
