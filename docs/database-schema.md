# Database Schema

## Design Goals

- Fully normalized where practical.
- Keep transactional history immutable.
- Support multi-branch customers.
- Support invoice numbering rules with admin configurability.
- Track audit data for business-critical changes.

## Core Tables

### Identity

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `refresh_tokens`

### Customers

- `parent_groups`
- `branches`

### Products and Inventory

- `products`
- `product_images`
- `stock_balances`
- `stock_movements`
- `stock_adjustments`

### Invoicing

- `invoices`
- `invoice_items`
- `invoice_number_sequences`
- `invoice_number_settings`

### Financial Records

- `statements`
- `statement_lines`
- `credit_notes`
- `credit_note_items`
- `payments`
- `payment_allocations`

### Reporting and Audit

- `audit_logs`
- `activity_logs`
- `system_settings`
- `company_profiles`
- `integration_settings`

## Key Relationships

- A parent group has many branches.
- A parent group has many invoices.
- A branch belongs to one parent group.
- An invoice belongs to one parent group and one branch.
- An invoice has many invoice items.
- A product can appear on many invoice items and credit note items.
- Stock movements reference products and optionally source documents.
- Statements summarize financial activity over a date range.
- Credit notes reference invoices when applicable.

## Important Constraints

- Invoice numbers must be unique.
- Product SKUs and barcodes should be unique when present.
- Branches should not exist without a parent group.
- Financial and stock documents should be soft deleted or locked rather than removed.
- Totals should be stored with decimals using sufficient precision.
- Foreign keys should preserve historical references even if the parent entity becomes inactive.

## Recommended Indexes

- `parent_groups(company_name)`
- `branches(parent_group_id, branch_name)`
- `products(sku)`
- `products(barcode)`
- `invoices(invoice_number)`
- `invoices(parent_group_id, invoice_date)`
- `invoices(branch_id, invoice_date)`
- `stock_movements(product_id, movement_date)`
- `credit_notes(credit_note_number)`

## Audit Fields

Every transactional table should carry:

- `id`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`
- `is_deleted`
- `deleted_at`
- `deleted_by`
- `row_version`

## Invoice Numbering Rules

- Support configurable prefix, start value, padding, and reset policy.
- Allow manual entry before finalization when enabled.
- Enforce uniqueness at the database level.
- Advance the automatic sequence to the next safe value after any manual override.

