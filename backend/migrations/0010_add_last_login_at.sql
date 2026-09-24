alter table app_users
    add column if not exists last_login_at timestamptz null;
