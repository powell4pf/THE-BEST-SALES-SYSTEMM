-- Supporting indexes for dashboard, activity, stock, and notification reads.
-- All statements are idempotent so deployment is safe on existing databases.
create index if not exists ix_invoices_dashboard_date_status_deleted
    on invoices (invoice_date, status, is_deleted);

create index if not exists ix_invoices_created_at_active
    on invoices (created_at desc)
    where is_deleted = false;

create index if not exists ix_stock_movements_created_at_active
    on stock_movements (created_at desc)
    where is_deleted = false;
