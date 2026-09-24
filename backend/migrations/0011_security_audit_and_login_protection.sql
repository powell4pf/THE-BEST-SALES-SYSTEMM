alter table app_users
    add column if not exists failed_login_attempts integer not null default 0,
    add column if not exists locked_until timestamptz null;

create table if not exists security_audit_logs (
    id uuid primary key,
    user_id uuid null,
    target_user_id uuid null,
    event_type varchar(60) not null,
    email varchar(150) null,
    ip_address varchar(80) null,
    user_agent varchar(500) null,
    details varchar(1000) null,
    succeeded boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists ix_security_audit_logs_created_at on security_audit_logs(created_at desc);
create index if not exists ix_security_audit_logs_user_id on security_audit_logs(user_id);
create index if not exists ix_security_audit_logs_target_user_id on security_audit_logs(target_user_id);
