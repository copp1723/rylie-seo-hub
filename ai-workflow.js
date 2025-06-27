#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

console.log(`
🤖 AI-Powered Multi-Agent Development System
===========================================

This system combines:
- Multi-Agent orchestration with boundaries
- Master Agent oversight and integration  
- AI-powered code generation via OpenRouter
- Access to 300+ language models

`);

async function main() {
  // Check for OpenRouter API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OpenRouter API key not found!');
    console.log('\nTo use AI features, set your API key:');
    console.log('export OPENROUTER_API_KEY=your-key-here\n');
    console.log('Get your key at: https://openrouter.ai/keys\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Continue without AI features? (y/n): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      process.exit(1);
    }
  }

  console.log('Select workflow mode:\n');
  console.log('1. 🤖 Full AI Mode - AI agents write code autonomously');
  console.log('2. 🎯 Hybrid Mode - AI assists human developers');
  console.log('3. 👤 Manual Mode - Traditional multi-agent (no AI)');
  console.log('4. 📊 Status - Check system status');
  console.log('5. 🚀 Demo - See AI capabilities\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const mode = await new Promise(resolve => {
    rl.question('Select mode (1-5): ', resolve);
  });

  switch (mode) {
    case '1':
      await fullAIMode(rl);
      break;
    case '2':
      await hybridMode(rl);
      break;
    case '3':
      await manualMode(rl);
      break;
    case '4':
      await checkStatus();
      break;
    case '5':
      await runDemo();
      break;
    default:
      console.log('Invalid selection');
  }

  rl.close();
}

async function fullAIMode(rl) {
  console.log('\n🤖 Full AI Mode Selected\n');
  
  console.log('Options:');
  console.log('1. Load tickets from file');
  console.log('2. Enter tickets manually');
  console.log('3. Use existing assignments\n');
  
  const option = await new Promise(resolve => {
    rl.question('Select option (1-3): ', resolve);
  });
  
  let tickets = [];
  
  if (option === '1') {
    const file = await new Promise(resolve => {
      rl.question('Enter ticket file path: ', resolve);
    });
    
    // Use master dispatcher to parse and assign
    execSync(`node master-dispatcher.js assign ${file}`);
    
  } else if (option === '2') {
    console.log('\nEnter ticket (format: TICKET-XXX: Description)');
    const ticket = await new Promise(resolve => {
      rl.question('Ticket: ', resolve);
    });
    
    // Parse and assign
    execSync(`node master-dispatcher.js assign "${ticket}"`);
  }
  
  // Now execute AI agents
  console.log('\n🚀 Starting AI agents...\n');
  
  // Read assignments
  const stateFile = '.master-dispatcher-state.json';
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    
    for (const [ticketId, assignment] of Object.entries(state.activeAssignments)) {
      if (assignment.status !== 'completed') {
        console.log(`\n🤖 Deploying AI ${assignment.agent} agent for ${ticketId}...`);
        
        try {
          // Run AI agent
          execSync(`node ai-agent.js ${ticketId} ${assignment.agent}`, {
            stdio: 'inherit'
          });
          
          // Mark as completed
          execSync(`node master-dispatcher.js complete ${ticketId}`);
          
        } catch (e) {
          console.error(`❌ Failed to complete ${ticketId}`);
        }
      }
    }
  }
  
  // Run master integration
  console.log('\n🔄 Running Master Agent integration...');
  execSync('node master-workflow.js standardIntegration', { stdio: 'inherit' });
  
  console.log('\n✅ AI workflow complete!');
}

async function hybridMode(rl) {
  console.log('\n🎯 Hybrid Mode - AI Assists Developers\n');
  
  console.log('In this mode:');
  console.log('- Master assigns tickets to agents');
  console.log('- Developers can use AI assistance');
  console.log('- AI generates code, developers review\n');
  
  // First assign tickets
  const ticketFile = await new Promise(resolve => {
    rl.question('Enter ticket file (or press enter to skip): ', resolve);
  });
  
  if (ticketFile) {
    execSync(`node master-dispatcher.js assign ${ticketFile}`);
  }
  
  // Show instructions
  console.log('\n📋 Instructions for developers:\n');
  console.log('For manual development:');
  console.log('  node agent-task.js\n');
  console.log('For AI-assisted development:');
  console.log('  node ai-agent.js <ticket-id> <agent-type>\n');
  console.log('To check assignments:');
  console.log('  node master-dispatcher.js status\n');
  console.log('AI will generate code based on ticket descriptions.');
  console.log('Developers review and modify before committing.\n');
}

async function manualMode(rl) {
  console.log('\n👤 Manual Mode - Traditional Multi-Agent\n');
  
  console.log('Starting traditional workflow...\n');
  
  // Show available commands
  console.log('Available commands:');
  console.log('  node agent-task.js          - Create agent task');
  console.log('  node orchestrator.js status - Check agent status');
  console.log('  node master-agent.js review - Review pending work');
  console.log('  node master-workflow.js standardIntegration - Integrate\n');
}

async function checkStatus() {
  console.log('\n📊 System Status\n');
  
  // Check dispatcher status
  try {
    console.log('📋 Task Assignments:');
    execSync('node master-dispatcher.js status', { stdio: 'inherit' });
  } catch (e) {
    console.log('No active assignments');
  }
  
  console.log('\n');
  
  // Check agent status  
  try {
    console.log('🤖 Agent Status:');
    execSync('node orchestrator.js status', { stdio: 'inherit' });
  } catch (e) {
    console.log('No active agents');
  }
  
  // Check AI readiness
  console.log('\n🧠 AI Status:');
  if (process.env.OPENROUTER_API_KEY) {
    console.log('✅ OpenRouter API configured');
    console.log('   300+ models available');
  } else {
    console.log('❌ OpenRouter API not configured');
  }
}

async function runDemo() {
  console.log('\n🚀 Running AI Demo...\n');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('❌ Demo requires OpenRouter API key');
    return;
  }
  
  // Run the AI engine demo
  execSync('node ai-agent-engine.js', { stdio: 'inherit' });
}

// Model selection helper
function showModelRecommendations() {
  console.log('\n🎯 Recommended Models by Task:\n');
  
  const recommendations = {
    'Simple Tasks (CRUD, basic UI)': [
      'openai/gpt-3.5-turbo - Fast and cost-effective',
      'google/palm-2-codechat-bison - Good for code'
    ],
    'Complex Logic (algorithms, refactoring)': [
      'anthropic/claude-3-opus-20240229 - Best for complex reasoning',
      'openai/gpt-4 - Excellent general purpose'
    ],
    'Frontend/UI Components': [
      'openai/gpt-4 - Great for React/TypeScript',
      'anthropic/claude-2 - Good for creative UI'
    ],
    'Backend/APIs': [
      'openai/gpt-4-turbo-preview - Latest knowledge',
      'anthropic/claude-3-opus-20240229 - Excellent for architecture'
    ],
    'Database/Schema Design': [
      'anthropic/claude-3-opus-20240229 - Best for complex schemas',
      'openai/gpt-4 - Good for Prisma/SQL'
    ],
    'Testing': [
      'openai/gpt-3.5-turbo - Fast test generation',
      'openai/gpt-4 - Comprehensive test suites'
    ],
    'Code Review': [
      'anthropic/claude-3-opus-20240229 - Most thorough reviews',
      'openai/gpt-4 - Excellent security analysis'
    ]
  };
  
  for (const [task, models] of Object.entries(recommendations)) {
    console.log(`${task}:`);
    models.forEach(model => console.log(`  - ${model}`));
    console.log('');
  }
}

// Show help
console.log('Quick Start Commands:');
console.log('  export OPENROUTER_API_KEY=your-key   # Set up AI');
console.log('  node ai-workflow.js                  # Start here');
console.log('  node ai-agent.js TICKET-001 frontend # Run AI agent');
console.log('  node master-dispatcher.js assign tickets.txt # Assign work\n');

// Run main
main().catch(console.error);
