// src/app/api/reports/trigger-scheduled-jobs/route.test.ts
import { POST } from './route'; // Adjust if your handler is named differently
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processSchedule, calculateNextRun } from '@/lib/services/scheduler-service';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    reportSchedule: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock scheduler-service
jest.mock('@/lib/services/scheduler-service', () => ({
  processSchedule: jest.fn(),
  calculateNextRun: jest.fn(),
}));

const MOCK_SECRET = 'test-secret';

describe('/api/reports/trigger-scheduled-jobs', () => {
  let originalEnv: any; // Changed from NodeJS.ProcessEnv to any

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      REPORT_TRIGGER_SECRET: MOCK_SECRET,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 401 if secret is missing', async () => {
    const request = new NextRequest('http://localhost/api/reports/trigger-scheduled-jobs', {
      method: 'POST',
      headers: {},
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 401 if secret is invalid', async () => {
    const request = new NextRequest('http://localhost/api/reports/trigger-scheduled-jobs', {
      method: 'POST',
      headers: { 'x-api-key': 'wrong-secret' },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 500 if REPORT_TRIGGER_SECRET is not set in environment', async () => {
    delete process.env.REPORT_TRIGGER_SECRET;
    const request = new NextRequest('http://localhost/api/reports/trigger-scheduled-jobs', {
      method: 'POST',
      headers: { 'x-api-key': MOCK_SECRET },
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });

  it('should return 200 and "No due schedules" if none are found', async () => {
    (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue([]);
    const request = new NextRequest('http://localhost/api/reports/trigger-scheduled-jobs', {
      method: 'POST',
      headers: { 'x-api-key': MOCK_SECRET },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('No due schedules to process.');
  });

  it('should process due schedules and update them', async () => {
    const now = new Date();
    const schedules = [
      { id: '1', cronPattern: '0 0 * * *', ga4PropertyId: 'prop1', userId: 'user1', emailRecipients: ['test@example.com'], reportType: 'WeeklySummary', isActive: true, nextRun: new Date(now.getTime() - 1000) },
      { id: '2', cronPattern: '0 0 * * *', ga4PropertyId: 'prop2', userId: 'user2', emailRecipients: ['test2@example.com'], reportType: 'MonthlyReport', isActive: true, nextRun: new Date(now.getTime() - 2000) },
    ];
    (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue(schedules);
    (processSchedule as jest.Mock).mockResolvedValue(undefined); // Simulate successful processing

    const mockNextRunDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    (calculateNextRun as jest.Mock).mockReturnValue(mockNextRunDate);

    const request = new NextRequest('http://localhost/api/reports/trigger-scheduled-jobs', {
      method: 'POST',
      headers: { 'x-api-key': MOCK_SECRET },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toBe('Scheduled jobs processed.');
    expect(body.processedCount).toBe(2);
    expect(body.errorCount).toBe(0);
    expect(body.totalDue).toBe(2);

    expect(prisma.reportSchedule.findMany).toHaveBeenCalledWith({
      where: { isActive: true, nextRun: { lte: expect.any(Date) } },
    });
    expect(processSchedule).toHaveBeenCalledTimes(2);
    expect(processSchedule).toHaveBeenCalledWith(schedules[0]);
    expect(processSchedule).toHaveBeenCalledWith(schedules[1]);

    expect(prisma.reportSchedule.update).toHaveBeenCalledTimes(2);
    expect(prisma.reportSchedule.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { lastRun: expect.any(Date), nextRun: mockNextRunDate },
    });
    expect(prisma.reportSchedule.update).toHaveBeenCalledWith({
      where: { id: '2' },
      data: { lastRun: expect.any(Date), nextRun: mockNextRunDate },
    });
  });

  it('should handle errors during schedule processing', async () => {
    const now = new Date();
    const schedules = [
      { id: '1', cronPattern: '0 0 * * *', ga4PropertyId: 'prop1', userId: 'user1', emailRecipients: ['test@example.com'], reportType: 'WeeklySummary', isActive: true, nextRun: now },
    ];
    (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue(schedules);
    (processSchedule as jest.Mock).mockRejectedValue(new Error('Processing failed'));

    const mockNextRunDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    (calculateNextRun as jest.Mock).mockReturnValue(mockNextRunDate); // Still calculate next run for update

    const request = new NextRequest('http://localhost/api/reports/trigger-scheduled-jobs', {
      method: 'POST',
      headers: { 'x-api-key': MOCK_SECRET },
    });
    const response = await POST(request);
    expect(response.status).toBe(200); // Endpoint itself doesn't fail, but reports errorCount
    const body = await response.json();

    expect(body.message).toBe('Scheduled jobs processed.');
    expect(body.processedCount).toBe(0);
    expect(body.errorCount).toBe(1);
    expect(body.totalDue).toBe(1);

    expect(processSchedule).toHaveBeenCalledWith(schedules[0]);
    // Ensure update is NOT called for the failed schedule if processSchedule throws before update
    // However, my current implementation in route.ts updates lastRun/nextRun *after* processSchedule,
    // so if processSchedule fails, the update for that specific schedule is skipped.
    // If the requirement was to update even on failure (e.g. to set an error state or reschedule differently),
    // this test would need to change. For now, it reflects the current code.
    expect(prisma.reportSchedule.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' } })
    );
  });

  it('should correctly report processed and error counts', async () => {
    const now = new Date();
    const schedules = [
      { id: '1', cronPattern: '0 0 * * *', ga4PropertyId: 'prop1', userId: 'user1', emailRecipients: ['test@example.com'], reportType: 'WeeklySummary', isActive: true, nextRun: now },
      { id: '2', cronPattern: '0 0 * * *', ga4PropertyId: 'prop2', userId: 'user2', emailRecipients: ['test2@example.com'], reportType: 'MonthlyReport', isActive: true, nextRun: now },
      { id: '3', cronPattern: '0 0 * * *', ga4PropertyId: 'prop3', userId: 'user3', emailRecipients: ['test3@example.com'], reportType: 'QuarterlyReview', isActive: true, nextRun: now },
    ];
    (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue(schedules);

    (processSchedule as jest.Mock)
      .mockResolvedValueOnce(undefined) // Schedule 1 succeeds
      .mockRejectedValueOnce(new Error('Processing failed for schedule 2')) // Schedule 2 fails
      .mockResolvedValueOnce(undefined); // Schedule 3 succeeds

    const mockNextRunDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    (calculateNextRun as jest.Mock).mockReturnValue(mockNextRunDate);

    const request = new NextRequest('http://localhost/api/reports/trigger-scheduled-jobs', {
      method: 'POST',
      headers: { 'x-api-key': MOCK_SECRET },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toBe('Scheduled jobs processed.');
    expect(body.processedCount).toBe(2);
    expect(body.errorCount).toBe(1);
    expect(body.totalDue).toBe(3);

    expect(processSchedule).toHaveBeenCalledTimes(3);
    expect(prisma.reportSchedule.update).toHaveBeenCalledTimes(2); // Only for successful ones
    expect(prisma.reportSchedule.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { lastRun: expect.any(Date), nextRun: mockNextRunDate },
    });
    expect(prisma.reportSchedule.update).toHaveBeenCalledWith({
      where: { id: '3' },
      data: { lastRun: expect.any(Date), nextRun: mockNextRunDate },
    });
  });

  it('should return 500 if prisma.reportSchedule.findMany fails', async () => {
    (prisma.reportSchedule.findMany as jest.Mock).mockRejectedValue(new Error('DB connection error'));
    const request = new NextRequest('http://localhost/api/reports/trigger-scheduled-jobs', {
      method: 'POST',
      headers: { 'x-api-key': MOCK_SECRET },
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to process scheduled jobs');
  });

});
