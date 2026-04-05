# ATRAVA Defense Support Workflow Setup

## Purpose

This document defines the recommended support workflow for operating ATRAVA Defense in production.

## Support Objectives

- restore service quickly
- protect production traffic safely
- preserve evidence for analysis
- route issues to the correct owner

## Support Tiers

### Tier 1: Service Desk / First-Line Support

Responsibilities:

- receive and log tickets
- confirm basic user, tenant, and application details
- identify whether the issue is access, configuration, monitoring, or security-event related
- gather screenshots, timestamps, and reproduction details
- route standard requests

### Tier 2: Platform Operations / WAF Operations

Responsibilities:

- review tenant, app, policy, and log data
- validate production configuration
- perform safe operational fixes
- confirm whether impact is platform-wide or tenant-specific
- decide whether engineering or security escalation is required

### Tier 3: Engineering / R&D

Responsibilities:

- investigate product defects
- analyze rule-generation or runtime issues
- inspect code-level behavior
- implement permanent fixes

### Tier 4: Security Leadership / Incident Command

Responsibilities:

- manage major incidents
- approve emergency protective actions
- coordinate stakeholder communication

## Ticket Categories

- access and authentication
- tenant and user administration
- protected application onboarding
- policy change request
- false positive
- false negative
- log visibility issue
- analytics inconsistency
- production outage
- suspected active attack

## Intake Requirements

Every ticket should capture:

- requester name
- tenant name
- affected application or domain
- severity
- issue summary
- time observed
- screenshots or logs
- business impact

## Recommended Workflow

1. Intake the ticket.
2. Classify the issue category.
3. Assign initial severity.
4. Perform first-line validation.
5. Escalate to platform operations if not resolved.
6. Escalate to engineering or security leadership if risk or product defect is confirmed.
7. Document actions taken and closure notes.

## Change-Related Requests

Requests involving these items should follow controlled approval:

- policy changes
- application origin changes
- SSL changes
- tenant-level administrative changes

Minimum expectations:

- documented requester
- reason for change
- expected impact
- rollback approach when applicable

## Major Incident Workflow

Trigger major incident handling when:

- multiple protected applications are affected
- WAF blocks legitimate production traffic broadly
- WAF fails open or fails closed unexpectedly
- log visibility is lost during suspected attack activity

Major incident steps:

1. assign incident owner
2. create incident timeline
3. capture evidence
4. stabilize service
5. communicate status
6. perform post-incident review

## Support Tools

Recommended operational tools:

- ATRAVA Defense dashboard
- logs module
- analytics views
- policy audit logs
- deployment or build pipeline records
- infrastructure and DNS records

## Metrics to Track

- ticket volume by type
- mean response time
- mean resolution time
- false positive rate
- recurring issue count
- incidents by protected site
