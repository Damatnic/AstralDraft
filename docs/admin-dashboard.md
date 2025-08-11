# Admin Dashboard Documentation

## Overview

The Admin Dashboard is a comprehensive platform management interface that provides administrators with tools to monitor, manage, and maintain the Oracle Fantasy Football platform. It includes user management, contest oversight, payment monitoring, Oracle configuration, and system analytics.

## Features

### 🔐 **Authentication & Authorization**
- Secure admin login with credential validation
- Role-based permission system
- Session management with local storage
- Protected routes and actions

### 👥 **User Management**
- View all registered users with pagination
- Filter users by status, risk level, and search terms
- User profile details and activity tracking
- Status management (active, suspended, banned)
- Risk scoring and flag management
- User activity monitoring (contests, spending, winnings)

### 🏆 **Contest Management**
- View all contests with status tracking
- Contest participation monitoring
- Prize pool and entry fee oversight
- Contest creation and cancellation tools
- Flag management for problematic contests
- Real-time contest status updates

### 💳 **Payment Monitoring**
- Complete payment transaction history
- Payment type filtering (deposits, withdrawals, entries, payouts)
- Status tracking (pending, completed, failed, disputed)
- Fraud detection and risk flags
- Refund processing capabilities
- Payment method tracking

### 🔮 **Oracle Management**
- Oracle performance metrics and analytics
- Accuracy tracking by category
- API usage monitoring
- User engagement statistics
- Configuration management
- Model retraining controls

### 📊 **System Analytics**
- Real-time system health monitoring
- User growth and revenue metrics
- Performance tracking
- Error logging and resolution
- Uptime monitoring
- System resource usage

## Architecture

### Service Layer (`adminService.ts`)

The `AdminService` class provides the core functionality:

```typescript
class AdminService {
  // User Management
  async getAllUsers(page, limit, filters)
  async getUserDetails(userId)
  async updateUserStatus(adminId, userId, status, reason)
  async addUserFlag(adminId, userId, flag)

  // Contest Management
  async getAllContests(page, limit, filters)
  async createContest(adminId, contestData)
  async cancelContest(adminId, contestId, reason)

  // Payment Management
  async getAllPayments(page, limit, filters)
  async processRefund(adminId, paymentId, amount, reason)

  // Oracle Management
  async getOracleMetrics()
  async updateOracleConfig(adminId, config)
  async triggerOracleRetrain(adminId)

  // System Analytics
  async getSystemMetrics()
  async getDashboardData()
}
```

### Component Structure

```
components/admin/
├── AdminRoute.tsx          # Authentication and routing
├── AdminDashboard.tsx      # Main dashboard interface
└── AdminLogin.tsx          # Login component (included in AdminRoute)
```

### Data Models

#### Admin User
```typescript
interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'support';
  permissions: AdminPermission[];
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}
```

#### User Summary
```typescript
interface UserSummary {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'suspended' | 'banned' | 'pending';
  joinDate: string;
  lastLogin?: string;
  totalContests: number;
  totalSpent: number;
  totalWinnings: number;
  accountBalance: number;
  riskScore: number;
  flags: UserFlag[];
}
```

#### Contest Summary
```typescript
interface ContestSummary {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  participantCount: number;
  maxParticipants: number;
  entryFee: number;
  prizePool: number;
  startDate: string;
  endDate: string;
  creator: string;
  flags: ContestFlag[];
}
```

## Usage Guide

### Accessing the Admin Dashboard

1. Navigate to `/admin` in your application
2. Login with admin credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Navigate through different sections using the tab navigation

### User Management

#### Viewing Users
- Access the "Users" tab to see all registered users
- Use filters to find specific users:
  - **Search**: Search by username or email
  - **Status**: Filter by active, suspended, or banned users
  - **Risk Level**: Filter by low, medium, or high risk scores

#### Managing User Status
- Click "Suspend" or "Activate" buttons to change user status
- Provide a reason when changing status
- View user flags and risk scores for decision making

#### Risk Assessment
- **Green Badge (0-3)**: Low risk users
- **Yellow Badge (4-6)**: Medium risk users
- **Red Badge (7+)**: High risk users requiring attention

### Contest Management

#### Monitoring Contests
- View all contests with participation rates
- Monitor prize pools and entry fees
- Track contest status from pending to completion

#### Contest Actions
- **Create Contest**: Use the "Create Contest" button
- **Cancel Contest**: Available for active contests
- **View Details**: Click "View" for detailed contest information

### Payment Monitoring

#### Transaction Oversight
- Monitor all payment transactions
- Filter by payment type and status
- Track payment methods and amounts

#### Fraud Detection
- Review flagged transactions
- Process refunds when necessary
- Monitor for unusual payment patterns

### Oracle Management

#### Performance Monitoring
- Track Oracle prediction accuracy
- Monitor API usage and response times
- View performance by prediction category

#### Configuration
- Update Oracle settings
- Trigger model retraining
- Export performance data

### System Analytics

#### Health Monitoring
- Monitor system health across all components
- Track uptime and performance metrics
- Review error logs and resolve issues

#### Growth Metrics
- User growth over time
- Revenue tracking
- Contest participation trends
- Oracle accuracy improvements

## Security Features

### Authentication
- Secure credential validation
- Session management
- Automatic logout on inactivity

### Authorization
- Role-based access control
- Permission checking for all actions
- Audit logging for administrative actions

### Data Protection
- Sensitive data handling
- Secure storage of admin sessions
- Input validation and sanitization

## Configuration

### Environment Variables
```bash
# Admin Configuration
ADMIN_SESSION_TIMEOUT=3600000  # 1 hour
ADMIN_MAX_LOGIN_ATTEMPTS=5
ADMIN_LOCKOUT_DURATION=900000  # 15 minutes

# Database Configuration
ADMIN_DB_CONNECTION=your_admin_db_connection
ADMIN_LOGS_RETENTION=30        # days

# Security Configuration
ADMIN_REQUIRE_2FA=false
ADMIN_IP_WHITELIST=192.168.1.0/24
```

### Permission Levels

#### Admin (Full Access)
- All user management functions
- Contest creation and cancellation
- Payment refund processing
- Oracle configuration changes
- System maintenance operations

#### Moderator (Limited Access)
- User status changes (suspend/activate)
- Contest monitoring
- Payment review (no refunds)
- Oracle performance viewing

#### Support (Read-Only)
- User information viewing
- Contest information viewing
- Payment transaction viewing
- System metrics viewing

## API Integration

### Contest Scoring Service
```typescript
// Integration with contest management
const contests = contestScoringService.getAllContests();
const activeContests = contestScoringService.getActiveContests();
```

### Production Sports Data Service
```typescript
// System health monitoring
const sportsDataStatus = productionSportsDataService.getAPIStatus();
```

## Testing

### Test Coverage
- Authentication and authorization
- User management operations
- Contest management functions
- Payment processing
- Oracle metrics retrieval
- System analytics
- Error handling
- Performance testing

### Running Tests
```bash
npm test -- --testPathPattern=adminService.test.ts
```

## Deployment

### Production Setup
1. Configure environment variables
2. Set up admin user accounts
3. Configure database connections
4. Set up monitoring and alerting
5. Configure backup systems

### Security Checklist
- [ ] Admin credentials configured
- [ ] HTTPS enabled
- [ ] Session timeouts configured
- [ ] IP whitelisting enabled (if required)
- [ ] Audit logging enabled
- [ ] Backup systems configured
- [ ] Monitoring alerts configured

## Monitoring & Maintenance

### System Health Checks
- Database connectivity
- API endpoint availability
- Payment processor status
- Oracle service status

### Regular Maintenance Tasks
- Review system error logs
- Monitor user activity patterns
- Check payment transaction flags
- Review Oracle performance metrics
- Backup system data
- Update security configurations

### Alert Thresholds
- **Critical**: System downtime, payment failures
- **Warning**: High error rates, unusual user activity
- **Info**: Performance metrics, daily summaries

## Troubleshooting

### Common Issues

#### Login Problems
- Verify admin credentials
- Check session storage
- Clear browser cache
- Verify network connectivity

#### Data Loading Issues
- Check API connectivity
- Verify database connections
- Review error logs
- Check service health status

#### Permission Errors
- Verify admin role assignment
- Check permission configuration
- Review audit logs
- Confirm user account status

### Performance Optimization
- Implement data pagination
- Cache frequently accessed data
- Optimize database queries
- Monitor API response times

## Future Enhancements

### Planned Features
- Real-time notifications
- Advanced analytics dashboards
- Automated report generation
- Multi-factor authentication
- API rate limiting controls
- Advanced user segmentation
- Predictive analytics for risk assessment

### Integration Opportunities
- External monitoring tools
- Business intelligence platforms
- Customer support systems
- Financial reporting tools
- Compliance management systems

## Support

For technical support or questions about the admin dashboard:

1. Check the troubleshooting section
2. Review system logs
3. Contact the development team
4. Submit issue reports with detailed information

---

*Last updated: December 2024*
