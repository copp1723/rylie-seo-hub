#!/bin/bash

echo "🚀 Setting up Multi-Agent Development System"
echo "=========================================="

# Make scripts executable
echo "📝 Making scripts executable..."
chmod +x orchestrator.js agent-task.js analyze-conflicts.js master-agent.js master-workflow.js

# Check if we're in a git repository
if [ ! -d .git ]; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $CURRENT_BRANCH"

# Initialize status files
echo "📁 Initializing status files..."
echo "{}" > .agent-status.json
echo "{}" > .agent-locks.json

# Add to gitignore
echo "📝 Updating .gitignore..."
if [ -f .gitignore ]; then
  # Check if entries already exist
  grep -q ".agent-status.json" .gitignore || echo ".agent-status.json" >> .gitignore
  grep -q ".agent-locks.json" .gitignore || echo ".agent-locks.json" >> .gitignore
  grep -q ".agent-work-boundaries.json" .gitignore || echo ".agent-work-boundaries.json" >> .gitignore
  grep -q ".agent-workspace.md" .gitignore || echo ".agent-workspace.md" >> .gitignore
  grep -q ".agent-analysis.json" .gitignore || echo ".agent-analysis.json" >> .gitignore
  grep -q ".run-*.sh" .gitignore || echo ".run-*.sh" >> .gitignore
else
  cat > .gitignore << EOF
.agent-status.json
.agent-locks.json
.agent-work-boundaries.json
.agent-workspace.md
.agent-analysis.json
.run-*.sh
EOF
fi

# Run initial analysis
echo ""
echo "🔍 Analyzing project structure..."
node analyze-conflicts.js . > /dev/null 2>&1

if [ -f .agent-analysis.json ]; then
  echo "✅ Project analysis complete"
else
  echo "⚠️  Project analysis failed, but you can continue"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Quick Start Commands:"
echo "  - Initialize Master:    node master-agent.js init"
echo "  - Start a new task:     node agent-task.js"
echo "  - Check agent status:   node orchestrator.js status"
echo "  - Monitor system:       node master-agent.js monitor"
echo "  - View dashboard:       open master-dashboard.html"
echo "  - View full guide:      cat MULTI_AGENT_GUIDE.md"
echo ""
echo "💡 Recommended workflow:"
echo "  1. Run 'node master-agent.js init' to initialize the Master Agent"
echo "  2. Run 'node agent-task.js' to create agent tasks"
echo "  3. Run 'node master-agent.js monitor' to oversee everything"
