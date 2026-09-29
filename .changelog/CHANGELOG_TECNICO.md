# 📋 Registro Técnico de Cambios

> Documento generado automáticamente con cada commit realizado en el proyecto.
> Contiene el detalle técnico completo de cada cambio para el equipo de desarrollo.

---

## feat(release): release v1.5.0 - cambio agil de categorias, dock flotante, confidencialidad de diezmos y auditoria mes a mes

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 13:14:00 |
| **Autor** | David Méndez (demg@outlook.com) |
| **Branch** | main |
| **Tipo** | Feature Release |

### Archivos Modificados

| Archivo | Estado | Descripción del Cambio |
|---------|--------|----------------------|
| `package.json` | Modificado | Bump de versión a `1.5.0` |
| `README.md` | Modificado | Actualización de tabla de versiones y nuevas características |
| `api/movimientos.ts` | Modificado | Soporte completo para métodos HTTP `PATCH` y `DELETE` para actualizar categorías y eliminar transacciones en producción Vercel/PostgreSQL |
| `vite.config.ts` | Modificado | Implementación de manejadores `PATCH` y `DELETE` en el plugin local de desarrollo `aivenDbDevPlugin` con actualización en base de datos PostgreSQL Aiven |
| `src/services/storageService.ts` | Modificado | Función `actualizarCategoriaTransaccion` con `await`, sincronización optimista local y fallback |
| `src/components/LibroCajaView.tsx` | Modificado | Integración de selector desplegable inline (`<select>`) para cambio directo e instantáneo de categoría con 1 clic y auto-guardado |
| `src/components/Navbar.tsx` | Modificado | Limpieza y simplificación del encabezado superior, reubicando botones de acciones frecuentes para una interfaz más despejada |
| `src/components/FloatingActionsDock.tsx` | Creado | Dock flotante ergonómico de acciones rápidas para registro de ingresos, gastos y apertura del informe financiero |
| `src/App.tsx` | Modificado | Integración del componente `FloatingActionsDock` con los modales correspondientes |
| `src/components/ReporteFinancieroModal.tsx` | Modificado | Soporte de modos de reporte "Por Mes" / "Total General", anonimización de diezmantistas a "Confidencial", adición del Secretario General en las firmas ministeriales (4 columnas), tabla ejecutiva mes a mes, y ordenamiento estrictamente cronológico continuo sin separaciones artificiales en las tablas de detalle |

### Detalle Técnico
1. **Persistencia de Categorías en Base de Datos**:
   - Se resolvió la causa raíz donde el dev server de Vite carecía de endpoints `PATCH` y `DELETE` en `/api/movimientos`, provocando respuestas 404 que hacían que las categorías se revirtieran al recargar datos desde PostgreSQL.
   - Se añadieron consultas parametrizadas seguras `UPDATE transacciones SET categoria = $1 WHERE id = $2 RETURNING *`.
2. **Selector Inline de Categorías**:
   - En `LibroCajaView.tsx`, se habilitó un `<select>` directo por fila con actualización reactiva instantánea en memoria y en almacenamiento permanente.
3. **Ergonomía de Interfaz (Navbar + FloatingActionsDock)**:
   - Se despejó el navbar de elementos redundantes, creando un dock flotante discreto y accesible (`FloatingActionsDock.tsx`) para registrar ingresos, egresos y abrir el reporte financiero.
4. **Confidencialidad Congregacional de Diezmos**:
   - En el reporte financiero oficial, los diezmos se marcan automáticamente con `<span className="text-slate-500 italic font-medium">Confidencial</span>` en la columna de donante y se higieniza el concepto en la vista de impresión, en el Libro Diario y en la exportación a CSV.
5. **Ampliación de Firmas Ministeriales**:
   - Se incorporó la firma de "Secretario General" entre el Pastor Principal y el Tesorero General, estructurando una cuadrícula simétrica de 4 columnas en impresión.
6. **Auditoría Mes a Mes y Detalle Continuo por Fecha**:
   - Se integró la tabla ejecutiva "Reporte Consolidado de Entradas y Gastos Mes a Mes" cuando se consulta el Total General o el Año en Curso.
   - Las tablas detalladas de entradas y gastos se mantienen en una lista única y continua, ordenada estrictamente por fecha (`fecha` y `created_at`) de forma ascendente.

---

## feat(release): release v1.4.1 - alineacion total del reporte pdf con resumen general y libro de caja

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 12:16:00 |
| **Autor** | David Méndez (demg@outlook.com) |
| **Branch** | main |
| **Tipo** | Feature / Patch Release |

### Archivos Modificados

| Archivo | Estado | Descripción del Cambio |
|---------|--------|----------------------|
| `package.json` | Modificado | Bump de versión a `1.4.1` |
| `README.md` | Modificado | Actualización de tabla de versiones y referencias |
| `src/components/ReporteFinancieroModal.tsx` | Modificado | Alineación contable integral del reporte en PDF con el Resumen General y Libro de Caja General: exclusión estricta de pactos en Entradas de Caja General, sincronización del balance neto de caja, adición de franja de desglose proporcional (ofrendas, diezmos y cultos), sub-tabla de aportes a proyectos en el período, toggle opcional de Libro Diario con saldos acumulados progresivos, y sincronización de exportación CSV |

### Detalle Técnico
1. **Sincronización de Resumen Ejecutivo de Tesorería**:
   - Se recalculó `totalEntradasCaja` filtrando exclusivamente transacciones operativas corrientes (`subtipo !== 'pacto'`).
   - Se sincronizó `balanceNetoCaja` (`totalEntradasCaja - totalGastosCaja`), garantizando que la tarjeta "Balance Neto en Caja" coincida exactamente con el saldo de Caja General y Resumen General.
   - El Fondo de Proyectos Pactados se muestra en su propia tarjeta como fondo restringido independiente.
2. **Franja de Desglose Proporcional y Cultos**:
   - Se incorporó un bloque ejecutivo con las métricas de porcentaje y monto de Ofrendas, Diezmos, y recaudación por cultos de Miércoles vs Domingo (evitando conteo cruzado).
3. **Sección 1 (Entradas de Caja General)**:
   - La tabla cronológica ahora lista únicamente Ofrendas y Diezmos, evitando la contaminación visual de recibos de pactos en la caja operativa.
4. **Sección 3 (Proyectos Pactados)**:
   - Se añadió una sub-tabla detallada con los aportes recaudados para proyectos durante el período seleccionado, preservando la trazabilidad de recibos individuales en su contexto ministerial correcto.
5. **Sección 4 Opcional (Libro Diario con Saldo Progresivo)**:
   - Se integró un toggle de control `[ ] Libro Diario con Saldos` que imprime la bitácora completa de entradas y salidas con la columna `Saldo en Caja` calculada cronológicamente.
6. **Sincronización de CSV**:
   - La exportación a CSV refleja con idéntica fidelidad la separación entre Caja General y Proyectos Pactados.

---

## feat(release): release v1.4.0 - sincronizacion de saldos de caja en resumen, reporte pdf aislado e indestructible y toggle de password

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 12:10:00 |
| **Autor** | David Méndez (demg@outlook.com) |
| **Branch** | main |
| **Tipo** | Feature / Minor Release |

### Archivos Modificados

| Archivo | Estado | Descripción del Cambio |
|---------|--------|----------------------|
| `package.json` | Modificado | Bump de versión a `1.4.0` |
| `src/services/storageService.ts` | Modificado | Cálculo riguroso de `saldoNeto` y `saldoCaja` deduciendo gastos únicamente de entradas operativas corrientes (ofrendas + diezmos) para igualar el Libro de Caja General, y asignación estricta de cultos Miércoles vs Domingo sin duplicidades |
| `src/types/index.ts` | Modificado | Extensión de `ResumenFinanciero` con `saldoCaja`, `saldoConsolidado` e `ingresosOperativos` |
| `src/App.tsx` | Modificado | Actualización de estado inicial de `resumen` con campos de saldo operativo |
| `src/components/DashboardView.tsx` | Modificado | Sincronización del saldo en tarjeta principal "Fondo en Caja General", separación de "Fondo de Proyectos", clarificación de composición de entradas y corrección de doble conteo entre Miércoles y Domingo |
| `src/components/Navbar.tsx` | Modificado | Distintivo `CAJA` en sincronía con el saldo real de caja operativa (`saldoNeto`), y ocultamiento de navbar en impresión (`no-print`) |
| `src/components/LibroCajaView.tsx` | Modificado | Ocultamiento de la columna Evidencia R2 en impresión (`no-print`), membrete oficial eclesiástico (`hidden print:block`), pie de tabla con totales, bloque de 3 firmas ministeriales y botón de impresión directa |
| `src/components/ReporteFinancieroModal.tsx` | Modificado | Aislamiento de impresión mediante clase `reporte-modal-activo`, IDs para membrete en modelo tabla indestructible (`#reporte-membrete-tabla`, `#reporte-membrete-col-izq`, `#reporte-membrete-col-der`) y reglas anti-ruptura de página |
| `src/components/AuthView.tsx` | Modificado | Botón interactivo de alternancia de contraseña con iconos `Eye` / `EyeOff`, espaciado ergonómico (`pr-10`) y navegación accesible |
| `src/index.css` | Modificado | Reglas de `@media print` para ocultar la app de fondo al imprimir el reporte, supresión de barras de desplazamiento que recortaban columnas, y estilo de tabla fija para el membrete oficial |
| `README.md` | Modificado | Actualización de punto de referencia a `v1.4.0` y documentación de nuevas funcionalidades |

### Detalle Técnico

1. **Sincronización de Liquidez Operativa en Caja:**  
   Se corrigió la distorsión donde el Dashboard y el Navbar reportaban un saldo neto erróneo al consolidar indistintamente las aportaciones de proyectos pactados como efectivo libre. `storageService.calcularResumen` computa ahora el saldo operativo real (`ingresosOperativos - totalGastos`), alineando la tarjeta "Fondo en Caja General" y el Navbar exactamente con el saldo reportado por el `LibroCajaView` (-$662.00 en los datos actuales).
2. **Desacoplamiento Estricto de Cultos Miércoles vs Domingo:**  
   Se eliminó el solapamiento cruzado donde transacciones con fecha de miércoles eran atribuidas simultáneamente a domingo debido al `tipo_culto` por defecto. Mediante predicados mutuamente excluyentes (`esMiercoles` y `esDomingo`), la sumatoria de ofrendas, diezmos y proyectos por culto coincide al 100% con los totales registrados.
3. **Arquitectura de Reporte Ministerial Indestructible en PDF:**  
   Se solventó la limitación nativa de Blink/WebKit donde `break-inside: avoid` es omitido en contenedores flexbox. El membrete institucional se desacopló hacia un modelo `@media print` de `display: table` y `display: table-cell`, garantizando que el encabezado jamás sea seccionado a la mitad por un salto de página.
4. **Aislamiento de Ventana Modal en Impresión:**  
   Se configuró la regla `@media print { body.reporte-modal-activo > #root > div > *:not(#modal-reporte-financiero) { display: none !important; } }` para ocultar todo el DOM subyacente durante la impresión del reporte, iniciando de inmediato en la Página 1 sin páginas en blanco o residuos web precedentes.
5. **Ergonomía de Acceso (Password Visibility Toggle):**  
   Implementación de interruptor con estado React en `AuthView.tsx`, alternando atributos de tipo (`text` / `password`) con `tabIndex={-1}` para mantener el flujo natural del teclado.

---

## feat(release): release v1.3.0 - saldos mensuales, saldo por movimiento y separacion de caja general

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 11:54:00 |
| **Autor** | David Méndez (demg@outlook.com) |
| **Branch** | main |
| **Tipo** | Feature / Minor Release |

### Archivos Modificados

| Archivo | Estado | Descripción del Cambio |
|---------|--------|----------------------|
| `package.json` | Modificado | Bump de versión a `1.3.0` |
| `src/components/LibroCajaView.tsx` | Modificado | Módulo de saldos mensuales (saldo inicial, entradas, gastos, flujo neto y cierre), carrusel interactivo de tarjetas por mes, selector de modo (Movimientos vs Tabla Mensual), columna Saldo en Caja acumulado en cada transacción, exclusión por defecto de proyectos pactados y exportación CSV adaptativa |
| `src/components/DashboardView.tsx` | Modificado | Separación explícita de Ofrendas, Diezmos y Proyectos en tarjetas independientes, barra visual de distribución proporcional de entradas y desglose de las tres categorías en la comparativa de Miércoles vs Domingo |
| `src/components/Navbar.tsx` | Modificado | Actualización de la etiqueta de navegación a "Caja General" |
| `src/App.tsx` | Modificado | Soporte de preselección de subtipos ('ofrenda' / 'diezmo') al navegar desde las tarjetas del Dashboard |
| `README.md` | Modificado | Documentación de saldos mensuales, running balance y segregación de fondos en Caja General |

### Detalle Técnico

1. **Algoritmo Cronológico de Saldo Acumulado por Movimiento:**  
   Se calcula el running balance de cada transacción ordenando cronológicamente el histórico de movimientos base de Caja General (`fecha ASC`, `created_at ASC`). Cada entrada suma al saldo acumulado y cada salida resta, almacenando el resultado en un mapa indexado por ID (`mapaSaldos`). Al renderizarse en orden descendente, cada fila expone su saldo contable exacto en ese punto temporal.
2. **Motor de Saldos y Cierres Mensuales:**  
   Se computa un acumulador temporal por clave mensual (`YYYY-MM`). Para cada período se determina el saldo de apertura (`saldoInicial`), el total de entradas y egresos operativos, el flujo neto del mes (`flujoNeto`) y el saldo al cierre (`saldoFinal`), sirviendo tanto al carrusel de tarjetas interactivas como a la tabla formal de auditoría mensual.
3. **Segregación Contable de Caja General vs Proyectos:**  
   Para evitar distorsiones en la liquidez operativa diaria de la iglesia, se filtran de forma predeterminada los aportes a proyectos pactados (`subtipo: 'pacto'`) y los egresos de liquidación, permitiendo alternar mediante un control segmentado al modo consolidado si se requiere.
4. **Navegación e Interacción Dinámica:**  
   Al seleccionar cualquier tarjeta mensual se activa un filtro temporal que acota la vista diaria a los límites de ese mes (`fechaDesde` y `fechaHasta`), con opción de limpieza rápida y exportación CSV contextualizada según el modo activo.

---

## feat(release): release v1.2.0 - reporte pdf oficial, rediseño apple hig, asignación de gastos y liquidación de proyectos a ofrenda

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 11:25:00 |
| **Autor** | David Méndez (demg@outlook.com) |
| **Branch** | main |
| **Tipo** | Feature / Minor Release |

### Archivos Modificados

| Archivo | Estado | Descripción del Cambio |
|---------|--------|----------------------|
| `package.json` | Modificado | Bump de versión a `1.2.0` |
| `src/components/ReporteFinancieroModal.tsx` | Agregado | Generador de reporte financiero pastoral en PDF vectorial imprimible (`@media print`) en formato Carta con desglose de ingresos por culto, gastos operativos con comprobante R2, proyectos pactados con desglose individual de hermanos y bloque oficial de firmas ministeriales |
| `src/components/ModalFinalizarProyecto.tsx` | Agregado | Modal para liquidación formal de proyectos con balance remanente y transferencia contable neutral a la Ofrenda General con motivo "Resto del proyecto: [Nombre]" |
| `src/components/Navbar.tsx` | Modificado | Rediseño ultra-slim Apple HIG (~48px), segmented navigation pills, balance en vivo, badge de usuario y botón de acceso rápido para generar reporte PDF |
| `src/components/DashboardView.tsx` | Modificado | Rediseño con tarjetas Inset Grouped, cifras numéricas tabulares (`tabular-nums`), comparativa Miércoles vs. Domingo y acceso a reporte pastoral |
| `src/components/CapturaIngresosView.tsx` | Modificado | Input monetario Hero con chips de incremento rápido (+50, +100, +200, +500, +1000, +2000), controles segmentados de culto y modo continuo optimizado |
| `src/components/RegistroGastoView.tsx` | Modificado | Formulario Apple HIG con selector de asignación presupuestaria a proyectos y dropzone estilizado para comprobantes en Cloudflare R2 |
| `src/components/LibroCajaView.tsx` | Modificado | Barra de herramientas estilo macOS con filtrado reactivo de cultos/fechas y botón oficial para exportar/imprimir reporte pastoral |
| `src/components/ProyectosPactadosView.tsx` | Modificado | Pestañas de filtrado (Activos / Finalizados / Todos), balance no ejercido en tiempo real y botón de liquidación/finalización con traspaso de fondos |
| `src/components/ModalEvidencia.tsx` | Modificado | Modal Apple HIG con esquinas redondeadas continuas (`rounded-3xl`) y visor de comprobantes fotográficos o PDF |
| `src/components/ConfiguracionView.tsx` | Eliminado | Remoción de interfaz de configuración de claves de base de datos y R2 en frontend para elevar la seguridad y delegar a variables de entorno |
| `src/services/storageService.ts` | Modificado | Integración de `liquidarYMoverRestoProyecto()` con doble asiento contable (gasto de liquidación + ingreso en ofrenda general) y recarga sincronizada |
| `src/types/index.ts` | Modificado | Agregado de campos `total_gastado` y `fecha_fin` en la interfaz `ProyectoPactado` y soporte en transacciones |
| `api/proyectos.ts` | Modificado | Subconsulta SQL para calcular `total_gastado` en vivo, adición automática de columna `fecha_fin` si no existe, y soporte de método PATCH para cierre o actualización de proyectos |
| `api/movimientos.ts` | Modificado | Soporte optimizado para transacciones vinculadas a proyectos |
| `api/pactos.ts` | Agregado | Endpoint serverless para lectura, registro y persistencia de pactos de miembros |
| `src/index.css` | Modificado | Reglas de estilo para impresión `@media print` (ocultamiento de elementos de interfaz, ajuste a página Carta, no división de filas de tabla y layout oficial) |
| `vite.config.ts` | Modificado | Limpieza y optimización del bundler |

### Detalle Técnico

1. **Motor de Reportes Vectoriales Nativos en PDF (`ReporteFinancieroModal.tsx`):**  
   Implementación de plantilla imprimible de alta fidelidad que se apoya en `@media print` del navegador, evitando librerías binarias pesadas y asegurando nitidez tipográfica en cualquier resolución o impresora. Incluye control de saltos de página con `break-inside: avoid` en filas y bloques de rúbrica.
2. **Contabilidad Neutral en Liquidación de Proyectos (`storageService.ts` & `ModalFinalizarProyecto.tsx`):**  
   Para evitar duplicación o desfasaje en el libro de caja general, la finalización de proyectos no consumidos en su totalidad ejecuta una partida doble:
   - Registro de egreso / liquidación imputado al proyecto por el saldo restante ($R$), lo que reduce los fondos asignados al proyecto a $0.00.
   - Registro de ingreso simultáneo en la tesorería general como Ofrenda con concepto `"Resto del proyecto: " + nombre`.
   - Marcado de proyecto como inactivo (`activo = false`) y sellado con `fecha_fin`.
   El balance neto de caja de la congregación permanece exactamente idéntico mientras los fondos se reclasifican con total transparencia.
3. **Rediseño UI/UX Apple Human Interface Guidelines:**  
   Se estandarizó la interfaz con tarjetas *Inset Grouped*, bordes suaves, desenfoques en barra superior (`backdrop-blur`), selectores segmentados con fondo activo sutil y `tabular-nums` para que columnas monetarias mantengan perfecta alineación vertical.
4. **Seguridad y Limpieza Arquitectónica:**  
   Se eliminó la vista de configuración client-side que permitía ingresar cadenas de conexión a PostgreSQL y credenciales de Cloudflare R2 en el navegador. La autenticación a recursos sensibles se canaliza exclusivamente por variables de entorno serverless.

---

## feat(release): release v1.1.0 - autenticación con Auth.js, gestión interna de usuarios y migración a pnpm

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 09:44:00 |
| **Autor** | David Méndez (demg@outlook.com) |
| **Branch** | main |
| **Tipo** | Feature / Minor Release |

### Archivos Modificados

| Archivo | Estado | Descripción del Cambio |
|---------|--------|----------------------|
| `package.json` | Modificado | Bump de versión a `1.1.0`, adición de `@auth/core`, `bcryptjs`, `@types/bcryptjs`, remoción de restricción `packageManager` |
| `pnpm-lock.yaml` | Modificado | Regeneración limpia del lockfile para pnpm v11.9.0 con dependencias de Auth.js y esbuild |
| `schema.sql` | Modificado | Definición de tabla `usuarios` (UUID, email, password_hash, rol, activo, timestamps) con índice `idx_usuarios_email` |
| `api/auth/[...auth].ts` | Agregado | Handler serverless de Auth.js (`@auth/core`) con `CredentialsProvider`, JWT callbacks, sesión y registro (`/api/auth/register`) |
| `api/usuarios.ts` | Agregado | Endpoint administrativo para gestión de usuarios (GET, POST con hash bcrypt, PATCH, DELETE) |
| `src/types/index.ts` | Modificado | Declaración de interfaces `Usuario`, `AuthUser` y tipo `RolUsuario` ('admin', 'pastor', 'tesorero', 'operador') |
| `src/context/AuthContext.tsx` | Agregado | Proveedor de contexto React para Auth.js: login de credenciales, registro, logout y validación CSRF |
| `src/components/AuthModal.tsx` | Agregado | Modal de autenticación y bienvenida con selección de roles y soporte para auto-asignación de admin |
| `src/components/GestionUsuariosModal.tsx` | Agregado | Panel administrativo para dar de alta usuarios de la iglesia, alternar estado activo/inactivo y eliminarlos |
| `src/components/Navbar.tsx` | Modificado | Integración de badge de usuario activo con rol, acceso a gestión de usuarios y botón de cerrar sesión |
| `src/App.tsx` | Modificado | Envoltura con `AuthProvider`, bloqueo pastoral por sesión inactiva y orquestación de vistas |
| `vite.config.ts` | Modificado | Middleware de desarrollo para simular endpoints `/api/auth/*` y `/api/usuarios` en local |
| `README.md` | Modificado | Documentación de Auth.js, roles ministeriales, variable `AUTH_SECRET` y comandos `pnpm` |
| `.gitignore` | Modificado | Inclusión de `.pnpm-store` y `*.tsbuildinfo` |

### Detalle Técnico

1. **Autenticación Desacoplada con Auth.js:**  
   Se integró `@auth/core` adaptado a la arquitectura serverless Jamstack sobre Vercel. Utiliza la estrategia JWT para sesiones seguras y un `CredentialsProvider` que valida directamente contra PostgreSQL en Aiven.
2. **Cifrado Homogéneo con `bcryptjs`:**  
   Tanto el registro de usuarios como la creación interna desde el panel administrativo utilizan `bcrypt.hash(password, 10)`. Esto garantiza que los usuarios creados manualmente o por un pastor/admin inicien sesión exactamente de la misma manera que los usuarios auto-registrados.
3. **Control de Acceso Basado en Roles (RBAC):**  
   Se definieron cuatro niveles de privilegio: `admin` (superusuario automático para la primera cuenta), `pastor` (revisión e informes pastorales), `tesorero` (administración de caja y egresos) y `operador` (captura continua de sobres).
4. **Migración Nativa a PNPM:**  
   Se eliminó la restricción de NPM en `package.json`, se configuró la aprobación de compilaciones de esbuild mediante `pnpm approve-builds` y se generó un `pnpm-lock.yaml` actualizado para CI/CD sin conflictos de dependencias.

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
