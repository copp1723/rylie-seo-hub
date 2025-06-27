# Multi-Agent Development System for Rylie SEO Hub

This system allows multiple AI agents to work on different parts of your codebase simultaneously without creating conflicts.

## Quick Start

### 1. Initial Setup
```bash
# Make scripts executable
chmod +x orchestrator.js agent-task.js analyze-conflicts.js

# Initialize the orchestrator
node orchestrator.js init

# Analyze your project structure
node analyze-conflicts.js .
```

### 2. Start a New Agent Task
```bash
# Interactive task creation
node agent-task.js

# This will:
# - Let you select an agent (frontend, backend, database, etc.)
# - Create a task-specific branch
# - Set up work boundaries
# - Install pre-commit hooks to prevent boundary violations
```

### 3. Monitor Agent Status
```bash
# Check all agent statuses
node orchestrator.js status

# Run continuous sync (keeps agents updated with main branch)
node orchestrator.js watch
```

### 4. Complete an Agent Task
```bash
# When an agent finishes their task
node orchestrator.js merge <agent-name> "Description of changes"
```

## Architecture Overview

### Agent Boundaries

Each agent has clearly defined work areas:

**Frontend Agent**
- Allowed: `src/components`, `src/pages`, `src/styles`, `src/hooks`
- Focus: UI components, page layouts, styling, client-side logic

**Backend Agent**
- Allowed: `src/server`, `src/lib/api`, API routes
- Focus: Server logic, API endpoints, business logic

**Database Agent**
- Allowed: `prisma`, `src/lib/db`, database models
- Focus: Schema changes, migrations, database queries

**Integration Agent**
- Allowed: `src/lib/integrations`, `src/server/webhooks`
- Focus: External API integrations, webhooks, third-party services

**Testing Agent**
- Allowed: All test files (`*.test.ts`, `*.test.tsx`)
- Focus: Unit tests, integration tests, test coverage

### Conflict Prevention Strategies

1. **File Locking**: When an agent starts working on files, they're automatically locked
2. **Pre-commit Hooks**: Prevent commits that violate agent boundaries
3. **Automatic Rebasing**: Agents are regularly synced with the main branch
4. **Interface Contracts**: Shared interfaces are clearly defined and versioned

### Best Practices

1. **Keep Tasks Small**: Each agent task should be completable in 1-2 hours
2. **Clear Task IDs**: Use descriptive IDs like `fix-navbar-mobile`, `add-user-auth`
3. **Atomic Commits**: Each commit should be self-contained and not break the build
4. **Test Locally**: Always test changes before committing
5. **Document Changes**: Update relevant documentation with your changes

## Common Workflows

### Scenario 1: Frontend and Backend Parallel Development

```bash
# Terminal 1: Frontend agent works on new dashboard
node agent-task.js
# Select: Frontend Agent
# Task ID: dashboard-redesign

# Terminal 2: Backend agent adds new API endpoint
node agent-task.js  
# Select: Backend Agent
# Task ID: analytics-endpoint

# Both can work simultaneously without conflicts
```

### Scenario 2: Database Schema Update with API Changes

```bash
# Step 1: Database agent updates schema
node agent-task.js
# Select: Database Agent
# Task ID: add-user-preferences

# Step 2: After schema is merged, backend updates API
node orchestrator.js merge database "Added user preferences table"
node agent-task.js
# Select: Backend Agent  
# Task ID: user-preferences-api
```

### Scenario 3: Coordinated Feature Development

```bash
# Create feature branches for all agents
node orchestrator.js create frontend feature-x-ui
node orchestrator.js create backend feature-x-api
node orchestrator.js create database feature-x-schema

# Monitor progress
node orchestrator.js status

# Merge in dependency order
node orchestrator.js merge database "Feature X database schema"
node orchestrator.js merge backend "Feature X API implementation"
node orchestrator.js merge frontend "Feature X UI"
```

## Troubleshooting

### "Agent boundary violation" error
- You're trying to modify files outside your agent's allowed paths
- Check `.agent-work-boundaries.json` for your allowed paths
- If you need to modify other files, coordinate with the appropriate agent

### Merge conflicts
- Run `node orchestrator.js sync <agent>` to update your branch
- Resolve conflicts locally before pushing
- Consider smaller, more frequent commits

### Branch divergence
- Use `git rebase` instead of `git merge` to keep history clean
- The orchestrator automatically uses rebase strategy
- If severely diverged, create a new task branch

## Advanced Configuration

Edit `agent-orchestrator.config.json` to:
- Add new agents
- Modify work boundaries  
- Change sync frequency
- Adjust conflict resolution strategy

## Integration with CI/CD

Add to your GitHub Actions:

```yaml
- name: Check Agent Boundaries
  run: |
    if [ -f .agent-work-boundaries.json ]; then
      node .github/scripts/verify-boundaries.js
    fi
```

## Tips for Maximum Efficiency

1. **Run the watcher**: Keep `node orchestrator.js watch` running to auto-sync
2. **Use VS Code workspaces**: Create agent-specific workspaces with only their allowed folders
3. **Communicate through interfaces**: Don't directly modify other agents' code
4. **Plan before starting**: Discuss task boundaries in team chat/issues
5. **Merge frequently**: Don't let branches diverge too far

## Emergency Commands

```bash
# Abort current agent work and start fresh
git checkout main
git branch -D <agent-branch>
node orchestrator.js create <agent> <new-task>

# Force sync all agents
for agent in frontend backend database integration testing; do
  node orchestrator.js sync $agent
done

# Check for file conflicts
node analyze-conflicts.js .
```

## Master Agent System

The Master Agent acts as the central authority for all code integration, with supreme oversight over all other agents.

### Master Agent Commands

```bash
# Initialize Master Agent
node master-agent.js init

# Review all pending agent work
node master-agent.js review

# Integrate approved changes
node master-agent.js integrate

# Check Master Agent status
node master-agent.js status

# Enter override mode for critical fixes
node master-agent.js override

# Sync all active agents
node master-agent.js sync

# Start continuous monitoring
node master-agent.js monitor
```

### Master Agent Workflows

1. **Standard Integration**
   ```bash
   node master-workflow.js standardIntegration
   ```
   - Fetches all branches
   - Reviews changes
   - Validates boundaries
   - Runs tests
   - Merges to master
   - Deploys to production

2. **Batch Integration**
   ```bash
   node master-workflow.js batchIntegration
   ```
   - Collects all ready branches
   - Orders by dependency
   - Sequential integration
   - Full regression testing

3. **Emergency Fix**
   ```bash
   node master-workflow.js emergencyFix
   ```
   - Creates override branch
   - Disables all boundaries
   - Fast-track validation
   - Direct push to main

### Master Agent Dashboard

Open `master-dashboard.html` in your browser for a real-time view of:
- Active agents and their tasks
- Pending reviews
- Integration pipeline status
- Recent activity feed
- System metrics

### Master Agent Authority

The Master Agent has:
- **Supreme Authority**: Can override any agent decision
- **No Boundaries**: Can modify any file in the codebase
- **Conflict Resolution**: Automatically resolves merge conflicts
- **Quality Control**: Enforces code standards and testing
- **Final Say**: Only the Master Agent can push to main branch

### Typical Master Agent Workflow

```bash
# 1. Start monitoring
node master-agent.js monitor

# 2. When agents complete work, review it
node master-agent.js review

# 3. Run integration workflow
node master-workflow.js standardIntegration

# 4. Or handle emergency
node master-agent.js override
# Make fixes...
node master-agent.js integrate
```

### Master Agent Configuration

Edit `master-agent-config.json` to customize:
- Review standards
- Auto-approval conditions
- Integration pipeline stages
- Automation rules
- Agent hierarchy

## Complete Multi-Agent Development Flow

1. **Agents work in parallel**:
   ```bash
   # Terminal 1: Frontend Agent
   node agent-task.js
   
   # Terminal 2: Backend Agent
   node agent-task.js
   
   # Terminal 3: Database Agent
   node agent-task.js
   ```

2. **Master Agent monitors**:
   ```bash
   node master-agent.js monitor
   ```

3. **Agents complete tasks**:
   ```bash
   git add .
   git commit -m "Agent: Task complete"
   git push origin <branch>
   ```

4. **Master Agent reviews and integrates**:
   ```bash
   node master-workflow.js standardIntegration
   ```

5. **Production deployment**:
   - Master Agent validates everything
   - Runs comprehensive tests
   - Pushes to main branch
   - Triggers deployment

## Benefits of Master Agent System

1. **Single Source of Truth**: Only Master Agent commits to main
2. **Automated Quality Control**: Enforces standards automatically
3. **Conflict Resolution**: Master Agent handles all conflicts
4. **Emergency Override**: Can quickly fix critical issues
5. **Complete Oversight**: Monitors all agent activity
6. **Intelligent Integration**: Orders merges by dependency

## Next Steps

1. Initialize the Master Agent: `node master-agent.js init`
2. Try creating agent tasks with `node agent-task.js`
3. Run the Master Agent monitor: `node master-agent.js monitor`
4. Open the dashboard: `open master-dashboard.html`
5. Customize the configuration files for your needs

Remember: The Master Agent ensures code quality while enabling multiple agents to work efficiently in parallel. It's the final authority that maintains order in your multi-agent development ecosystem.
