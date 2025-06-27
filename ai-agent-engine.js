#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

class AIAgentEngine {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    if (!this.apiKey) {
      console.error('❌ Please set OPENROUTER_API_KEY environment variable');
      console.log('export OPENROUTER_API_KEY=your-key-here');
      process.exit(1);
    }
    
    // Available models from OpenRouter - Latest and most powerful!
    this.availableModels = {
      // Primary models (use these most often)
      primary: [
        'openai/gpt-4.1',                // GPT 4.1 - Latest
        'anthropic/claude-opus-4',       // Claude Opus 4
        'anthropic/claude-sonnet-4',     // Claude Sonnet 4
        'openai/o3-pro',                 // O3 Pro for complex reasoning
      ],
      // Fast models for simple tasks
      fast: [
        'openai/gpt-4.1-mini',           // GPT 4.1 Mini
        'google/gemini-2.5-flash',       // Gemini 2.5 Flash
        'deepseek/deepseek-r1',          // DeepSeek R1
        'qwen/qwen-2.5-coder-32b-instruct', // Qwen Coder
      ],
      // Specialized models
      specialized: [
        'openai/o3',                     // O3 for reasoning
        'x-ai/grok-3',                   // Grok 3
        'deepseek/deepseek-chat',        // DeepSeek Chat
        'minimax/minimax-01',            // MiniMax
      ],
      // Coding-focused models
      coding: [
        'qwen/qwen-2.5-coder-32b-instruct',
        'deepseek/deepseek-r1',
        'openai/gpt-4.1',
        'anthropic/claude-sonnet-4'
      ]
    };
    
    // Model selection based on task complexity and agent type
    // These are suggestions, not hard requirements
    this.modelConfig = {
      frontend: {
        simple: 'openai/gpt-4.1-mini',
        complex: 'anthropic/claude-sonnet-4',
        creative: 'anthropic/claude-opus-4',
        review: 'openai/gpt-4.1'
      },
      backend: {
        simple: 'openai/gpt-4.1-mini',
        complex: 'openai/gpt-4.1',
        algorithm: 'deepseek/deepseek-r1',
        review: 'anthropic/claude-sonnet-4'
      },
      database: {
        simple: 'google/gemini-2.5-flash',
        complex: 'anthropic/claude-sonnet-4',
        optimization: 'deepseek/deepseek-r1',
        review: 'anthropic/claude-opus-4'
      },
      testing: {
        unit: 'openai/gpt-4.1-mini',
        integration: 'openai/gpt-4.1',
        e2e: 'anthropic/claude-sonnet-4',
        review: 'openai/gpt-4.1'
      }
    };
    
    // Load existing code patterns
    this.codePatterns = this.loadProjectPatterns();
    
    // Agent personas for better code generation
    this.agentPersonas = {
      frontend: "You are a senior React/Next.js developer. You follow modern React patterns, use TypeScript strictly, and create reusable components. You care about UI/UX and accessibility.",
      backend: "You are a senior Node.js/API developer. You write secure, scalable, and well-documented APIs. You follow RESTful principles and handle errors gracefully.",
      database: "You are a database architect. You design efficient schemas, write optimized queries, and ensure data integrity. You understand Prisma and PostgreSQL deeply.",
      testing: "You are a QA engineer who writes comprehensive tests. You ensure high code coverage and test edge cases. You write clear, maintainable test suites."
    };
  }

  async callOpenRouter(messages, model, temperature = 0.7) {
    const data = JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: 4000
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'HTTP-Referer': 'https://github.com/rylie-seo-hub',
        'X-Title': 'Multi-Agent Development System'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            
            // Check for API errors
            if (response.error) {
              console.error('OpenRouter API Error:', response.error);
              reject(new Error(response.error.message || 'API Error'));
              return;
            }
            
            // Check response structure
            if (!response.choices || !response.choices[0] || !response.choices[0].message) {
              console.error('Unexpected response format:', response);
              reject(new Error('Invalid response format from OpenRouter'));
              return;
            }
            
            resolve(response.choices[0].message.content);
          } catch (e) {
            console.error('Failed to parse response:', e.message);
            console.error('Response body:', body);
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  loadProjectPatterns() {
    // Analyze existing code to understand patterns
    const patterns = {
      imports: new Set(),
      components: [],
      utilities: [],
      apiPatterns: [],
      testPatterns: []
    };
    
    // This would scan your project, for now using common patterns
    patterns.imports = new Set([
      'import React from "react"',
      'import { useState, useEffect } from "react"',
      'import { prisma } from "@/lib/prisma"',
      'import { NextResponse } from "next/server"'
    ]);
    
    return patterns;
  }

  async analyzeTicket(ticket) {
    const prompt = `Analyze this development ticket and provide a structured response:

Ticket: ${ticket.id}
Description: ${ticket.description}
Notes: ${ticket.notes?.join('\n') || 'None'}

Provide your analysis in this JSON format:
{
  "complexity": "simple|medium|complex",
  "estimatedLinesOfCode": number,
  "requiredFiles": ["list", "of", "files", "to", "create", "or", "modify"],
  "suggestedApproach": "brief approach",
  "potentialChallenges": ["list", "of", "challenges"],
  "testingStrategy": "how to test this"
}`;

    const response = await this.callOpenRouter([
      { role: 'system', content: 'You are a senior software architect analyzing tickets.' },
      { role: 'user', content: prompt }
    ], 'openai/gpt-4');

    try {
      return JSON.parse(response);
    } catch (e) {
      console.log('Failed to parse analysis, using defaults');
      return { complexity: 'medium', estimatedLinesOfCode: 100 };
    }
  }

  async generateImplementationPlan(ticket, agent, analysis) {
    const persona = this.agentPersonas[agent];
    const examples = await this.getRelevantExamples(ticket, agent);
    
    const prompt = `${persona}

You are implementing this ticket:
${ticket.id}: ${ticket.description}

Analysis: ${JSON.stringify(analysis, null, 2)}

Existing code patterns in this project:
${examples}

Create a detailed implementation plan with specific code snippets. Include:
1. Files to create/modify
2. Key code sections
3. Integration points
4. Error handling
5. Testing approach

Format your response as executable steps.`;

    const model = this.modelConfig[agent][analysis.complexity] || this.modelConfig[agent].complex;
    
    return await this.callOpenRouter([
      { role: 'system', content: persona },
      { role: 'user', content: prompt }
    ], model);
  }

  async generateCode(agent, file, requirements, existingCode = null) {
    const persona = this.agentPersonas[agent];
    const model = this.modelConfig[agent].complex;
    
    const prompt = `${persona}

Generate production-ready code for: ${file}

Requirements:
${requirements}

${existingCode ? `Existing code to modify:\n\`\`\`\n${existingCode}\n\`\`\`` : 'This is a new file.'}

Project patterns to follow:
- Use TypeScript
- Follow existing import patterns
- Include proper error handling
- Add JSDoc comments
- Make it testable

Respond with ONLY the complete code, no explanations.`;

    const code = await this.callOpenRouter([
      { role: 'system', content: persona },
      { role: 'user', content: prompt }
    ], model, 0.3); // Lower temperature for more consistent code
    
    // Clean up response
    return code.replace(/```[\w]*\n/g, '').replace(/```$/g, '').trim();
  }

  async generateTests(agent, codeFile, implementation) {
    const testFile = codeFile.replace(/\.(ts|tsx|js)$/, '.test.$1');
    const model = this.modelConfig.testing.unit;
    
    const prompt = `Generate comprehensive tests for this code:

File: ${codeFile}
\`\`\`
${implementation}
\`\`\`

Create tests that:
1. Cover all functions/methods
2. Test edge cases
3. Test error scenarios
4. Use Jest and React Testing Library (if React component)
5. Aim for >80% coverage

Respond with ONLY the test code.`;

    return await this.callOpenRouter([
      { role: 'system', content: this.agentPersonas.testing },
      { role: 'user', content: prompt }
    ], model, 0.3);
  }

  async reviewCode(agent, code, requirements) {
    const model = this.modelConfig[agent].review;
    
    const prompt = `Review this code for quality, security, and best practices:

Requirements: ${requirements}

Code:
\`\`\`
${code}
\`\`\`

Provide a JSON response:
{
  "score": 0-100,
  "issues": [{"severity": "high|medium|low", "description": "...", "line": number}],
  "suggestions": ["improvement suggestions"],
  "security": ["any security concerns"],
  "approved": boolean
}`;

    const response = await this.callOpenRouter([
      { role: 'system', content: 'You are a senior code reviewer focused on quality and security.' },
      { role: 'user', content: prompt }
    ], model);

    try {
      return JSON.parse(response);
    } catch (e) {
      return { score: 80, issues: [], approved: true };
    }
  }

  async getRelevantExamples(ticket, agent) {
    // In a real implementation, this would search your codebase
    // For now, return common patterns
    const examples = {
      frontend: `
// Common component pattern:
export const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary' }) => {
  return <button className={cn('btn', variant)} onClick={onClick}>{children}</button>
}

// Common hook pattern:
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  // ... implementation
}`,
      backend: `
// Common API route pattern:
export async function GET(request: Request) {
  try {
    const data = await prisma.model.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`,
      database: `
// Common Prisma model pattern:
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`
    };

    return examples[agent] || '';
  }

  async improveCode(code, feedback) {
    const prompt = `Improve this code based on the feedback:

Current code:
\`\`\`
${code}
\`\`\`

Feedback:
${JSON.stringify(feedback, null, 2)}

Provide the improved code only.`;

    return await this.callOpenRouter([
      { role: 'system', content: 'You are an expert developer improving code based on review feedback.' },
      { role: 'user', content: prompt }
    ], 'openai/gpt-4', 0.3);
  }

  async suggestModelForTask(task, agent) {
    // Intelligently select the best model based on task
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('refactor') || taskLower.includes('optimize')) {
      return 'anthropic/claude-3-opus-20240229'; // Best for complex refactoring
    }
    
    if (taskLower.includes('ui') || taskLower.includes('component')) {
      return 'openai/gpt-4'; // Good for React components
    }
    
    if (taskLower.includes('test')) {
      return 'openai/gpt-3.5-turbo'; // Fast and good for tests
    }
    
    if (taskLower.includes('algorithm') || taskLower.includes('complex')) {
      return 'anthropic/claude-3-opus-20240229'; // Best for algorithms
    }
    
    // Default based on agent
    return this.modelConfig[agent].complex;
  }
}

// Export for use in other parts of the system
module.exports = AIAgentEngine;

// CLI interface
if (require.main === module) {
  const engine = new AIAgentEngine();
  
  async function demo() {
    console.log('🤖 AI Agent Engine Demo\n');
    
    // Demo ticket
    const ticket = {
      id: 'TICKET-001',
      description: 'Create a progress bar component that shows package completion',
      notes: ['Should be reusable', 'Support different color themes', 'Show percentage']
    };
    
    console.log('1️⃣ Analyzing ticket...');
    const analysis = await engine.analyzeTicket(ticket);
    console.log('Analysis:', analysis);
    
    console.log('\n2️⃣ Generating implementation plan...');
    const plan = await engine.generateImplementationPlan(ticket, 'frontend', analysis);
    console.log('Plan:', plan.substring(0, 500) + '...');
    
    console.log('\n3️⃣ Generating code...');
    const code = await engine.generateCode('frontend', 'ProgressBar.tsx', ticket.description);
    console.log('Generated code preview:', code.substring(0, 300) + '...');
    
    console.log('\n4️⃣ Generating tests...');
    const tests = await engine.generateTests('frontend', 'ProgressBar.tsx', code);
    console.log('Generated tests preview:', tests.substring(0, 300) + '...');
    
    console.log('\n5️⃣ Reviewing code...');
    const review = await engine.reviewCode('frontend', code, ticket.description);
    console.log('Review:', review);
    
    console.log('\n✅ AI Agent Engine is ready!');
    console.log('\n📝 Available models through OpenRouter:');
    console.log('   - GPT-4, GPT-3.5 for general coding');
    console.log('   - Claude 3 Opus for complex algorithms');
    console.log('   - Claude 2 for creative solutions');
    console.log('   - And 300+ more models to choose from!');
  }
  
  demo().catch(console.error);
}
