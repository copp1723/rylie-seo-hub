#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MultiAgentOrchestrator {
  constructor(configPath) {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.projectPath = this.config.project.localPath;
    this.statusFile = path.join(this.projectPath, this.config.communication.statusFile);
    this.lockFile = path.join(this.projectPath, this.config.communication.lockFile);
    this.agentStatus = {};
    this.fileLocks = {};
  }

  init() {
    // Initialize status and lock files
    this.loadStatus();
    this.loadLocks();
    
    // Ensure we're on the base branch and up to date
    this.exec(`git checkout ${this.config.project.baseBranch}`);
    this.exec('git pull origin ' + this.config.project.baseBranch);
  }

  exec(command, options = {}) {
    try {
      return execSync(command, {
        cwd: this.projectPath,
        encoding: 'utf8',
        ...options
      });
    } catch (error) {
      console.error(`Error executing: ${command}`, error.message);
      throw error;
    }
  }

  loadStatus() {
    if (fs.existsSync(this.statusFile)) {
      this.agentStatus = JSON.parse(fs.readFileSync(this.statusFile, 'utf8'));
    }
  }

  saveStatus() {
    fs.writeFileSync(this.statusFile, JSON.stringify(this.agentStatus, null, 2));
  }

  loadLocks() {
    if (fs.existsSync(this.lockFile)) {
      this.fileLocks = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
    }
  }

  saveLocks() {
    fs.writeFileSync(this.lockFile, JSON.stringify(this.fileLocks, null, 2));
  }

  createAgentBranch(agentKey, taskId) {
    const agent = this.config.agents[agentKey];
    const branchName = `${agent.branchPrefix}/${taskId}`;
    
    try {
      // Create branch from latest base
      this.exec(`git checkout -b ${branchName} ${this.config.project.baseBranch}`);
      
      // Update agent status
      this.agentStatus[agentKey] = {
        currentBranch: branchName,
        taskId: taskId,
        startTime: new Date().toISOString(),
        status: 'active'
      };
      this.saveStatus();
      
      console.log(`✅ Created branch ${branchName} for ${agent.name}`);
      return branchName;
    } catch (error) {
      console.error(`❌ Failed to create branch for ${agent.name}:`, error.message);
      throw error;
    }
  }

  canAccessFile(agentKey, filePath) {
    const agent = this.config.agents[agentKey];
    const relativePath = path.relative(this.projectPath, filePath);
    
    // Check if file is in agent's working paths
    const inWorkingPath = agent.workingPaths.some(wp => 
      relativePath.startsWith(wp) || relativePath.includes(wp.replace('**/', ''))
    );
    
    // Check if file is in excluded paths
    const inExcludedPath = agent.excludePaths.some(ep => 
      relativePath.startsWith(ep) || relativePath.includes(ep.replace('**/', ''))
    );
    
    // Check if file is locked by another agent
    const isLocked = this.fileLocks[relativePath] && 
                     this.fileLocks[relativePath].agent !== agentKey;
    
    return inWorkingPath && !inExcludedPath && !isLocked;
  }

  lockFiles(agentKey, files) {
    const lockedFiles = [];
    
    for (const file of files) {
      if (this.canAccessFile(agentKey, file)) {
        const relativePath = path.relative(this.projectPath, file);
        this.fileLocks[relativePath] = {
          agent: agentKey,
          lockedAt: new Date().toISOString()
        };
        lockedFiles.push(relativePath);
      }
    }
    
    this.saveLocks();
    return lockedFiles;
  }

  unlockFiles(agentKey) {
    const unlockedFiles = [];
    
    for (const [file, lock] of Object.entries(this.fileLocks)) {
      if (lock.agent === agentKey) {
        delete this.fileLocks[file];
        unlockedFiles.push(file);
      }
    }
    
    this.saveLocks();
    return unlockedFiles;
  }

  syncAgent(agentKey) {
    const agent = this.config.agents[agentKey];
    const status = this.agentStatus[agentKey];
    
    if (!status || status.status !== 'active') {
      console.log(`⏭️  ${agent.name} is not active, skipping sync`);
      return;
    }
    
    try {
      // Stash any uncommitted changes
      this.exec('git stash');
      
      // Fetch latest changes
      this.exec('git fetch origin');
      
      // Rebase on base branch
      this.exec(`git rebase origin/${this.config.project.baseBranch}`);
      
      // Pop stashed changes
      try {
        this.exec('git stash pop');
      } catch (e) {
        // No stash to pop
      }
      
      console.log(`✅ Synced ${agent.name} with base branch`);
    } catch (error) {
      console.error(`❌ Sync failed for ${agent.name}:`, error.message);
      
      // Abort rebase if in progress
      try {
        this.exec('git rebase --abort');
      } catch (e) {}
      
      throw error;
    }
  }

  mergeAgent(agentKey, message) {
    const agent = this.config.agents[agentKey];
    const status = this.agentStatus[agentKey];
    
    if (!status || status.status !== 'active') {
      console.log(`⏭️  ${agent.name} has no active branch`);
      return;
    }
    
    try {
      // Commit any pending changes
      this.exec('git add -A');
      this.exec(`git commit -m "${message || `${agent.name}: ${status.taskId}`}"`);
      
      // Push branch
      this.exec(`git push -u origin ${status.currentBranch}`);
      
      // Create pull request (using GitHub CLI if available)
      try {
        const prUrl = this.exec(
          `gh pr create --base ${this.config.project.baseBranch} ` +
          `--head ${status.currentBranch} --title "${agent.name}: ${status.taskId}" ` +
          `--body "Automated PR from ${agent.name}"`
        );
        console.log(`✅ Created PR for ${agent.name}: ${prUrl}`);
      } catch (e) {
        console.log(`ℹ️  Pushed branch ${status.currentBranch}. Create PR manually.`);
      }
      
      // Update status
      this.agentStatus[agentKey].status = 'completed';
      this.agentStatus[agentKey].completedAt = new Date().toISOString();
      this.saveStatus();
      
      // Unlock files
      this.unlockFiles(agentKey);
      
    } catch (error) {
      console.error(`❌ Merge failed for ${agent.name}:`, error.message);
      throw error;
    }
  }

  runPeriodicSync() {
    const interval = this.parseInterval(this.config.conflictResolution.updateFrequency);
    
    setInterval(() => {
      console.log('\n🔄 Running periodic sync...');
      
      for (const agentKey of Object.keys(this.config.agents)) {
        try {
          this.syncAgent(agentKey);
        } catch (error) {
          console.error(`Failed to sync ${agentKey}:`, error.message);
        }
      }
    }, interval);
  }

  parseInterval(frequency) {
    const match = frequency.match(/(\d+)([mh])/);
    if (!match) return 30 * 60 * 1000; // Default 30 minutes
    
    const [, value, unit] = match;
    const multiplier = unit === 'h' ? 60 * 60 * 1000 : 60 * 1000;
    return parseInt(value) * multiplier;
  }

  status() {
    console.log('\n📊 Agent Status:');
    console.log('================');
    
    for (const [agentKey, agent] of Object.entries(this.config.agents)) {
      const status = this.agentStatus[agentKey];
      
      if (status) {
        console.log(`\n${agent.name}:`);
        console.log(`  Branch: ${status.currentBranch}`);
        console.log(`  Task: ${status.taskId}`);
        console.log(`  Status: ${status.status}`);
        console.log(`  Started: ${status.startTime}`);
        
        // Show locked files
        const lockedFiles = Object.entries(this.fileLocks)
          .filter(([, lock]) => lock.agent === agentKey)
          .map(([file]) => file);
        
        if (lockedFiles.length > 0) {
          console.log(`  Locked files: ${lockedFiles.length}`);
          lockedFiles.forEach(f => console.log(`    - ${f}`));
        }
      } else {
        console.log(`\n${agent.name}: Inactive`);
      }
    }
    
    console.log('\n');
  }
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0];
const orchestrator = new MultiAgentOrchestrator(
  path.join(__dirname, 'agent-orchestrator.config.json')
);

try {
  switch (command) {
    case 'init':
      orchestrator.init();
      console.log('✅ Orchestrator initialized');
      break;
      
    case 'create':
      const [, agentKey, taskId] = args;
      if (!agentKey || !taskId) {
        console.error('Usage: orchestrator create <agent> <task-id>');
        process.exit(1);
      }
      orchestrator.createAgentBranch(agentKey, taskId);
      break;
      
    case 'sync':
      const [, syncAgent] = args;
      if (syncAgent) {
        orchestrator.syncAgent(syncAgent);
      } else {
        // Sync all agents
        for (const agentKey of Object.keys(orchestrator.config.agents)) {
          orchestrator.syncAgent(agentKey);
        }
      }
      break;
      
    case 'merge':
      const [, mergeAgent, ...messageParts] = args;
      if (!mergeAgent) {
        console.error('Usage: orchestrator merge <agent> [message]');
        process.exit(1);
      }
      orchestrator.mergeAgent(mergeAgent, messageParts.join(' '));
      break;
      
    case 'status':
      orchestrator.status();
      break;
      
    case 'watch':
      orchestrator.init();
      orchestrator.runPeriodicSync();
      console.log('👀 Watching for changes...');
      // Keep process alive
      setInterval(() => {}, 1000);
      break;
      
    default:
      console.log(`
Multi-Agent Orchestrator

Commands:
  init              Initialize orchestrator
  create <agent> <task-id>   Create a new branch for an agent
  sync [agent]      Sync agent(s) with base branch
  merge <agent> [message]    Merge agent's work
  status            Show status of all agents
  watch             Run periodic sync
      `);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
