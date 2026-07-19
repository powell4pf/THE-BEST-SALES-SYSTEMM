-- Reference data seed script for Nurtured Choice Products.

insert into app_roles (id, name, description, status, created_at, is_deleted)
values
('11111111-1111-1111-1111-111111111111', 'Super Administrator', 'Super Administrator role', 0, now(), false),
('22222222-2222-2222-2222-222222222222', 'Sales', 'Sales role', 0, now(), false),
('33333333-3333-3333-3333-333333333333', 'Accounts', 'Accounts role', 0, now(), false),
('44444444-4444-4444-4444-444444444444', 'Warehouse', 'Warehouse role', 0, now(), false),
('55555555-5555-5555-5555-555555555555', 'Viewer', 'Viewer role', 0, now(), false)
on conflict (name) do nothing;

insert into app_permissions (id, key, name, description, created_at, is_deleted)
values
(gen_random_uuid(), 'customers.view', 'View Customers', 'Can view parent groups and branches', now(), false),
(gen_random_uuid(), 'customers.manage', 'Manage Customers', 'Can create and edit customers', now(), false),
(gen_random_uuid(), 'products.view', 'View Products', 'Can view product catalog', now(), false),
(gen_random_uuid(), 'products.manage', 'Manage Products', 'Can create and edit products', now(), false),
(gen_random_uuid(), 'stock.view', 'View Stock', 'Can view inventory data', now(), false),
(gen_random_uuid(), 'stock.manage', 'Manage Stock', 'Can adjust stock and movements', now(), false),
(gen_random_uuid(), 'invoices.view', 'View Invoices', 'Can view invoices', now(), false),
(gen_random_uuid(), 'invoices.manage', 'Manage Invoices', 'Can create and finalize invoices', now(), false),
(gen_random_uuid(), 'statements.view', 'View Statements', 'Can view customer statements', now(), false),
(gen_random_uuid(), 'statements.manage', 'Manage Statements', 'Can generate statements', now(), false),
(gen_random_uuid(), 'creditnotes.view', 'View Credit Notes', 'Can view credit notes', now(), false),
(gen_random_uuid(), 'creditnotes.manage', 'Manage Credit Notes', 'Can create and issue credit notes', now(), false),
(gen_random_uuid(), 'reports.view', 'View Reports', 'Can view reports and dashboards', now(), false),
(gen_random_uuid(), 'settings.manage', 'Manage Settings', 'Can update company and system settings', now(), false),
(gen_random_uuid(), 'users.manage', 'Manage Users', 'Can manage users and roles', now(), false)
on conflict (key) do nothing;

insert into company_profiles (id, company_name, email, phone, address, country, currency_code, is_active, created_at, is_deleted)
values
('66666666-6666-6666-6666-666666666666', 'Nurtured Choice Products', 'info@nurturedchoice.co.ke', '+254700000000', 'Nairobi, Kenya', 'Kenya', 'KES', true, now(), false)
on conflict do nothing;

insert into invoice_number_settings (id, prefix, starting_number, padding, reset_policy, manual_editing_allowed, is_active, created_at, is_deleted)
values
('77777777-7777-7777-7777-777777777777', 'INV', 1, 6, 2, true, true, now(), false)
on conflict do nothing;

