create table if not exists product_images (
    id uuid primary key,
    product_id uuid not null references products(id) on delete cascade,
    file_name varchar(255) not null,
    url varchar(1000) not null,
    is_primary boolean not null default false,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create table if not exists stock_balances (
    id uuid primary key,
    product_id uuid not null references products(id) on delete cascade,
    branch_id uuid null references branches(id) on delete set null,
    quantity_on_hand numeric(18,2) not null default 0,
    reserved_quantity numeric(18,2) not null default 0,
    last_reconciled_at timestamptz not null default now(),
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create table if not exists stock_adjustments (
    id uuid primary key,
    product_id uuid not null references products(id) on delete restrict,
    branch_id uuid null references branches(id) on delete set null,
    previous_quantity numeric(18,2) not null,
    adjusted_quantity numeric(18,2) not null,
    reason varchar(500) not null,
    approved_by uuid null,
    notes varchar(1000) null,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create table if not exists credit_notes (
    id uuid primary key,
    credit_note_number varchar(100) not null,
    parent_group_id uuid not null references parent_groups(id) on delete restrict,
    branch_id uuid null references branches(id) on delete set null,
    invoice_id uuid null references invoices(id) on delete set null,
    credit_date date not null,
    reason varchar(500) null,
    total_amount numeric(18,2) not null default 0,
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

create table if not exists credit_note_items (
    id uuid primary key,
    credit_note_id uuid not null references credit_notes(id) on delete cascade,
    product_id uuid null references products(id) on delete set null,
    item_name varchar(255) not null,
    quantity numeric(18,2) not null,
    unit_price numeric(18,2) not null,
    line_total numeric(18,2) not null,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create table if not exists statements (
    id uuid primary key,
    statement_number varchar(100) not null,
    parent_group_id uuid not null references parent_groups(id) on delete restrict,
    period_start date not null,
    period_end date not null,
    opening_balance numeric(18,2) not null default 0,
    closing_balance numeric(18,2) not null default 0,
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

create table if not exists statement_lines (
    id uuid primary key,
    statement_id uuid not null references statements(id) on delete cascade,
    transaction_date date not null,
    description varchar(500) not null,
    debit numeric(18,2) not null default 0,
    credit numeric(18,2) not null default 0,
    balance numeric(18,2) not null default 0,
    source_document_type varchar(100) null,
    source_document_id uuid null,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create table if not exists payments (
    id uuid primary key,
    parent_group_id uuid not null references parent_groups(id) on delete restrict,
    branch_id uuid null references branches(id) on delete set null,
    payment_date date not null,
    amount numeric(18,2) not null,
    method varchar(100) not null,
    reference varchar(255) null,
    notes varchar(1000) null,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create table if not exists payment_allocations (
    id uuid primary key,
    payment_id uuid not null references payments(id) on delete cascade,
    invoice_id uuid null references invoices(id) on delete set null,
    statement_id uuid null references statements(id) on delete set null,
    amount numeric(18,2) not null,
    row_version bytea null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null
);

create index if not exists ix_credit_notes_parent_group on credit_notes(parent_group_id);
create index if not exists ix_credit_note_items_credit_note on credit_note_items(credit_note_id);
create index if not exists ix_payments_parent_group on payments(parent_group_id);
create index if not exists ix_payment_allocations_payment on payment_allocations(payment_id);
create index if not exists ix_statements_parent_group on statements(parent_group_id);
create index if not exists ix_statement_lines_statement on statement_lines(statement_id);
