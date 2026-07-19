# Folder Structure

## Repository Layout

```text
/
├─ README.md
├─ docs/
│  ├─ architecture.md
│  ├─ api-contracts.md
│  ├─ database-schema.md
│  └─ folder-structure.md
├─ backend/
│  ├─ src/
│  │  ├─ NurturedChoice.Api/
│  │  ├─ NurturedChoice.Application/
│  │  ├─ NurturedChoice.Domain/
│  │  └─ NurturedChoice.Infrastructure/
│  ├─ tests/
│  │  ├─ NurturedChoice.UnitTests/
│  │  └─ NurturedChoice.IntegrationTests/
│  └─ NurturedChoice.sln
└─ frontend/
   ├─ src/
   │  ├─ app/
   │  ├─ components/
   │  ├─ features/
   │  ├─ hooks/
   │  ├─ lib/
   │  ├─ routes/
   │  └─ styles/
   ├─ public/
   └─ index.html
```

## Backend Layout

- `Api`: controllers, middleware, auth, swagger, versioning
- `Application`: use cases, DTOs, validators, query services
- `Domain`: entities, aggregates, value objects, domain events
- `Infrastructure`: persistence, repositories, external services, migrations

## Frontend Layout

- `app`: providers, router shell, global layout
- `features`: business modules grouped by domain
- `components`: shared reusable UI pieces
- `lib`: utilities, API client, constants, helpers
- `routes`: route definitions and guards
- `styles`: tokens and global styling

