# ATRAVAD WAF - Wireframes & UI Specifications

## Overview
This document contains wireframes and UI specifications for the ATRAVAD WAF (Web Application Firewall) management platform.

---

## 1. Login/Sign Up Page

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    ATRAVAD WAF                         │
│              Sign in to your account                   │
│                                                         │
│  ┌──────────────┬──────────────┐                      │
│  │   Sign In    │   Sign Up    │                      │
│  └──────────────┴──────────────┘                      │
│                                                         │
│  ┌─────────────────────────────────────┐              │
│  │  Email address                      │              │
│  └─────────────────────────────────────┘              │
│                                                         │
│  ┌─────────────────────────────────────┐              │
│  │  Password                           │              │
│  └─────────────────────────────────────┘              │
│                                                         │
│  ┌─────────────────────────────────────┐              │
│  │         Sign in                     │              │
│  └─────────────────────────────────────┘              │
│                                                         │
│  ───────────── Or continue with ─────────────          │
│                                                         │
│  ┌─────────────────────────────────────┐              │
│  │  [G]  Sign in with Google           │              │
│  └─────────────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Components:
- **Header**: "ATRAVAD WAF" title with subtitle
- **Toggle Tabs**: Sign In / Sign Up toggle buttons
- **Form Fields**: 
  - Email input
  - Password input
  - Confirm Password (only in Sign Up mode)
- **Primary Action**: Sign in/Sign up button
- **Secondary Action**: Google OAuth button
- **Error Display**: Red alert box for error messages

### States:
- **Sign In Mode**: Email + Password fields
- **Sign Up Mode**: Email + Password + Confirm Password fields
- **Loading State**: Disabled buttons with loading text
- **Error State**: Error message displayed above form

---

## 2. Dashboard Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☰  ATRAVAD WAF                                    [Logout]         │
├──────────┬──────────────────────────────────────────────────────────┤
│          │  Dashboard                                               │
│ 📊       │                                                           │
│ Dashboard│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│          │  │   🏢         │ │   📱         │ │   🖥️         │    │
│ 📱       │  │  Tenant      │ │ Applications │ │  WAF Nodes   │    │
│ Apps     │  │              │ │              │ │              │    │
│          │  │ Default      │ │      5       │ │      3       │    │
│ 🛡️       │  │  Tenant      │ │              │ │              │    │
│ Policies │  └──────────────┘ └──────────────┘ └──────────────┘    │
│          │                                                           │
│ 🖥️       │  ┌──────────────────────────────────────────────┐       │
│ Nodes    │  │ Latest Deployments                            │       │
│          │  │                                                │       │
│          │  │  No deployments yet                            │       │
│          │  └──────────────────────────────────────────────┘       │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Components:
- **Top Bar**: 
  - Hamburger menu (☰)
  - App title "ATRAVAD WAF"
  - Logout button
- **Sidebar Navigation**:
  - Dashboard (active)
  - Applications
  - Policies
  - Nodes
- **Main Content**:
  - Page title: "Dashboard"
  - **Stats Cards** (3-column grid):
    - Tenant card (🏢 icon, tenant name)
    - Applications card (📱 icon, count)
    - WAF Nodes card (🖥️ icon, count)
  - **Latest Deployments Section**:
    - Title
    - List of recent deployments (or empty state)

### States:
- **Loading**: Centered "Loading..." text
- **Empty State**: "No deployments yet" message
- **Populated State**: List of deployment items with name and timestamp

---

## 3. Applications Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☰  ATRAVAD WAF                                    [Logout]         │
├──────────┬──────────────────────────────────────────────────────────┤
│          │  Applications          [+ New Application]              │
│ 📊       │                                                           │
│ Dashboard│  ┌──────────────────────────────────────────────┐       │
│          │  │ Create New Application                       │       │
│ 📱       │  │                                              │       │
│ Apps     │  │ Name: [________________________]             │       │
│          │  │                                              │       │
│ 🛡️       │  │ Domain: [________________________]            │       │
│ Policies │  │                                              │       │
│          │  │                                    [Create]  │       │
│ 🖥️       │  └──────────────────────────────────────────────┘       │
│ Nodes    │                                                           │
│          │  ┌──────────────────────────────────────────────┐       │
│          │  │ Name    │ Domain        │ Created            │       │
│          │  ├─────────┼───────────────┼────────────────────┤       │
│          │  │ App 1   │ app1.com      │ 01/15/2024         │       │
│          │  │ App 2   │ app2.com      │ 01/14/2024         │       │
│          │  │ App 3   │ app3.com      │ 01/13/2024         │       │
│          │  └──────────────────────────────────────────────┘       │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Components:
- **Header Section**:
  - Page title: "Applications"
  - Action button: "+ New Application" (toggles to "Cancel" when form is open)
- **Create Form** (conditional):
  - Title: "Create New Application"
  - Name input field
  - Domain input field
  - Create button (disabled during submission)
- **Applications Table**:
  - Headers: Name | Domain | Created
  - Rows: Application data
  - Empty state: "No applications yet. Create your first application above."

### States:
- **Form Hidden**: Only table visible
- **Form Visible**: Form appears above table
- **Submitting**: Create button shows "Creating..." and is disabled
- **Empty State**: Table shows empty state message
- **Populated State**: Table shows list of applications

---

## 4. Policies Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☰  ATRAVAD WAF                                    [Logout]         │
├──────────┬──────────────────────────────────────────────────────────┤
│          │  Policies                [+ New Policy]                  │
│ 📊       │                                                           │
│ Dashboard│  ┌──────────────────────────────────────────────┐       │
│          │  │ Create New Policy                            │       │
│ 📱       │  │                                              │       │
│ Apps     │  │ Policy Name: [________________________]       │       │
│          │  │                                              │       │
│ 🛡️       │  │ Protections:                                 │       │
│ Policies │  │ ☐ SQL Injection Protection                   │       │
│          │  │ ☑ XSS Protection                             │       │
│ 🖥️       │  │ ☐ File Upload Protection                     │       │
│ Nodes    │  │                                              │       │
│          │  │ Application (Optional):                      │       │
│          │  │ [Select application ▼]                      │       │
│          │  │                                              │       │
│          │  │                                    [Create]  │       │
│          │  └──────────────────────────────────────────────┘       │
│          │                                                           │
│          │  ┌──────────────────────────────────────────────┐       │
│          │  │ Policy Name                    [View →]      │       │
│          │  │ Version 3 (Latest)                            │       │
│          │  │                                                │       │
│          │  │ Protections: [XSS] [File Upload]              │       │
│          │  │ Created: 01/15/2024, 10:30 AM                 │       │
│          │  └──────────────────────────────────────────────┘       │
│          │                                                           │
│          │  ┌──────────────────────────────────────────────┐       │
│          │  │ Another Policy                [View →]        │       │
│          │  │ Version 1 (Latest)                            │       │
│          │  │                                                │       │
│          │  │ Protections: [SQL Injection] [XSS]            │       │
│          │  │ Created: 01/14/2024, 2:15 PM                  │       │
│          │  └──────────────────────────────────────────────┘       │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Components:
- **Header Section**:
  - Page title: "Policies"
  - Action button: "+ New Policy"
- **Create Form** (conditional):
  - Policy Name input
  - Protections checkboxes (SQL Injection, XSS, File Upload)
  - Application dropdown (optional)
  - Create button
- **Policy Cards**:
  - Policy name and version
  - "View Versions →" link
  - Protection badges (color-coded)
  - Created timestamp
  - Empty state card if no policies

### States:
- **Form Hidden**: Only policy cards visible
- **Form Visible**: Form appears above cards
- **Submitting**: Create button shows "Creating..." and is disabled
- **Empty State**: Single card showing "No policies yet..."
- **Populated State**: Cards for each policy name (grouped by name)

---

## 5. Policy Versions Detail Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☰  ATRAVAD WAF                                    [Logout]         │
├──────────┬──────────────────────────────────────────────────────────┤
│          │  Policy Name                                            │
│ 📊       │  Policy Versions                                         │
│ Dashboard│                                                           │
│          │  ┌──────────────────┐ ┌──────────────────────────────┐  │
│ 📱       │  │ Versions         │ │ Version 3 Details            │  │
│ Apps     │  │                  │ │                              │  │
│          │  │ ┌──────────────┐ │ │ Protections:                 │  │
│ 🛡️       │  │ │ Version 3    │ │ │ ● SQL Injection Protection  │  │
│ Policies │  │ │ 01/15/2024   │ │ │ ○ XSS Protection            │  │
│          │  │ └──────────────┘ │ │ ○ File Upload Protection     │  │
│ 🖥️       │  │                  │ │                              │  │
│ Nodes    │  │ ┌──────────────┐ │ │ ModSecurity Configuration:  │  │
│          │  │ │ Version 2    │ │ │ ┌────────────────────────┐  │  │
│          │  │ │ 01/14/2024   │ │ │ │ SecRuleEngine On       │  │  │
│          │  │ │ [Rollback]   │ │ │ │ SecRule ...            │  │  │
│          │  │ └──────────────┘ │ │ │ ...                    │  │  │
│          │  │                  │ │ │ └────────────────────────┘  │  │
│          │  │ ┌──────────────┐ │ │                              │  │
│          │  │ │ Version 1    │ │ │ Created: 01/15/2024, 10:30  │  │
│          │  │ │ 01/13/2024   │ │ │                              │  │
│          │  │ │ [Rollback]   │ │ │                              │  │
│          │  │ └──────────────┘ │ │                              │  │
│          │  └──────────────────┘ └──────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Components:
- **Header**: Policy name and "Policy Versions" subtitle
- **Two-Column Layout**:
  - **Left Column**: Version list
    - Version cards (clickable)
    - Version number and date
    - Rollback button (except for latest version)
    - Active version highlighted
  - **Right Column**: Selected version details
    - Version number in title
    - Protections list (with status indicators)
    - ModSecurity Configuration (code block)
    - Created timestamp

### States:
- **Loading**: Centered "Loading..." text
- **Version Selected**: Details panel shows selected version info
- **Rollback Confirmation**: Browser confirm dialog before rollback

---

## 6. Nodes Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☰  ATRAVAD WAF                                    [Logout]         │
├──────────┬──────────────────────────────────────────────────────────┤
│          │  WAF Nodes              [+ Register Node]                │
│ 📊       │                                                           │
│ Dashboard│  ┌──────────────────────────────────────────────┐       │
│          │  │ Register New Node                             │       │
│ 📱       │  │                                              │       │
│ Apps     │  │ Node Name: [________________________]         │       │
│          │  │                                              │       │
│ 🛡️       │  │ IP Address: [________________________]       │       │
│ Policies │  │                                              │       │
│          │  │                                    [Register]│       │
│ 🖥️       │  └──────────────────────────────────────────────┘       │
│ Nodes    │                                                           │
│          │  ┌──────────────────────────────────────────────┐       │
│          │  │ Name  │ IP Address │ Status │ Last Seen │ Created│ │
│          │  ├──────┼────────────┼────────┼───────────┼────────┤ │
│          │  │Node 1│ 192.168.1.1│[online]│ 10:30 AM  │01/15/24│ │
│          │  │Node 2│ 192.168.1.2│[offline]│ Never    │01/14/24│ │
│          │  │Node 3│ 192.168.1.3│[online]│ 9:15 AM   │01/13/24│ │
│          │  └──────────────────────────────────────────────┘       │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Components:
- **Header Section**:
  - Page title: "WAF Nodes"
  - Action button: "+ Register Node"
- **Register Form** (conditional):
  - Node Name input
  - IP Address input
  - Register button
- **Nodes Table**:
  - Headers: Name | IP Address | Status | Last Seen | Created
  - Status badges (color-coded: green for online, red for offline)
  - Empty state: "No nodes registered yet..."

### States:
- **Form Hidden**: Only table visible
- **Form Visible**: Form appears above table
- **Submitting**: Register button shows "Registering..." and is disabled
- **Empty State**: Table shows empty state message
- **Populated State**: Table shows list of nodes with status indicators

---

## Design System

### Colors
- **Primary**: Indigo (#4F46E5)
- **Background**: Gray-50 (#F9FAFB)
- **Text Primary**: Gray-900 (#111827)
- **Text Secondary**: Gray-500 (#6B7280)
- **Success**: Green-500 (#10B981)
- **Error**: Red-500 (#EF4444)
- **Warning**: Yellow-500 (#F59E0B)

### Typography
- **Headings**: Bold, Gray-900
- **Body**: Regular, Gray-700
- **Labels**: Medium, Gray-700
- **Helper Text**: Small, Gray-500

### Spacing
- **Page Padding**: 24px (p-6) / 32px (p-8) on large screens
- **Card Padding**: 24px (p-6)
- **Form Spacing**: 16px (space-y-4)
- **Section Spacing**: 24px (space-y-6)

### Components
- **Buttons**: 
  - Primary: Indigo-600 background, white text
  - Secondary: White background, gray text, border
- **Inputs**: White background, gray border, indigo focus ring
- **Cards**: White background, shadow, rounded corners
- **Tables**: Striped rows, gray headers
- **Badges**: Rounded-full, color-coded backgrounds

### Responsive Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px (lg)

### Interactive States
- **Hover**: Slightly darker background or border color
- **Active**: Indigo-50 background for navigation items
- **Disabled**: 50% opacity, not-allowed cursor
- **Loading**: Disabled state with loading text
