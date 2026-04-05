# ATRAVA Defense Escalation Procedure

## Purpose

This procedure defines when and how ATRAVA Defense issues should be escalated during production operations.

## Escalation Principles

- escalate based on impact and urgency
- preserve service and evidence
- avoid uncontrolled production changes
- keep communications clear and timestamped

## Severity Levels

### Severity 1: Critical

Examples:

- production outage affecting protected internal websites
- widespread blocking of legitimate traffic
- loss of WAF visibility during active attack activity
- core authentication or tenant access failure for multiple users

Target action:

- immediate escalation to platform operations, engineering, and security leadership

### Severity 2: High

Examples:

- a key protected site is degraded
- repeated false positives affect business use
- logs or analytics are materially delayed during active testing or incident review

Target action:

- escalate to platform operations immediately and involve engineering if not restored quickly

### Severity 3: Medium

Examples:

- isolated tenant issue
- configuration drift without outage
- user management issue with workaround

Target action:

- assign to operations queue and escalate if unresolved within agreed SLA

### Severity 4: Low

Examples:

- documentation request
- minor UI issue
- standard change request

Target action:

- normal workflow handling

## Escalation Triggers

Escalate immediately when any of the following occur:

- multiple protected sites are affected
- there is evidence of ongoing attack activity
- production policy changes cause widespread false positives
- no logs are visible when traffic is known to be present
- a production fix requires engineering code change

## Escalation Path

1. Tier 1 Support
2. Tier 2 Platform Operations
3. Tier 3 Engineering / R&D
4. Tier 4 Security Leadership / Management

## Required Escalation Data

Every escalation should include:

- incident or ticket ID
- tenant name
- affected application or domain
- impact summary
- start time and current status
- actions already taken
- screenshots, logs, and example request details

## Communication Expectations

- record time of each handoff
- identify current incident owner
- state whether service is restored, degraded, or still failing
- avoid ambiguous wording

## Emergency Change Expectations

Before an emergency change:

- identify the exact protective change proposed
- confirm expected benefit
- identify rollback approach
- notify the incident owner

After an emergency change:

- validate outcome
- document timestamp and operator
- review for follow-up permanent fix

## Post-Escalation Review

After resolution:

1. confirm service stability
2. document root cause
3. list corrective actions
4. update documentation if needed
5. identify monitoring or process improvements
