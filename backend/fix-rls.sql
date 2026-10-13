alter table users disable row level security;
alter table concerts disable row level security;
alter table tickets disable row level security;

grant all on users to service_role;
grant all on concerts to service_role;
grant all on tickets to service_role;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
