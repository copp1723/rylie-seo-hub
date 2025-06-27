#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const crypto = require('crypto');

class HumanOversightSystem {
  constructor() {
    this.checkpointsFile = '.human-checkpoints.json';
    this.reviewQueueFile = '.review-queue.json';
    this.approvalLogFile = '.approval-log.json';
    
    this.checkpointTypes = {
      CRITICAL_CHANGE: {
        name: 'Critical Change',
        requiresApproval: true,
        autoApproveAfter: null,
        patterns: [
          /auth|security|payment|billing/i,
          /delete.*database|drop.*table/i,
          /api.*key|secret|password|token/i
        ]
      },
      LARGE_CHANGE: {
        name: 'Large Change',
        requiresApproval: true,
        autoApproveAfter: 3600000, // 1 hour
        threshold: 500 // lines
      },
      DATABASE_MIGRATION: {
        name: 'Database Migration',
        requiresApproval: true,
        autoApproveAfter: 1800000, // 30 minutes
        patterns: [/migration|schema.*change|alter.*table/i]
      },
      API_BREAKING_CHANGE: {
        name: 'API Breaking Change',
        requiresApproval: true,
        autoApproveAfter: 3600000,
        patterns: [/breaking.*change|deprecated|removed/i]
      },
      DEPENDENCY_UPDATE: {
        name: 'Dependency Update',
        requiresApproval: false,
        autoApproveAfter: 600000, // 10 minutes
        files: ['package.json', 'package-lock.json', 'requirements.txt', 'Gemfile']
      }
    };
    
    this.initializeOversight();
  }

  initializeOversight() {
    if (!fs.existsSync(this.checkpointsFile)) {
      this.saveCheckpoints([]);
    }
    if (!fs.existsSync(this.reviewQueueFile)) {
      this.saveReviewQueue([]);
    }
    if (!fs.existsSync(this.approvalLogFile)) {
      this.saveApprovalLog([]);
    }
  }

  async createCheckpoint(agentId, taskId, changeSet, metadata = {}) {
    const checkpointId = crypto.randomBytes(8).toString('hex');
    const checkpointType = this.determineCheckpointType(changeSet);
    
    const checkpoint = {
      id: checkpointId,
      agentId,
      taskId,
      type: checkpointType,
      timestamp: new Date().toISOString(),
      changeSet,
      metadata,
      status: 'pending',
      approvalStatus: null,
      approvedBy: null,
      approvalTime: null,
      comments: []
    };
    
    const checkpoints = this.getCheckpoints();
    checkpoints.push(checkpoint);
    this.saveCheckpoints(checkpoints);
    
    // Add to review queue if requires approval
    if (this.checkpointTypes[checkpointType]?.requiresApproval) {
      this.addToReviewQueue(checkpoint);
    }
    
    return checkpoint;
  }

  determineCheckpointType(changeSet) {
    // Check for critical changes
    for (const file of changeSet.files || []) {
      const content = file.content || '';
      for (const pattern of this.checkpointTypes.CRITICAL_CHANGE.patterns) {
        if (pattern.test(content) || pattern.test(file.path)) {
          return 'CRITICAL_CHANGE';
        }
      }
    }
    
    // Check for database migrations
    for (const file of changeSet.files || []) {
      for (const pattern of this.checkpointTypes.DATABASE_MIGRATION.patterns) {
        if (pattern.test(file.path) || pattern.test(file.content || '')) {
          return 'DATABASE_MIGRATION';
        }
      }
    }
    
    // Check for API breaking changes
    if (changeSet.description) {
      for (const pattern of this.checkpointTypes.API_BREAKING_CHANGE.patterns) {
        if (pattern.test(changeSet.description)) {
          return 'API_BREAKING_CHANGE';
        }
      }
    }
    
    // Check for large changes
    const totalLines = changeSet.files?.reduce((acc, file) => 
      acc + (file.additions || 0) + (file.deletions || 0), 0
    ) || 0;
    
    if (totalLines > this.checkpointTypes.LARGE_CHANGE.threshold) {
      return 'LARGE_CHANGE';
    }
    
    // Check for dependency updates
    const depFiles = changeSet.files?.filter(f => 
      this.checkpointTypes.DEPENDENCY_UPDATE.files.includes(path.basename(f.path))
    );
    
    if (depFiles?.length > 0) {
      return 'DEPENDENCY_UPDATE';
    }
    
    return 'STANDARD';
  }

  addToReviewQueue(checkpoint) {
    const queue = this.getReviewQueue();
    
    queue.push({
      checkpointId: checkpoint.id,
      priority: this.calculatePriority(checkpoint),
      addedAt: new Date().toISOString(),
      expiresAt: this.calculateExpiration(checkpoint),
      notified: false
    });
    
    // Sort by priority
    queue.sort((a, b) => b.priority - a.priority);
    
    this.saveReviewQueue(queue);
    
    // Notify if critical
    if (checkpoint.type === 'CRITICAL_CHANGE') {
      this.notifyReviewer(checkpoint);
    }
  }

  calculatePriority(checkpoint) {
    const priorities = {
      CRITICAL_CHANGE: 100,
      API_BREAKING_CHANGE: 80,
      DATABASE_MIGRATION: 70,
      LARGE_CHANGE: 50,
      DEPENDENCY_UPDATE: 30,
      STANDARD: 10
    };
    
    return priorities[checkpoint.type] || 10;
  }

  calculateExpiration(checkpoint) {
    const type = this.checkpointTypes[checkpoint.type];
    if (!type || !type.autoApproveAfter) {
      return null;
    }
    
    return new Date(Date.now() + type.autoApproveAfter).toISOString();
  }

  async requestApproval(checkpointId) {
    const checkpoint = this.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`APPROVAL REQUEST: ${checkpoint.type}`);
    console.log('='.repeat(80));
    console.log(`Agent: ${checkpoint.agentId}`);
    console.log(`Task: ${checkpoint.taskId}`);
    console.log(`Time: ${checkpoint.timestamp}`);
    
    if (checkpoint.changeSet.description) {
      console.log(`\nDescription: ${checkpoint.changeSet.description}`);
    }
    
    console.log('\nChanges:');
    checkpoint.changeSet.files?.forEach(file => {
      console.log(`  - ${file.path} (+${file.additions || 0}/-${file.deletions || 0})`);
    });
    
    if (checkpoint.metadata.risks) {
      console.log('\nIdentified Risks:');
      checkpoint.metadata.risks.forEach(risk => {
        console.log(`  - ${risk}`);
      });
    }
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      console.log('\nOptions:');
      console.log('  [a] Approve');
      console.log('  [r] Reject');
      console.log('  [d] View diff');
      console.log('  [c] Add comment');
      console.log('  [s] Skip (review later)');
      
      const handleInput = (answer) => {
        switch (answer.toLowerCase()) {
          case 'a':
            rl.close();
            this.approve(checkpointId, 'human');
            resolve({ approved: true });
            break;
            
          case 'r':
            rl.question('Rejection reason: ', (reason) => {
              rl.close();
              this.reject(checkpointId, 'human', reason);
              resolve({ approved: false, reason });
            });
            break;
            
          case 'd':
            this.showDiff(checkpoint);
            rl.question('\nAction: ', handleInput);
            break;
            
          case 'c':
            rl.question('Comment: ', (comment) => {
              this.addComment(checkpointId, comment);
              rl.question('\nAction: ', handleInput);
            });
            break;
            
          case 's':
            rl.close();
            resolve({ approved: null, skipped: true });
            break;
            
          default:
            rl.question('Invalid option. Action: ', handleInput);
        }
      };
      
      rl.question('\nAction: ', handleInput);
    });
  }

  approve(checkpointId, approvedBy = 'system') {
    const checkpoints = this.getCheckpoints();
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
    
    if (checkpoint) {
      checkpoint.status = 'approved';
      checkpoint.approvalStatus = 'approved';
      checkpoint.approvedBy = approvedBy;
      checkpoint.approvalTime = new Date().toISOString();
      
      this.saveCheckpoints(checkpoints);
      this.removeFromReviewQueue(checkpointId);
      this.logApproval(checkpoint);
      
      console.log(`✅ Checkpoint ${checkpointId} approved`);
    }
  }

  reject(checkpointId, rejectedBy = 'system', reason = '') {
    const checkpoints = this.getCheckpoints();
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
    
    if (checkpoint) {
      checkpoint.status = 'rejected';
      checkpoint.approvalStatus = 'rejected';
      checkpoint.approvedBy = rejectedBy;
      checkpoint.approvalTime = new Date().toISOString();
      checkpoint.rejectionReason = reason;
      
      this.saveCheckpoints(checkpoints);
      this.removeFromReviewQueue(checkpointId);
      this.logApproval(checkpoint);
      
      console.log(`❌ Checkpoint ${checkpointId} rejected: ${reason}`);
    }
  }

  addComment(checkpointId, comment) {
    const checkpoints = this.getCheckpoints();
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
    
    if (checkpoint) {
      checkpoint.comments.push({
        text: comment,
        timestamp: new Date().toISOString(),
        author: 'human'
      });
      
      this.saveCheckpoints(checkpoints);
      console.log('💬 Comment added');
    }
  }

  showDiff(checkpoint) {
    console.log('\n' + '-'.repeat(80));
    console.log('DETAILED CHANGES:');
    console.log('-'.repeat(80));
    
    checkpoint.changeSet.files?.forEach(file => {
      console.log(`\nFile: ${file.path}`);
      if (file.diff) {
        console.log(file.diff);
      } else {
        console.log(`  Added: ${file.additions || 0} lines`);
        console.log(`  Removed: ${file.deletions || 0} lines`);
      }
    });
  }

  processAutoApprovals() {
    const queue = this.getReviewQueue();
    const now = new Date();
    let processed = 0;
    
    const updatedQueue = queue.filter(item => {
      if (item.expiresAt && new Date(item.expiresAt) < now) {
        this.approve(item.checkpointId, 'auto-approval');
        processed++;
        return false;
      }
      return true;
    });
    
    if (processed > 0) {
      this.saveReviewQueue(updatedQueue);
      console.log(`⏰ Auto-approved ${processed} checkpoint(s)`);
    }
    
    return processed;
  }

  notifyReviewer(checkpoint) {
    // In a real implementation, this would send notifications
    console.log('\n🚨 CRITICAL CHANGE REQUIRES REVIEW 🚨');
    console.log(`Checkpoint ID: ${checkpoint.id}`);
    console.log(`Type: ${checkpoint.type}`);
    console.log(`Agent: ${checkpoint.agentId}`);
  }

  removeFromReviewQueue(checkpointId) {
    const queue = this.getReviewQueue();
    const updatedQueue = queue.filter(item => item.checkpointId !== checkpointId);
    this.saveReviewQueue(updatedQueue);
  }

  logApproval(checkpoint) {
    const log = this.getApprovalLog();
    log.push({
      checkpointId: checkpoint.id,
      type: checkpoint.type,
      status: checkpoint.approvalStatus,
      approvedBy: checkpoint.approvedBy,
      timestamp: checkpoint.approvalTime,
      agentId: checkpoint.agentId,
      taskId: checkpoint.taskId
    });
    
    // Keep only last 1000 entries
    if (log.length > 1000) {
      log.splice(0, log.length - 1000);
    }
    
    this.saveApprovalLog(log);
  }

  getCheckpoint(checkpointId) {
    const checkpoints = this.getCheckpoints();
    return checkpoints.find(cp => cp.id === checkpointId);
  }

  getCheckpoints() {
    return JSON.parse(fs.readFileSync(this.checkpointsFile, 'utf8'));
  }

  saveCheckpoints(checkpoints) {
    fs.writeFileSync(this.checkpointsFile, JSON.stringify(checkpoints, null, 2));
  }

  getReviewQueue() {
    return JSON.parse(fs.readFileSync(this.reviewQueueFile, 'utf8'));
  }

  saveReviewQueue(queue) {
    fs.writeFileSync(this.reviewQueueFile, JSON.stringify(queue, null, 2));
  }

  getApprovalLog() {
    return JSON.parse(fs.readFileSync(this.approvalLogFile, 'utf8'));
  }

  saveApprovalLog(log) {
    fs.writeFileSync(this.approvalLogFile, JSON.stringify(log, null, 2));
  }

  getOversightReport() {
    const checkpoints = this.getCheckpoints();
    const log = this.getApprovalLog();
    const queue = this.getReviewQueue();
    
    const report = {
      summary: {
        totalCheckpoints: checkpoints.length,
        pendingReview: queue.length,
        approved: checkpoints.filter(cp => cp.status === 'approved').length,
        rejected: checkpoints.filter(cp => cp.status === 'rejected').length,
        autoApproved: log.filter(l => l.approvedBy === 'auto-approval').length
      },
      byType: {},
      recentActivity: log.slice(-10).reverse(),
      criticalPending: queue.filter(q => {
        const cp = this.getCheckpoint(q.checkpointId);
        return cp?.type === 'CRITICAL_CHANGE';
      }).length
    };
    
    // Group by type
    checkpoints.forEach(cp => {
      if (!report.byType[cp.type]) {
        report.byType[cp.type] = {
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0
        };
      }
      report.byType[cp.type].total++;
      if (cp.status === 'approved') report.byType[cp.type].approved++;
      else if (cp.status === 'rejected') report.byType[cp.type].rejected++;
      else report.byType[cp.type].pending++;
    });
    
    return report;
  }
}

module.exports = HumanOversightSystem;

// CLI interface
if (require.main === module) {
  const oversight = new HumanOversightSystem();
  const command = process.argv[2];
  
  switch (command) {
    case 'review':
      (async () => {
        const queue = oversight.getReviewQueue();
        if (queue.length === 0) {
          console.log('No checkpoints pending review');
          return;
        }
        
        for (const item of queue) {
          const result = await oversight.requestApproval(item.checkpointId);
          if (result.skipped) {
            console.log('Review session ended');
            break;
          }
        }
      })();
      break;
      
    case 'auto-approve':
      const processed = oversight.processAutoApprovals();
      console.log(`Processed ${processed} auto-approvals`);
      break;
      
    case 'report':
      const report = oversight.getOversightReport();
      console.log('\nOversight Report:');
      console.log(JSON.stringify(report, null, 2));
      break;
      
    case 'queue':
      const queue = oversight.getReviewQueue();
      console.log('\nReview Queue:');
      queue.forEach((item, i) => {
        const cp = oversight.getCheckpoint(item.checkpointId);
        console.log(`${i + 1}. ${cp.type} - ${cp.agentId}/${cp.taskId} (Priority: ${item.priority})`);
      });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node human-oversight.js review       - Review pending checkpoints');
      console.log('  node human-oversight.js auto-approve - Process auto-approvals');
      console.log('  node human-oversight.js report       - Show oversight report');
      console.log('  node human-oversight.js queue        - Show review queue');
  }
}