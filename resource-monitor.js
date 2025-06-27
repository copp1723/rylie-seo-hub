#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class ResourceMonitor {
  constructor() {
    this.metricsFile = '.agent-metrics.json';
    this.costEstimateFile = '.agent-costs.json';
    this.alertsFile = '.resource-alerts.json';
    
    // API pricing (per 1M tokens)
    this.pricing = {
      'openai/gpt-4o': { input: 2.50, output: 10.00 },
      'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
      'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00 },
      'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 }
    };
    
    // Resource limits
    this.limits = {
      maxTokensPerHour: 500000,
      maxCostPerDay: 50.00,
      maxMemoryUsageGB: 4,
      maxCPUUsagePercent: 80,
      maxActiveAgents: 5
    };
    
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    if (!fs.existsSync(this.metricsFile)) {
      this.saveMetrics({
        sessions: [],
        totals: {
          tokens: 0,
          cost: 0,
          apiCalls: 0
        },
        startTime: new Date().toISOString()
      });
    }
  }

  startSession(agentId, taskId) {
    const sessionId = `${agentId}-${taskId}-${Date.now()}`;
    const session = {
      id: sessionId,
      agentId,
      taskId,
      startTime: new Date().toISOString(),
      endTime: null,
      resources: {
        tokens: { input: 0, output: 0 },
        apiCalls: [],
        cost: 0,
        memory: [],
        cpu: []
      },
      status: 'active'
    };
    
    const metrics = this.getMetrics();
    metrics.sessions.push(session);
    this.saveMetrics(metrics);
    
    // Start resource monitoring
    this.monitoringIntervals = this.monitoringIntervals || {};
    this.monitoringIntervals[sessionId] = setInterval(() => {
      this.captureResourceSnapshot(sessionId);
    }, 5000); // Every 5 seconds
    
    return sessionId;
  }

  endSession(sessionId) {
    const metrics = this.getMetrics();
    const session = metrics.sessions.find(s => s.id === sessionId);
    
    if (session) {
      session.endTime = new Date().toISOString();
      session.status = 'completed';
      
      // Update totals
      metrics.totals.tokens += session.resources.tokens.input + session.resources.tokens.output;
      metrics.totals.cost += session.resources.cost;
      metrics.totals.apiCalls += session.resources.apiCalls.length;
      
      this.saveMetrics(metrics);
    }
    
    // Stop monitoring
    if (this.monitoringIntervals && this.monitoringIntervals[sessionId]) {
      clearInterval(this.monitoringIntervals[sessionId]);
      delete this.monitoringIntervals[sessionId];
    }
  }

  trackAPICall(sessionId, model, inputTokens, outputTokens) {
    const metrics = this.getMetrics();
    const session = metrics.sessions.find(s => s.id === sessionId);
    
    if (session) {
      const apiCall = {
        timestamp: new Date().toISOString(),
        model,
        inputTokens,
        outputTokens,
        cost: this.calculateCost(model, inputTokens, outputTokens)
      };
      
      session.resources.apiCalls.push(apiCall);
      session.resources.tokens.input += inputTokens;
      session.resources.tokens.output += outputTokens;
      session.resources.cost += apiCall.cost;
      
      this.saveMetrics(metrics);
      
      // Check limits
      this.checkResourceLimits(metrics);
    }
  }

  captureResourceSnapshot(sessionId) {
    const metrics = this.getMetrics();
    const session = metrics.sessions.find(s => s.id === sessionId);
    
    if (session && session.status === 'active') {
      // CPU usage
      const cpuUsage = this.getCPUUsage();
      session.resources.cpu.push({
        timestamp: new Date().toISOString(),
        usage: cpuUsage
      });
      
      // Memory usage
      const memUsage = this.getMemoryUsage();
      session.resources.memory.push({
        timestamp: new Date().toISOString(),
        usage: memUsage
      });
      
      // Keep only last 100 snapshots
      if (session.resources.cpu.length > 100) {
        session.resources.cpu.shift();
      }
      if (session.resources.memory.length > 100) {
        session.resources.memory.shift();
      }
      
      this.saveMetrics(metrics);
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.pricing[model] || { input: 1.0, output: 5.0 }; // Default pricing
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    return inputCost + outputCost;
  }

  getCPUUsage() {
    try {
      const cpus = os.cpus();
      const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
      const totalTick = cpus.reduce((acc, cpu) => 
        acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0
      );
      return ((1 - totalIdle / totalTick) * 100).toFixed(2);
    } catch {
      return 0;
    }
  }

  getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      heapUsed: (used.heapUsed / 1024 / 1024).toFixed(2), // MB
      heapTotal: (used.heapTotal / 1024 / 1024).toFixed(2),
      rss: (used.rss / 1024 / 1024).toFixed(2),
      external: (used.external / 1024 / 1024).toFixed(2)
    };
  }

  checkResourceLimits(metrics) {
    const alerts = [];
    const now = new Date();
    
    // Check hourly token limit
    const hourAgo = new Date(now - 60 * 60 * 1000);
    const recentTokens = metrics.sessions
      .filter(s => new Date(s.startTime) > hourAgo)
      .reduce((acc, s) => acc + s.resources.tokens.input + s.resources.tokens.output, 0);
    
    if (recentTokens > this.limits.maxTokensPerHour) {
      alerts.push({
        type: 'token_limit',
        message: `Token limit exceeded: ${recentTokens}/${this.limits.maxTokensPerHour}`,
        severity: 'high'
      });
    }
    
    // Check daily cost limit
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const recentCost = metrics.sessions
      .filter(s => new Date(s.startTime) > dayAgo)
      .reduce((acc, s) => acc + s.resources.cost, 0);
    
    if (recentCost > this.limits.maxCostPerDay) {
      alerts.push({
        type: 'cost_limit',
        message: `Daily cost limit exceeded: $${recentCost.toFixed(2)}/$${this.limits.maxCostPerDay}`,
        severity: 'high'
      });
    }
    
    // Check active agents
    const activeAgents = metrics.sessions.filter(s => s.status === 'active').length;
    if (activeAgents > this.limits.maxActiveAgents) {
      alerts.push({
        type: 'agent_limit',
        message: `Too many active agents: ${activeAgents}/${this.limits.maxActiveAgents}`,
        severity: 'medium'
      });
    }
    
    if (alerts.length > 0) {
      this.saveAlerts(alerts);
      alerts.forEach(alert => {
        console.error(`⚠️  ALERT: ${alert.message}`);
      });
    }
  }

  getResourceReport(period = 'day') {
    const metrics = this.getMetrics();
    const now = new Date();
    let startTime;
    
    switch (period) {
      case 'hour':
        startTime = new Date(now - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(0);
    }
    
    const periodSessions = metrics.sessions.filter(s => 
      new Date(s.startTime) > startTime
    );
    
    const report = {
      period,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      summary: {
        totalSessions: periodSessions.length,
        activeSessions: periodSessions.filter(s => s.status === 'active').length,
        totalTokens: periodSessions.reduce((acc, s) => 
          acc + s.resources.tokens.input + s.resources.tokens.output, 0
        ),
        totalCost: periodSessions.reduce((acc, s) => acc + s.resources.cost, 0),
        totalAPICalls: periodSessions.reduce((acc, s) => acc + s.resources.apiCalls.length, 0)
      },
      byAgent: {},
      byModel: {},
      topTasks: []
    };
    
    // Group by agent
    periodSessions.forEach(session => {
      if (!report.byAgent[session.agentId]) {
        report.byAgent[session.agentId] = {
          sessions: 0,
          tokens: 0,
          cost: 0,
          apiCalls: 0
        };
      }
      report.byAgent[session.agentId].sessions++;
      report.byAgent[session.agentId].tokens += session.resources.tokens.input + session.resources.tokens.output;
      report.byAgent[session.agentId].cost += session.resources.cost;
      report.byAgent[session.agentId].apiCalls += session.resources.apiCalls.length;
    });
    
    // Group by model
    periodSessions.forEach(session => {
      session.resources.apiCalls.forEach(call => {
        if (!report.byModel[call.model]) {
          report.byModel[call.model] = {
            calls: 0,
            tokens: 0,
            cost: 0
          };
        }
        report.byModel[call.model].calls++;
        report.byModel[call.model].tokens += call.inputTokens + call.outputTokens;
        report.byModel[call.model].cost += call.cost;
      });
    });
    
    // Top tasks by cost
    const taskCosts = {};
    periodSessions.forEach(session => {
      if (!taskCosts[session.taskId]) {
        taskCosts[session.taskId] = 0;
      }
      taskCosts[session.taskId] += session.resources.cost;
    });
    
    report.topTasks = Object.entries(taskCosts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([taskId, cost]) => ({ taskId, cost }));
    
    return report;
  }

  getMetrics() {
    return JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
  }

  saveMetrics(metrics) {
    fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
  }

  saveAlerts(alerts) {
    const existingAlerts = fs.existsSync(this.alertsFile) 
      ? JSON.parse(fs.readFileSync(this.alertsFile, 'utf8'))
      : [];
    
    alerts.forEach(alert => {
      alert.timestamp = new Date().toISOString();
      existingAlerts.push(alert);
    });
    
    // Keep only last 1000 alerts
    if (existingAlerts.length > 1000) {
      existingAlerts.splice(0, existingAlerts.length - 1000);
    }
    
    fs.writeFileSync(this.alertsFile, JSON.stringify(existingAlerts, null, 2));
  }

  exportCostReport(outputFile = 'agent-cost-report.csv') {
    const metrics = this.getMetrics();
    const csv = ['Date,Agent,Task,Model,Input Tokens,Output Tokens,Cost'];
    
    metrics.sessions.forEach(session => {
      session.resources.apiCalls.forEach(call => {
        csv.push([
          call.timestamp,
          session.agentId,
          session.taskId,
          call.model,
          call.inputTokens,
          call.outputTokens,
          call.cost.toFixed(4)
        ].join(','));
      });
    });
    
    fs.writeFileSync(outputFile, csv.join('\n'));
    console.log(`Cost report exported to ${outputFile}`);
  }
}

module.exports = ResourceMonitor;

// CLI interface
if (require.main === module) {
  const monitor = new ResourceMonitor();
  const command = process.argv[2];
  
  switch (command) {
    case 'report':
      const period = process.argv[3] || 'day';
      const report = monitor.getResourceReport(period);
      console.log('\nResource Usage Report:');
      console.log(JSON.stringify(report, null, 2));
      break;
      
    case 'export':
      const outputFile = process.argv[3];
      monitor.exportCostReport(outputFile);
      break;
      
    case 'limits':
      console.log('\nResource Limits:');
      console.log(JSON.stringify(monitor.limits, null, 2));
      break;
      
    default:
      console.log('Usage:');
      console.log('  node resource-monitor.js report [hour|day|week]  - Show resource report');
      console.log('  node resource-monitor.js export [filename]        - Export cost report');
      console.log('  node resource-monitor.js limits                  - Show resource limits');
  }
}