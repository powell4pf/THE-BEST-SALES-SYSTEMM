create table if not exists collection_follow_ups (
    id uuid primary key,
    parent_group_id uuid not null references parent_groups(id) on delete cascade,
    status varchar(40) not null default 'Not contacted',
    next_follow_up_date date null,
    last_contacted_at timestamptz null,
    last_contact_method varchar(40) null,
    notes varchar(2000) null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);
create unique index if not exists ux_collection_follow_ups_parent_group on collection_follow_ups(parent_group_id);
