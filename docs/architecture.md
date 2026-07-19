# System Architecture

## Guiding Principles

- Preserve historical financial data.
- Never hard-delete transactional records.
- Separate concerns cleanly across domain, application, infrastructure, and presentation layers.
- Make invoice and stock flows auditable end to end.
- Optimize for search, filtering, pagination, and traceability.

## High-Level Components

- Web client: React SPA for internal users and customer portal
- Public auth entry points: Google OAuth and token refresh
- API layer: ASP.NET Core REST API with versioning
- Application layer: use cases, validation, orchestration
- Domain layer: entities, value objects, invariants, business rules
- Infrastructure layer: EF Core, PostgreSQL, file storage, email, logging, integrations
- Reporting layer: export-ready queries for PDF and Excel generation

## Suggested Module Boundaries

- Identity and access control
- Customer management
- Product and catalog management
- Stock and inventory
- Invoicing
- Statements
- Credit notes
- Reports and analytics
- Settings and configuration
- Audit and activity tracking

## Request Flow

1. UI sends a typed request through TanStack Query or a form submission.
2. API controller accepts a DTO and passes it to an application use case.
3. Validator enforces input rules and business constraints.
4. Domain logic applies invariants such as uniqueness, totals, and state rules.
5. Repository or query service reads/writes via EF Core.
6. API returns standardized success or error envelopes.

## Security Model

- Google OAuth for sign-in
- JWT access tokens for API calls
- Refresh tokens for session continuity
- Role-based access control for protected routes
- Policy-based authorization for sensitive operations
- Input validation on client and server
- Soft delete on master data where historical integrity matters
- Audit trail for financial and inventory changes

## Performance Strategy

- Server-side pagination and filtering
- Proper indexing for customer, invoice, stock, and lookup fields
- Caching for stable reference data
- Code splitting and lazy loading on the frontend
- Query projection for list screens
- Background jobs for heavy exports and document generation

## UI Direction

- Premium enterprise look and feel
- Clean card-based layouts
- Dense but readable data tables
- Strong empty, loading, and error states
- Light and dark themes
- Keyboard-friendly workflows
- Fast global search and command actions

