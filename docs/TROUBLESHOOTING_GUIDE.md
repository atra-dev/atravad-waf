# ATRAVA Defense Troubleshooting Guide

## Purpose

This guide helps operators and support personnel diagnose common ATRAVA Defense issues in testing and production.

## 1. Login Issues

### Symptoms

- user cannot sign in
- session immediately expires
- tenant data does not load after login

### Checks

1. Confirm the user account exists in Firebase Authentication if applicable.
2. Confirm the user document exists in Firestore.
3. Verify the account has the correct `tenantName` and role.
4. Confirm Firebase environment variables are present and valid.

### Likely Causes

- invalid auth configuration
- missing tenant assignment
- expired or invalid session token
- mismatched auth provider configuration

## 2. Protected Site Not Receiving Traffic

### Symptoms

- no logs appear
- analytics remain at zero
- application appears inactive

### Checks

1. Verify DNS points to the ATRAVA Defense edge.
2. Confirm the application is created with the correct domain.
3. Confirm the origin is reachable.
4. Confirm SSL and routing settings are correct.
5. Check whether traffic is bypassing the WAF path.

## 3. Requests Reach Origin but WAF Protection Seems Inactive

### Symptoms

- malicious test requests appear to pass
- expected blocking is not observed

### Checks

1. Confirm a policy is assigned to the application.
2. Review the policy controls enabled.
3. Review exceptions and IP/geo allow rules.
4. Test using known safe validation payloads.
5. Check runtime logs for inspection path or policy loading issues.

## 4. Excessive Blocking or False Positives

### Symptoms

- legitimate users are blocked
- normal requests generate repeated denials

### Checks

1. Review the affected request in `Logs`.
2. Identify the rule ID and matching URI.
3. Confirm whether the block came from WAF or origin.
4. Review recent policy changes.
5. Apply the smallest safe exception or tuning change.

## 5. Logs Are Missing or Incomplete

### Symptoms

- expected events do not appear in logs
- analytics are inconsistent with observed traffic

### Checks

1. Confirm log ingestion credentials are valid.
2. Confirm the tenant name used by the ingest path is correct.
3. Review traffic logging configuration.
4. Confirm Firestore quotas and billing are healthy.
5. Check whether low-value allowed traffic sampling is reducing raw log retention.

## 6. Analytics Looks Delayed or Lower Than Expected

### Explanation

ATRAVA Defense uses aggregate rollups plus selected raw logs. This reduces cost and improves performance, but it can make operators compare different views incorrectly.

### Checks

1. Confirm the analytics window being viewed.
2. Compare the site filter with the application domain.
3. Check whether the request type is sampled in raw logs.
4. Confirm rollup generation is functioning.

## 7. Cannot Create More Apps, Policies, or Users

### Symptoms

- create action fails
- platform reports plan limit reached

### Checks

1. Open the subscription or tenant summary view.
2. Review the current plan limits.
3. Review tenant usage values.
4. Remove unused resources or request a plan adjustment.

## 8. Policy Delete Fails

### Likely Reason

The policy is still assigned to one or more applications.

### Checks

1. Review which applications reference the policy.
2. Reassign those applications first.
3. Retry deletion.

## 9. Admin Data Does Not Match Expected Tenant Counts

### Checks

1. Confirm tenant usage summary is present on the tenant record.
2. Re-open the tenant summary so usage can self-backfill if needed.
3. Review recent create, delete, or reassignment operations.

## 10. Build or Deployment Issues

### Checks

1. Run `npm run build`.
2. Confirm required environment variables exist.
3. Confirm Firebase Admin credentials are valid.
4. Confirm runtime has access to required network destinations.

## Evidence to Capture Before Escalation

- tenant name
- affected site or application
- time of issue
- exact user action
- screenshot or error message
- sample request path or IP
- relevant log IDs if available
