create table if not exists audit_logs (
    "Id" uuid primary key,
    "UserId" uuid null references app_users(id) on delete set null,
    "Action" varchar(30) not null,
    "EntityName" varchar(150) not null,
    "EntityId" uuid not null,
    "Changes" jsonb not null,
    "CreatedAt" timestamptz not null default now()
);

create index if not exists ix_audit_logs_entity on audit_logs("EntityName", "EntityId", "CreatedAt");
create index if not exists ix_audit_logs_user on audit_logs("UserId");
