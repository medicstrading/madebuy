# Model Hand-off Protocol

## Overview

This protocol defines how tasks are transferred between model tiers in the NEXUS system.

---

## Escalation (Lower → Higher Tier)

### When to Escalate

1. **Ambiguous Requirements** - Task requirements unclear or contradictory
2. **Scope Expansion** - Task complexity exceeds initial estimate
3. **Security-Sensitive** - Authentication, encryption, permissions
4. **Architectural Decisions** - New patterns or system design needed
5. **Low Confidence** - Model confidence drops below 70%

### Escalation Format

```json
{
  "handoff_type": "escalation",
  "from_tier": "haiku|sonnet",
  "to_tier": "sonnet|opus",
  "timestamp": "ISO-8601",
  "task": {
    "original_description": "string",
    "current_state": "string",
    "files_touched": ["array"]
  },
  "escalation_reason": {
    "category": "ambiguous|scope|security|architecture|confidence",
    "details": "string",
    "specific_blockers": ["array"]
  },
  "context": {
    "discoveries": ["array"],
    "questions_unresolved": ["array"]
  }
}
```

---

## Delegation (Higher → Lower Tier)

### When to Delegate

1. **Simple Subtasks** - Formatting, docs, simple CRUD
2. **Parallel Work** - Independent subtasks
3. **Cost Optimization** - Well-defined bounded tasks

### Delegation Format

```json
{
  "handoff_type": "delegation",
  "from_tier": "opus|sonnet",
  "to_tier": "sonnet|haiku",
  "task": {
    "description": "string",
    "scope": {
      "files": ["array"],
      "boundaries": "string"
    }
  },
  "specification": {
    "acceptance_criteria": ["array"],
    "constraints": ["array"]
  }
}
```

---

## Best Practices

1. **Preserve Context Efficiently** - Include only relevant context
2. **Clear Boundaries** - Explicit scope prevents scope creep
3. **Fail Fast** - Escalate early when blockers are hit
4. **Trust the Tier** - Match detail level to tier capability
