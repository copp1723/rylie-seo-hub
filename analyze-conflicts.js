#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ConflictPreventionSystem {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.dependencyMap = new Map();
    this.fileOwnership = new Map();
    this.moduleInterfaces = new Map();
  }

  analyzeProjectStructure() {
    console.log('🔍 Analyzing project structure...');
    
    // Analyze source files
    this.analyzeDependencies('src');
    
    // Create ownership map based on file patterns
    this.createOwnershipMap();
    
    // Define module interfaces
    this.defineModuleInterfaces();
  }

  analyzeDependencies(dir, basePath = '') {
    const fullPath = path.join(this.projectPath, basePath, dir);
    
    if (!fs.existsSync(fullPath)) return;
    
    const items = fs.readdirSync(fullPath);
    
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const relativePath = path.join(basePath, dir, item);
      
      if (fs.statSync(itemPath).isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          this.analyzeDependencies(item, path.join(basePath, dir));
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
        this.analyzeFile(itemPath, relativePath);
      }
    }
  }

  analyzeFile(filePath, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);
      
      this.dependencyMap.set(relativePath, {
        imports: imports,
        exports: exports,
        modified: fs.statSync(filePath).mtime
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:{[^}]+}|[\w\s,]+)\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g;
    const defaultExportRegex = /export\s+default\s+/g;
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    if (defaultExportRegex.test(content)) {
      exports.push('default');
    }
    
    return exports;
  }

  createOwnershipMap() {
    // Define clear ownership boundaries
    const ownershipRules = {
      'frontend': {
        paths: ['src/components', 'src/pages', 'src/styles', 'src/hooks'],
        extensions: ['.tsx', '.css', '.scss']
      },
      'backend': {
        paths: ['src/server', 'src/api', 'src/lib/api'],
        extensions: ['.ts', '.js']
      },
      'database': {
        paths: ['prisma', 'src/lib/db', 'src/models'],
        extensions: ['.prisma', '.sql', '.ts']
      },
      'shared': {
        paths: ['src/lib/utils', 'src/types', 'src/constants'],
        extensions: ['.ts', '.js']
      }
    };

    for (const [owner, rules] of Object.entries(ownershipRules)) {
      for (const filePath of this.dependencyMap.keys()) {
        const matchesPath = rules.paths.some(p => filePath.includes(p));
        const matchesExt = rules.extensions.some(e => filePath.endsWith(e));
        
        if (matchesPath || matchesExt) {
          this.fileOwnership.set(filePath, owner);
        }
      }
    }
  }

  defineModuleInterfaces() {
    // Define stable interfaces between modules
    this.moduleInterfaces.set('api-contracts', {
      location: 'src/types/api.ts',
      owner: 'shared',
      consumers: ['frontend', 'backend'],
      rules: [
        'Changes must be backward compatible',
        'New fields should be optional',
        'Deprecate before removing'
      ]
    });

    this.moduleInterfaces.set('database-schema', {
      location: 'prisma/schema.prisma',
      owner: 'database',
      consumers: ['backend'],
      rules: [
        'Migrations must be additive',
        'Column removals require migration plan',
        'Index changes need performance review'
      ]
    });

    this.moduleInterfaces.set('component-props', {
      location: 'src/types/components.ts',
      owner: 'frontend',
      consumers: ['frontend'],
      rules: [
        'Props interfaces should be stable',
        'Use optional props for new features',
        'Maintain prop type compatibility'
      ]
    });
  }

  generateAgentGuidelines() {
    const guidelines = {
      version: '1.0',
      generated: new Date().toISOString(),
      modules: {},
      interfaces: {},
      rules: []
    };

    // Module ownership guidelines
    for (const [file, owner] of this.fileOwnership.entries()) {
      if (!guidelines.modules[owner]) {
        guidelines.modules[owner] = {
          files: [],
          canModify: [],
          cannotModify: [],
          mustCoordinate: []
        };
      }
      guidelines.modules[owner].files.push(file);
    }

    // Interface contracts
    for (const [name, contract] of this.moduleInterfaces.entries()) {
      guidelines.interfaces[name] = contract;
    }

    // General rules
    guidelines.rules = [
      {
        rule: 'File Ownership',
        description: 'Agents should only modify files in their designated areas',
        enforcement: 'Pre-commit hooks will check file ownership'
      },
      {
        rule: 'Interface Stability',
        description: 'Changes to shared interfaces require coordination',
        enforcement: 'PR reviews required for interface changes'
      },
      {
        rule: 'Dependency Direction',
        description: 'Dependencies should flow in one direction: UI -> API -> Database',
        enforcement: 'Circular dependencies will be rejected'
      },
      {
        rule: 'Atomic Changes',
        description: 'Each commit should be self-contained and not break builds',
        enforcement: 'CI/CD will validate each commit'
      }
    ];

    return guidelines;
  }

  generateConflictReport() {
    const report = {
      timestamp: new Date().toISOString(),
      potentialConflicts: [],
      suggestions: []
    };

    // Check for cross-module dependencies
    for (const [file, data] of this.dependencyMap.entries()) {
      const fileOwner = this.fileOwnership.get(file);
      
      for (const importPath of data.imports) {
        if (importPath.startsWith('.')) {
          // Resolve relative import
          const resolvedPath = path.join(path.dirname(file), importPath);
          const importOwner = this.fileOwnership.get(resolvedPath);
          
          if (fileOwner && importOwner && fileOwner !== importOwner) {
            report.potentialConflicts.push({
              type: 'cross-module-dependency',
              from: file,
              to: resolvedPath,
              fromOwner: fileOwner,
              toOwner: importOwner,
              severity: 'medium'
            });
          }
        }
      }
    }

    // Generate suggestions
    if (report.potentialConflicts.length > 0) {
      report.suggestions.push({
        title: 'Create Stable Interfaces',
        description: 'Define clear contracts between modules to reduce coupling'
      });
      report.suggestions.push({
        title: 'Use Message Passing',
        description: 'Consider event-driven communication between modules'
      });
    }

    return report;
  }

  saveAnalysis() {
    const analysis = {
      timestamp: new Date().toISOString(),
      projectPath: this.projectPath,
      dependencies: Array.from(this.dependencyMap.entries()),
      ownership: Array.from(this.fileOwnership.entries()),
      interfaces: Array.from(this.moduleInterfaces.entries()),
      guidelines: this.generateAgentGuidelines(),
      conflictReport: this.generateConflictReport()
    };

    fs.writeFileSync(
      path.join(this.projectPath, '.agent-analysis.json'),
      JSON.stringify(analysis, null, 2)
    );

    return analysis;
  }
}

// Run analysis
const projectPath = process.argv[2] || process.cwd();
const analyzer = new ConflictPreventionSystem(projectPath);

analyzer.analyzeProjectStructure();
const analysis = analyzer.saveAnalysis();

console.log('\n✅ Analysis complete!');
console.log(`📊 Found ${analysis.dependencies.length} files`);
console.log(`🏢 Identified ${Object.keys(analysis.guidelines.modules).length} module owners`);
console.log(`🔗 Defined ${analysis.interfaces.length} interface contracts`);
console.log(`⚠️  Found ${analysis.conflictReport.potentialConflicts.length} potential conflicts`);

console.log('\n📋 Module Ownership:');
for (const [owner, data] of Object.entries(analysis.guidelines.modules)) {
  console.log(`  ${owner}: ${data.files.length} files`);
}

if (analysis.conflictReport.potentialConflicts.length > 0) {
  console.log('\n⚠️  Potential Conflicts:');
  analysis.conflictReport.potentialConflicts.slice(0, 5).forEach(conflict => {
    console.log(`  - ${conflict.from} → ${conflict.to}`);
    console.log(`    ${conflict.fromOwner} depends on ${conflict.toOwner}`);
  });
}

console.log('\n💡 Suggestions:');
analysis.conflictReport.suggestions.forEach(suggestion => {
  console.log(`  - ${suggestion.title}: ${suggestion.description}`);
});

console.log('\n📄 Full analysis saved to .agent-analysis.json');
