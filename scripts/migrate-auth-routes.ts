#!/usr/bin/env node

/**
 * Script to migrate API routes to use the new auth wrapper
 * Run with: npx tsx scripts/migrate-auth-routes.ts
 */

import fs from 'fs/promises'
import path from 'path'

const ROUTES_DIR = './src/app/api'
const BACKUP_DIR = './auth-migration-backup'

// Patterns to find hardcoded values
const HARDCODED_PATTERNS = [
  { pattern: /userId:\s*['"]test-user-id['"]/g, replacement: 'userId: user.id' },
  { pattern: /userEmail:\s*['"]user@example\.com['"]/g, replacement: 'userEmail: user.email' },
  { pattern: /agencyId:\s*['"]default-agency['"]/g, replacement: 'agencyId: tenant.agencyId' },
  { pattern: /agencyId:\s*['"]default['"]/g, replacement: 'agencyId: tenant.agencyId' },
  { pattern: /const\s+userId\s*=\s*['"]test-user-id['"]/g, replacement: 'const userId = user.id' },
  { pattern: /const\s+userEmail\s*=\s*['"]user@example\.com['"]/g, replacement: 'const userEmail = user.email' },
  { pattern: /const\s+agencyId\s*=\s*['"]default-agency['"]/g, replacement: 'const agencyId = tenant.agencyId' },
]

// Routes that should use different wrappers
const ROUTE_WRAPPER_MAP: Record<string, string> = {
  '/admin/': 'withAdminAuth',
  '/super-admin/': 'withSuperAdminAuth',
  '/public/': 'withOptionalAuth',
  // Default is withAuth
}

async function findRouteFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  
  async function scanDirectory(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(fullPath)
        } else if (entry.isFile() && entry.name === 'route.ts') {
          // Found a route file
          files.push(fullPath)
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${currentDir}:`, error)
    }
  }
  
  await scanDirectory(dir)
  return files
}

async function backupFile(filePath: string): Promise<void> {
  const backupPath = filePath.replace('./src', BACKUP_DIR)
  const backupDir = path.dirname(backupPath)
  
  await fs.mkdir(backupDir, { recursive: true })
  await fs.copyFile(filePath, backupPath)
}

async function migrateFile(filePath: string): Promise<void> {
  try {
    // Read the file
    let content = await fs.readFile(filePath, 'utf-8')
    const originalContent = content
    
    // Skip if already migrated
    if (content.includes('withAuth(') || content.includes('route-handler')) {
      console.log(`✓ Already migrated: ${filePath}`)
      return
    }
    
    // Backup the file first
    await backupFile(filePath)
    
    // Determine which wrapper to use
    let wrapperFunction = 'withAuth'
    for (const [pathPattern, wrapper] of Object.entries(ROUTE_WRAPPER_MAP)) {
      if (filePath.includes(pathPattern)) {
        wrapperFunction = wrapper
        break
      }
    }
    
    // Add import if not present
    if (!content.includes("from '@/lib/api/route-handler'")) {
      const importStatement = `import { ${wrapperFunction}, successResponse, errorResponse } from '@/lib/api/route-handler'\n`
      
      // Add after other imports
      const lastImportMatch = content.match(/import.*from.*\n/g)
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1]
        const lastImportIndex = content.lastIndexOf(lastImport)
        content = content.slice(0, lastImportIndex + lastImport.length) + 
                  importStatement + 
                  content.slice(lastImportIndex + lastImport.length)
      } else {
        // No imports found, add at the beginning
        content = importStatement + '\n' + content
      }
    }
    
    // Replace hardcoded patterns
    for (const { pattern, replacement } of HARDCODED_PATTERNS) {
      content = content.replace(pattern, replacement)
    }
    
    // Wrap each HTTP method handler
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    
    for (const method of methods) {
      // Pattern to match: export async function GET(request: NextRequest) {
      const functionPattern = new RegExp(
        `export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*{`,
        'g'
      )
      
      if (functionPattern.test(content)) {
        // Wrap the function
        content = content.replace(
          new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(([^)]*)\\)\\s*{`),
          `export const ${method} = ${wrapperFunction}(async (request, { user, tenant }) => {`
        )
        
        // Find the matching closing brace and add the wrapper closing
        let braceCount = 0
        let startIndex = content.indexOf(`export const ${method}`)
        let i = content.indexOf('{', startIndex)
        
        for (; i < content.length; i++) {
          if (content[i] === '{') braceCount++
          else if (content[i] === '}') {
            braceCount--
            if (braceCount === 0) {
              content = content.slice(0, i + 1) + ')' + content.slice(i + 1)
              break
            }
          }
        }
      }
    }
    
    // Replace NextResponse.json with helper functions where appropriate
    content = content.replace(
      /NextResponse\.json\(\s*{\s*error:\s*['"]([^'"]+)['"]\s*}\s*,\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
      "errorResponse('$1', $2)"
    )
    
    // Write the migrated file
    await fs.writeFile(filePath, content)
    
    if (content !== originalContent) {
      console.log(`✓ Migrated: ${filePath}`)
    } else {
      console.log(`✓ No changes needed: ${filePath}`)
    }
    
  } catch (error) {
    console.error(`✗ Error migrating ${filePath}:`, error)
  }
}

async function main() {
  console.log('🚀 Starting route migration...\n')
  
  // Create backup directory
  await fs.mkdir(BACKUP_DIR, { recursive: true })
  
  // Find all route files
  const files = await findRouteFiles(ROUTES_DIR)
  console.log(`Found ${files.length} route files\n`)
  
  // Migrate each file
  for (const file of files) {
    await migrateFile(file)
  }
  
  console.log('\n✨ Migration complete!')
  console.log(`\nBackups saved to: ${BACKUP_DIR}`)
  console.log('\nNext steps:')
  console.log('1. Review the changes')
  console.log('2. Test the routes')
  console.log('3. Delete the backup directory when satisfied')
}

// Run the migration
main().catch(console.error)