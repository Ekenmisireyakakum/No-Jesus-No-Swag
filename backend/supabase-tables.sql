create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null default 'USER',
  created_at timestamptz default now()
);

create table if not exists concerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  description text,
  venue_name text not null,
  venue_address text not null,
  date_time timestamptz not null,
  total_capacity int not null,
  available_slots int not null,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  concert_id uuid not null references concerts(id) on delete cascade,
  qr_code_data text unique not null,
  status text not null default 'CONFIRMED',
  registered_at timestamptz default now(),
  unique(user_id, concert_id)
);
