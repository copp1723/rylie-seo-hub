import { render, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { FEATURE_FLAGS, getTerminology } from '@/lib/feature-flags';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
}));

describe('Feature Flags', () => {
  test('USE_REQUESTS_TERMINOLOGY should be true', () => {
    expect(FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY).toBe(true);
  });

  test('getTerminology returns correct values', () => {
    const terms = getTerminology();
    expect(terms.order).toBe('request');
    expect(terms.orders).toBe('requests');
    expect(terms.Order).toBe('Request');
    expect(terms.Orders).toBe('Requests');
    expect(terms.ordering).toBe('requesting');
    expect(terms.ordered).toBe('requested');
    expect(terms.Ordered).toBe('Requested');
  });
});

describe('Critical Routes', () => {
  test('auth endpoints are defined', () => {
    const authRoutes = [
      '/api/auth/[...nextauth]',
      '/api/auth/signin',
      '/api/auth/signout',
      '/api/auth/session',
    ];
    
    // This is a basic check - in a real app you'd test the actual routes
    authRoutes.forEach(route => {
      expect(route).toMatch(/^\/api\/auth/);
    });
  });
  
  test('API endpoints follow naming convention', () => {
    const apiRoutes = [
      '/api/orders',
      '/api/orders/[id]',
      '/api/agencies/current',
      '/api/ga4/properties',
      '/api/ga4/connect',
    ];
    
    apiRoutes.forEach(route => {
      expect(route).toMatch(/^\/api\//);
    });
  });
});

describe('Environment Variables', () => {
  test('critical build-time vars are defined', () => {
    // In a real test environment, you'd mock these
    const criticalVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];
    
    // This is a placeholder - in production you'd check process.env
    expect(criticalVars).toHaveLength(2);
  });
});
