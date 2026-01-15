# ATRAVAD WAF MVP Features Documentation

This document outlines all MVP (Minimum Viable Product) features implemented in ATRAVAD WAF.

## MVP Feature Checklist

✅ **Multi-tenant management**
✅ **Web dashboard (Next.js)**
✅ **Policy editor (no manual rule editing)**
✅ **Central deployment to many WAF nodes**
✅ **RBAC (Admin, Analyst, Client)**
✅ **Versioned configurations + rollback**
✅ **Node health monitoring**
✅ **Log ingestion (basic)**

---

## 1. Multi-Tenant Management

### Implementation
- Tenant isolation at the database level using Firestore
- All resources (policies, nodes, apps, logs) are scoped by `tenantId`
- Users are associated with a single tenant via the `users` collection

### API Endpoints
- `POST /api/tenants` - Create a new tenant (admin only)
- `GET /api/tenants` - Get current user's tenant
- `GET /api/tenants/current` - Get current tenant info

### Data Model
```javascript
{
  tenantId: "string", // All resources include this
  // Users collection
  users: {
    userId: {
      tenantId: "string",
      role: "admin" | "analyst" | "client",
      email: "string"
    }
  }
}
```

---

## 2. Web Dashboard (Next.js)

### Implementation
- Built with Next.js 16 (App Router)
- React 19 with Tailwind CSS
- Protected routes with authentication middleware
- Responsive dashboard layout

### Pages
- `/dashboard` - Main dashboard
- `/apps` - Application management
- `/policies` - Policy management
- `/policies/[name]` - Policy versions and rollback
- `/nodes` - Node management
- `/login` - Authentication

---

## 3. Policy Editor (No Manual Rule Editing)

### Implementation
- **Visual policy editor only** - No manual ModSecurity rule editing allowed
- Policy creation via structured configuration object
- ModSecurity configuration is auto-generated from policy settings
- Manual `modSecurityConfig` field is rejected if provided in API

### Policy Configuration Structure
```javascript
{
  name: "string",
  sqlInjection: boolean,
  xss: boolean,
  fileUpload: boolean,
  pathTraversal: boolean,
  rce: boolean,
  rateLimiting: {
    requestsPerMinute: number,
    requestsPerHour: number,
    burstSize: number
  },
  customRules: [], // Structured custom rules (not raw ModSecurity)
  applicationId: "string",
  includeOWASPCRS: boolean,
  mode: "detection" | "prevention"
}
```

### Protection Features
- SQL Injection protection
- XSS protection
- File upload restrictions
- Path traversal prevention
- Remote Code Execution (RCE) detection
- Rate limiting
- Custom rules (structured, not raw ModSecurity)

### API Endpoints
- `POST /api/policies` - Create policy (admin only, rejects manual config)
- `GET /api/policies` - List policies
- `GET /api/policies/[id]` - Get policy details

---

## 4. Central Deployment to Many WAF Nodes

### Implementation
- Deployment API that can push policies to multiple nodes simultaneously
- Nodes poll for configuration updates
- Deployment tracking with status per node
- Rollback capability through policy versioning

### Workflow
1. Admin creates/updates policy
2. Admin selects nodes and deploys via `POST /api/deploy/[policyId]`
3. Nodes poll `GET /api/nodes/[id]/config` for new configurations
4. Nodes apply configuration and report status via `POST /api/nodes/[id]/config`
5. Deployment status tracked in `deployments` collection

### API Endpoints
- `POST /api/deploy/[policyId]` - Deploy policy to nodes (admin only)
- `GET /api/nodes/[id]/config` - Node fetches configuration
- `POST /api/nodes/[id]/config` - Node reports deployment status

### Deployment Status
- `pending` - Deployment initiated
- `in_progress` - Some nodes have fetched, deployment ongoing
- `completed` - All nodes successfully deployed
- `partial` - Some nodes failed, some succeeded
- `failed` - All nodes failed

---

## 5. RBAC (Role-Based Access Control)

### Roles

#### Admin
- ✅ Full access to all features
- ✅ Create, read, update, delete policies
- ✅ Deploy policies to nodes
- ✅ Create and manage nodes
- ✅ Create and manage applications
- ✅ View logs
- ✅ Manage tenants

#### Analyst
- ✅ Read-only access to most resources
- ✅ Can view policies, nodes, applications
- ✅ Can view logs (read-only)
- ❌ Cannot create, update, or delete resources
- ❌ Cannot deploy policies

#### Client
- ✅ Read-only access to policies, nodes, applications
- ❌ Cannot view logs
- ❌ Cannot create, update, or delete resources
- ❌ Cannot deploy policies

### Implementation
- RBAC checks in all API routes via `checkAuthorization()` utility
- Role stored in `users` collection
- Permission matrix defined in `src/lib/rbac.js`

### Authorization Checks
```javascript
import { checkAuthorization } from '@/lib/rbac';

const authCheck = await checkAuthorization(adminDb, userId, 'create', 'policies');
if (!authCheck.authorized) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## 6. Versioned Configurations + Rollback

### Implementation
- Every policy creation creates a new version
- Version number auto-increments
- All policy versions stored in `policies` collection
- Rollback creates a new version from an old version's configuration

### Version Management
- Policy versions are identified by `name` and `version` number
- Each version includes full policy configuration and ModSecurity config
- Rollback UI available on policy versions page

### API Endpoints
- `POST /api/policies` - Creates new version (auto-increments)
- `GET /api/policies?name=PolicyName` - Get all versions of a policy
- Rollback handled via UI (creates new version from old)

### Data Model
```javascript
{
  name: "Policy Name",
  version: 1, // Auto-incremented
  policy: { /* policy config */ },
  modSecurityConfig: "string", // Generated
  tenantId: "string",
  createdAt: "ISO timestamp",
  createdBy: "userId"
}
```

---

## 7. Node Health Monitoring

### Implementation
- Heartbeat endpoint for nodes to report health
- Health metrics stored and tracked over time
- Status indicators: `online`, `offline`, `degraded`
- Health history kept (last 100 entries per node)

### Health Metrics
- Status (`online` | `offline` | `degraded`)
- Version
- Uptime
- CPU usage
- Memory usage
- Active connections
- Policies deployed
- Last log time

### API Endpoints
- `POST /api/nodes/[id]/health` - Node reports health (called periodically)
- `GET /api/nodes` - List nodes with health status

### Data Model
```javascript
{
  nodes: {
    nodeId: {
      name: "string",
      ip: "string",
      status: "online" | "offline" | "degraded",
      lastSeen: "ISO timestamp",
      health: {
        version: "string",
        uptime: number,
        cpuUsage: number,
        memoryUsage: number,
        activeConnections: number,
        policiesDeployed: number,
        lastLogTime: "ISO timestamp",
        lastUpdated: "ISO timestamp"
      }
    }
  },
  node_health_history: {
    // Last 100 health reports per node
  }
}
```

---

## 8. Log Ingestion (Basic)

### Implementation
- Basic log ingestion endpoint for nodes to send logs
- Logs stored in Firestore `logs` collection
- Queryable by node, level, severity
- Analyst and admin roles can view logs

### Log Structure
```javascript
{
  nodeId: "string",
  tenantId: "string",
  timestamp: "ISO timestamp",
  level: "info" | "warning" | "error" | "critical",
  message: "string",
  ruleId: number | null,
  ruleMessage: "string" | null,
  severity: "low" | "medium" | "high" | "critical" | null,
  request: object | null,
  response: object | null,
  clientIp: "string" | null,
  userAgent: "string" | null,
  uri: "string" | null,
  method: "GET" | "POST" | etc,
  statusCode: number | null,
  blocked: boolean,
  ingestedAt: "ISO timestamp"
}
```

### API Endpoints
- `POST /api/logs` - Node sends logs (basic auth via nodeId/nodeApiKey)
- `GET /api/logs` - Retrieve logs (analyst/admin only)
  - Query parameters:
    - `nodeId` - Filter by node
    - `level` - Filter by log level
    - `severity` - Filter by severity
    - `limit` - Results limit (default: 100)
    - `startAfter` - Pagination cursor

---

## Technical Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- Tailwind CSS

### Backend
- Next.js API Routes
- Firebase Firestore (database)
- Firebase Authentication
- Firebase Admin SDK

### WAF Engine
- ModSecurity 3.x
- OWASP Core Rule Set (CRS) 3.3.0

---

## Security Considerations

1. **RBAC Enforcement**: All API routes check authorization
2. **Tenant Isolation**: All queries filtered by tenantId
3. **No Manual Rule Editing**: Prevents security risks from manual config
4. **API Key Authentication**: Nodes authenticate via API key (basic, can be enhanced)
5. **Firestore Security Rules**: Should enforce tenant isolation at database level

---

## Future Enhancements (Post-MVP)

- Real-time node status updates (WebSockets)
- Advanced log analytics and dashboards
- Automated policy deployment triggers
- Webhook integrations for deployments
- Multi-factor authentication
- API key management UI
- Policy templates and presets
- Attack pattern analytics
- Alert notifications

---

## API Summary

### Authentication Required
All API endpoints (except node endpoints with API keys) require authentication via `authToken` cookie.

### Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| POST | `/api/tenants` | Create tenant | Admin |
| GET | `/api/tenants` | Get tenant | Any authenticated |
| GET | `/api/tenants/current` | Get current tenant | Any authenticated |
| POST | `/api/apps` | Create application | Admin |
| GET | `/api/apps` | List applications | Any authenticated |
| POST | `/api/policies` | Create policy | Admin |
| GET | `/api/policies` | List policies | Any authenticated |
| GET | `/api/policies/[id]` | Get policy | Any authenticated |
| POST | `/api/deploy/[policyId]` | Deploy policy | Admin |
| POST | `/api/nodes` | Register node | Admin |
| GET | `/api/nodes` | List nodes | Any authenticated |
| POST | `/api/nodes/[id]/health` | Report health | Node (API key) |
| GET | `/api/nodes/[id]/config` | Get config | Node (API key) |
| POST | `/api/nodes/[id]/config` | Report status | Node (API key) |
| POST | `/api/logs` | Ingest logs | Node (API key) |
| GET | `/api/logs` | View logs | Analyst/Admin |
| POST | `/api/modsecurity/test` | Test request | Any authenticated |

---

## Getting Started

1. **Setup Environment**: Configure Firebase credentials in `.env.local`
2. **Create Tenant**: First admin user creates tenant
3. **Create Applications**: Register applications to protect
4. **Create Policies**: Define security policies
5. **Register Nodes**: Add WAF nodes
6. **Deploy Policies**: Deploy policies to nodes
7. **Monitor Health**: Nodes report health automatically
8. **View Logs**: Analysts and admins can view security logs

For detailed setup instructions, see `README.md`.
