# NO JESUS NO SWAG

A free rap and hip-hop concert event registration platform. Users register for the concert, get a digital ticket, and admins manage ticketing with seat and meal assignments.

## Features

- Event detail page with live countdown timer
- Free registration with name, email, phone, and role selection
- Admin dashboard — verify registrants, assign seats and meals, generate printable tickets with QR codes
- Backend REST API (Node.js + Express + Supabase)

## Tech Stack

- **Frontend** — HTML, CSS, Vanilla JavaScript
- **Backend** — Node.js, Express, Supabase (PostgreSQL)
- **Auth** — JWT (custom) + bcrypt
- **Database** — Supabase

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/no-jesus-no-swag.git
cd no-jesus-no-swag
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Fill in your Supabase URL and service role key in .env
npm install
npm run dev
```

### 3. Frontend setup

Open `index.html` with a local server (e.g. VS Code Live Server or `serve`).

Update `api.js` with your backend URL if deployed.

### 4. Database

Run the SQL files in your Supabase SQL Editor in this order:

1. `backend/supabase-tables.sql`
2. `backend/backend/add-columns.sql`
3. `backend/admin-columns.sql`
4. `backend/fix-rls.sql`
5. `backend/make-admin.sql` (update email first)

## Environment Variables

```
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
PORT=4000
```

Never commit your `.env` file.
