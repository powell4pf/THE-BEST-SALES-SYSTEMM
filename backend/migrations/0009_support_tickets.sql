create table if not exists support_tickets (
    id uuid primary key,
    ticket_number varchar(24) not null,
    app_user_id uuid not null,
    assigned_to_id uuid null,
    subject varchar(180) not null,
    description varchar(5000) not null,
    category varchar(40) not null default 'Issue',
    priority varchar(20) not null default 'Normal',
    status varchar(30) not null default 'Submitted',
    last_activity_at timestamptz not null default now(),
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create unique index if not exists ux_support_tickets_number on support_tickets(ticket_number);
create index if not exists ix_support_tickets_user_activity on support_tickets(app_user_id, last_activity_at desc);

create table if not exists support_ticket_messages (
    id uuid primary key,
    support_ticket_id uuid not null references support_tickets(id) on delete cascade,
    app_user_id uuid not null,
    body varchar(5000) not null,
    message_type varchar(30) not null default 'Reply',
    is_internal boolean not null default false,
    previous_status varchar(30) null,
    new_status varchar(30) null,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create index if not exists ix_support_ticket_messages_ticket_created on support_ticket_messages(support_ticket_id, created_at);
