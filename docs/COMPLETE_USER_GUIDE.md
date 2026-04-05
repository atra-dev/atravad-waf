# ATRAVA Defense Complete User Guide

## Purpose

This guide explains how to use ATRAVA Defense in day-to-day operations. It is intended for administrators, analysts, and support personnel responsible for protecting websites and reviewing WAF activity.

## Platform Summary

ATRAVA Defense is a reverse-proxy web application firewall platform that protects websites before traffic reaches the origin server. It provides:

- Protected application onboarding
- Policy creation and assignment
- Security event logging
- Traffic and attack analytics
- Tenant-aware user and subscription management

Main user-facing modules:

- `Dashboard`
- `Applications`
- `Policies`
- `Logs`
- `Analytics`
- `Subscription`
- `Users`
- `Admin`

## Accessing the Platform

Users sign in through the ATRAVA Defense login page. Depending on account configuration, access may use managed Firebase Authentication credentials or Google-based sign-in.

Operational notes:

- Use named accounts only
- Keep admin access limited to authorized personnel
- Review tenant assignment if a user cannot see expected resources

## Dashboard

The dashboard provides the top-level operating view for a tenant.

Use the dashboard to:

- confirm protected sites are present
- review high-level traffic and attack indicators
- confirm subscription limits and tenant context

Recommended operator checks:

1. Verify the correct tenant is loaded.
2. Check protected application counts.
3. Review recent attack or denial activity.
4. Confirm no unusual drop in visibility or traffic metrics.

## Managing Applications

Applications represent protected websites or services behind the WAF.

### Create a Protected Application

Required inputs usually include:

- application name
- protected domain
- origin server configuration
- SSL mode
- routing options
- optional policy assignment

General workflow:

1. Open `Applications`.
2. Select the option to add a site.
3. Enter the application name and protected domain.
4. Configure origin settings.
5. Configure SSL behavior.
6. Assign a policy if ready.
7. Save the application.

### Review Application Status

For each protected site, review:

- domain
- origin definition
- assigned policy
- activation state
- traffic statistics

### Update an Application

Use application edit actions when:

- the origin server changes
- SSL material changes
- routing behavior changes
- response inspection needs to be enabled or disabled

### Delete an Application

Only delete an application after confirming:

- traffic is no longer expected through the WAF
- DNS or upstream references have been retired
- the site is no longer needed in analytics and operations

## Managing Policies

Policies define the protections applied by ATRAVA Defense.

### Create a Policy

Policies can include controls for:

- SQL injection
- cross-site scripting
- file upload restrictions
- path traversal
- SSRF-style checks
- IP access controls
- geographic restrictions
- rate limiting
- custom rules and exceptions

General workflow:

1. Open `Policies`.
2. Create a new policy.
3. Enable the required security controls.
4. Define exceptions carefully.
5. Assign the policy to one or more applications.
6. Save and validate.

### Policy Versioning

ATRAVA Defense supports policy versioning. When a policy is materially changed, a new version may be created. Operators should:

- document the reason for the change
- verify affected applications
- test expected traffic paths after update

### Operational Updates

Some list-focused updates, such as IP or geo changes, may be handled as operational updates. These should still be reviewed and tracked through the audit history.

## Logs

The logs module is used to review WAF decisions and supporting request details.

### Common Log Filters

Operators can filter by:

- site
- severity
- action or decision
- IP address
- search keywords

### Typical Log Review Process

1. Open `Logs`.
2. Filter by site or action.
3. Review severity and decision.
4. Open an event for full details.
5. Export results if needed for investigation.

### Log Interpretation

Typical decisions include:

- `allowed`
- `waf_blocked`
- `origin_denied`

Use log review to answer:

- what was blocked
- where the request came from
- which rule or condition triggered the event
- whether the event was expected or requires tuning

## Analytics

ATRAVA Defense includes multiple analytics views.

### Traffic Analytics

Use this view to understand:

- request volume
- blocked versus allowed traffic
- hourly traffic behavior
- site-level visibility

### Geographic Analytics

Use this view to identify:

- top source countries
- blocked traffic distribution
- unusual source regions

### Attack Analytics

Use this view to understand:

- attack volume over time
- top attacking IPs
- dominant attack types
- severity distribution

## Users

Tenant administrators can manage user access within their tenant.

Typical user actions:

- invite users
- update roles
- remove users

Good practice:

- keep the number of admin users limited
- remove stale accounts promptly
- review tenant membership before changing access

## Subscription and Limits

The subscription module shows tenant plan information and usage against limits.

Operators should review:

- current plan
- feature availability
- application count
- policy count
- managed user count

This is important before onboarding more sites or users.

## Admin Functions

Super admin users can manage:

- tenants
- cross-tenant users
- logging settings
- platform activity views

These functions should be restricted to the platform operations team.

## Standard Operational Tasks

### Onboard a New Internal Website

1. Create the application.
2. Define the origin.
3. Assign or create a policy.
4. Validate DNS and activation.
5. Monitor logs and analytics after cutover.

### Investigate a Suspected Attack

1. Open logs.
2. Filter by affected site and time window.
3. Review IP, URI, rule ID, and severity.
4. Check analytics for attack spikes or recurring sources.
5. Escalate if business impact or repeated hostile traffic is observed.

### Tune a Policy

1. Identify the false positive or missed detection.
2. Review matching rule context.
3. Apply the smallest safe policy adjustment.
4. Retest.
5. Monitor logs after change.

## Operational Guardrails

- Do not disable protections without approval.
- Treat policy exceptions as controlled changes.
- Record production-impacting changes in the change process.
- Use audit data when investigating configuration drift.

## Related Documents

- [API Documentation](./API_DOCUMENTATION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)
- [Support Workflow Setup](./SUPPORT_WORKFLOW_SETUP.md)
- [Escalation Procedure](./ESCALATION_PROCEDURE.md)
