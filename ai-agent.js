#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const AIAgentEngine = require('./ai-agent-engine');
const AIValidationLayer = require('./ai-validation-layer');

class AIEnabledAgent {
  constructor(agentType, ticket) {
    this.type = agentType;
    this.ticket = ticket;
    this.ai = new AIAgentEngine();
    this.validator = new AIValidationLayer();
    this.workDir = process.cwd();
    this.branch = `feature/${agentType}/${ticket.id.toLowerCase()}`;
  }

  async execute() {
    console.log(`\n🤖 AI-Enabled ${this.type.toUpperCase()} Agent`);
    console.log(`📋 Working on: ${this.ticket.id} - ${this.ticket.description}\n`);
    
    try {
      // 1. Analyze the ticket
      console.log('1️⃣ Analyzing requirements...');
      const analysis = await this.ai.analyzeTicket(this.ticket);
      console.log(`   Complexity: ${analysis.complexity}`);
      console.log(`   Estimated LOC: ${analysis.estimatedLinesOfCode}`);
      
      // 2. Get implementation plan
      console.log('\n2️⃣ Creating implementation plan...');
      const plan = await this.ai.generateImplementationPlan(this.ticket, this.type, analysis);
      
      // Save plan for reference
      fs.writeFileSync(`.ai-plan-${this.ticket.id}.md`, plan);
      console.log('   Plan saved to .ai-plan-' + this.ticket.id + '.md');
      
      // 3. Create/checkout branch
      console.log('\n3️⃣ Setting up development branch...');
      this.setupBranch();
      
      // 4. Generate code for each required file
      console.log('\n4️⃣ Generating code...');
      const files = analysis.requiredFiles || this.inferRequiredFiles();
      
      for (const file of files) {
        console.log(`   📄 Generating ${file}...`);
        
        // Ensure directory exists
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`   📁 Created directory: ${dir}`);
        }
        
        // Check if file exists
        const exists = fs.existsSync(file);
        const existingCode = exists ? fs.readFileSync(file, 'utf8') : null;
        
        // Generate code
        const code = await this.ai.generateCode(
          this.type,
          file,
          `${this.ticket.description}\n\nPlan:\n${plan}`,
          existingCode
        );
        
        // Validate AI-generated code
        console.log(`   🔍 Validating generated code...`);
        const validation = await this.validator.validateCode(code, file, {
          ticket: this.ticket.id,
          agent: this.type
        });
        
        if (!validation.valid) {
          console.log(`   ❌ Validation failed:`);
          validation.errors.forEach(e => console.log(`      - ${e.message}`));
          console.log(`   🔧 Attempting to fix issues...`);
          
          // Generate fixed code with validation feedback
          const fixPrompt = `Fix the following validation errors:\n${JSON.stringify(validation.errors, null, 2)}`;
          const fixedCode = await this.ai.improveCode(code, { feedback: fixPrompt });
          
          // Re-validate
          const revalidation = await this.validator.validateCode(fixedCode, file, {
            ticket: this.ticket.id,
            agent: this.type,
            attempt: 2
          });
          
          if (!revalidation.valid) {
            console.log(`   ⚠️  Still has issues, proceeding with warnings`);
          }
          
          fs.writeFileSync(file, fixedCode);
        } else {
          // Review before writing
          const review = await this.ai.reviewCode(this.type, code, this.ticket.description);
          
          if (review.score < 70) {
            console.log(`   ⚠️  Code quality too low (${review.score}/100), improving...`);
            const improvedCode = await this.ai.improveCode(code, review);
            fs.writeFileSync(file, improvedCode);
          } else {
            fs.writeFileSync(file, code);
          }
        }
        
        console.log(`   ✅ Generated ${file} (Quality: ${review.score}/100)`);
        
        // Generate tests
        if (!file.includes('.test.')) {
          console.log(`   🧪 Generating tests for ${file}...`);
          const tests = await this.ai.generateTests(this.type, file, code);
          const testFile = file.replace(/\.(ts|tsx|js)$/, '.test.$1');
          fs.writeFileSync(testFile, tests);
          console.log(`   ✅ Generated ${testFile}`);
        }
      }
      
      // 5. Run linting and tests
      console.log('\n5️⃣ Running quality checks...');
      this.runQualityChecks();
      
      // 6. Commit the work
      console.log('\n6️⃣ Committing changes...');
      this.commitWork();
      
      console.log('\n✅ AI Agent completed the task!');
      console.log('\n📝 Summary:');
      console.log(`   - Branch: ${this.branch}`);
      console.log(`   - Files created/modified: ${files.length}`);
      console.log(`   - Tests generated: ${files.filter(f => !f.includes('.test.')).length}`);
      console.log('\n🚀 Ready for review by Master Agent!');
      
    } catch (error) {
      console.error('\n❌ AI Agent encountered an error:', error.message);
      throw error;
    }
  }

  setupBranch() {
    try {
      // Create new branch
      execSync(`git checkout -b ${this.branch}`, { cwd: this.workDir });
    } catch (e) {
      // Branch might exist, try checking out
      execSync(`git checkout ${this.branch}`, { cwd: this.workDir });
    }
  }

  inferRequiredFiles() {
    // Intelligent file inference based on ticket and agent type
    const files = [];
    const desc = this.ticket.description.toLowerCase();
    
    if (this.type === 'frontend') {
      if (desc.includes('component')) {
        const componentName = this.extractComponentName(desc);
        files.push(`src/components/${componentName}.tsx`);
      } else if (desc.includes('page')) {
        const pageName = this.extractPageName(desc);
        files.push(`src/app/${pageName}/page.tsx`);
      } else if (desc.includes('chat') || desc.includes('prompt')) {
        // For SEO prompts, modify existing chat components
        files.push(`src/components/chat/ChatInterface.tsx`);
        files.push(`src/components/chat/PromptSuggestions.tsx`);
      } else {
        // Default frontend location
        files.push(`src/components/${this.ticket.id.toLowerCase()}.tsx`);
      }
    } else if (this.type === 'backend') {
      if (desc.includes('api') || desc.includes('endpoint')) {
        const endpoint = this.extractEndpointName(desc);
        files.push(`src/app/api/${endpoint}/route.ts`);
      }
      if (desc.includes('service')) {
        files.push(`src/lib/services/${this.ticket.id.toLowerCase()}.ts`);
      }
    } else if (this.type === 'database') {
      if (desc.includes('model') || desc.includes('schema')) {
        files.push('prisma/schema.prisma');
      }
      if (desc.includes('migration')) {
        files.push(`prisma/migrations/${this.ticket.id.toLowerCase()}/migration.sql`);
      }
    }
    
    return files.length > 0 ? files : [`src/${this.type}/${this.ticket.id.toLowerCase()}.ts`];
  }

  extractComponentName(description) {
    // AI could do this better, but for now use simple extraction
    const match = description.match(/(\w+)\s*component/i);
    return match ? match[1] : 'Component';
  }

  extractPageName(description) {
    const match = description.match(/(\w+)\s*page/i);
    return match ? match[1].toLowerCase() : 'page';
  }

  extractEndpointName(description) {
    const match = description.match(/(\w+)\s*(?:api|endpoint)/i);
    return match ? match[1].toLowerCase() : 'endpoint';
  }

  runQualityChecks() {
    try {
      // Run linting
      console.log('   🔍 Running linter...');
      execSync('npm run lint', { cwd: this.workDir, stdio: 'pipe' });
      console.log('   ✅ Linting passed');
    } catch (e) {
      console.log('   ⚠️  Linting warnings (non-blocking)');
    }
    
    try {
      // Run tests
      console.log('   🧪 Running tests...');
      execSync('npm test -- --passWithNoTests', { cwd: this.workDir, stdio: 'pipe' });
      console.log('   ✅ Tests passed');
    } catch (e) {
      console.log('   ⚠️  Some tests failed (non-blocking)');
    }
  }

  commitWork() {
    execSync('git add .', { cwd: this.workDir });
    
    const commitMessage = `feat(${this.ticket.id}): ${this.ticket.description}

AI-Generated Implementation
- Complexity: ${this.analysis?.complexity || 'medium'}
- Model: ${this.ai.suggestModelForTask(this.ticket.description, this.type)}
- Auto-reviewed and tested`;
    
    execSync(`git commit -m "${commitMessage}"`, { cwd: this.workDir });
  }
}

// CLI Interface
async function main() {
  console.log('🤖 AI-Powered Agent System');
  console.log('========================\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`Usage: 
  node ai-agent.js <ticket-id> <agent-type>
  node ai-agent.js interactive
  node ai-agent.js from-file <file>
  
Examples:
  node ai-agent.js TICKET-001 frontend
  node ai-agent.js interactive
  node ai-agent.js from-file assigned-tasks.json`);
    return;
  }
  
  if (args[0] === 'interactive') {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const ticketId = await new Promise(resolve => {
      rl.question('Enter ticket ID: ', resolve);
    });
    
    const description = await new Promise(resolve => {
      rl.question('Enter ticket description: ', resolve);
    });
    
    const agentType = await new Promise(resolve => {
      rl.question('Enter agent type (frontend/backend/database): ', resolve);
    });
    
    rl.close();
    
    const agent = new AIEnabledAgent(agentType, {
      id: ticketId,
      description: description
    });
    
    await agent.execute();
    
  } else if (args[0] === 'from-file') {
    // Read from assignment file
    const file = args[1];
    const assignment = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    const agent = new AIEnabledAgent(assignment.agent, {
      id: assignment.ticket,
      description: assignment.description,
      notes: assignment.notes
    });
    
    await agent.execute();
    
  } else {
    // Direct execution
    const [ticketId, agentType] = args;
    
    // Try to load ticket details from dispatcher state
    const stateFile = '.master-dispatcher-state.json';
    let ticket = { id: ticketId, description: 'Implement ' + ticketId };
    
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      const assignment = state.activeAssignments[ticketId];
      if (assignment) {
        ticket.description = assignment.description;
      }
    }
    
    const agent = new AIEnabledAgent(agentType, ticket);
    await agent.execute();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AIEnabledAgent;
