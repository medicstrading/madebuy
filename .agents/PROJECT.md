# Project Configuration

## Project Name
madebuy

## Description
[One line description]

---

## Tech Stack

### Backend

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.11+ |
| Database | MongoDB |
| Cache | Redis |
| Auth | JWT |

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | React Query + Context |
| Forms | React Hook Form |

---

## File Structure

```
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   └── package.json
└── docker-compose.yml
```

---

## Key Files

| Purpose | Path |
|---------|------|
| API routes | backend/app/routes/ |
| Database models | backend/app/models/ |
| React components | frontend/src/components/ |
| API client | frontend/src/services/api.ts |

---

## Established Patterns

### Backend
- Repository pattern for database access
- Pydantic models for validation
- Circuit breaker for external APIs

### Frontend
- Custom hooks for data fetching
- Service layer for API calls
- Context for global state


## Git Verification Rule

Before ANY git push:
1. Run `git remote -v`
2. Show output to user
3. Say: "Pushing to: [repo URL]. Approve?"
4. Wait for explicit approval before pushing

