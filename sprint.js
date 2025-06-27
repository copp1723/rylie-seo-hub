#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

class SprintManager {
  constructor() {
    this.dependencies = JSON.parse(fs.readFileSync('sprint-dependencies.json', 'utf8'));
    this.tickets = {
      'TICKET-001': { agent: 'database', desc: 'Package Definitions' },
      'TICKET-002': { agent: 'database', desc: 'Order Model Enhancement' },
      'TICKET-003': { agent: 'backend', desc: 'Webhook Updates' },
      'TICKET-004': { agent: 'frontend', desc: 'Progress Components' },
      'TICKET-005': { agent: 'frontend', desc: 'SEO Prompts' },
      'TICKET-006': { agent: 'frontend', desc: 'Terminology Refactor' },
      'TICKET-007': { agent: 'frontend', desc: 'Enhanced Task Display' },
      'TICKET-008': { agent: 'integration', desc: 'Send to SEO Team' },
      'TICKET-009': { agent: 'integration', desc: 'Google Search Console' },
      'TICKET-010': { agent: 'backend', desc: 'AI Context Enhancement' },
      'TICKET-CA-001': { agent: 'backend', desc: 'Analytics Templates' },
      'TICKET-CA-002': { agent: 'backend', desc: 'Analytics Data Service' },
      'TICKET-CA-003': { agent: 'frontend', desc: 'Chat Analytics Integration' },
      'TICKET-CA-004': { agent: 'frontend', desc: 'Data Visualization' },
      'TICKET-CA-005': { agent: 'backend', desc: 'Natural Language Query' }
    };
  }

  async selectTicket() {
    console.log('\n📋 Available Sprint Tickets:\n');
    
    const available = [];
    for (const [ticket, info] of Object.entries(this.tickets)) {
      const deps = this.dependencies.ticketDependencies[ticket];
      const blocked = deps && deps.length > 0 ? 
        `\n     ⚠️  Blocked by: ${deps.join(', ')}` : '';
      
      console.log(`${available.length + 1}. ${ticket}: ${info.desc}${blocked}`);
      available.push(ticket);
    }
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nSelect ticket number: ', resolve);
    });
    rl.close();
    
    const index = parseInt(answer) - 1;
    return available[index];
  }

  async createTicketBranch(ticket) {
    const info = this.tickets[ticket];
    if (!info) {
      console.error('Unknown ticket');
      return;
    }
    
    // Check dependencies
    const deps = this.dependencies.ticketDependencies[ticket];
    if (deps && deps.length > 0) {
      console.log(`\n⚠️  Warning: ${ticket} depends on: ${deps.join(', ')}`);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Continue anyway? (y/n): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y') return;
    }
    
    // Create the branch using agent-task system
    const agentMap = {
      'frontend': '1',
      'backend': '2',
      'database': '3',
      'integration': '4',
      'testing': '5'
    };
    
    const taskId = ticket.toLowerCase().replace('ticket-', '');
    
    console.log(`\n🚀 Creating branch for ${ticket}`);
    console.log(`   Agent: ${info.agent}`);
    console.log(`   Task: ${info.desc}`);
    
    // Generate the task script
    const script = `#!/bin/bash
cd ${process.cwd()}

# Create branch for ${ticket}
git checkout -b feature/${info.agent}/${taskId}

# Create ticket tracking file
cat > .current-ticket.json << EOF
{
  "ticket": "${ticket}",
  "description": "${info.desc}",
  "agent": "${info.agent}",
  "startTime": "${new Date().toISOString()}",
  "dependencies": ${JSON.stringify(deps || [])}
}
EOF

# Set up commit template
cat > .gitmessage << EOF
feat(${ticket}): 

# ${info.desc}
# Agent: ${info.agent}
EOF

git config commit.template .gitmessage

echo ""
echo "✅ Branch created for ${ticket}"
echo ""
echo "📝 Development Guidelines:"
echo "   - Follow existing patterns in src/"
echo "   - Use existing UI components from @/components/ui/"
echo "   - Run 'npm run lint' before committing"
echo "   - Commit message format: feat(${ticket}): description"
echo ""
echo "🚀 Ready to start development!"
`;

    fs.writeFileSync('.sprint-task.sh', script);
    execSync('chmod +x .sprint-task.sh');
    execSync('./.sprint-task.sh');
    fs.unlinkSync('.sprint-task.sh');
  }

  async checkProgress() {
    console.log('\n📊 Sprint Progress Report\n');
    
    // Get all branches
    const branches = execSync('git branch -a')
      .toString()
      .split('\n')
      .filter(b => b.includes('feature/'));
    
    const completed = [];
    const inProgress = [];
    const blocked = [];
    
    for (const [ticket, info] of Object.entries(this.tickets)) {
      const branchName = `feature/${info.agent}/${ticket.toLowerCase().replace('ticket-', '')}`;
      const hasBranch = branches.some(b => b.includes(branchName));
      
      if (hasBranch) {
        inProgress.push(ticket);
      }
      
      const deps = this.dependencies.ticketDependencies[ticket];
      if (deps && deps.length > 0) {
        const unmetDeps = deps.filter(dep => !completed.includes(dep));
        if (unmetDeps.length > 0) {
          blocked.push({ ticket, blockedBy: unmetDeps });
        }
      }
    }
    
    console.log('✅ Completed:', completed.length || 'None');
    completed.forEach(t => console.log(`   - ${t}`));
    
    console.log('\n🔄 In Progress:', inProgress.length);
    inProgress.forEach(t => console.log(`   - ${t}: ${this.tickets[t].desc}`));
    
    console.log('\n⏸️  Blocked:', blocked.length);
    blocked.forEach(b => console.log(`   - ${b.ticket}: waiting for ${b.blockedBy.join(', ')}`));
    
    // Show parallel tracks
    console.log('\n📈 Parallel Track Status:');
    for (const [track, info] of Object.entries(this.dependencies.parallelTracks)) {
      const trackProgress = info.tickets.filter(t => 
        completed.includes(t) || inProgress.includes(t)
      );
      console.log(`   ${info.name}: ${trackProgress.length}/${info.tickets.length} tickets`);
    }
  }

  showHelp() {
    console.log(`
🎯 Sprint Manager for Rylie SEO Hub

Commands:
  node sprint.js start      - Start work on a ticket
  node sprint.js progress   - Check sprint progress
  node sprint.js week1      - Show week 1 assignments
  node sprint.js week2      - Show week 2 assignments

This tool helps manage the sprint tickets with proper:
- Agent assignment
- Dependency tracking  
- Branch creation
- Progress monitoring
    `);
  }

  showWeekPlan(week) {
    const schedule = this.dependencies.sprintSchedule[week];
    if (!schedule) {
      console.log('No schedule for', week);
      return;
    }
    
    console.log(`\n📅 ${week.toUpperCase()} Sprint Assignments\n`);
    
    for (const [day, assignments] of Object.entries(schedule)) {
      console.log(`${day.charAt(0).toUpperCase() + day.slice(1)}:`);
      for (const [dev, ticket] of Object.entries(assignments)) {
        const info = this.tickets[ticket];
        console.log(`  ${dev}: ${ticket} - ${info ? info.desc : ticket}`);
      }
    }
  }

  async run() {
    const command = process.argv[2];
    
    switch (command) {
      case 'start':
        const ticket = await this.selectTicket();
        if (ticket) {
          await this.createTicketBranch(ticket);
        }
        break;
        
      case 'progress':
        await this.checkProgress();
        break;
        
      case 'week1':
        this.showWeekPlan('week1');
        break;
        
      case 'week2':
        this.showWeekPlan('week2');
        break;
        
      default:
        this.showHelp();
    }
  }
}

const manager = new SprintManager();
manager.run().catch(console.error);
