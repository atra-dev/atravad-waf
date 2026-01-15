# ATRAVAD WAF

A production-ready Web Application Firewall (WAF) management platform built with Next.js, Node.js, and Firebase. This platform allows you to manage WAF policies, applications, and nodes using ModSecurity as the core engine.

## Features

- 🔐 **Firebase Authentication** - Secure email/password authentication
- 🏢 **Multi-tenant Support** - Tenant-based organization with role-based access
- 📱 **Application Management** - Create and manage web applications
- 🛡️ **Policy Editor** - Create comprehensive WAF policies with multiple protection types
- 📝 **ModSecurity Core Engine** - Full ModSecurity integration with OWASP CRS support
- 🔍 **Advanced Rule Generation** - SQL Injection, XSS, File Upload, Path Traversal, RCE, and Rate Limiting
- 🧪 **Request Testing** - Test HTTP requests against ModSecurity rules before deployment
- 📊 **Version Control** - Track policy versions with rollback capability
- 🖥️ **Node Management** - Register and monitor WAF nodes

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **WAF Engine**: ModSecurity 3.x with OWASP Core Rule Set (CRS) 3.3.0

## Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled
- Firebase Admin SDK service account credentials

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** with Email/Password provider
3. Enable **Firestore Database**
4. Go to Project Settings > Service Accounts
5. Generate a new private key and download the JSON file
6. Create a `.env.local` file in the root directory:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

**Note**: For the `FIREBASE_PRIVATE_KEY`, copy the `private_key` value from your service account JSON file. Make sure to include the `\n` characters and wrap it in quotes.

### 3. Firestore Security Rules

Set up Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tenants - users can read their own tenant
    match /tenants/{tenantId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId == tenantId;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Applications - users can read/write apps in their tenant
    match /applications/{appId} {
      allow read, write: if request.auth != null && 
        resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }
    
    // Policies - users can read/write policies in their tenant
    match /policies/{policyId} {
      allow read, write: if request.auth != null && 
        resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }
    
    // Nodes - users can read/write nodes in their tenant
    match /nodes/{nodeId} {
      allow read, write: if request.auth != null && 
        resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }
  }
}
```

### 4. Create Initial User

1. Start the development server:
```bash
npm run dev
```

2. Go to `http://localhost:3000/login`
3. Create a user account in Firebase Console > Authentication > Users
4. After first login, you'll need to create a tenant (this can be automated in production)

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
atravad-waf/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── tenants/      # Tenant management
│   │   │   ├── apps/         # Application management
│   │   │   ├── policies/     # Policy management
│   │   │   └── nodes/        # Node management
│   │   ├── dashboard/        # Dashboard page
│   │   ├── login/            # Login page
│   │   ├── apps/             # Applications page
│   │   ├── policies/         # Policies page
│   │   └── nodes/            # Nodes page
│   ├── components/           # React components
│   │   └── Layout.jsx        # Main layout with sidebar
│   ├── lib/                  # Utilities
│   │   ├── firebase.js       # Firebase client config
│   │   └── firebase-admin.js # Firebase admin config
│   └── middleware.js         # Auth middleware
├── public/                   # Static assets
├── .env.local                # Environment variables (create this)
└── README.md
```

## API Endpoints

### Authentication
- All protected routes require authentication via cookie-based session

### Tenants
- `POST /api/tenants` - Create a new tenant
- `GET /api/tenants` - Get current user's tenant
- `GET /api/tenants/current` - Get current tenant info

### Applications
- `POST /api/apps` - Create a new application
- `GET /api/apps` - List all applications for current tenant

### Policies
- `POST /api/policies` - Create a new policy version with ModSecurity config generation
- `GET /api/policies` - List all policies (optionally filter by name)
- `GET /api/policies/[id]` - Get specific policy details

### ModSecurity
- `POST /api/modsecurity/test` - Test HTTP requests against ModSecurity rules

### Nodes
- `POST /api/nodes` - Register a new WAF node
- `GET /api/nodes` - List all nodes for current tenant

## User Roles

- **admin**: Full access to all features
- **analyst**: Can view and analyze data
- **viewer**: Read-only access

## ModSecurity Core Engine Integration

ATRAVAD WAF uses **ModSecurity** as its core WAF engine, providing enterprise-grade web application protection. The platform generates comprehensive ModSecurity configurations with full OWASP Core Rule Set (CRS) integration.

### Important: OWASP CRS is Enabled by Default

**You don't need to create policies to get protection!** All policies automatically include **OWASP CRS 3.3.0**, which provides comprehensive protection against:
- SQL Injection attacks
- Cross-Site Scripting (XSS)
- Local/Remote File Inclusion
- Remote Code Execution
- Protocol violations
- And many more threats

**Policies are optional customizations** that add application-specific rules on top of OWASP CRS. You can create a policy with just a name and still get full OWASP CRS protection.

### Additional Protection Types (Optional)

The platform supports the following **additional** protection types that complement OWASP CRS:

- **Enhanced SQL Injection Protection**: Additional SQL injection rules beyond OWASP CRS (OWASP CRS already provides comprehensive SQL injection protection)
- **Enhanced XSS Protection**: Additional XSS detection rules beyond OWASP CRS (OWASP CRS already provides comprehensive XSS protection)
- **File Upload Protection**: Dangerous file extension blocking and file size limits
- **Path Traversal Protection**: Directory traversal attack prevention
- **Remote Code Execution (RCE)**: Command injection and code execution attempt detection
- **Rate Limiting**: Configurable request rate limiting per IP address
- **Custom Rules**: Support for custom ModSecurity rules with full rule syntax

### OWASP Core Rule Set (CRS) Integration

All policies can optionally include OWASP CRS 3.3.0, which provides:

- **REQUEST-901-INITIALIZATION**: CRS initialization and setup
- **REQUEST-920-PROTOCOL-ENFORCEMENT**: HTTP protocol validation
- **REQUEST-930-APPLICATION-ATTACK-LFI**: Local File Inclusion protection
- **REQUEST-932-APPLICATION-ATTACK-RCE**: Remote Code Execution protection
- **REQUEST-941-APPLICATION-ATTACK-XSS**: XSS attack detection
- **REQUEST-942-APPLICATION-ATTACK-SQLI**: SQL injection detection
- **RESPONSE-950-DATA-LEAKAGES**: Response data leakage prevention
- And many more comprehensive rule sets

### ModSecurity Configuration Generation

Generated configurations include:

- Complete ModSecurity engine setup
- OWASP CRS integration (optional)
- Custom protection rules based on policy settings
- Proper rule IDs, phases, and actions
- Comprehensive logging configuration
- Error handling and anomaly scoring

### Request Testing

Use the `/api/modsecurity/test` endpoint to test HTTP requests against your policies before deployment:

```bash
POST /api/modsecurity/test
{
  "policyId": "policy-id",
  "testRequest": {
    "method": "GET",
    "url": "/api/users?id=1' OR '1'='1",
    "headers": {},
    "query": { "id": "1' OR '1'='1" },
    "body": {}
  }
}
```

The endpoint returns detailed evaluation results including matched rules, severity levels, and blocking decisions.

### Deployment

Generated ModSecurity configurations are stored with each policy version and can be:

1. **Downloaded** directly from the policy management interface
2. **Deployed** to ModSecurity-enabled servers (Apache, Nginx, or standalone)
3. **Tested** using the built-in request testing endpoint
4. **Versioned** with full rollback capability

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## Security Considerations

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Firestore Rules**: Always configure proper security rules
3. **Authentication**: Ensure middleware properly protects routes
4. **API Security**: All API routes verify authentication tokens

## Future Enhancements

- Real-time node status monitoring
- Policy deployment automation
- Advanced rule customization
- Attack analytics and reporting
- Webhook integrations
- Multi-factor authentication

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.
