# Clockwise - Time Registration System

A comprehensive time tracking and project management application built for Elmar Services. This system allows employees to register working hours, manage vacation requests, and provides administrators with powerful oversight tools.

## 🚀 Features

### For Employees
- **Time Registration**: Register working hours with quarter-hour precision
- **Project Selection**: Choose from assigned projects organized by company and project groups
- **Vacation Management**: Submit and track vacation requests
- **Week Overview**: Visual calendar showing registered hours and progress
- **Expense Tracking**: Record travel costs, distances, and other expenses
- **Notifications**: Real-time updates on time entry approvals and vacation requests

### For Managers/Admins
- **User Management**: Create, edit, and manage employee accounts
- **Time Approval**: Review and approve/reject submitted time entries
- **Vacation Processing**: Approve or deny vacation requests
- **Project Management**: Create projects and assign users to them
- **Dashboard Analytics**: Overview of company-wide statistics and metrics
- **Activity Monitoring**: Track all system activities and notifications

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
- **Authentication**: Cookie-based with role management

## 📁 Project Structure

```
clockwise-project/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (dashboard)/    # Protected dashboard pages
│   │   └── admin/          # Admin panel pages
│   ├── components/         # Reusable React components
│   │   ├── WeekOverview/   # Time registration components
│   │   └── VacationOverview/ # Vacation management
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
- **User**: Employee information and authentication
- **Company**: Top-level organization entities
- **ProjectGroup**: Logical groupings within companies
- **Project**: Individual projects for time registration
- **TimeEntry**: Individual time registrations
- **VacationRequest**: Employee vacation requests
- **Activity**: System notifications and audit trail
- **UserProject**: Many-to-many relationship between users and projects

### Key Relationships
- Companies contain multiple ProjectGroups
- ProjectGroups contain multiple Projects
- Users can be assigned to multiple Projects
- TimeEntries link Users to Projects with time data
- Activities track all system events for notifications

## 🔐 Authentication & Authorization

### User Roles
- **User**: Standard employee (register time, request vacation)
- **Manager**: Mid-level access (approve time entries, manage team)
- **Admin**: Full system access (user management, system configuration)

### Authentication Flow
1. User logs in with email/username and password
2. Server validates credentials and sets authentication cookie
3. Frontend stores user info in localStorage
4. Protected routes check authentication status
5. API endpoints validate user permissions per role

## 📊 Key Features Deep Dive

### Time Registration
- **Quarter-hour precision**: All time entries rounded to 15-minute intervals
- **Overnight shifts**: Support for work spanning midnight
- **Break tracking**: Automatic break deduction from total hours
- **24-hour limit**: Daily maximum validation
- **Multi-project support**: Register time across different projects per day

### Project Management
- **Hierarchical structure**: Company > ProjectGroup > Project
- **User assignment**: Flexible user-to-project relationships
- **Access control**: Users only see assigned projects (except admins)
- **Audit trail**: All project assignments tracked in activities

### Vacation System
- **Request workflow**: Submit → Pending → Approved/Rejected
- **Hour calculation**: Automatic work hour computation
- **Notification system**: Real-time updates on request status
- **Manager approval**: Dedicated admin interface for processing

### Notification System
- **Real-time updates**: Bell icon with unread count
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

### Key UI Components
- **WeekOverview**: Interactive calendar grid for time registration
- **TimeEntryModal**: Comprehensive form for time entry creation/editing
- **NotificationBell**: Real-time notification system
- **AdminDashboard**: Statistics and management interface
- **VacationOverview**: Vacation request management

## 🚀 Deployment

### Frontend (Vercel)
1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Backend (Production)
1. Configure production database connection
2. Set up IIS or Linux hosting
3. Configure HTTPS and CORS for frontend domain
4. Set up automated backup for Firebird database

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
- **Caching**: Response caching for static data
- **Pagination**: Implemented for large data sets
- **Query optimization**: Efficient database queries

## 🔧 Development Guidelines

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Consistent code formatting
- **Prettier**: Automated code formatting
- **Conventional Commits**: Structured commit messages

### API Design
- **RESTful principles**: Standard HTTP methods and status codes
- **Consistent responses**: Uniform error and success response format
- **Validation**: Input validation on all endpoints
- **Documentation**: Clear controller and method documentation

## 🐛 Troubleshooting

### Common Issues

**Frontend won't start**
- Check Node.js version (requires 18+)
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

**Database connection fails**
- Verify Firebird server is running
- Check connection string format
- Ensure database file exists and has proper permissions

**CORS errors**
- Verify frontend URL in backend CORS configuration
- Check that API base URL is correct in frontend

**Authentication issues**
- Clear browser localStorage and cookies
- Verify user exists in database
- Check password encoding/validation

### Logging
- Frontend: Browser console and network tab
- Backend: ASP.NET Core logging to console and files
- Database: Firebird log files for connection issues

## 📝 License

This project is proprietary software developed for Elmar Services. All rights reserved.


---

**Built with ❤️ for efficient time tracking and project management**
