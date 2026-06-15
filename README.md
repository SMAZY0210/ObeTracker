# OBE Tracker — Bangladesh University of Professionals

## Credentials
| Role    | Email / Login         | Password      |
|---------|-----------------------|---------------|
| Admin   | admin@bup.edu.bd      | 1234          |
| Faculty | AZ@bup.edu.bd         | 1234          |
| Faculty | RAI@bup.edu.bd        | 1234          |
| Student | 23549009001           | 23549009001   |
| Student | (any roll number)     | (roll number) |

## Quick Start

### Backend
```bash
cd obe-tracker-backend
npm install
# Create .env with DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Web Frontend
Open `obe-tracker-web/index.html` directly in Chrome.
Backend must be running at localhost:3000.

## Attainment Model
Binary model — 60% threshold.
- CO Attained: student scores ≥ 60% of weighted marks across all assessments linked to that CO
- PO Attained: ≥ 60% of correlation-weighted COs mapped to that PO are individually attained
