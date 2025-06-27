#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class FailureRecoverySystem {
  constructor() {
    this.checkpointDir = '.agent-checkpoints';
    this.recoveryLogFile = '.agent-recovery.log';
    this.maxRetries = 3;
    this.backoffMultiplier = 2;
    this.stateFile = '.agent-state.json';
    
    this.initializeRecoverySystem();
  }

  initializeRecoverySystem() {
    if (!fs.existsSync(this.checkpointDir)) {
      fs.mkdirSync(this.checkpointDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.stateFile)) {
      this.saveState({
        agents: {},
        checkpoints: [],
        failures: [],
        initialized: new Date().toISOString()
      });
    }
  }

  createCheckpoint(agentId, taskId, data) {
    const checkpointId = crypto.randomBytes(8).toString('hex');
    const checkpoint = {
      id: checkpointId,
      agentId,
      taskId,
      timestamp: new Date().toISOString(),
      data,
      branch: this.getCurrentBranch(),
      workingDirectory: process.cwd(),
      environment: this.captureEnvironment()
    };
    
    // Save checkpoint
    const checkpointPath = path.join(this.checkpointDir, `${checkpointId}.json`);
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    
    // Update state
    const state = this.getState();
    state.checkpoints.push({
      id: checkpointId,
      agentId,
      taskId,
      timestamp: checkpoint.timestamp
    });
    this.saveState(state);
    
    this.log('info', `Checkpoint created: ${checkpointId} for agent ${agentId}`);
    return checkpointId;
  }

  async recoverFromCheckpoint(checkpointId) {
    const checkpointPath = path.join(this.checkpointDir, `${checkpointId}.json`);
    
    if (!fs.existsSync(checkpointPath)) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    
    const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    this.log('info', `Recovering from checkpoint ${checkpointId}`);
    
    try {
      // 1. Restore branch
      if (checkpoint.branch !== this.getCurrentBranch()) {
        this.log('info', `Switching to branch ${checkpoint.branch}`);
        execSync(`git checkout ${checkpoint.branch}`, { stdio: 'pipe' });
      }
      
      // 2. Restore working directory
      if (checkpoint.workingDirectory !== process.cwd()) {
        process.chdir(checkpoint.workingDirectory);
      }
      
      // 3. Restore environment variables
      Object.entries(checkpoint.environment).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
      
      // 4. Return checkpoint data for agent to resume
      this.log('success', `Successfully recovered from checkpoint ${checkpointId}`);
      return checkpoint.data;
      
    } catch (error) {
      this.log('error', `Failed to recover from checkpoint: ${error.message}`);
      throw error;
    }
  }

  async executeWithRecovery(agentId, taskId, operation, context = {}) {
    let lastCheckpoint = null;
    let attempts = 0;
    let lastError = null;
    
    while (attempts < this.maxRetries) {
      try {
        // Create checkpoint before operation
        if (attempts === 0) {
          lastCheckpoint = this.createCheckpoint(agentId, taskId, context);
        }
        
        // Execute operation
        const result = await operation();
        
        // Success - clean up checkpoint
        if (lastCheckpoint) {
          this.cleanupCheckpoint(lastCheckpoint);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempts++;
        
        this.log('error', `Operation failed for ${agentId}/${taskId}: ${error.message}`);
        this.recordFailure(agentId, taskId, error);
        
        if (attempts < this.maxRetries) {
          // Calculate backoff delay
          const delay = Math.pow(this.backoffMultiplier, attempts - 1) * 1000;
          this.log('info', `Retrying in ${delay}ms (attempt ${attempts + 1}/${this.maxRetries})`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Attempt recovery
          if (lastCheckpoint) {
            try {
              context = await this.recoverFromCheckpoint(lastCheckpoint);
            } catch (recoveryError) {
              this.log('error', `Recovery failed: ${recoveryError.message}`);
            }
          }
        }
      }
    }
    
    // All retries exhausted
    this.log('error', `All retries exhausted for ${agentId}/${taskId}`);
    throw lastError;
  }

  recordFailure(agentId, taskId, error) {
    const state = this.getState();
    
    state.failures.push({
      agentId,
      taskId,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context: {
        branch: this.getCurrentBranch(),
        workingDirectory: process.cwd()
      }
    });
    
    // Keep only last 100 failures
    if (state.failures.length > 100) {
      state.failures = state.failures.slice(-100);
    }
    
    this.saveState(state);
  }

  cleanupCheckpoint(checkpointId) {
    const checkpointPath = path.join(this.checkpointDir, `${checkpointId}.json`);
    
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
      
      const state = this.getState();
      state.checkpoints = state.checkpoints.filter(cp => cp.id !== checkpointId);
      this.saveState(state);
      
      this.log('info', `Checkpoint ${checkpointId} cleaned up`);
    }
  }

  cleanupOldCheckpoints(maxAgeHours = 24) {
    const state = this.getState();
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    const oldCheckpoints = state.checkpoints.filter(cp => 
      new Date(cp.timestamp) < cutoffTime
    );
    
    oldCheckpoints.forEach(cp => this.cleanupCheckpoint(cp.id));
    
    this.log('info', `Cleaned up ${oldCheckpoints.length} old checkpoints`);
  }

  getCurrentBranch() {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  captureEnvironment() {
    return {
      NODE_ENV: process.env.NODE_ENV,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? '***' : undefined,
      PATH: process.env.PATH
    };
  }

  getState() {
    return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
  }

  saveState(state) {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  log(level, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    // Console output
    const colors = {
      info: '\x1b[36m',
      error: '\x1b[31m',
      success: '\x1b[32m',
      warning: '\x1b[33m'
    };
    
    console.log(`${colors[level] || ''}[${level.toUpperCase()}] ${message}\x1b[0m`);
    
    // File logging
    fs.appendFileSync(
      this.recoveryLogFile,
      JSON.stringify(logEntry) + '\n'
    );
  }

  getFailureReport(agentId = null) {
    const state = this.getState();
    let failures = state.failures;
    
    if (agentId) {
      failures = failures.filter(f => f.agentId === agentId);
    }
    
    // Group failures by error type
    const errorGroups = {};
    failures.forEach(failure => {
      const key = failure.error.message;
      if (!errorGroups[key]) {
        errorGroups[key] = {
          message: key,
          count: 0,
          lastOccurrence: null,
          agents: new Set()
        };
      }
      errorGroups[key].count++;
      errorGroups[key].lastOccurrence = failure.timestamp;
      errorGroups[key].agents.add(failure.agentId);
    });
    
    return {
      totalFailures: failures.length,
      uniqueErrors: Object.keys(errorGroups).length,
      errorGroups: Object.values(errorGroups).map(g => ({
        ...g,
        agents: Array.from(g.agents)
      }))
    };
  }
}

module.exports = FailureRecoverySystem;

// CLI interface
if (require.main === module) {
  const recovery = new FailureRecoverySystem();
  const command = process.argv[2];
  
  switch (command) {
    case 'cleanup':
      const hours = parseInt(process.argv[3]) || 24;
      recovery.cleanupOldCheckpoints(hours);
      break;
      
    case 'report':
      const agentId = process.argv[3];
      const report = recovery.getFailureReport(agentId);
      console.log('\nFailure Report:');
      console.log(JSON.stringify(report, null, 2));
      break;
      
    case 'list':
      const state = recovery.getState();
      console.log('\nActive Checkpoints:');
      state.checkpoints.forEach(cp => {
        console.log(`- ${cp.id} (Agent: ${cp.agentId}, Task: ${cp.taskId}, Time: ${cp.timestamp})`);
      });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node failure-recovery.js cleanup [hours]  - Clean up old checkpoints');
      console.log('  node failure-recovery.js report [agentId] - Show failure report');
      console.log('  node failure-recovery.js list            - List active checkpoints');
  }
}