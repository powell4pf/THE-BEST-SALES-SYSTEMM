# Production readiness checklist

- Apply every SQL file in `backend/migrations` in filename order.
- Keep `NURTURED_CHOICE_CONNECTION_STRING`, JWT signing keys, and OAuth secrets outside source control.
- Schedule `backend/scripts/backup-database.ps1` daily and test restores monthly.
- Restrict CORS to the deployed frontend origin and run the API behind HTTPS.
- Expose `/api/v1/health` for container/load-balancer checks.
- Review `audit_logs` regularly; business writes record actor, action, entity, and before/after values.
- Build the frontend with `VITE_API_BASE_URL` set to the deployed API URL and preserve SPA fallback routing.
- Test each role's permitted and forbidden actions before handover.
- Test invoice creation/finalization, payment allocation, credit notes, statements, reports, printing, and restore procedures.

## Railway deployment

Deploy `backend` and `frontend` as separate Railway services using their Dockerfiles. Configure the backend with `ConnectionStrings__DefaultConnection`, `Jwt__SigningKey`, `AllowedHosts`, `Cors__AllowedOrigins__0`, `ASPNETCORE_ENVIRONMENT=Production`, and `ASPNETCORE_URLS=http://+:${{PORT}}`. Configure the frontend build with `VITE_API_BASE_URL` set to the public backend URL.

The API health endpoint is `/api/v1/health`; the frontend nginx image includes SPA fallbacks for direct navigation to application routes. The Windows auto-start scripts are for the office computer only and are not part of the Railway deployment.
