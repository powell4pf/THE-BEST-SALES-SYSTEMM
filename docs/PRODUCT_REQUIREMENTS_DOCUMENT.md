# Product Requirements Document

## Nurtured Choice Sales & Distribution System

**Document status:** Baseline for the system as implemented
**Prepared:** 21 September 2026
**Source of truth:** The frontend and backend source in this repository. Where the code and older planning documents disagree, this document follows the code.
**Audience:** Product owner, operations, finance, warehouse, sales, support, and engineering teams.

## 1. Product summary

Nurtured Choice Sales & Distribution System is an internal, browser-based business application for managing customers, products, invoices, inventory visibility, receivables, collections, and operational reporting for Nurtured Choice Products. It is intended for a Kenyan operating context and displays monetary values in Kenyan shillings (KES).

The system supports the commercial record from customer setup through invoicing, payment capture, statement generation, collections follow-up, and reporting. It also provides delivery notes, credit notes, notifications, support tickets, a customer-account workspace, and basic offline draft recovery.

## 2. Problem and intended outcomes

Teams need one controlled workspace instead of fragmented customer lists, manual invoices, stock spreadsheets, and disconnected receivables follow-up. The product must make customer and financial records easy to find, preserve the state of invoices, expose outstanding balances, and give authorised users only the actions relevant to their role.

The intended outcomes are:

- A single maintained customer and product catalogue.
- Faster, consistently numbered invoice creation and review.
- Clear visibility of stock quantity, valuation, movement history, and low-stock exposure.
- Receivables visibility through payments, customer statements, ageing, and collections follow-ups.
- Reusable, exportable report tables for commercial and inventory decisions.
- Controlled access, auditable timestamps, recoverable user sessions, and usable behaviour during intermittent connectivity.

## 3. Users and access model

All workspace routes require a signed-in user. The API authorises actions using permissions linked to roles, rather than relying solely on whether a user can see a menu item.

| Role | Intended access posture |
|---|---|
| Super Administrator, Administrator, CEO | All seeded permissions, including user and configuration management. |
| Sales | Customer, product, invoice, statement, and reporting work needed for sales operations. |
| Accounts | Invoices, statements, credit notes, reports, and configured settings. |
| Warehouse | Stock, products, and inventory-related reports. |
| Viewer, Tester | Broad non-destructive access; delete, user management, system settings, and support management are withheld. |

Permission names define the enforceable actions: `customers`, `products`, `stock`, `invoices`, `statements`, `creditnotes`, `deliverynotes`, `payments`, `reports`, `settings`, `users`, `notifications`, and `support`, with `view`, `manage`, or `delete` variants where applicable. User deletion has an additional server-side role check: only Super Administrator, CEO, and Administrator can archive an account. The final permissions assigned to a user are database data, so administrators must treat role configuration as a controlled operational change.

## 4. Functional requirements

### 4.1 Identity and session management

- Users can register with display name, email, password, password confirmation, and an optional phone number.
- Users can sign in with email/password or Google identity token, sign out, and retrieve their current profile and roles.
- The browser retains access and refresh tokens locally, restores a non-expired session, and refreshes the displayed user profile from the API.
- Access tokens expire after the configured lifetime (60 minutes by default); refresh tokens have a configured lifetime (30 days by default).
- Authentication endpoints are rate limited to 30 requests per minute per client IP.

### 4.2 Customer management

- Users with customer-view access can list, search, and inspect parent customer groups.
- Authorised users can create, update, and delete parent groups, and create branches beneath a parent group.
- Customer details support the customer portal/workspace, invoice association, payments, statements, and collections.
- A branch belongs to a parent group; commercial documents identify the relevant customer and, where supplied, branch.

### 4.3 Product catalogue and inventory visibility

- Users can list, search, create, update, and delete products subject to their permissions.
- Product data includes stock-related values, purchase price, minimum stock, and identifiers used by the product experience. The web client includes barcode-scanning support.
- The stock dashboard shows product count, units on hand, purchase-cost inventory value, low-stock count, and recent stock movements.
- Reports provide inventory valuation, stock movement history, and inventory ageing. Stock history records movement type, quantity, unit cost, optional branch/source-document reference, and notes.

- Authorised warehouse and administrative users can set a verified quantity on hand with a reason and optional notes. The system stores the adjustment, updates the product's stock quantity, records the resulting movement, and keeps the unbranched stock balance aligned in one transaction.
- Users with stock-view permission can retrieve paginated stock movement history through the API; the stock page shows the latest movements and provides the adjustment workflow to authorised roles.

### 4.4 Invoicing

- An authorised user can list and search invoices, open an invoice, create a draft, edit a draft, finalise a draft, and delete an invoice when authorised.
- An invoice contains an invoice number, optional LPO number, invoice date, customer, branch, salesperson, payment terms, optional due date, notes, status, and one or more line items.
- Each line stores product reference when supplied, description, quantity, unit price, and a calculated line total. Current invoice calculations use quantity × unit price; item-level tax and discount are not persisted or calculated.
- A finalised invoice is read-only through the update endpoint. Draft is the initial state; finalisation changes its status to Finalized.
- An omitted invoice number is generated from active invoice-number settings (prefix, starting number, padding). A manually supplied number must be unique among active invoices.
- Creating an invoice creates an in-app notification for the acting user.

**Important data-integrity limitation:** invoice deletion is a permanent database delete and clears payment-allocation/credit-note links to the invoice. It must therefore be limited to a documented correction workflow; it is not a financial-record retention mechanism.

### 4.5 Payments, customer statements, and collections

- Users can list payments, record a payment, and delete a payment if they hold the relevant permission.
- Payments may be allocated to invoices; the accounts-receivable ageing report subtracts non-deleted allocations from non-draft, non-cancelled invoices.
- Users with statement-management permission can generate a customer statement for a selected inclusive date range. The result includes opening balance, transaction lines, and closing balance; the UI supports printing.
- The Collections workspace presents receivables follow-up information and permits an authorised user to store per-customer follow-up status, date, contact method, notes, and contact timestamp.
- The reports area includes accounts-receivable ageing and payment history.

### 4.6 Credit notes and delivery notes

- Authorised users can list, inspect, create, update, and delete credit notes and delivery notes.
- Each module provides a generated next document number, records the customer and relevant line items, and raises an in-app notification on creation.
- Credit notes can reference an invoice. Delivery notes record delivery date, customer, optional branch, notes, status, and items.

### 4.7 Reporting and dashboard

- The dashboard supplies summary, custom period, sales trend, product performance, customer revenue, and recent activity views.
- The reporting API provides: sales by customer, product, and salesperson; inventory valuation; stock movement history; inventory ageing; payment history; and accounts-receivable ageing.
- Report tables are structured as columns and rows and can be exported by the frontend as CSV. The client also supports print-oriented document output for selected business views.

### 4.8 Operational experience

- The responsive React application includes protected routes, loading/error states, light/dark theme, command palette, onboarding tour, system-health page, support workspace, notifications, and a month-end reminder experience.
- Support tickets permit an authenticated user to create, list, read, update, and message tickets. Ticket access is scoped by the service to the requesting user unless an authorised support workflow permits otherwise.
- A month-end automation endpoint creates one reminder per active user on the last calendar day of the month in the Africa/Nairobi time zone. It requires a configured shared automation key in the request header.
- The app is installable as a progressive web app. It caches the application shell and can cache selected API values in IndexedDB for up to seven days. It queues failed invoice, payment, and stock requests as browser-local drafts for manual replay/synchronisation.

**Offline limitation:** the server does not implement conflict resolution, idempotency keys, or automatic background reconciliation. A queued change can fail when replayed and must be reviewed by the user.

## 5. Core business rules

| Area | Implemented rule |
|---|---|
| Pagination | The API accepts page, page size, and optional search; page size is clamped to 1–200. |
| Invoice editing | Only Draft invoices can be updated. |
| Invoice totals | Subtotal is the sum of quantity × unit price; discount and tax totals are currently zero; grand total is the sum of line totals. |
| Invoice numbering | Default format is `INV-` plus six padded digits; active configuration may change prefix, start, and padding. |
| Receivables ageing | Uses due date, or invoice date if no due date exists; buckets are current, 1–30, 31–60, 61–90, and 91+ days. |
| Product low stock | A product is low stock when current stock is less than or equal to its minimum stock. |
| Notification/read state | Notifications and month-end reminders are stored per user and can be marked read. |

## 6. Non-functional requirements

| Category | Requirement and current implementation |
|---|---|
| Security | JWT bearer authentication, refresh tokens, server-enforced role/permission checks, ASP.NET Identity password hashing, Google token validation, restrictive CORS configuration, and security response headers. |
| Availability | API health endpoint at `/api/v1/health`; Docker Compose waits for PostgreSQL health before starting the API. |
| Performance | Database queries use server-side paging for the common paged services; the UI lazy-loads pages. Some report endpoints intentionally cap result rows at 1,000. |
| Auditability | Business entities contain created/updated/deleted audit fields and row-version fields; stock movements preserve inventory events. Actual coverage varies by operation and is not an immutable audit ledger. |
| Data quality | Unique database indexes protect document numbers and selected entities. Validations and error messages are enforced at service/API boundaries where implemented. |
| Usability | Responsive SPA, visual feedback, printing/export, dark mode, mobile navigation, camera permission for barcode scanning, and offline draft UI. |
| Deployability | Container images for frontend and API, PostgreSQL 16, SQL migration runner, reference-data seeding, and environment-based configuration. |

## 7. Explicit exclusions and follow-up decisions

The following must not be represented as delivered features without further implementation and acceptance:

- No direct PDF-generation API endpoints for invoices, credit notes, or statements are currently implemented; printing is client-side.
- No email delivery, file-storage integration, background job worker, or external accounting/ERP integration is implemented.
- No public stock-adjustment, low-stock-alert, or stock-movement list API is exposed, despite older planning documentation mentioning them.
- No customer-facing unauthenticated portal is implemented; `/portal` is a protected internal workspace.
- No multi-tenancy, multi-currency accounting, tax calculation, purchase orders, supplier management, dispatch optimisation, or general ledger is implemented.
- No automated reconciliation or conflict policy exists for offline drafts.
- Deletion and retention requirements for financial documents need a business decision before production use because permanent deletion exists in the current implementation.

## 8. Acceptance criteria for a production release

1. A user in each role can perform only the permitted actions, verified with role-based automated tests.
2. A user can create, edit, finalise, retrieve, and report on invoices without miscalculating totals or duplicating a number under concurrent use.
3. A payment allocation changes the receivables ageing total correctly, and a customer statement reconciles to its underlying transactions.
4. Product changes and existing opening stock produce intelligible inventory value and movement history.
5. Database migrations run cleanly on a new PostgreSQL instance and on the supported upgrade paths.
6. Production configuration supplies non-placeholder database, JWT, host, CORS, Google OAuth, and automation secrets; no secret is committed to the repository.
7. The deployed frontend can reach the configured API, the health check reports healthy, and authenticated CORS requests work only from approved origins.
8. The business owner signs off on invoice/credit-note/payment deletion, numbering, tax, and retention policies.

## 9. Traceability and document maintenance

This is a living baseline, not a substitute for stakeholder approval. Update it with every material product change and record a version/date. The main implementation evidence is in `frontend/src/routes/AppRoutes.tsx`, `frontend/src/lib/api.ts`, `backend/src/NurturedChoice.Api/Controllers`, `backend/src/NurturedChoice.Infrastructure/Services`, `backend/src/NurturedChoice.Infrastructure/Persistence`, and `backend/migrations`.
