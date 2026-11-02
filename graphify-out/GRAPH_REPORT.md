# Graph Report - RGDev.App.FlujoEfectivo  (2026-11-01)

## Corpus Check
- 57 files · ~63,113 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 302 nodes · 603 edges · 18 communities (10 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Income and Expense Views
- Package Dependencies
- Auth and Database Backend API
- UI Components and Main App
- Docker Infrastructure
- Database Backup Services
- TypeScript Configuration
- NPM Build Scripts
- Error Handling Components
- Vercel Deployment Config
- Movimientos API Endpoints
- Proyectos API Endpoints
- PNPM Workspace Config
- Vite Environment Types
- Production Backup Script
- Local Restore Script

## God Nodes (most connected - your core abstractions)
1. `react` - 20 edges
2. `lucide-react` - 18 edges
3. `formatearMoneda()` - 17 edges
4. `compilerOptions` - 16 edges
5. `getDbPool()` - 15 edges
6. `AppContent()` - 14 edges
7. `LibroCajaView()` - 13 edges
8. `scripts` - 12 edges
9. `@vercel/node` - 11 edges
10. `Transaccion` - 11 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `getDbPool()`  [EXTRACTED]
  api/auth/[...auth].ts → api/db.ts
- `handler()` --calls--> `getDbPool()`  [EXTRACTED]
  api/configuracion.ts → api/db.ts
- `handler()` --calls--> `getDbPool()`  [EXTRACTED]
  api/health.ts → api/db.ts
- `handler()` --calls--> `getDbPool()`  [EXTRACTED]
  api/usuarios.ts → api/db.ts
- `AppContent()` --calls--> `CapturaIngresosView()`  [EXTRACTED]
  src/App.tsx → src/components/CapturaIngresosView.tsx

## Import Cycles
- None detected.

## Communities (18 total, 8 thin omitted)

### Community 0 - "Income and Expense Views"
Cohesion: 0.12
Nodes (41): CapturaIngresosProps, CapturaIngresosView(), CATEGORIAS_GASTOS_DISPONIBLES, CATEGORIAS_INGRESOS_DISPONIBLES, formatearMesAnio(), LibroCajaProps, LibroCajaView(), ModalConfirmacion() (+33 more)

### Community 1 - "Package Dependencies"
Cohesion: 0.06
Nodes (45): dependencies, @auth/core@^0.41.3, bcryptjs@^3.0.3, busboy@^1.6.0, clsx@^2.1.1, lucide-react@^1.16.0, react@^18.3.1, react-dom@^18.3.1 (+37 more)

### Community 2 - "Auth and Database Backend API"
Cohesion: 0.09
Nodes (24): authConfig, handler(), handler(), getDbPool(), handler(), handler(), sanitizeUUID(), handler() (+16 more)

### Community 3 - "UI Components and Main App"
Cohesion: 0.12
Nodes (29): lucide-react, react, App(), AppContent(), AuthView(), AuthViewProps, DashboardView(), DashboardViewProps (+21 more)

### Community 4 - "Docker Infrastructure"
Cohesion: 0.06
Nodes (30): build, container_name, depends_on, environment, ports, restart, volumes, context (+22 more)

### Community 5 - "Database Backup Services"
Cohesion: 0.11
Nodes (16): pg@^8.23.0, pg, __dirname, escapeSqlValue(), exportarBaseDeDatos(), __filename, main(), parseConnectionString() (+8 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 7 - "NPM Build Scripts"
Cohesion: 0.17
Nodes (12): scripts, backup:r2, build, dev, dev:local, docker:backup, docker:db, docker:down (+4 more)

### Community 9 - "Vercel Deployment Config"
Cohesion: 0.40
Nodes (4): buildCommand, framework, outputDirectory, rewrites

### Community 12 - "PNPM Workspace Config"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, packages

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `UI Components and Main App` to `Income and Expense Views`, `Package Dependencies`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Should `Income and Expense Views` be split into smaller, more focused modules?**
  _Cohesion score 0.1204644412191582 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `UI Components and Main App` to `Income and Expense Views`, `Package Dependencies`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05851063829787234 - nodes in this community are weakly interconnected._
- **Why does `@aws-sdk/client-s3` connect `Auth and Database Backend API` to `Package Dependencies`, `Database Backup Services`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `Auth and Database Backend API` be split into smaller, more focused modules?**
  _Cohesion score 0.0859465737514518 - nodes in this community are weakly interconnected._
- **Should `UI Components and Main App` be split into smaller, more focused modules?**
  _Cohesion score 0.11829268292682926 - nodes in this community are weakly interconnected._