# 📋 Registro Técnico de Cambios

> Documento generado automáticamente con cada commit realizado en el proyecto.
> Contiene el detalle técnico completo de cada cambio para el equipo de desarrollo.

---

## fix: Resolver error de compilación en Vercel estandarizando gestor de paquetes con NPM

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-28 19:12:00 |
| **Autor** | David Méndez |
| **Branch** | main |
| **Tipo** | Bug Fix / CI/CD Deployment |

### Archivos Modificados

| Archivo | Estado | Descripción del Cambio |
|---------|--------|----------------------|
| `package.json` | Modificado | Declaración explícita de `packageManager: npm@11.16.0` para obligar a Vercel a usar NPM |
| `pnpm-lock.yaml` | Eliminado | Eliminación del lockfile desactualizado de pnpm que provocaba `ERR_PNPM_OUTDATED_LOCKFILE` en Vercel |
| `pnpm-workspace.yaml` | Eliminado | Remoción de configuración innecesaria de workspace para unificar gestión en NPM |

### Detalle Técnico

Durante el despliegue automático en Vercel, el pipeline de CI/CD detectó la presencia de `pnpm-lock.yaml` e intentó ejecutar `pnpm install --frozen-lockfile`. Dado que las dependencias agregadas recientemente (`@aws-sdk/client-s3`, `busboy`, `pg`, `@vercel/node`, etc.) se habían gestionado e instalado con `npm` actualizando exclusivamente `package-lock.json`, `pnpm` abortó el build con el error `ERR_PNPM_OUTDATED_LOCKFILE`.

Se resolvieron los siguientes puntos:
1. Se removieron los archivos residuales de pnpm (`pnpm-lock.yaml` y `pnpm-workspace.yaml`).
2. Se fijó en `package.json` el motor `"packageManager": "npm@11.16.0"`.
3. Se verificó la consistencia y actualización completa de `package-lock.json`.
4. El pipeline de Vercel ahora ejecutará directamente `npm install` sin discrepancias de lockfile.

---

## feat: Inicialización y puesta en producción del Sistema de Flujo de Efectivo Eclesiástico

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-28 10:16:00 |
| **Autor** | David Méndez |
| **Branch** | main |
| **Tipo** | Feature / Initial Release |

### Archivos Modificados

| Archivo | Estado | Descripción del Cambio |
|---------|--------|----------------------|
| `src/App.tsx` | Agregado | Componente raíz que coordina vistas, modales y sincronización asíncrona con Aiven |
| `src/main.tsx` | Agregado | Punto de entrada de React 18 con StrictMode |
| `src/index.css` | Agregado | Estilos globales, directivas de Tailwind y estilos optimizados para impresión pastoral |
| `src/types/index.ts` | Agregado | Definiciones e interfaces TypeScript para transacciones, pactos, proyectos y cultos |
| `src/services/storageService.ts` | Agregado | Servicio de persistencia dual (LocalStorage y sincronización con API Aiven) sin datos seed |
| `src/services/cloudflareService.ts` | Agregado | Servicio cliente de compresión de imágenes en Canvas y subida a Cloudflare R2 |
| `src/utils/dateUtils.ts` | Agregado | Utilidades de cálculo para cultos de miércoles/domingo y formateo de moneda |
| `src/components/Navbar.tsx` | Agregado | Barra de navegación superior con balance en vivo y accesos directos de captura |
| `src/components/DashboardView.tsx` | Agregado | Panel principal con métricas, desglose de entradas y comparativa miércoles vs domingo |
| `src/components/CapturaIngresosView.tsx` | Agregado | Módulo de captura rápida con atajos para Miércoles y Domingo, y modo continuo de sobres |
| `src/components/RegistroGastoView.tsx` | Agregado | Formulario de salidas con fecha, categorías eclesiásticas y dropzone hacia Cloudflare R2 |
| `src/components/ProyectosPactadosView.tsx` | Agregado | Gestión de proyectos de fe con pactos individuales (monto meta y cuotas semanales) |
| `src/components/LibroCajaView.tsx` | Agregado | Auditoría de movimientos, filtros avanzados, exportación CSV e informe pastoral imprimible |
| `src/components/ConfiguracionView.tsx` | Agregado | Panel interactivo de estado de conexión a Aiven PostgreSQL y Cloudflare R2 Bucket |
| `src/components/ModalEvidencia.tsx` | Agregado | Lightbox modal para visualizar y descargar comprobantes desde Cloudflare R2 |
| `api/db.ts` | Agregado | Pool de conexiones a Aiven PostgreSQL para Vercel Serverless Functions |
| `api/r2.ts` | Agregado | Cliente S3 para Cloudflare R2 Bucket en Vercel |
| `api/health.ts` | Agregado | Endpoint serverless para verificación de conectividad a Aiven y R2 |
| `api/movimientos.ts` | Agregado | Endpoint serverless CRUD para transacciones en PostgreSQL |
| `api/proyectos.ts` | Agregado | Endpoint serverless para proyectos pactados en PostgreSQL |
| `api/upload.ts` | Agregado | Endpoint serverless para subida multipart a Cloudflare R2 con busboy |
| `api/evidencia/[...key].ts` | Agregado | Endpoint serverless para transmisión de archivos desde Cloudflare R2 |
| `functions/api/*` | Agregado | Funciones para despliegue alternativo en Cloudflare Pages |
| `schema.sql` | Agregado | DDL completo para PostgreSQL en Aiven con índices y catálogo base de categorías |
| `scripts/setup-db.js` | Agregado | Script de inicialización de tablas en Aiven |
| `scripts/clean-seed.js` | Agregado | Script de purga de datos de prueba |
| `vercel.json` | Agregado | Configuración de enrutamiento y compilación en Vercel |
| `vite.config.ts` | Agregado | Configuración de Vite con middleware API para desarrollo local |
| `tailwind.config.js` | Agregado | Paleta eclesiástica y configuración de utilidades |
| `README.md` | Agregado | Documentación integral y guía de despliegue para Vercel |

### Detalle Técnico

Se implementó una arquitectura Jamstack completa basada en React 18, TypeScript y Tailwind CSS, preparada tanto para Vercel Serverless Functions (`api/`) como para Cloudflare Pages Functions (`functions/api/`).

1. **Persistencia en Aiven PostgreSQL**:
   - Conexión configurada con soporte SSL `rejectUnauthorized: false` para certificados Aiven.
   - Creación de tablas relacionales: `transacciones`, `proyectos_pactados`, `pactos_miembros`, `miembros` y catálogo de `categorias`.
   - Purga exitosa de datos semilla de prueba para entrega en producción lista para uso real.

2. **Almacenamiento en Cloudflare R2**:
   - Integración con el bucket `gospel` mediante la API de S3 (`@aws-sdk/client-s3`).
   - Compresión previa en el cliente para imágenes de comprobantes.
   - Streaming y servicio seguro de evidencias mediante endpoints dedicados.

3. **Optimizaciones de Captura Eclesiástica**:
   - Cálculo dinámico para preseleccionar los días de culto oficiales (Miércoles y Domingos).
   - Modo continuo de captura por sobres que mantiene el contexto de servicio y fecha.
   - Seguimiento matemático de semanas cubiertas y saldos restantes en proyectos pactados.

---
