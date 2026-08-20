create table if not exists delivery_notes (
    id uuid primary key,
    delivery_note_number varchar(100) not null,
    parent_group_id uuid not null references parent_groups(id) on delete restrict,
    branch_id uuid null references branches(id) on delete set null,
    delivery_date date not null,
    notes varchar(2000) null,
    status integer not null default 0,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create unique index if not exists ux_delivery_notes_number on delivery_notes(delivery_note_number);
create index if not exists ix_delivery_notes_parent_group_date on delivery_notes(parent_group_id, delivery_date);

create table if not exists delivery_note_items (
    id uuid primary key,
    delivery_note_id uuid not null references delivery_notes(id) on delete cascade,
    product_id uuid null references products(id) on delete set null,
    item_name varchar(255) not null,
    quantity numeric(18,3) not null,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create index if not exists ix_delivery_note_items_delivery_note on delivery_note_items(delivery_note_id);
