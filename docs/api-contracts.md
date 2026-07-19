# API Contracts

## API Style

- RESTful JSON endpoints
- Versioned base path, for example `/api/v1`
- Standard pagination and filtering
- Consistent error envelope
- DTOs for every request and response boundary

## Authentication

- `POST /auth/google`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Users and Access

- `GET /users`
- `POST /users`
- `GET /users/{id}`
- `PUT /users/{id}`
- `DELETE /users/{id}`
- `GET /roles`
- `GET /permissions`

## Customers

- `GET /parent-groups`
- `POST /parent-groups`
- `GET /parent-groups/{id}`
- `PUT /parent-groups/{id}`
- `DELETE /parent-groups/{id}`
- `GET /parent-groups/{id}/branches`
- `POST /parent-groups/{id}/branches`
- `GET /branches/{id}`
- `PUT /branches/{id}`
- `DELETE /branches/{id}`

## Products

- `GET /products`
- `POST /products`
- `GET /products/{id}`
- `PUT /products/{id}`
- `DELETE /products/{id}`

## Stock

- `GET /stock/dashboard`
- `GET /stock/movements`
- `POST /stock/adjustments`
- `GET /stock/low-alerts`

## Invoices

- `GET /invoices`
- `POST /invoices`
- `GET /invoices/{id}`
- `PUT /invoices/{id}`
- `POST /invoices/{id}/finalize`
- `POST /invoices/{id}/print`
- `GET /invoices/{id}/pdf`

## Statements and Credit Notes

- `GET /statements`
- `POST /statements`
- `GET /statements/{id}/pdf`
- `GET /credit-notes`
- `POST /credit-notes`
- `GET /credit-notes/{id}/pdf`

## Reports

- `GET /reports/sales/monthly`
- `GET /reports/sales/annual`
- `GET /reports/customers/{id}/sales`
- `GET /reports/products`
- `GET /reports/inventory`
- `GET /reports/stock-movements`
- `GET /reports/outstanding-balances`
- `GET /reports/top-products`

## Settings

- `GET /settings/company-profile`
- `PUT /settings/company-profile`
- `GET /settings/invoice-number`
- `PUT /settings/invoice-number`
- `GET /settings/theme`
- `PUT /settings/theme`

