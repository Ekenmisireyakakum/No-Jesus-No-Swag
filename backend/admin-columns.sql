alter table tickets add column if not exists seat_number text;
alter table tickets add column if not exists meal_option text;
alter table tickets add column if not exists issued_by_admin boolean default false;
alter table tickets add column if not exists issued_at timestamptz;

alter table users add column if not exists phone text;
alter table users add column if not exists interest text;
