-- Run this in your Supabase SQL Editor to grant admin role to your account.
-- Replace the email with your actual admin email address.

UPDATE users SET role = 'ADMIN' WHERE email = 'your-admin-email@example.com';
