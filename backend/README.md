# NO JESUS NO SWAG — Backend API

Node.js + Express + PostgreSQL + Prisma

## Setup

1. Install PostgreSQL and create a database:
   ```sql
   CREATE DATABASE njns_db;
   ```

2. Update `.env` with your actual database credentials.

3. Run Prisma migrations:
   ```
   npm run db:push
   ```

4. Start the development server:
   ```
   npm run dev
   ```

API runs at `http://localhost:4000`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/concerts | — | List upcoming concerts |
| GET | /api/concerts/:id | — | Single concert details |
| POST | /api/concerts | Admin JWT | Create a concert |
| POST | /api/tickets | JWT | Book a free ticket |
| GET | /api/tickets/my-tickets | JWT | Your tickets |
| DELETE | /api/tickets/:id | JWT | Cancel ticket |

## Auth

Send JWT in the Authorization header:
```
Authorization: Bearer <token>
```

## Example — Register

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jay","email":"jay@example.com","password":"password123"}'
```

## Example — Book a ticket

```bash
curl -X POST http://localhost:4000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"concertId":"<concert-uuid>"}'
```

## Make yourself Admin

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```
