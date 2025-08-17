# Clockwise - Time Registration System

A comprehensive time tracking and project management application built for Elmar Services. This system allows employees to register working hours, manage vacation requests, and provides administrators and managers with powerful oversight tools.

## 🚀 Features

### For Employees
- **Time Registration**: Register working hours with quarter-hour precision
- **Project Selection**: Choose from assigned projects organized by company and project groups
- **Vacation Management**: Submit and track vacation requests
- **Week Overview**: Visual calendar showing registered hours and progress
- **Expense Tracking**: Record travel costs, distances, and other expenses
- **Notifications**: Real-time updates on time entry approvals and vacation requests

### For Managers (NEW ROLE)
- **Team Management**: Manage only users under their direct supervision
- **Time Approval**: Review and approve/reject submitted time entries for team members
- **Vacation Processing**: First-level approval in two-step vacation approval process
- **Project Assignment**: Assign team members to projects they can manage
- **Team Dashboard**: Overview of team statistics and activities
- **User Management**: Add, edit, and manage team member accounts
- **Restricted Access**: Cannot process their own hours or vacation requests (separation of duties)

### For Administrators
- **Full System Access**: Complete oversight of all users and operations
- **User Management**: Create, edit, and manage all employee accounts
- **Final Approvals**: Second-level approval for vacation requests after manager approval
- **Project Management**: Create projects and manage the complete project hierarchy
- **System Analytics**: Comprehensive dashboard with company-wide statistics
- **Activity Monitoring**: Track all system activities and notifications
- **Two-Step Vacation Approval**: Final approval authority after manager review

## 🏗️ Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **Icons**: Heroicons
- **Date Handling**: Day.js
- **HTTP Client**: Axios
- **Deployment**: Vercel-ready

### Backend (ASP.NET Core)
- **Framework**: ASP.NET Core Web API
- **Database**: Firebird with Entity Framework Core
- **Architecture**: RESTful API with controllers and services
- **Authentication**: JWT-based with secure password hashing
- **Authorization**: Role-based access control (User, Manager, Admin)

## 📁 Project Structure

```
clockwise-project/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (dashboard)/    # Protected dashboard pages
│   │   ├── admin/          # Admin panel pages
│   │   └── manager/        # Manager panel pages (NEW)
│   ├── components/         # Reusable React components
│   │   ├── WeekOverview/   # Time registration components
│   │   ├── VacationOverview/ # Vacation management
│   │   ├── AdminRoute/     # Admin access protection
│   │   └── ManagerRoute/   # Manager access protection (NEW)
│   └── lib/                # Utilities and API functions
└── backend/                # ASP.NET Core backend
    ├── Controllers/        # API controllers
    ├── Models/            # Data models
    ├── DbContext/         # Entity Framework setup
    └── Data/              # Database seeding
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- .NET 8 SDK
- Firebird 3.0+ database server

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Configure environment variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:5203
```

5. Start development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Restore NuGet packages:
```bash
dotnet restore
```

3. Configure database connection in `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "User=sysdba;Password=masterkey;Database=path/to/clockwise.fdb;DataSource=localhost;Port=3050;"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key-here",
    "Issuer": "clockwise-api",
    "Audience": "clockwise-client",
    "ExpirationMinutes": 60
  }
}
```

4. Run database migrations:
```bash
dotnet ef database update
```

5. Seed the database with sample data:
```bash
dotnet run seed
```

6. Start the API server:
```bash
dotnet run
```

The API will be available at `http://localhost:5203`

## 🗄️ Database Schema

### Core Models
- **User**: Employee information and authentication with manager relationships
- **Company**: Top-level organization entities
- **ProjectGroup**: Logical groupings within companies
- **Project**: Individual projects for time registration
- **TimeEntry**: Individual time registrations with approval tracking
- **VacationRequest**: Employee vacation requests with two-step approval
- **Activity**: System notifications and audit trail
- **UserProject**: Many-to-many relationship between users and projects

### Key Relationships
- Companies contain multiple ProjectGroups
- ProjectGroups contain multiple Projects
- Users can be assigned to multiple Projects
- Users have manager relationships (managerId field)
- TimeEntries link Users to Projects with time data and approval status
- VacationRequests have two-step approval (manager → admin)
- Activities track all system events for notifications

## 🔐 Authentication & Authorization

### Enhanced Security Features
- **Password Hashing**: Secure bcrypt password hashing
- **JWT Tokens**: JSON Web Token-based authentication
- **Role-Based Access**: Three-tier permission system
- **Session Management**: Secure token refresh and expiration

### User Roles & Hierarchy
- **User**: Standard employee (register time, request vacation)
- **Manager**: Mid-level access (manage assigned team members, first-level approvals)
- **Admin**: Full system access (final approvals, system configuration)

### Manager-User Relationships
- Users are assigned to managers via `managerId` field
- Managers can only access and manage their assigned team members
- Separation of duties: managers cannot approve their own requests
- Hierarchical approval workflow for vacation requests

### Authentication Flow
1. User logs in with email/username and password
2. Server validates credentials against hashed passwords
3. JWT token is generated and returned to client
4. Frontend stores token securely
5. Protected routes validate JWT and check role permissions
6. API endpoints enforce role-based authorization

## 📊 Key Features Deep Dive

### Time Registration
- **Quarter-hour precision**: All time entries rounded to 15-minute intervals with visual quarter notation (¼, ½, ¾)
- **Week-based workflow**: Users can register hours throughout the week in "concept" mode, then submit entire week at once
- **Flexible entry management**: Add, edit, and manage multiple time entries per day before submission
- **Overnight shifts**: Support for work spanning midnight
- **Break tracking**: Automatic break deduction from total hours
- **24-hour limit**: Daily maximum validation
- **Multi-project support**: Register time across different projects per day
- **Bulk operations**: Submit all concept entries for an entire week in one action
- **Visual progress tracking**: Real-time progress bars showing daily and weekly hour targets
- **Status management**: Clear visual indicators for concept, submitted, approved, and rejected entries
- **Archive and submit**: Complete week overview with ability to review all entries before final submission
- **Manager approval**: Team time entries require manager approval after submission
- **Admin oversight**: Final oversight by administrators with complete audit trail

### Project Management
- **Hierarchical structure**: Company > ProjectGroup > Project
- **Manager-controlled assignment**: Managers assign their team members to projects
- **Access control**: Users only see assigned projects (managers see team projects)
- **Audit trail**: All project assignments tracked in activities

### Two-Step Vacation Approval System
#### Step 1: Manager Approval
- **Team Focus**: Managers only see requests from their direct team members
- **Vacation Balance Validation**: System warns about insufficient vacation balance
- **First-Level Decision**: Manager approves or rejects with reason
- **Tracking**: All manager decisions are permanently tracked

#### Step 2: Admin Final Approval
- **Final Authority**: Admins provide ultimate approval for vacation requests
- **Complete Oversight**: Can see all requests across the organization
- **Manager Decision Visibility**: Can see manager's previous decision and reasoning
- **Workflow Completion**: Final approval activates the vacation

#### Security & Separation of Duties
- **Self-Approval Prevention**: Managers cannot approve their own vacation requests
- **Team Boundaries**: Managers only see requests from assigned team members
- **Audit Trail**: Complete tracking of who approved what and when
- **Notification System**: All stakeholders notified at each approval step

### Manager Panel Features
#### Dashboard
- **Team Statistics**: Overview of team performance and activities
- **Quick Actions**: Fast access to common management tasks
- **Notifications**: Real-time updates on team activities
- **System Status**: Health indicators and recent activity

#### Team Management
- **User Overview**: List of all team members with search and filtering
- **Add Team Members**: Create new user accounts assigned to the manager
- **Edit Team Information**: Update team member details (restricted scope)
- **Project Assignment**: Assign team members to available projects

#### Time Entry Management
- **Grouped Views**: Time entries organized by day, week, or month
- **Bulk Approval**: Approve entire periods at once
- **Detailed Review**: Individual time entry inspection and approval
- **Export Capabilities**: Excel and PDF export of team time data

#### Vacation Management
- **Pending Requests**: Queue of vacation requests awaiting manager approval
- **Balance Tracking**: Visibility into team members' vacation balances
- **Decision Tracking**: History of all vacation decisions made
- **Bulk Operations**: Process multiple requests efficiently

### Notification System
- **Real-time updates**: Bell icon with unread count
- **Role-specific notifications**: Different notifications for different roles
- **Activity types**: Time entries, vacation requests, project assignments
- **Mark as read**: Individual and bulk read operations
- **Persistent storage**: All activities stored for audit purposes

## 🎨 UI/UX Design

### Design System
- **Color Scheme**: Blue gradient primary with semantic colors
- **Typography**: Poppins font family for modern look
- **Components**: DaisyUI components with custom Tailwind styling
- **Responsive**: Mobile-first design with breakpoint optimization
- **Animation**: Smooth transitions and hover effects

### Role-Specific Interfaces
- **Manager Layout**: Dedicated manager panel with team-focused navigation
- **Permission Indicators**: Clear visual indicators of role capabilities
- **Contextual Actions**: Role-appropriate action buttons and menus
- **Dashboard Customization**: Role-specific dashboard content and metrics

### Key UI Components
- **WeekOverview**: Interactive calendar grid for time registration
- **TimeEntryModal**: Comprehensive form for time entry creation/editing
- **NotificationBell**: Real-time notification system
- **ManagerDashboard**: Team statistics and management interface
- **VacationOverview**: Two-step vacation request management
- **TwoStepApproval**: Visual workflow indicator for vacation approvals

## 🚀 Deployment

### Frontend (Vercel)
1. Connect repository to Vercel
2. Configure environment variables including API URL
3. Deploy automatically on push to main branch

### Backend (Production)
1. Configure production database connection
2. Set up JWT secret keys and security settings
3. Configure HTTPS and CORS for frontend domain
4. Set up automated backup for Firebird database
5. Implement SSL/TLS for secure communication

## 🧪 Testing

### Frontend Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Backend Testing
```bash
# Run unit tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"
```

## 📈 Performance Optimization

### Frontend
- **Code splitting**: Automatic Next.js route-based splitting
- **Image optimization**: Next.js Image component
- **Caching**: API response caching with proper invalidation
- **Bundle analysis**: Regular bundle size monitoring

### Backend
- **Entity Framework optimization**: Proper includes and lazy loading
- **JWT caching**: Efficient token validation
- **Pagination**: Implemented for large data sets
- **Query optimization**: Efficient database queries with role-based filtering

## 🔧 Development Guidelines

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Consistent code formatting
- **Prettier**: Automated code formatting
- **Conventional Commits**: Structured commit messages

### API Design
- **RESTful principles**: Standard HTTP methods and status codes
- **JWT Authentication**: Secure token-based authentication
- **Role-based authorization**: Endpoint-level permission checking
- **Consistent responses**: Uniform error and success response format
- **Input validation**: Comprehensive validation on all endpoints

### Security Best Practices
- **Password Security**: Bcrypt hashing with salt
- **JWT Security**: Secure token generation and validation
- **Role Verification**: Multiple layers of authorization checking
- **Input Sanitization**: Protection against injection attacks
- **CORS Configuration**: Proper cross-origin request handling

## 🐛 Troubleshooting

### Common Issues

**Authentication Problems**
- Verify JWT secret key configuration
- Check token expiration settings
- Ensure proper password hashing implementation
- Validate user role assignments

**Manager Permission Issues**
- Confirm manager-user relationships in database
- Verify managerId assignments are correct
- Check role-based route protection
- Validate API endpoint authorization

**Vacation Approval Workflow**
- Ensure two-step approval process is configured
- Verify manager and admin role permissions
- Check vacation request status transitions
- Validate notification system functionality

**Database Connection**
- Verify Firebird server is running
- Check connection string format and credentials
- Ensure database migrations are applied
- Confirm user roles and relationships are seeded

### Logging & Monitoring
- **Frontend**: Browser console and network monitoring
- **Backend**: Structured logging with role and action tracking
- **Database**: Firebird log monitoring for connection issues
- **Authentication**: JWT validation and role verification logging

## 📝 License

This project is proprietary software developed for Elmar Services. All rights reserved.

