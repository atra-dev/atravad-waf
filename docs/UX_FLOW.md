# ATRAVAD WAF - User Experience Flow

## Overview
This document outlines the user experience flows and user journeys for the ATRAVAD WAF management platform.

---

## 1. Authentication Flow

### 1.1 First-Time User (Sign Up)

```
┌─────────────┐
│ Landing/    │
│ Login Page  │
└──────┬──────┘
       │
       │ User clicks "Sign Up" tab
       ▼
┌─────────────────────┐
│ Sign Up Form        │
│ - Email             │
│ - Password          │
│ - Confirm Password  │
└──────┬──────────────┘
       │
       │ User fills form and submits
       ▼
┌─────────────────────┐
│ Validation          │
│ - Password match?   │
│ - Length >= 6?      │
└──────┬──────────────┘
       │
       │ Valid
       ▼
┌─────────────────────┐
│ Firebase Auth       │
│ Create Account      │
└──────┬──────────────┘
       │
       │ Success
       ▼
┌─────────────────────┐
│ Set Auth Token      │
│ Cookie              │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Redirect to         │
│ Dashboard           │
└─────────────────────┘
```

**Alternative Paths:**
- **Email already exists**: Error message → User switches to Sign In
- **Weak password**: Error message → User updates password
- **Google Sign Up**: Click "Sign in with Google" → OAuth popup → Redirect to Dashboard

### 1.2 Returning User (Sign In)

```
┌─────────────┐
│ Login Page  │
│ (Sign In)   │
└──────┬──────┘
       │
       │ User enters credentials
       ▼
┌─────────────────────┐
│ Submit Form         │
└──────┬──────────────┘
       │
       │ Valid credentials
       ▼
┌─────────────────────┐
│ Firebase Auth       │
│ Sign In             │
└──────┬──────────────┘
       │
       │ Success
       ▼
┌─────────────────────┐
│ Set Auth Token      │
│ Cookie              │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Redirect to         │
│ Dashboard           │
└─────────────────────┘
```

**Error Handling:**
- **Wrong password**: Error message → User retries
- **User not found**: Error message → User switches to Sign Up
- **Too many attempts**: Error message → User waits before retry

---

## 2. Dashboard Flow

### 2.1 Initial Dashboard Load

```
┌─────────────────────┐
│ User lands on       │
│ Dashboard           │
└──────┬──────────────┘
       │
       │ Loading state
       ▼
┌─────────────────────┐
│ Fetch Data          │
│ - Current Tenant    │
│ - Applications      │
│ - Nodes             │
└──────┬──────────────┘
       │
       │ Data loaded
       ▼
┌─────────────────────┐
│ Display Dashboard   │
│ - Stats Cards       │
│ - Latest Deployments│
└─────────────────────┘
```

**User Actions:**
- Click sidebar navigation → Navigate to other pages
- View stats → Quick overview of system state
- Check deployments → See recent activity

---

## 3. Applications Management Flow

### 3.1 Create New Application

```
┌─────────────────────┐
│ Applications Page   │
│ (List View)         │
└──────┬──────────────┘
       │
       │ User clicks "+ New Application"
       ▼
┌─────────────────────┐
│ Create Form         │
│ Appears Above Table │
└──────┬──────────────┘
       │
       │ User fills:
       │ - Name
       │ - Domain
       ▼
┌─────────────────────┐
│ Submit Form         │
└──────┬──────────────┘
       │
       │ Valid data
       ▼
┌─────────────────────┐
│ API Call            │
│ POST /api/apps      │
└──────┬──────────────┘
       │
       │ Success
       ▼
┌─────────────────────┐
│ Close Form          │
│ Refresh List        │
│ Show New App        │
└─────────────────────┘
```

**User Actions:**
- **Cancel**: Click "Cancel" → Form closes, no changes saved
- **View List**: Scroll through applications table
- **Navigate**: Click sidebar → Go to other sections

### 3.2 View Applications

```
┌─────────────────────┐
│ Applications Page   │
└──────┬──────────────┘
       │
       │ Page loads
       ▼
┌─────────────────────┐
│ Fetch Applications  │
│ GET /api/apps       │
└──────┬──────────────┘
       │
       │ Data received
       ▼
┌─────────────────────┐
│ Display Table       │
│ - Name              │
│ - Domain            │
│ - Created Date      │
└─────────────────────┘
```

**Empty State:**
- If no applications: Show message "No applications yet. Create your first application above."

---

## 4. Policies Management Flow

### 4.1 Create New Policy

```
┌─────────────────────┐
│ Policies Page       │
│ (List View)         │
└──────┬──────────────┘
       │
       │ User clicks "+ New Policy"
       ▼
┌─────────────────────┐
│ Create Form         │
│ - Policy Name       │
│ - Protections       │
│   ☐ SQL Injection   │
│   ☐ XSS             │
│   ☐ File Upload     │
│ - Application       │
│   (Optional)        │
└──────┬──────────────┘
       │
       │ User configures and submits
       ▼
┌─────────────────────┐
│ API Call            │
│ POST /api/policies  │
└──────┬──────────────┘
       │
       │ Success
       ▼
┌─────────────────────┐
│ Close Form          │
│ Refresh List        │
│ Show New Policy     │
│ (Version 1)         │
└─────────────────────┘
```

**User Actions:**
- **Select Protections**: Check/uncheck protection types
- **Link Application**: Optionally associate with an application
- **Cancel**: Discard changes and close form

### 4.2 View Policy Versions

```
┌─────────────────────┐
│ Policies Page       │
│ Policy Card         │
└──────┬──────────────┘
       │
       │ User clicks "View Versions →"
       ▼
┌─────────────────────┐
│ Policy Versions     │
│ Page                │
│ - Policy Name       │
└──────┬──────────────┘
       │
       │ Fetch versions
       ▼
┌─────────────────────┐
│ Display Versions    │
│ - Version List      │
│ - Version Details   │
│   (Latest selected) │
└──────┬──────────────┘
       │
       │ User clicks different version
       ▼
┌─────────────────────┐
│ Update Details      │
│ Panel               │
│ Show Selected       │
│ Version Info        │
└─────────────────────┘
```

### 4.3 Rollback Policy

```
┌─────────────────────┐
│ Policy Versions     │
│ Page                │
└──────┬──────────────┘
       │
       │ User clicks "Rollback" on old version
       ▼
┌─────────────────────┐
│ Confirmation        │
│ Dialog              │
│ "Are you sure?"     │
└──────┬──────────────┘
       │
       │ User confirms
       ▼
┌─────────────────────┐
│ API Call            │
│ POST /api/policies  │
│ (Create new version)│
└──────┬──────────────┘
       │
       │ Success
       ▼
┌─────────────────────┐
│ Refresh Versions    │
│ Show New Version    │
│ (Now latest)        │
└─────────────────────┘
```

---

## 5. Nodes Management Flow

### 5.1 Register New Node

```
┌─────────────────────┐
│ Nodes Page          │
│ (List View)         │
└──────┬──────────────┘
       │
       │ User clicks "+ Register Node"
       ▼
┌─────────────────────┐
│ Register Form       │
│ - Node Name         │
│ - IP Address        │
└──────┬──────────────┘
       │
       │ User fills and submits
       ▼
┌─────────────────────┐
│ API Call            │
│ POST /api/nodes     │
└──────┬──────────────┘
       │
       │ Success
       ▼
┌─────────────────────┐
│ Close Form          │
│ Refresh List        │
│ Show New Node       │
│ (Status: offline)   │
└─────────────────────┘
```

### 5.2 View Nodes Status

```
┌─────────────────────┐
│ Nodes Page          │
└──────┬──────────────┘
       │
       │ Page loads
       ▼
┌─────────────────────┐
│ Fetch Nodes         │
│ GET /api/nodes      │
└──────┬──────────────┘
       │
       │ Data received
       ▼
┌─────────────────────┐
│ Display Table       │
│ - Name              │
│ - IP Address        │
│ - Status (badge)    │
│   [online/offline]  │
│ - Last Seen         │
│ - Created           │
└─────────────────────┘
```

**Status Indicators:**
- **Online**: Green badge
- **Offline**: Red badge
- **Last Seen**: Timestamp or "Never"

---

## 6. Navigation Flow

### 6.1 Sidebar Navigation

```
┌─────────────────────┐
│ Any Page            │
│ (With Layout)       │
└──────┬──────────────┘
       │
       │ User clicks navigation item
       ▼
┌─────────────────────┐
│ Route Change        │
│ Next.js Navigation  │
└──────┬──────────────┘
       │
       │ Navigate to new page
       ▼
┌─────────────────────┐
│ Load New Page       │
│ - Update active     │
│   nav item          │
│ - Fetch page data   │
│ - Render content    │
└─────────────────────┘
```

**Navigation Items:**
- 📊 Dashboard → `/dashboard`
- 📱 Applications → `/apps`
- 🛡️ Policies → `/policies`
- 🖥️ Nodes → `/nodes`

### 6.2 Sidebar Toggle

```
┌─────────────────────┐
│ Any Page            │
└──────┬──────────────┘
       │
       │ User clicks hamburger (☰)
       ▼
┌─────────────────────┐
│ Toggle Sidebar      │
│ - Open/Close        │
│ - Animate           │
│ - Preserve state    │
└─────────────────────┘
```

---

## 7. Logout Flow

```
┌─────────────────────┐
│ Any Authenticated   │
│ Page                │
└──────┬──────────────┘
       │
       │ User clicks "Logout"
       ▼
┌─────────────────────┐
│ Firebase Sign Out   │
│ Clear Auth Token    │
│ Cookie              │
└──────┬──────────────┘
       │
       │ Success
       ▼
┌─────────────────────┐
│ Redirect to         │
│ /login              │
└─────────────────────┘
```

---

## 8. Error Handling Flows

### 8.1 API Error Flow

```
┌─────────────────────┐
│ User Action         │
│ (Form Submit, etc.) │
└──────┬──────────────┘
       │
       │ API call fails
       ▼
┌─────────────────────┐
│ Error Response      │
│ Received            │
└──────┬──────────────┘
       │
       │ Display error
       ▼
┌─────────────────────┐
│ Show Error Message  │
│ - Alert dialog      │
│ - Inline message    │
│ - Toast notification│
└─────────────────────┘
```

**Error Types:**
- **Network Error**: "Failed to connect. Please check your connection."
- **Validation Error**: Show specific field errors
- **Server Error**: "An error occurred. Please try again."
- **Unauthorized**: Redirect to login

### 8.2 Loading States

```
┌─────────────────────┐
│ User Action         │
│ Triggers Async      │
│ Operation           │
└──────┬──────────────┘
       │
       │ Show loading
       ▼
┌─────────────────────┐
│ Loading State       │
│ - Disable buttons   │
│ - Show spinner      │
│ - Show "Loading..." │
└──────┬──────────────┘
       │
       │ Operation completes
       ▼
┌─────────────────────┐
│ Hide Loading        │
│ Show Result         │
└─────────────────────┘
```

---

## 9. User Journey Examples

### 9.1 New User Onboarding Journey

```
1. User visits application
   ↓
2. Sees Login page
   ↓
3. Clicks "Sign Up" tab
   ↓
4. Enters email and password
   ↓
5. Creates account
   ↓
6. Redirected to Dashboard
   ↓
7. Sees empty state (0 apps, 0 nodes)
   ↓
8. Navigates to Applications
   ↓
9. Creates first application
   ↓
10. Navigates to Policies
    ↓
11. Creates first policy
    ↓
12. Navigates to Nodes
    ↓
13. Registers first node
    ↓
14. Returns to Dashboard
    ↓
15. Sees populated stats
```

### 9.2 Policy Update Journey

```
1. User on Policies page
   ↓
2. Sees existing policy
   ↓
3. Clicks "View Versions →"
   ↓
4. Reviews version history
   ↓
5. Selects older version
   ↓
6. Reviews configuration
   ↓
7. Clicks "Rollback"
   ↓
8. Confirms rollback
   ↓
9. New version created
   ↓
10. Returns to Policies list
    ↓
11. Sees updated version number
```

### 9.3 Node Monitoring Journey

```
1. User on Nodes page
   ↓
2. Views node status table
   ↓
3. Notices node is "offline"
   ↓
4. Checks "Last Seen" timestamp
   ↓
5. Investigates node issue
   ↓
6. Fixes node connectivity
   ↓
7. Refreshes page
   ↓
8. Node status updates to "online"
   ↓
9. "Last Seen" timestamp updates
```

---

## 10. Accessibility Considerations

### 10.1 Keyboard Navigation
- **Tab Order**: Logical flow through interactive elements
- **Focus Indicators**: Visible focus rings on all interactive elements
- **Skip Links**: Allow skipping navigation for screen readers

### 10.2 Screen Reader Support
- **ARIA Labels**: All buttons and form inputs have descriptive labels
- **Semantic HTML**: Proper use of headings, lists, and landmarks
- **Status Announcements**: Loading and error states announced

### 10.3 Visual Accessibility
- **Color Contrast**: Meets WCAG AA standards
- **Text Size**: Scalable text, minimum 14px
- **Icons**: Used alongside text labels

---

## 11. Performance Considerations

### 11.1 Loading Strategies
- **Initial Load**: Fetch critical data first (tenant, basic stats)
- **Lazy Loading**: Load detailed data on demand
- **Caching**: Cache API responses where appropriate

### 11.2 User Feedback
- **Optimistic Updates**: Show changes immediately, sync in background
- **Skeleton Screens**: Show content structure while loading
- **Progressive Enhancement**: Core functionality works without JavaScript

---

## 12. Mobile Experience

### 12.1 Responsive Behavior
- **Sidebar**: Collapses to hamburger menu on mobile
- **Tables**: Scroll horizontally or convert to cards
- **Forms**: Full-width inputs, stacked layout
- **Cards**: Single column layout

### 12.2 Touch Interactions
- **Tap Targets**: Minimum 44x44px
- **Swipe Gestures**: Support for common gestures
- **Pull to Refresh**: Refresh data on mobile
