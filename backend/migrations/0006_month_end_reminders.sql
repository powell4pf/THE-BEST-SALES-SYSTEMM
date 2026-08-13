create table if not exists month_end_reminders (
    id uuid primary key,
    app_user_id uuid not null references app_users(id) on delete cascade,
    period_key varchar(7) not null,
    title varchar(160) not null,
    message varchar(1000) not null,
    read_at timestamptz null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);
create unique index if not exists ux_month_end_reminders_user_period on month_end_reminders(app_user_id, period_key);
create index if not exists ix_month_end_reminders_user_unread on month_end_reminders(app_user_id, read_at) where read_at is null;
