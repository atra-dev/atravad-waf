# ATRAVA Defense API Documentation

## Purpose

This document summarizes the main application APIs used by ATRAVA Defense for platform operations. It is intended for internal engineering, operations, and support teams.

## General Notes

- Base URL depends on the environment.
- Most routes are implemented as Next.js route handlers under `src/app/api`.
- Authenticated routes require a valid session token.
- Many routes are tenant-scoped.

## Authentication and User APIs

### `GET /api/users/me`

Returns the current user profile and normalized account metadata.

Typical use:

- session validation
- role-aware UI rendering
- tenant lookup

### `GET /api/tenants/current`

Returns the current tenant summary for the authenticated user.

Typical use:

- subscription display
- tenant feature/limit checks
- tenant-aware UI state

### `GET /api/tenants`

Behavior depends on user role:

- super admin: returns all tenants
- regular tenant user: returns the assigned tenant

### `POST /api/tenants`

Creates a tenant. Restricted to authorized roles.

## Applications APIs

### `GET /api/apps`

Returns tenant applications with summarized traffic statistics.

### `POST /api/apps`

Creates a protected application.

Expected payload areas:

- name
- domain
- origins
- SSL settings
- routing settings
- policy assignment

### `GET /api/apps/[id]`

Returns a single protected application.

### `PATCH /api/apps/[id]`

Updates mutable application settings such as:

- origins
- policy assignment
- response inspection
- SSL configuration
- routing
- activation flag

### `DELETE /api/apps/[id]`

Deletes a protected application.

### `POST /api/apps/[id]/clear-cache`

Clears runtime or application-side cache for the selected application when supported by the flow.

## Policies APIs

### `GET /api/policies`

Returns policies for the current tenant. Supports filtering by name.

### `POST /api/policies`

Creates or versions a WAF policy.

Policy areas include:

- attack protections
- exceptions
- rate controls
- IP restrictions
- geo restrictions
- virtual patching
- assigned applications

### `DELETE /api/policies`

Deletes policies by policy name within the tenant, subject to assignment checks.

### `GET /api/policies/[id]`

Returns a specific policy document by ID.

### `GET /api/policies/audit`

Returns paginated audit data for policy changes.

Key filters may include:

- tenant
- policy name
- actor
- change scope
- date window

## Logs and Analytics APIs

### `POST /api/logs`

Ingests security logs from the WAF edge.

Primary behaviors:

- validates ingest credentials
- normalizes log data
- applies geolocation and metadata enrichment
- writes rollups and selected raw logs

### `GET /api/logs`

Returns paginated tenant logs with filters.

Common filters:

- level
- severity
- blocked flag
- decision
- site
- request method
- request URI
- search or IP lookup

Response fields commonly include:

- `logs`
- `count`
- `totalStoredCount`
- `hasMore`
- `pageSize`
- `nextCursor`

### `GET /api/logs/analytics`

Returns aggregate traffic or attack analytics for the current tenant.

Typical query areas:

- time window
- site
- severity
- decision
- attacks-only mode

## Tenant User Management APIs

### `GET /api/tenant/users`

Returns users within the current tenant.

### `POST /api/tenant/users`

Creates or invites a user in the current tenant.

### `PUT /api/tenant/users`

Updates a tenant user role within tenant rules.

### `DELETE /api/tenant/users`

Deletes a tenant user, subject to access restrictions.

## Admin APIs

### `GET /api/admin/users`

Returns a cross-tenant user list for super admins.

### `POST /api/admin/users`

Creates a managed user in a specified tenant.

### `PUT /api/admin/users`

Updates user role, tenant assignment, and authentication mode.

### `DELETE /api/admin/users`

Deletes a managed user.

### `GET /api/admin/tenants`

Returns the tenant list with plan and usage data for super admins.

### `POST /api/admin/tenants`

Creates a tenant and optionally assigns an existing managed user.

### `PUT /api/admin/tenants`

Updates tenant subscription and plan details.

### `GET /api/admin/activity`

Returns recent platform activity and top-level counts for super admin visibility.

### `GET /api/admin/logging`

Returns traffic logging configuration.

### `PUT /api/admin/logging`

Updates traffic logging configuration.

## Error Handling Expectations

Common status patterns:

- `200` success
- `201` created
- `400` validation or business rule failure
- `401` unauthorized
- `403` forbidden
- `404` not found
- `409` conflict
- `500` internal server error

## Security Notes

- Do not expose admin routes to non-admin roles.
- Validate tenant ownership on all tenant-scoped operations.
- Review logging and retention settings before production rollout.
- Treat log ingestion credentials as secrets.
