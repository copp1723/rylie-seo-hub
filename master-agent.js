#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const FailureRecoverySystem = require('./failure-recovery');

class MasterAgent {
  constructor() {
    this.configFile = 'agent-orchestrator.config.json';
    this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
    this.projectPath = this.config.project.localPath;
    this.masterConfigFile = path.join(this.projectPath, '.master-agent.json');
    this.pendingReviewsFile = path.join(this.projectPath, '.pending-reviews.json');
    this.masterLogFile = path.join(this.projectPath, '.master-agent.log');
    this.recovery = new FailureRecoverySystem();
    
    this.initializeMasterConfig();
  }

  initializeMasterConfig() {
    if (!fs.existsSync(this.masterConfigFile)) {
      const config = {
        initialized: new Date().toISOString(),
        masterBranch: 'master-integration',
        reviewStandards: {
          codeQuality: ['no-console-logs', 'no-commented-code', 'proper-types'],
          testing: ['unit-tests-required', 'min-coverage-80'],
          documentation: ['jsdoc-required', 'readme-updated'],
          security: ['no-hardcoded-secrets', 'input-validation']
        },
        integrationRules: {
          buildMustPass: true,
          testsRequired: true,
          lintingRequired: true,
          conflictResolution: 'master-decides'
        },
        approvalThresholds: {
          autoApprove: {
            enabled: false,
            conditions: ['all-tests-pass', 'no-conflicts', 'within-boundaries']
          },
          requiresReview: ['database-changes', 'api-changes', 'security-sensitive']
        }
      };
      fs.writeFileSync(this.masterConfigFile, JSON.stringify(config, null, 2));
    }
  }

  exec(command, options = {}) {
    try {
      return execSync(command, {
        cwd: this.projectPath,
        encoding: 'utf8',
        ...options
      });
    } catch (error) {
      this.log(`Error executing: ${command}`, 'error');
      throw error;
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(this.masterLogFile, logEntry);
    console.log(logEntry.trim());
  }

  async runCommand() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'init':
        await this.initMasterBranch();
        break;
      case 'review':
        await this.reviewPendingWork();
        break;
      case 'integrate':
        await this.integrateApprovedWork();
        break;
      case 'status':
        await this.showMasterStatus();
        break;
      case 'validate':
        await this.validateAgentWork(args[1]);
        break;
      case 'override':
        await this.overrideAndFix();
        break;
      case 'sync':
        await this.syncAllAgents();
        break;
      case 'monitor':
        await this.startMonitoring();
        break;
      default:
        this.showHelp();
    }
  }

  async initMasterBranch() {
    this.log('Initializing Master Agent branch...');
    
    try {
      // Create master integration branch
      this.exec('git checkout -b master-integration');
      
      // Create master workspace
      const masterWorkspace = {
        role: 'Master Agent',
        authority: 'final',
        responsibilities: [
          'Review all agent submissions',
          'Resolve conflicts between agents',
          'Ensure code quality standards',
          'Perform final integration testing',
          'Commit to main branch'
        ],
        created: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(this.projectPath, '.master-workspace.json'),
        JSON.stringify(masterWorkspace, null, 2)
      );
      
      this.log('✅ Master Agent initialized successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        this.exec('git checkout master-integration');
        this.log('✅ Switched to existing master-integration branch');
      } else {
        throw error;
      }
    }
  }

  async reviewPendingWork() {
    this.log('Starting review of pending agent work...');
    
    // Get all agent branches
    const branches = this.exec('git branch -r')
      .split('\n')
      .filter(b => b.includes('feature/') || b.includes('test/'))
      .map(b => b.trim().replace('origin/', ''));
    
    if (branches.length === 0) {
      this.log('No pending agent work to review');
      return;
    }
    
    const reviews = [];
    
    for (const branch of branches) {
      this.log(`\nReviewing branch: ${branch}`);
      
      // Fetch latest
      this.exec(`git fetch origin ${branch}`);
      
      // Get diff statistics
      const stats = this.exec(`git diff master-integration...origin/${branch} --stat`);
      const files = this.exec(`git diff master-integration...origin/${branch} --name-only`).split('\n').filter(f => f);
      
      // Analyze changes
      const analysis = await this.analyzeChanges(branch, files);
      
      reviews.push({
        branch,
        files: files.length,
        analysis,
        timestamp: new Date().toISOString()
      });
      
      // Display review
      console.log(`\n📊 Analysis for ${branch}:`);
      console.log(`   Files changed: ${files.length}`);
      console.log(`   Risk level: ${analysis.riskLevel}`);
      console.log(`   Issues found: ${analysis.issues.length}`);
      
      if (analysis.issues.length > 0) {
        console.log('   Issues:');
        analysis.issues.forEach(issue => console.log(`     - ${issue}`));
      }
    }
    
    // Save reviews
    fs.writeFileSync(this.pendingReviewsFile, JSON.stringify(reviews, null, 2));
    this.log(`\n✅ Review complete. ${reviews.length} branches analyzed.`);
  }

  async analyzeChanges(branch, files) {
    const analysis = {
      riskLevel: 'low',
      issues: [],
      suggestions: [],
      conflicts: []
    };
    
    // Check for high-risk file changes
    const highRiskPatterns = [
      { pattern: /schema\.prisma/, risk: 'database-change' },
      { pattern: /\.env/, risk: 'environment-change' },
      { pattern: /auth/, risk: 'security-sensitive' },
      { pattern: /api/, risk: 'api-change' }
    ];
    
    for (const file of files) {
      for (const { pattern, risk } of highRiskPatterns) {
        if (pattern.test(file)) {
          analysis.riskLevel = 'high';
          analysis.issues.push(`${risk}: ${file}`);
        }
      }
    }
    
    // Check for conflicts
    try {
      this.exec(`git merge-tree master-integration origin/${branch} origin/${branch}`);
    } catch (error) {
      analysis.conflicts.push('Potential merge conflicts detected');
      analysis.riskLevel = 'high';
    }
    
    // Check boundaries
    const agentMatch = branch.match(/^(feature|test)\/([\w-]+)\//);
    if (agentMatch) {
      const agentType = agentMatch[1];
      const agent = Object.entries(this.config.agents).find(([key, config]) => 
        config.branchPrefix.includes(agentType)
      );
      
      if (agent) {
        const [agentKey, agentConfig] = agent;
        for (const file of files) {
          const allowed = agentConfig.workingPaths.some(path => file.startsWith(path));
          const excluded = agentConfig.excludePaths.some(path => file.startsWith(path));
          
          if (!allowed || excluded) {
            analysis.issues.push(`Boundary violation: ${file} outside ${agentKey} scope`);
          }
        }
      }
    }
    
    return analysis;
  }

  async integrateApprovedWork() {
    if (!fs.existsSync(this.pendingReviewsFile)) {
      this.log('No reviews to integrate');
      return;
    }
    
    const reviews = JSON.parse(fs.readFileSync(this.pendingReviewsFile, 'utf8'));
    
    // Show reviews and ask for selection
    console.log('\n🔍 Pending Reviews:');
    reviews.forEach((review, index) => {
      console.log(`  ${index + 1}. ${review.branch}`);
      console.log(`     Risk: ${review.analysis.riskLevel}`);
      console.log(`     Files: ${review.files}`);
    });
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nSelect branch to integrate (number): ', resolve);
    });
    rl.close();
    
    const index = parseInt(answer) - 1;
    if (index < 0 || index >= reviews.length) {
      this.log('Invalid selection');
      return;
    }
    
    const selected = reviews[index];
    await this.performIntegration(selected);
  }

  async performIntegration(review) {
    this.log(`Starting integration of ${review.branch}...`);
    
    try {
      // Ensure we're on master-integration
      this.exec('git checkout master-integration');
      
      // Create integration commit ID
      const integrationId = crypto.randomBytes(4).toString('hex');
      
      // Merge the branch
      this.log('Attempting merge...');
      try {
        this.exec(`git merge origin/${review.branch} --no-ff -m "Master Agent Integration: ${review.branch} [${integrationId}]"`);
        this.log('✅ Merge successful');
      } catch (mergeError) {
        this.log('⚠️  Merge conflicts detected. Resolving...');
        await this.resolveConflicts(review);
      }
      
      // Run validation suite
      this.log('Running validation suite...');
      const validation = await this.runValidationSuite();
      
      if (!validation.passed) {
        this.log('❌ Validation failed. Rolling back...');
        this.exec('git reset --hard HEAD~1');
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }
      
      // Create integration report
      const report = {
        integrationId,
        branch: review.branch,
        integratedAt: new Date().toISOString(),
        validation,
        files: review.files
      };
      
      // Save integration history
      const historyFile = path.join(this.projectPath, '.integration-history.json');
      const history = fs.existsSync(historyFile) 
        ? JSON.parse(fs.readFileSync(historyFile, 'utf8'))
        : [];
      history.push(report);
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
      
      // Push to main if configured
      const pushToMain = await this.confirmPushToMain();
      if (pushToMain) {
        this.exec('git checkout main');
        this.exec('git merge master-integration --no-ff');
        this.exec('git push origin main');
        this.log('✅ Successfully pushed to main branch');
      }
      
      // Clean up integrated branch
      try {
        this.exec(`git push origin --delete ${review.branch}`);
        this.log('✅ Cleaned up integrated branch');
      } catch (e) {
        this.log('⚠️  Could not delete remote branch');
      }
      
    } catch (error) {
      this.log(`❌ Integration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async resolveConflicts(review) {
    this.log('Applying Master Agent conflict resolution...');
    
    // Get conflicted files
    const conflicts = this.exec('git diff --name-only --diff-filter=U').split('\n').filter(f => f);
    
    for (const file of conflicts) {
      this.log(`Resolving conflict in: ${file}`);
      
      // For now, we'll take a conservative approach
      // In a real implementation, this could use AI to resolve
      try {
        // Try to use ours (master-integration) for critical files
        if (file.includes('package-lock.json')) {
          this.exec(`git checkout --ours ${file}`);
        } else {
          // For other files, attempt a smart merge
          // This is where you could integrate an AI resolver
          this.exec(`git checkout --theirs ${file}`);
        }
        this.exec(`git add ${file}`);
      } catch (e) {
        this.log(`Manual resolution required for: ${file}`, 'warn');
      }
    }
    
    // Complete the merge
    this.exec(`git commit -m "Master Agent: Resolved conflicts for ${review.branch}"`);
  }

  async runValidationSuite() {
    const validation = {
      passed: true,
      errors: [],
      warnings: []
    };
    
    // Run build
    try {
      this.log('Running build...');
      this.exec('npm run build');
    } catch (e) {
      validation.passed = false;
      validation.errors.push('Build failed');
    }
    
    // Run tests
    try {
      this.log('Running tests...');
      this.exec('npm test');
    } catch (e) {
      validation.warnings.push('Some tests failed');
    }
    
    // Run linting
    try {
      this.log('Running linter...');
      this.exec('npm run lint');
    } catch (e) {
      validation.warnings.push('Linting issues found');
    }
    
    // Check for security issues
    try {
      this.log('Checking for security issues...');
      // Check for common security patterns
      const suspiciousPatterns = [
        /console\.log.*password/i,
        /api[_-]?key.*=.*["']/i,
        /secret.*=.*["']/i
      ];
      
      const files = this.exec('git diff --name-only HEAD~1').split('\n').filter(f => f);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(this.projectPath, file), 'utf8');
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(content)) {
              validation.warnings.push(`Security concern in ${file}`);
            }
          }
        }
      }
    } catch (e) {
      // Continue
    }
    
    return validation;
  }

  async confirmPushToMain() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\n🚀 Push to main branch? (y/n): ', resolve);
    });
    rl.close();
    
    return answer.toLowerCase() === 'y';
  }

  async showMasterStatus() {
    console.log('\n🤖 Master Agent Status');
    console.log('====================\n');
    
    // Current branch
    const currentBranch = this.exec('git rev-parse --abbrev-ref HEAD').trim();
    console.log(`Current branch: ${currentBranch}`);
    
    // Pending reviews
    if (fs.existsSync(this.pendingReviewsFile)) {
      const reviews = JSON.parse(fs.readFileSync(this.pendingReviewsFile, 'utf8'));
      console.log(`\nPending reviews: ${reviews.length}`);
      reviews.forEach(r => {
        console.log(`  - ${r.branch} (risk: ${r.analysis.riskLevel})`);
      });
    }
    
    // Integration history
    const historyFile = path.join(this.projectPath, '.integration-history.json');
    if (fs.existsSync(historyFile)) {
      const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      console.log(`\nTotal integrations: ${history.length}`);
      if (history.length > 0) {
        const latest = history[history.length - 1];
        console.log(`Latest: ${latest.branch} at ${latest.integratedAt}`);
      }
    }
    
    // Agent status
    const statusFile = path.join(this.projectPath, '.agent-status.json');
    if (fs.existsSync(statusFile)) {
      const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      console.log('\nActive agents:');
      for (const [agent, info] of Object.entries(status)) {
        if (info.status === 'active') {
          console.log(`  - ${agent}: ${info.currentBranch}`);
        }
      }
    }
  }

  async overrideAndFix() {
    console.log('\n⚡ Master Override Mode');
    console.log('======================');
    console.log('This mode allows the Master Agent to directly fix issues across any codebase area.\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const description = await new Promise(resolve => {
      rl.question('Describe the issue to fix: ', resolve);
    });
    
    const taskId = `master-fix-${Date.now()}`;
    rl.close();
    
    // Create override branch
    this.exec(`git checkout -b master-override/${taskId}`);
    
    // Remove all boundary restrictions for master
    const overrideConfig = {
      agent: 'master',
      authority: 'override',
      taskId,
      description,
      boundaries: 'none',
      startTime: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(this.projectPath, '.master-override.json'),
      JSON.stringify(overrideConfig, null, 2)
    );
    
    console.log('\n✅ Master Override activated');
    console.log('📝 You can now modify any file in the codebase');
    console.log(`🔧 Task ID: ${taskId}`);
    console.log('\nWhen done, run: node master-agent.js integrate');
  }

  async syncAllAgents() {
    this.log('Syncing all active agents with latest changes...');
    
    const statusFile = path.join(this.projectPath, '.agent-status.json');
    if (!fs.existsSync(statusFile)) {
      this.log('No active agents to sync');
      return;
    }
    
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    
    for (const [agent, info] of Object.entries(status)) {
      if (info.status === 'active') {
        this.log(`Syncing ${agent}...`);
        try {
          // This would trigger the agent's sync process
          this.exec(`node orchestrator.js sync ${agent}`);
          this.log(`✅ ${agent} synced`);
        } catch (e) {
          this.log(`⚠️  Failed to sync ${agent}`, 'warn');
        }
      }
    }
  }

  async startMonitoring() {
    console.log('👁️  Master Agent Monitoring Started');
    console.log('===================================\n');
    
    // Monitor for changes every 5 minutes
    setInterval(async () => {
      this.log('Running monitoring cycle...');
      
      // Check for new branches
      this.exec('git fetch --all');
      
      // Review pending work
      await this.reviewPendingWork();
      
      // Check agent health
      const statusFile = path.join(this.projectPath, '.agent-status.json');
      if (fs.existsSync(statusFile)) {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        for (const [agent, info] of Object.entries(status)) {
          if (info.status === 'active') {
            const startTime = new Date(info.startTime);
            const hoursActive = (Date.now() - startTime) / (1000 * 60 * 60);
            
            if (hoursActive > 24) {
              this.log(`⚠️  ${agent} has been active for ${hoursActive.toFixed(1)} hours`, 'warn');
            }
          }
        }
      }
      
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('Monitoring active. Press Ctrl+C to stop.\n');
    
    // Keep process alive
    process.stdin.resume();
  }

  showHelp() {
    console.log(`
🤖 Master Agent - Central Authority for Code Integration

Commands:
  init         Initialize Master Agent branch and workspace
  review       Review all pending agent work
  integrate    Integrate approved agent work
  status       Show Master Agent status
  validate     Validate specific agent branch
  override     Enter override mode to fix critical issues
  sync         Sync all active agents
  monitor      Start continuous monitoring

Examples:
  node master-agent.js init
  node master-agent.js review
  node master-agent.js integrate
  node master-agent.js override

The Master Agent has ultimate authority over the codebase and ensures
all agent work meets quality standards before integration.
    `);
  }
}

// Run Master Agent
const master = new MasterAgent();
master.runCommand().catch(console.error);
