-- Initial PostgreSQL schema baseline for Nurtured Choice Products.
-- This script mirrors the EF Core model and can be used as the starting migration.

create extension if not exists pgcrypto;

create table if not exists parent_groups (
    id uuid primary key,
    company_name varchar(200) not null,
    contact_person varchar(150),
    email varchar(150),
    phone varchar(50),
    address varchar(300),
    kra_pin varchar(50),
    credit_limit numeric(18,2) not null default 0,
    status integer not null default 0,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_parent_groups_company_name on parent_groups (company_name);

create table if not exists branches (
    id uuid primary key,
    parent_group_id uuid not null references parent_groups(id) on delete restrict,
    branch_name varchar(200) not null,
    address varchar(300),
    contact_person varchar(150),
    email varchar(150),
    phone varchar(50),
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_branches_parent_group_branch_name on branches (parent_group_id, branch_name);

create table if not exists products (
    id uuid primary key,
    sku varchar(80) not null,
    barcode varchar(80),
    product_name varchar(200) not null,
    category varchar(120),
    description varchar(1000),
    buying_price numeric(18,2) not null default 0,
    selling_price numeric(18,2) not null default 0,
    unit varchar(40) not null default 'pcs',
    current_stock numeric(18,3) not null default 0,
    minimum_stock numeric(18,3) not null default 0,
    status integer not null default 0,
    image_url varchar(500),
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_products_sku on products (sku);
create unique index if not exists ux_products_barcode on products (barcode);

create table if not exists invoice_number_settings (
    id uuid primary key,
    prefix varchar(20) not null default 'INV',
    starting_number bigint not null default 1,
    padding integer not null default 6,
    reset_policy integer not null default 2,
    manual_editing_allowed boolean not null default true,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create table if not exists invoice_number_sequences (
    id uuid primary key,
    sequence_key varchar(100) not null,
    current_number bigint not null default 0,
    period_start date null,
    period_end date null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_invoice_number_sequences_sequence_key on invoice_number_sequences (sequence_key);

create table if not exists invoices (
    id uuid primary key,
    invoice_number varchar(40) not null,
    lpo_number varchar(80),
    invoice_date date not null,
    parent_group_id uuid not null references parent_groups(id) on delete restrict,
    branch_id uuid not null references branches(id) on delete restrict,
    salesperson varchar(150),
    payment_terms varchar(200),
    due_date date null,
    discount_total numeric(18,2) not null default 0,
    tax_total numeric(18,2) not null default 0,
    subtotal numeric(18,2) not null default 0,
    grand_total numeric(18,2) not null default 0,
    notes varchar(2000),
    status integer not null default 0,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_invoices_invoice_number on invoices (invoice_number);
create index if not exists ix_invoices_parent_group_id_invoice_date on invoices (parent_group_id, invoice_date);
create index if not exists ix_invoices_branch_id_invoice_date on invoices (branch_id, invoice_date);

create table if not exists invoice_items (
    id uuid primary key,
    invoice_id uuid not null references invoices(id) on delete cascade,
    product_id uuid null references products(id) on delete restrict,
    item_name varchar(200) not null,
    item_description varchar(1000),
    quantity numeric(18,3) not null default 0,
    unit_price numeric(18,2) not null default 0,
    discount numeric(18,2) not null default 0,
    tax numeric(18,2) not null default 0,
    line_total numeric(18,2) not null default 0,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create index if not exists ix_invoice_items_invoice_id_product_id on invoice_items (invoice_id, product_id);

create table if not exists stock_movements (
    id uuid primary key,
    product_id uuid not null references products(id) on delete restrict,
    branch_id uuid null references branches(id) on delete restrict,
    movement_type integer not null,
    quantity numeric(18,3) not null default 0,
    unit_cost numeric(18,2) not null default 0,
    source_document_type varchar(100),
    source_document_id uuid null,
    notes varchar(1000),
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create index if not exists ix_stock_movements_product_branch_created on stock_movements (product_id, branch_id, created_at);

create table if not exists app_users (
    id uuid primary key,
    email varchar(150) not null,
    display_name varchar(150) not null,
    phone_number varchar(50),
    google_subject varchar(150),
    password_hash varchar(500),
    is_email_verified boolean not null default false,
    status integer not null default 0,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_app_users_email on app_users (email);

create table if not exists app_roles (
    id uuid primary key,
    name varchar(100) not null,
    description varchar(300),
    status integer not null default 0,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_app_roles_name on app_roles (name);

create table if not exists app_permissions (
    id uuid primary key,
    key varchar(150) not null,
    name varchar(150) not null,
    description varchar(300),
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_app_permissions_key on app_permissions (key);

create table if not exists app_user_roles (
    id uuid primary key,
    app_user_id uuid not null references app_users(id) on delete cascade,
    app_role_id uuid not null references app_roles(id) on delete cascade,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_app_user_roles_user_role on app_user_roles (app_user_id, app_role_id);

create table if not exists app_role_permissions (
    id uuid primary key,
    app_role_id uuid not null references app_roles(id) on delete cascade,
    app_permission_id uuid not null references app_permissions(id) on delete cascade,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_app_role_permissions_role_permission on app_role_permissions (app_role_id, app_permission_id);

create table if not exists refresh_tokens (
    id uuid primary key,
    app_user_id uuid not null references app_users(id) on delete cascade,
    token varchar(500) not null,
    expires_at timestamptz not null,
    revoked_at timestamptz null,
    replaced_by_token varchar(500) null,
    created_by_ip varchar(100) null,
    revoked_by_ip varchar(100) null,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_refresh_tokens_token on refresh_tokens (token);

create table if not exists company_profiles (
    id uuid primary key,
    company_name varchar(200) not null,
    logo_url varchar(500),
    email varchar(150),
    phone varchar(50),
    address varchar(300),
    country varchar(100),
    currency_code varchar(10) not null default 'KES',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create table if not exists system_settings (
    id uuid primary key,
    setting_key varchar(150) not null,
    setting_value varchar(4000) not null,
    description varchar(500),
    is_sensitive boolean not null default false,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz null,
    updated_by uuid null,
    is_deleted boolean not null default false,
    deleted_at timestamptz null,
    deleted_by uuid null,
    row_version bytea null
);

create unique index if not exists ux_system_settings_setting_key on system_settings (setting_key);

