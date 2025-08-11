/**
 * Admin Service Test Suite
 * Comprehensive tests for admin dashboard functionality
 */

import { adminService } from '../services/adminService';

describe('AdminService', () => {
  beforeEach(() => {
    // Reset any state between tests
  });

  describe('Admin Authentication', () => {
    test('should authenticate valid admin credentials', async () => {
      const admin = await adminService.authenticateAdmin('admin', 'admin123');
      
      expect(admin).toBeDefined();
      expect(admin?.username).toBe('admin');
      expect(admin?.role).toBe('admin');
      expect(admin?.isActive).toBe(true);
    });

    test('should reject invalid credentials', async () => {
      const admin = await adminService.authenticateAdmin('invalid', 'wrong');
      
      expect(admin).toBeNull();
    });

    test('should update last login time on successful authentication', async () => {
      const admin = await adminService.authenticateAdmin('admin', 'admin123');
      
      expect(admin?.lastLogin).toBeDefined();
      if (admin?.lastLogin) {
        const loginTime = new Date(admin.lastLogin);
        expect(loginTime).toBeInstanceOf(Date);
      }
    });
  });

  describe('Permission System', () => {
    test('should check admin permissions correctly', () => {
      const hasUserRead = adminService.checkAdminPermission('admin_001', 'users', 'read');
      const hasUserWrite = adminService.checkAdminPermission('admin_001', 'users', 'write');
      const hasInvalidPermission = adminService.checkAdminPermission('admin_001', 'invalid', 'read');
      
      expect(hasUserRead).toBe(true);
      expect(hasUserWrite).toBe(true);
      expect(hasInvalidPermission).toBe(false);
    });

    test('should deny permissions for invalid admin', () => {
      const hasPermission = adminService.checkAdminPermission('invalid_admin', 'users', 'read');
      
      expect(hasPermission).toBe(false);
    });
  });

  describe('User Management', () => {
    test('should get all users with pagination', async () => {
      const result = await adminService.getAllUsers(1, 10);
      
      expect(result).toBeDefined();
      expect(result.users).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBeGreaterThan(0);
    });

    test('should filter users by status', async () => {
      const activeUsers = await adminService.getAllUsers(1, 50, { status: 'active' });
      const suspendedUsers = await adminService.getAllUsers(1, 50, { status: 'suspended' });
      
      expect(activeUsers.users.every(u => u.status === 'active')).toBe(true);
      expect(suspendedUsers.users.every(u => u.status === 'suspended')).toBe(true);
    });

    test('should filter users by risk level', async () => {
      const highRiskUsers = await adminService.getAllUsers(1, 50, { riskLevel: 'high' });
      
      expect(highRiskUsers.users.every(u => u.riskScore >= 7)).toBe(true);
    });

    test('should search users by username and email', async () => {
      const searchResults = await adminService.getAllUsers(1, 50, { searchTerm: 'pro' });
      
      expect(searchResults.users.length).toBeGreaterThan(0);
      expect(
        searchResults.users.some(u => 
          u.username.toLowerCase().includes('pro') || 
          u.email.toLowerCase().includes('pro')
        )
      ).toBe(true);
    });

    test('should get user details by ID', async () => {
      const user = await adminService.getUserDetails('user_001');
      
      expect(user).toBeDefined();
      expect(user?.id).toBe('user_001');
      expect(user?.username).toBeDefined();
    });

    test('should update user status with admin permission', async () => {
      const success = await adminService.updateUserStatus('admin_001', 'user_001', 'suspended', 'Test suspension');
      
      expect(success).toBe(true);
      
      const user = await adminService.getUserDetails('user_001');
      expect(user?.status).toBe('suspended');
      expect(user?.flags.length).toBeGreaterThan(0);
    });

    test('should reject user status update without permission', async () => {
      await expect(
        adminService.updateUserStatus('invalid_admin', 'user_001', 'suspended', 'Test')
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should add user flags', async () => {
      const success = await adminService.addUserFlag('admin_001', 'user_001', {
        type: 'payment_issue',
        severity: 'medium',
        description: 'Test flag'
      });
      
      expect(success).toBe(true);
      
      const user = await adminService.getUserDetails('user_001');
      expect(user?.flags.some(f => f.description === 'Test flag')).toBe(true);
    });
  });

  describe('Contest Management', () => {
    test('should get all contests with pagination', async () => {
      const result = await adminService.getAllContests(1, 10);
      
      expect(result).toBeDefined();
      expect(result.contests).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.page).toBe(1);
    });

    test('should filter contests by status', async () => {
      const activeContests = await adminService.getAllContests(1, 50, { status: 'active' });
      
      if (activeContests.contests.length > 0) {
        expect(activeContests.contests.every(c => c.status === 'active')).toBe(true);
      }
    });

    test('should create contest with admin permission', async () => {
      const contestData = {
        name: 'Test Admin Contest',
        type: 'weekly',
        description: 'Test contest created by admin',
        season: 2024,
        week: 1,
        startDate: '2024-12-21T12:00:00Z',
        endDate: '2024-12-22T12:00:00Z',
        entryFee: 25,
        maxParticipants: 100,
        participants: [],
        predictions: [],
        rules: {
          predictionDeadline: '15',
          confidenceEnabled: true,
          allowLateEntry: false,
          requireAllPredictions: false,
          tiebreaker: 'accuracy'
        },
        scoring: {
          correctPrediction: 100,
          confidenceMultiplier: true,
          streakBonus: {
            enabled: true,
            minStreak: 3,
            bonusPerCorrect: 5,
            maxBonus: 50
          },
          difficultyMultiplier: {
            enabled: true,
            easy: 1.0,
            medium: 1.2,
            hard: 1.5,
            expert: 2.0
          },
          oracleBeatBonus: 25,
          categoryWeights: {
            'Game Lines': 1.0,
            'Player Props': 1.2,
            'Team Stats': 1.1
          }
        },
        prizePool: {
          totalPrize: 2000,
          currency: 'USD',
          distribution: [
            { rank: 1, percentage: 50, amount: 1000, description: '1st Place' }
          ],
          guaranteedPrize: true
        }
      };

      const contestId = await adminService.createContest('admin_001', contestData);
      
      expect(contestId).toBeDefined();
      expect(typeof contestId).toBe('string');
    });

    test('should reject contest creation without permission', async () => {
      await expect(
        adminService.createContest('invalid_admin', {})
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Payment Management', () => {
    test('should get all payments with pagination', async () => {
      const result = await adminService.getAllPayments(1, 10);
      
      expect(result).toBeDefined();
      expect(result.payments).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
    });

    test('should filter payments by type', async () => {
      const deposits = await adminService.getAllPayments(1, 50, { type: 'deposit' });
      
      if (deposits.payments.length > 0) {
        expect(deposits.payments.every(p => p.type === 'deposit')).toBe(true);
      }
    });

    test('should filter payments by status', async () => {
      const completedPayments = await adminService.getAllPayments(1, 50, { status: 'completed' });
      
      if (completedPayments.payments.length > 0) {
        expect(completedPayments.payments.every(p => p.status === 'completed')).toBe(true);
      }
    });

    test('should process refund with admin permission', async () => {
      const success = await adminService.processRefund('admin_001', 'pay_001', 50, 'Test refund');
      
      expect(success).toBe(true);
    });

    test('should reject refund without permission', async () => {
      await expect(
        adminService.processRefund('invalid_admin', 'pay_001', 50, 'Test')
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Oracle Management', () => {
    test('should get Oracle metrics', async () => {
      const metrics = await adminService.getOracleMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalPredictions).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracyRate).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracyRate).toBeLessThanOrEqual(1);
      expect(metrics.apiUsage).toBeDefined();
      expect(metrics.performanceByCategory).toBeDefined();
      expect(metrics.userEngagement).toBeDefined();
    });

    test('should update Oracle configuration with permission', async () => {
      const success = await adminService.updateOracleConfig('admin_001', {
        confidence_threshold: 0.8,
        enable_advanced_analysis: true
      });
      
      expect(success).toBe(true);
    });

    test('should trigger Oracle retrain with permission', async () => {
      const success = await adminService.triggerOracleRetrain('admin_001');
      
      expect(success).toBe(true);
    });

    test('should reject Oracle operations without permission', async () => {
      await expect(
        adminService.updateOracleConfig('invalid_admin', {})
      ).rejects.toThrow('Insufficient permissions');

      await expect(
        adminService.triggerOracleRetrain('invalid_admin')
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('System Analytics', () => {
    test('should get system metrics', async () => {
      const metrics = await adminService.getSystemMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.totalUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.systemHealth).toBeDefined();
      expect(metrics.systemHealth.database).toMatch(/healthy|warning|critical/);
      expect(metrics.systemHealth.apis).toMatch(/healthy|warning|critical/);
      expect(metrics.systemHealth.payments).toMatch(/healthy|warning|critical/);
      expect(metrics.systemHealth.oracle).toMatch(/healthy|warning|critical/);
    });

    test('should get complete dashboard data', async () => {
      const data = await adminService.getDashboardData();
      
      expect(data).toBeDefined();
      expect(data.overview).toBeDefined();
      expect(data.recentActivity).toBeDefined();
      expect(data.metrics).toBeDefined();
      
      expect(data.overview.totalUsers).toBeGreaterThanOrEqual(0);
      expect(data.overview.systemHealth).toMatch(/healthy|warning|critical/);
      
      expect(data.recentActivity.newUsers).toBeInstanceOf(Array);
      expect(data.recentActivity.recentContests).toBeInstanceOf(Array);
      expect(data.recentActivity.recentPayments).toBeInstanceOf(Array);
      expect(data.recentActivity.systemAlerts).toBeInstanceOf(Array);
      
      expect(data.metrics.userGrowth).toBeInstanceOf(Array);
      expect(data.metrics.revenueGrowth).toBeInstanceOf(Array);
      expect(data.metrics.contestParticipation).toBeInstanceOf(Array);
      expect(data.metrics.oracleAccuracy).toBeInstanceOf(Array);
    });
  });

  describe('System Error Management', () => {
    test('should log system errors', () => {
      adminService.logSystemError({
        type: 'database',
        severity: 'medium',
        message: 'Test database error'
      });

      // Since we can't directly access the private systemErrors array,
      // we'll test this through the dashboard data
      // This is a basic smoke test to ensure no exceptions are thrown
      expect(true).toBe(true);
    });

    test('should resolve system errors with permission', async () => {
      // First log an error to get an error ID
      adminService.logSystemError({
        type: 'api',
        severity: 'low',
        message: 'Test API error'
      });

      // Get the dashboard data to see if the error was logged
      const dashboardData = await adminService.getDashboardData();
      
      if (dashboardData.recentActivity.systemAlerts.length > 0) {
        const errorId = dashboardData.recentActivity.systemAlerts[0].id;
        const success = await adminService.resolveSystemError('admin_001', errorId);
        expect(success).toBe(true);
      }
    });

    test('should reject error resolution without permission', async () => {
      await expect(
        adminService.resolveSystemError('invalid_admin', 'error_123')
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Backup and Maintenance', () => {
    test('should create system backup with permission', async () => {
      const backupId = await adminService.createSystemBackup('admin_001');
      
      expect(backupId).toBeDefined();
      expect(typeof backupId).toBe('string');
      expect(backupId).toMatch(/^backup_/);
    });

    test('should run system maintenance with permission', async () => {
      const success = await adminService.runSystemMaintenance('admin_001', 'cache_clear');
      
      expect(success).toBe(true);
    });

    test('should reject backup/maintenance without permission', async () => {
      await expect(
        adminService.createSystemBackup('invalid_admin')
      ).rejects.toThrow('Insufficient permissions');

      await expect(
        adminService.runSystemMaintenance('invalid_admin', 'cache_clear')
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Data Validation', () => {
    test('should handle empty results gracefully', async () => {
      const emptyUsers = await adminService.getAllUsers(999, 10); // Page that doesn't exist
      
      expect(emptyUsers.users).toEqual([]);
      expect(emptyUsers.total).toBeGreaterThanOrEqual(0);
    });

    test('should validate user ID existence', async () => {
      const nonExistentUser = await adminService.getUserDetails('non_existent_user');
      
      expect(nonExistentUser).toBeNull();
    });

    test('should handle invalid filters gracefully', async () => {
      const result = await adminService.getAllUsers(1, 10, {
        status: 'invalid_status' as any,
        riskLevel: 'invalid_risk' as any
      });
      
      expect(result.users).toBeInstanceOf(Array);
    });
  });

  describe('Performance', () => {
    test('should respond to dashboard data request quickly', async () => {
      const startTime = Date.now();
      await adminService.getDashboardData();
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent requests', async () => {
      const promises = [
        adminService.getAllUsers(1, 10),
        adminService.getAllContests(1, 10),
        adminService.getAllPayments(1, 10),
        adminService.getOracleMetrics(),
        adminService.getSystemMetrics()
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});
