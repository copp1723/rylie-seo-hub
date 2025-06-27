#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class MasterAgentDispatcher {
  constructor() {
    this.config = JSON.parse(fs.readFileSync('agent-orchestrator.config.json', 'utf8'));
    this.activeAssignments = {};
    this.completedTasks = [];
    this.taskQueue = [];
    
    // Load or create dispatcher state
    this.stateFile = '.master-dispatcher-state.json';
    this.loadState();
    
    // Smart mapping rules
    this.keywordToAgent = {
      // Frontend keywords
      'component': 'frontend',
      'ui': 'frontend',
      'display': 'frontend',
      'button': 'frontend',
      'form': 'frontend',
      'page': 'frontend',
      'view': 'frontend',
      'chart': 'frontend',
      'visualization': 'frontend',
      'style': 'frontend',
      'css': 'frontend',
      'layout': 'frontend',
      'responsive': 'frontend',
      'animation': 'frontend',
      'progress': 'frontend',
      'prompt': 'frontend',
      'chat': 'frontend',
      
      // Backend keywords
      'api': 'backend',
      'endpoint': 'backend',
      'service': 'backend',
      'webhook': 'backend',
      'auth': 'backend',
      'security': 'backend',
      'validation': 'backend',
      'business logic': 'backend',
      'calculation': 'backend',
      'algorithm': 'backend',
      'analytics': 'backend',
      'query': 'backend',
      'template': 'backend',
      'parser': 'backend',
      'natural language': 'backend',
      
      // Database keywords
      'database': 'database',
      'model': 'database',
      'schema': 'database',
      'migration': 'database',
      'field': 'database',
      'table': 'database',
      'relation': 'database',
      'index': 'database',
      'constraint': 'database',
      'package definition': 'database',
      'order model': 'database',
      
      // Integration keywords
      'integration': 'integration',
      'google': 'integration',
      'search console': 'integration',
      'third-party': 'integration',
      'external': 'integration',
      'sync': 'integration',
      'import': 'integration',
      'export': 'integration',
      'connect': 'integration',
      'escalation': 'integration',
      
      // Testing keywords
      'test': 'testing',
      'coverage': 'testing',
      'unit test': 'testing',
      'integration test': 'testing',
      'e2e': 'testing',
      'spec': 'testing'
    };
    
    // File pattern rules
    this.filePatternToAgent = {
      'src/components': 'frontend',
      'src/pages': 'frontend',
      'src/app': 'frontend',
      'src/styles': 'frontend',
      'src/server': 'backend',
      'src/api': 'backend',
      'src/lib/api': 'backend',
      'src/lib/analytics': 'backend',
      'prisma': 'database',
      'src/lib/db': 'database',
      'src/lib/integrations': 'integration',
      'tests': 'testing',
      '__tests__': 'testing'
    };
  }

  loadState() {
    if (fs.existsSync(this.stateFile)) {
      const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      this.activeAssignments = state.activeAssignments || {};
      this.completedTasks = state.completedTasks || [];
      this.taskQueue = state.taskQueue || [];
    }
  }

  saveState() {
    fs.writeFileSync(this.stateFile, JSON.stringify({
      activeAssignments: this.activeAssignments,
      completedTasks: this.completedTasks,
      taskQueue: this.taskQueue,
      lastUpdated: new Date().toISOString()
    }, null, 2));
  }

  async parseTicketInput(input) {
    // Handle various input formats
    const tickets = [];
    
    // Check if it's a file path
    if (input.endsWith('.txt') || input.endsWith('.md')) {
      const content = fs.readFileSync(input, 'utf8');
      return this.parseTicketContent(content);
    }
    
    // Check if it's JSON
    if (input.startsWith('{') || input.startsWith('[')) {
      return JSON.parse(input);
    }
    
    // Otherwise treat as direct ticket list
    return this.parseTicketContent(input);
  }

  parseTicketContent(content) {
    const tickets = [];
    const lines = content.split('\n');
    
    let currentTicket = null;
    
    for (const line of lines) {
      // Match various ticket formats
      const ticketMatch = line.match(/(?:TICKET-\d+|ticket-\d+|#\d+):/i) ||
                         line.match(/^(?:TICKET-[\w-]+):/i) ||
                         line.match(/^\s*[-*]\s*(TICKET-[\w-]+):/i);
      
      if (ticketMatch) {
        if (currentTicket) tickets.push(currentTicket);
        
        const ticketId = ticketMatch[0].replace(/[:-]/g, '').trim();
        const description = line.substring(ticketMatch.index + ticketMatch[0].length).trim();
        
        currentTicket = {
          id: ticketId.toUpperCase(),
          description: description,
          dependencies: [],
          notes: []
        };
      } else if (currentTicket && line.trim()) {
        // Check for dependencies
        if (line.toLowerCase().includes('depends on:') || line.toLowerCase().includes('dependencies:')) {
          const deps = line.match(/TICKET-[\w-]+/gi) || [];
          currentTicket.dependencies.push(...deps.map(d => d.toUpperCase()));
        } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          currentTicket.notes.push(line.trim().substring(1).trim());
        }
      }
    }
    
    if (currentTicket) tickets.push(currentTicket);
    
    return tickets;
  }

  analyzeTicket(ticket) {
    const analysis = {
      ticket: ticket.id,
      description: ticket.description,
      suggestedAgent: null,
      confidence: 0,
      reasoning: [],
      estimatedComplexity: 'medium'
    };
    
    // Analyze description for keywords
    const desc = (ticket.description + ' ' + ticket.notes.join(' ')).toLowerCase();
    const agentScores = {
      frontend: 0,
      backend: 0,
      database: 0,
      integration: 0,
      testing: 0
    };
    
    // Score based on keywords
    for (const [keyword, agent] of Object.entries(this.keywordToAgent)) {
      if (desc.includes(keyword)) {
        agentScores[agent] += 10;
        analysis.reasoning.push(`Contains "${keyword}" → ${agent}`);
      }
    }
    
    // Check for file paths mentioned
    for (const note of ticket.notes) {
      for (const [pattern, agent] of Object.entries(this.filePatternToAgent)) {
        if (note.includes(pattern)) {
          agentScores[agent] += 15;
          analysis.reasoning.push(`Mentions ${pattern} → ${agent}`);
        }
      }
    }
    
    // Find best agent
    let maxScore = 0;
    let bestAgent = 'backend'; // default
    
    for (const [agent, score] of Object.entries(agentScores)) {
      if (score > maxScore) {
        maxScore = score;
        bestAgent = agent;
      }
    }
    
    analysis.suggestedAgent = bestAgent;
    analysis.confidence = Math.min(100, maxScore * 5);
    
    // Estimate complexity
    if (desc.includes('refactor') || desc.includes('major') || desc.includes('integration')) {
      analysis.estimatedComplexity = 'high';
    } else if (desc.includes('simple') || desc.includes('quick') || desc.includes('minor')) {
      analysis.estimatedComplexity = 'low';
    }
    
    return analysis;
  }

  async assignTickets(tickets) {
    console.log('\n🤖 Master Agent Analyzing Tickets...\n');
    
    const assignments = {
      frontend: [],
      backend: [],
      database: [],
      integration: [],
      testing: []
    };
    
    const analyses = [];
    
    // Analyze each ticket
    for (const ticket of tickets) {
      const analysis = this.analyzeTicket(ticket);
      analyses.push(analysis);
      
      console.log(`📋 ${ticket.id}: ${ticket.description}`);
      console.log(`   → Assigned to: ${analysis.suggestedAgent.toUpperCase()} Agent (${analysis.confidence}% confidence)`);
      if (analysis.reasoning.length > 0) {
        console.log(`   → Reasoning: ${analysis.reasoning[0]}`);
      }
      if (ticket.dependencies.length > 0) {
        console.log(`   → Dependencies: ${ticket.dependencies.join(', ')}`);
      }
      console.log('');
      
      assignments[analysis.suggestedAgent].push({
        ...ticket,
        analysis
      });
    }
    
    // Show summary
    console.log('📊 Assignment Summary:');
    for (const [agent, tasks] of Object.entries(assignments)) {
      if (tasks.length > 0) {
        console.log(`   ${agent.toUpperCase()}: ${tasks.length} tickets`);
      }
    }
    
    return { assignments, analyses };
  }

  async confirmAndDispatch(assignments) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\n✅ Proceed with these assignments? (y/n/edit): ', resolve);
    });
    
    if (answer.toLowerCase() === 'n') {
      rl.close();
      console.log('❌ Assignments cancelled');
      return;
    }
    
    if (answer.toLowerCase() === 'edit') {
      // Allow manual override
      for (const [agent, tasks] of Object.entries(assignments)) {
        for (const task of tasks) {
          const newAgent = await new Promise(resolve => {
            rl.question(`${task.id} currently → ${agent}. Change to (or press enter): `, resolve);
          });
          if (newAgent && this.config.agents[newAgent]) {
            // Move task to new agent
            assignments[agent] = assignments[agent].filter(t => t.id !== task.id);
            assignments[newAgent].push(task);
          }
        }
      }
    }
    
    rl.close();
    
    // Create the actual branches and assignments
    console.log('\n🚀 Dispatching tickets to agents...\n');
    
    for (const [agent, tasks] of Object.entries(assignments)) {
      if (tasks.length === 0) continue;
      
      for (const task of tasks) {
        await this.createAgentTask(agent, task);
      }
    }
    
    // Update state
    this.saveState();
    
    console.log('\n✅ All tickets dispatched!');
    console.log('\n📋 Next steps:');
    console.log('   1. Agents can start working on their assigned tickets');
    console.log('   2. Run "node master-dispatcher.js status" to check progress');
    console.log('   3. Run "node master-workflow.js standardIntegration" to integrate completed work');
  }

  async createAgentTask(agent, task) {
    const taskId = task.id.toLowerCase().replace('ticket-', '');
    const branchName = `feature/${agent}/${taskId}`;
    
    console.log(`🎯 Creating task for ${agent} agent: ${task.id}`);
    
    // Store in active assignments
    this.activeAssignments[task.id] = {
      agent: agent,
      branch: branchName,
      description: task.description,
      dependencies: task.dependencies,
      assignedAt: new Date().toISOString(),
      status: 'assigned'
    };
    
    // Create a task file for the agent
    const taskFile = {
      ticket: task.id,
      agent: agent,
      branch: branchName,
      description: task.description,
      dependencies: task.dependencies,
      notes: task.notes,
      assignedAt: new Date().toISOString(),
      instructions: this.generateInstructions(agent, task)
    };
    
    fs.writeFileSync(
      path.join('.', `.agent-tasks-${task.id}.json`),
      JSON.stringify(taskFile, null, 2)
    );
    
    console.log(`   ✓ Task file created: .agent-tasks-${task.id}.json`);
  }

  generateInstructions(agent, task) {
    const agentConfig = this.config.agents[agent];
    
    return {
      allowedPaths: agentConfig.workingPaths,
      excludedPaths: agentConfig.excludePaths,
      quickStart: `node agent-task.js → Select ${agent} → Enter ${task.id.toLowerCase()}`,
      aiQuickStart: `node ai-agent.js ${task.id} ${agent}`,
      guidelines: [
        `Work only in: ${agentConfig.workingPaths.join(', ')}`,
        `Do not modify: ${agentConfig.excludePaths.join(', ')}`,
        'Follow existing code patterns',
        'Write tests for new functionality',
        `Commit format: feat(${task.id}): description`
      ],
      aiEnabled: true,
      suggestedModel: this.suggestModelForTask(task, agent)
    };
  }

  suggestModelForTask(task, agent) {
    const desc = task.description.toLowerCase();
    
    // Task complexity analysis
    if (desc.includes('refactor') || desc.includes('complex') || desc.includes('architect')) {
      return 'anthropic/claude-3-opus-20240229';
    }
    
    if (desc.includes('simple') || desc.includes('fix') || desc.includes('update')) {
      return 'openai/gpt-3.5-turbo';
    }
    
    if (desc.includes('creative') || desc.includes('design') || desc.includes('ui')) {
      return 'anthropic/claude-2';
    }
    
    // Default by agent type
    const defaults = {
      frontend: 'openai/gpt-4',
      backend: 'openai/gpt-4',
      database: 'anthropic/claude-3-opus-20240229',
      integration: 'openai/gpt-4-turbo-preview',
      testing: 'openai/gpt-3.5-turbo'
    };
    
    return defaults[agent] || 'openai/gpt-4';
  }

  async checkStatus() {
    console.log('\n📊 Master Dispatcher Status\n');
    
    // Group by status
    const byStatus = {
      assigned: [],
      in_progress: [],
      completed: []
    };
    
    for (const [ticketId, assignment] of Object.entries(this.activeAssignments)) {
      byStatus[assignment.status || 'assigned'].push({
        ticket: ticketId,
        ...assignment
      });
    }
    
    // Show assignments
    if (byStatus.assigned.length > 0) {
      console.log('📋 Assigned (Not Started):');
      for (const task of byStatus.assigned) {
        console.log(`   ${task.ticket}: ${task.agent} agent - ${task.description}`);
      }
      console.log('');
    }
    
    if (byStatus.in_progress.length > 0) {
      console.log('🔄 In Progress:');
      for (const task of byStatus.in_progress) {
        console.log(`   ${task.ticket}: ${task.agent} agent - ${task.branch}`);
      }
      console.log('');
    }
    
    if (byStatus.completed.length > 0) {
      console.log('✅ Completed:');
      for (const task of byStatus.completed) {
        console.log(`   ${task.ticket}: ${task.description}`);
      }
    }
    
    // Check for blocking dependencies
    console.log('\n⚠️  Dependency Status:');
    for (const [ticketId, assignment] of Object.entries(this.activeAssignments)) {
      if (assignment.dependencies && assignment.dependencies.length > 0) {
        const blockers = assignment.dependencies.filter(dep => 
          !this.completedTasks.includes(dep)
        );
        if (blockers.length > 0) {
          console.log(`   ${ticketId} blocked by: ${blockers.join(', ')}`);
        }
      }
    }
  }

  async showAgentInstructions(agent) {
    console.log(`\n📋 Instructions for ${agent.toUpperCase()} Agent:\n`);
    
    const tasks = Object.entries(this.activeAssignments)
      .filter(([, assignment]) => assignment.agent === agent && assignment.status !== 'completed');
    
    if (tasks.length === 0) {
      console.log('No tasks assigned to this agent.');
      return;
    }
    
    for (const [ticketId, assignment] of tasks) {
      console.log(`📌 ${ticketId}: ${assignment.description}`);
      console.log(`   Branch: ${assignment.branch}`);
      console.log('   To start:');
      console.log(`     node agent-task.js`);
      console.log(`     → Select ${agent} agent`);
      console.log(`     → Enter: ${ticketId.toLowerCase().replace('ticket-', '')}`);
      console.log('');
    }
  }

  showHelp() {
    console.log(`
🤖 Master Agent Dispatcher

The Master Agent can automatically assign tickets to the right agents based on the work description.

Usage:
  node master-dispatcher.js assign <tickets>   - Assign tickets to agents
  node master-dispatcher.js status            - Check assignment status
  node master-dispatcher.js agent <name>      - Show tasks for specific agent
  node master-dispatcher.js complete <ticket> - Mark ticket as complete

Examples:
  # Assign tickets from a file
  node master-dispatcher.js assign tickets.txt
  
  # Assign tickets directly
  node master-dispatcher.js assign "TICKET-001: Add package definitions"
  
  # Check what frontend agent should work on
  node master-dispatcher.js agent frontend

Input Formats:
  - Text file with tickets (one per line)
  - Direct ticket descriptions
  - Paste from your sprint planning doc

The Master Agent will:
  1. Analyze each ticket description
  2. Determine the best agent for the job
  3. Consider dependencies
  4. Create task assignments
  5. Provide clear instructions for each agent
    `);
  }

  async run() {
    const command = process.argv[2];
    const args = process.argv.slice(3);
    
    switch (command) {
      case 'assign':
        if (args.length === 0) {
          console.log('Please provide tickets to assign');
          return;
        }
        
        const input = args.join(' ');
        const tickets = await this.parseTicketInput(input);
        
        if (tickets.length === 0) {
          console.log('No tickets found in input');
          return;
        }
        
        const { assignments } = await this.assignTickets(tickets);
        await this.confirmAndDispatch(assignments);
        break;
        
      case 'status':
        await this.checkStatus();
        break;
        
      case 'agent':
        if (args.length === 0) {
          console.log('Please specify an agent name');
          return;
        }
        await this.showAgentInstructions(args[0].toLowerCase());
        break;
        
      case 'complete':
        if (args.length === 0) {
          console.log('Please specify a ticket ID');
          return;
        }
        const ticketId = args[0].toUpperCase();
        if (this.activeAssignments[ticketId]) {
          this.activeAssignments[ticketId].status = 'completed';
          this.completedTasks.push(ticketId);
          this.saveState();
          console.log(`✅ Marked ${ticketId} as complete`);
        }
        break;
        
      default:
        this.showHelp();
    }
  }
}

const dispatcher = new MasterAgentDispatcher();
dispatcher.run().catch(console.error);
