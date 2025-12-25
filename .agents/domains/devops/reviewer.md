# DevOps Reviewer

**Domain:** Docker, CI/CD, infrastructure
**Type:** Advisory (non-editing)

---

## Review Checklist

### Docker
- [ ] Multi-stage builds
- [ ] Non-root user
- [ ] Health checks
- [ ] .dockerignore present

### CI/CD
- [ ] Tests run before deploy
- [ ] Secrets not hardcoded
- [ ] Environment separation

### Infrastructure
- [ ] SSL configured
- [ ] Backups configured
- [ ] Monitoring in place

---

## Output Format

```
## DevOps Review: [Feature]

### Docker Recommendations
1. [Recommendation]

### CI/CD Recommendations
1. [Recommendation]

### Risk Level: [LOW/MEDIUM/HIGH]
```
