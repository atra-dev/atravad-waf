# User Document Creation Fix

## Problem
Users were not being created in the Firestore `users` collection when they signed up or logged in. User documents were only created when a user created a tenant, which meant users without tenants had no record in the database.

## Solution
Implemented automatic user document creation that happens:
1. **On Authentication**: When users sign up or log in
2. **On Dashboard Load**: When the Layout component mounts (as a safety net)

## Implementation

### 1. New API Endpoint: `/api/users/me`

**Location**: `src/app/api/users/me/route.js`

**Features**:
- `GET /api/users/me` - Auto-creates user document if it doesn't exist
- `POST /api/users/me` - Updates user document (optional)

**User Document Structure**:
```javascript
{
  email: "user@example.com",
  role: "client", // Default role
  tenantId: null, // Set when user creates/joins a tenant
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

### 2. Updated Login Flow

**Location**: `src/app/login/page.jsx`

After successful authentication, the login page now:
1. Sets the auth token cookie
2. Calls `/api/users/me` to initialize the user document
3. Redirects to dashboard

This ensures user documents are created immediately upon signup/login.

### 3. Updated Layout Component

**Location**: `src/components/Layout.jsx`

The Layout component now automatically initializes the user document on mount. This serves as a safety net to ensure users have documents even if the login flow missed it.

## User Document Lifecycle

1. **Sign Up/Login** → User authenticated via Firebase Auth
2. **Auto-Initialize** → User document created in Firestore with:
   - Default role: `client`
   - No tenant assigned: `tenantId: null`
3. **Create Tenant** → When user creates a tenant:
   - `tenantId` is set
   - `role` is upgraded to `admin` (if they created the tenant)
4. **Role Updates** → Admins can update user roles via API

## Default User Role

- **Default Role**: `client` (read-only access)
- **After Tenant Creation**: `admin` (if user created the tenant)
- **Can be Updated**: By admins to `analyst` or `client`

## Testing

To verify user documents are being created:

1. Sign up a new user
2. Check Firestore `users` collection
3. You should see a document with the user's UID containing:
   - `email`
   - `role: "client"`
   - `tenantId: null`
   - `createdAt` timestamp

## Migration for Existing Users

If you have existing authenticated users without Firestore documents:

1. They will automatically get a user document on their next login
2. Or when they visit any page using the Layout component
3. Their role will default to `client` until updated by an admin

## Related Files

- `src/app/api/users/me/route.js` - User initialization API
- `src/app/login/page.jsx` - Login with auto-initialization
- `src/components/Layout.jsx` - Layout with auto-initialization
- `src/lib/rbac.js` - RBAC utilities that read user documents
