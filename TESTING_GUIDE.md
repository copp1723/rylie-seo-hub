# Pre-Deployment Testing Guide

## Overview
This project includes comprehensive pre-deployment tests to ensure quality and prevent broken deployments.

## Test Types

### 1. Unit Tests (`__tests__/`)
- **Feature flags**: Verifies terminology is hardcoded correctly
- **Security**: Checks authentication requirements
- **Routes**: Validates API endpoint structure

### 2. Pre-Deploy Checks (`scripts/pre-deploy-check.sh`)
- Environment setup validation
- Critical file existence
- Security scanning (hardcoded secrets)
- Git status verification
- TypeScript compilation
- Linting

### 3. CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
- Runs on every push to main
- Sets up test database
- Runs all tests
- Builds the application
- Smoke tests (server startup, page loading)
- Auto-deploys if all tests pass

### 4. Post-Deploy Validation (`scripts/validate-deployment.sh`)
- Checks live endpoints
- Verifies content (terminology)
- Tests API health
- Measures performance

## Running Tests Locally

### Quick Check Before Deploy
```bash
npm run pre-deploy:check
```

### Run All Tests
```bash
# Lint, type check, and test
npm run pre-deploy

# Just unit tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Manual Pre-Deploy Checklist
```bash
# 1. Check git status
git status

# 2. Run pre-deploy script
./scripts/pre-deploy-check.sh

# 3. Build locally to catch errors
npm run build

# 4. Test the build
npm start
# Then visit http://localhost:3001
```

### Validate After Deploy
```bash
# Check production
./scripts/validate-deployment.sh https://rylie-seo-hub.onrender.com

# Check staging (if applicable)
./scripts/validate-deployment.sh https://staging-rylie-seo-hub.onrender.com
```

## Test Configuration

### Environment Variables for Tests
Create `.env.test`:
```env
DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testdb"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret-key"
```

### Coverage Thresholds
Current thresholds (60% for all):
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

## GitHub Actions Workflow

The CI/CD pipeline automatically:
1. Sets up Node.js 18
2. Installs dependencies
3. Creates test database
4. Runs linter (continues on error)
5. Checks TypeScript types
6. Runs unit tests
7. Builds application
8. Runs smoke tests
9. Deploys if on main branch

## Adding New Tests

### Unit Test Template
```typescript
// __tests__/features/new-feature.test.ts
import { render, screen } from '@testing-library/react';
import { NewFeature } from '@/components/NewFeature';

describe('NewFeature', () => {
  test('renders correctly', () => {
    render(<NewFeature />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### API Test Template
```typescript
// __tests__/api/new-endpoint.test.ts
describe('API: /api/new-endpoint', () => {
  test('requires authentication', async () => {
    const response = await fetch('/api/new-endpoint');
    expect(response.status).toBe(401);
  });
});
```

## Troubleshooting

### Tests Failing Locally
1. Ensure dependencies are installed: `npm install`
2. Check Node version: `node --version` (should be 18+)
3. Clear cache: `npm run clean && npm install`

### CI/CD Failing
1. Check GitHub Actions logs
2. Ensure secrets are set (RENDER_DEPLOY_HOOK_URL)
3. Verify all files are committed
4. Check for TypeScript errors: `npm run type-check`

### Deployment Validation Failing
1. Check Render logs for build errors
2. Verify environment variables on Render
3. Ensure database migrations ran
4. Check domain/SSL configuration

## Best Practices

1. **Always run tests before pushing**
   ```bash
   npm run pre-deploy:check
   ```

2. **Fix linting errors**
   ```bash
   npm run lint:fix
   ```

3. **Keep tests fast**
   - Mock external services
   - Use test databases
   - Parallelize where possible

4. **Write tests for new features**
   - Add unit tests for components
   - Add API tests for endpoints
   - Update smoke tests for new pages

5. **Monitor test coverage**
   ```bash
   npm run test:coverage
   ```
   
## Emergency Rollback

If a bad deploy makes it through:
1. Go to Render Dashboard → Deploys
2. Find the last working deploy
3. Click "Rollback to this deploy"
4. Investigate what went wrong
5. Add tests to prevent recurrence
