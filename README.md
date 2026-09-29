# Sistema de Flujo de Efectivo Eclesiástico ⛪💰

Sistema moderno de tesorería y mayordomía financiera para iglesias, diseñado con **React + TypeScript + Vite + Tailwind CSS**, preparado para desplegarse en **Vercel** o **Cloudflare**, con base de datos en **Aiven con PostgreSQL**, autenticación con **Auth.js** y almacenamiento de evidencias (recibos, facturas y tickets) en **Cloudflare R2 Bucket (gospel)**.

### Punto de Referencia de Versión

| Versión | Fecha y Hora (UTC-6) | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **v1.6.0** | 2026-09-29 13:35:00 | David Méndez | Producción / Estable |
| **v1.5.0** | 2026-09-29 13:14:00 | David Méndez | Producción / Estable |
| **v1.4.1** | 2026-09-29 12:16:00 | David Méndez | Producción / Estable |
| **v1.4.0** | 2026-09-29 12:10:00 | David Méndez | Producción / Estable |
| **v1.3.0** | 2026-09-29 11:54:00 | David Méndez | Producción / Estable |
| **v1.2.0** | 2026-09-29 11:25:00 | David Méndez | Producción / Estable |
| **v1.1.0** | 2026-09-29 09:44:00 | David Méndez | Producción / Estable |

---

## 🌟 Características Principales

### 1. Navegación Móvil Apple HIG (Bottom Tab Bar), A11y Integral y Micro-Feedback Reactivo
- **Barra de Pestañas Inferior Nativa (iOS Bottom Tab Bar)**: Implementación de la barra de navegación principal fija en la zona del pulgar (`bottom-0`) para móviles con acabado `backdrop-blur-xl bg-slate-900/95` y soporte para safe-area (`pb-[env(safe-area-inset-bottom)]`), permitiendo alternar entre Resumen, Caja General, Entradas, Gastos y Pactos con 1 toque.
- **Dock Flotante Anticolisión y Touch Target 56x56**: Reubicación adaptativa del botón flotante por encima de la barra móvil (`bottom-[calc(4.5rem+env(safe-area-inset-bottom))]`) y elevación de dimensiones a `w-14 h-14` (56x56px) para un toque ergonómico impecable.
- **Micro-Loader en Reclasificación Inline**: Indicador visual giratorio (`Loader2`) directo en la fila del Libro de Caja al cambiar de categoría, deshabilitando el selector durante la persistencia en Aiven PostgreSQL para evitar peticiones duplicadas.
- **Empty State Ilustrado de Búsqueda**: Tarjeta estilizada con botón directo *"Restablecer todos los filtros"* cuando ninguna transacción coincide con los criterios de búsqueda.
- **Teclado Numérico Decimal Nativo en Móviles**: Integración de `inputMode="decimal"` en los campos principales de captura de ingresos y registro de gastos para desplegar el teclado numérico de iOS/Android con punto decimal.
- **Accesibilidad y Touch Targets Estándar Apple HIG**: Incorporación de atributos ARIA (`aria-label`, `aria-expanded`, `aria-haspopup="menu"`, roles ARIA) y botones interactivos de fila ampliados a mínimo 36x36px y 44x44px.

### 2. Cambio Rápido de Categorías, Dock Flotante, Confidencialidad en Diezmos y Auditoría Mes a Mes
- **Persistencia y Cambio Ágil de Categorías**: Selector desplegable inline directo en el Libro de Caja para reclasificar cualquier movimiento con 1 clic, con actualización optimista y persistencia en base de datos Aiven PostgreSQL (soporte para endpoints `PATCH` y `DELETE` en producción y desarrollo local).
- **Navbar Limpio y Dock de Acciones Flotante**: Reorganización ergonómica del encabezado con reducción de saturación visual; las acciones rápidas de registro e informes se centralizaron en un dock flotante interactivo y accesible.
- **Modos de Reporte Flexible (Por Mes y Total General)**: Selector rápido que permite alternar entre el desglose de un mes específico o el consolidado histórico general.
- **Confidencialidad en Diezmos Eclesiásticos**: Protección de datos y privacidad congregacional en el reporte oficial en PDF y CSV, reemplazando automáticamente el nombre de los diezmantistas por "Confidencial".
- **Firma del Secretario General**: Integración del Secretario General en el bloque ministerial de firmas oficiales a cuatro columnas (Pastor Principal, Secretario General, Tesorero General y Comité de Auditoría).
- **Reporte Consolidado Mes a Mes y Detalle Cronológico Continuo**: Tabla ejecutiva comparativa mensual para el Total General y listado de detalle estrictamente ordenado por fecha de forma continua.

### 2. Sincronización Contable, Reportes PDF Formateados y Visibilidad de Credenciales
- **Sincronización Total de Saldos**: Armonización exacta del balance contable entre el **Libro de Caja General**, el tablero principal (**Fondo en Caja General**) y el distintivo del **Navbar** (`CAJA`), deduciendo gastos únicamente de entradas operativas e independizando los fondos de proyectos pactados.
- **Cuadratura Matemática Miércoles vs Domingo**: Regla estricta de exclusión mutua que elimina duplicidades cruzadas en la comparativa de cultos, asegurando que la sumatoria de aportes coincida al 100% con los totales registrados.
- **Reportes PDF de Alta Fidelidad Vectorial**: Aislamiento total del informe ministerial en impresión (`@media print`), iniciando en la primera página sin elementos web residuales, con membrete oficial indestructible a dos columnas fijas y sin corte horizontal en tablas.
- **Impresión Directa y Membrete en Libro de Caja**: Botón de impresión rápida con encabezado institucional formal, totales consolidados y bloque de tres firmas oficiales (Pastor Principal, Tesorero General y Comité de Auditoría).
- **Visibilidad de Contraseña (Eye Toggle)**: Botón con icono interactivo (`Eye` / `EyeOff`) en el acceso al sistema con navegación por teclado accesible.

### 2. Libro de Caja General y Saldos por Mes (Auditoría Integral)
- **Saldos por Mes y Cierres Contables**: Módulo de auditoría periódica que calcula con rigor cronológico para cada mes: **Saldo Inicial**, **Entradas (+)**, **Gastos (-)**, **Flujo Neto (+/-)** y **Saldo al Cierre**.
- **Carrusel / Grid de Meses**: Tarjetas interactivas estilo Apple Inset Grouped para cada período mensual con desglose y filtrado instantáneo con un solo clic.
- **Saldo Acumulado en Cada Movimiento**: Columna **Saldo en Caja** directamente en la tabla contable, que refleja el balance disponible después de cada ingreso o egreso histórico.
- **Separación Contable Operativa**: El Libro de Caja General opera por defecto en modo *"Solo Caja General"*, excluyendo fondos comprometidos de proyectos pactados para representar fielmente la liquidez operativa diaria (con opción de alternar a consolidado).
- **Exportación Adaptativa a CSV**: Descarga el detalle diario con saldos individuales o la sábana consolidada de auditoría mensual.

### 2. Desglose Independiente de Ofrendas, Diezmos y Proyectos
- **Tarjetas Separadas en el Resumen General**: Visualización nítida y diferenciada de **Fondo en Caja / Bancos**, **Ofrendas**, **Diezmos**, **Proyectos Pactados** y **Total Egresos**, eliminando ambigüedades.
- **Barra de Distribución Proporcional**: Gráfico segmentado en tiempo real con porcentajes y montos acumulados por tipo de aporte.
- **Desglose en Comparativa de Cultos**: Detalle exacto de cuánto ingresó por ofrendas, diezmos y proyectos en los cultos de Miércoles vs. Domingo.

### 3. Reporte Financiero Oficial en PDF Vectorial (Impresión de Alta Fidelidad)
- **Generador de Estados de Cuenta Oficiales**: Generación directa de reportes impresos o descargables en PDF en tamaño Carta (*Letter*) mediante CSS `@media print` vectorizado sin dependencias externas.
- **Secciones Detalladas**:
  - **Entradas Detalladas**: Fecha, culto correspondiente, clasificación, tipo de aporte, ofrendante / miembro, concepto y monto.
  - **Egresos y Gastos Operativos**: Fecha, categoría eclesiástica, concepto/beneficiario, estado de comprobante fiscal en Cloudflare R2 y monto.
  - **Proyectos Pactados y Cumplimiento de Pactantes**: Metas generales, recaudación acumulada, saldo no ejecutado y desglose individual por hermano (cuota acordada, semanas aportadas, deuda restante y porcentaje de avance).
  - **Firmas Ministeriales Oficiales**: Bloque de validación con rúbricas para Pastor Principal, Tesorero General y Comité de Auditoría / Revisor Fiscal.
- **Filtros Flexibles de Período**: Selección rápida por Mes Actual, Mes Anterior, Año en Curso, Rango Personalizado o Histórico Completo, con exportación complementaria a CSV.

### 2. Gestión de Proyectos, Gastos y Remanente a Ofrenda
- **Asignación de Gastos a Proyectos**: Permite asociar cualquier compra o desembolso directamente a un proyecto de fe activo para llevar el balance en tiempo real entre lo recaudado y lo gastado.
- **Mecanismo de Liquidación y Traspaso de Sobrante**: Cuando una meta o construcción concluye sin agotar el 100% de los fondos pactados, el sistema permite cerrar el proyecto y transferir el remanente no utilizado a la **Ofrenda General** con el concepto oficial *"Resto del proyecto: [Nombre del Proyecto]"*. Esto preserva la cuadratura contable exacta con balance neto neutral ($0.00 de discrepancia).
- **Control de Estado de Proyectos**: Pestañas para visualizar proyectos activos, proyectos finalizados o el histórico completo, con posibilidad de reapertura si es necesario.

### 3. Rediseño de Experiencia de Usuario Apple HIG (Human Interface Guidelines)
- **Barra Superior Minimalista**: Reducción de altura a una sola línea ultra-compacta (~48px) con selectores segmentados, indicador de balance en vivo, badge de usuario y accesos de alta frecuencia.
- **Finanzas Inset Grouped**: Tablero principal y libro de caja con tarjetas redondeadas continuas, tipografía con números tabulares (`tabular-nums`) para alineación contable perfecta y comparativas visuales entre cultos de Miércoles y Domingo.
- **Captura Ágil Apple Pay Style**: Campo de monto hero de gran formato con botones rápidos para sumas frecuentes (+$50, +$100, +$200, +$500, +$1000, +$2000) y selección ágil de cultos.
- **Depuración de Seguridad**: Eliminación de interfaces de configuración de credenciales en el cliente; ahora las llaves de base de datos y Cloudflare R2 se administran de manera estricta y segura vía variables de entorno.

### 4. Autenticación Segura y Control de Usuarios (Auth.js)
- **Autenticación con Auth.js (`@auth/core`)**: Integración robusta basada en credenciales (email + contraseña) con sesiones seguras vía JWT / Cookies HTTP-Only.
- **Roles Eclesiásticos**:
  - 👑 **Administrador (`admin`)**: Acceso total al sistema y gestión de usuarios. El primer usuario registrado es promovido automáticamente a Super Admin.
  - ✝️ **Pastor (`pastor`)**: Acceso a libros de caja, reportes pastorales oficiales y visión ejecutiva.
  - 💼 **Tesorero (`tesorero`)**: Registro continuo de ofrendas, diezmos, pactos y gastos con comprobantes.
  - 📋 **Operador (`operador`)**: Captura ágil de cultos y sobres en tiempo real.
- **Gestión Interna de Usuarios**: Los pastores y administradores pueden crear, activar/desactivar o editar información de usuarios directamente desde el sistema con contraseñas encriptadas mediante `bcrypt`.

### 5. Captura Rápida de Entradas (Ingresos)
- **Atajos para Días Clave de Culto**:
  - 🟡 **Culto de Miércoles** (Reunión de oración y doctrina).
  - 🟢 **Culto de Domingo - Mañana** (Servicio matutino).
  - 🟢 **Culto de Domingo - Noche** (Servicio vespertino).
  - 📅 **Fecha Libre** (Eventos extraordinarios).
- **Modo Continuo de Sobres**: Los tesoreros pueden registrar decenas de sobres consecutivos sin que se reinicie el culto ni la fecha.
- **Tipos de Entrada**:
  - **Ofrendas**: General, Misionera, Niños/Escuela Dominical, Jóvenes, Pro-Templo, Acción de Gracias.
  - **Diezmos**: Registro rápido con autocompletado de miembros frecuentes.
  - **Aportes a Proyectos Pactados**: Vinculación directa con el pacto del hermano, con cálculo en vivo de cuotas semanales cubiertas y saldo restante.

### 6. Registro de Gastos y Salidas con Evidencia en Cloudflare R2
- Selección de la fecha exacta del gasto y categoría eclesiástica.
- Concepto, proveedor beneficiario y asignación presupuestaria a proyecto (opcional).
- **Subida de Evidencia al Bucket `gospel` de Cloudflare R2**:
  - Admite fotos de recibos/tickets tomadas con el teléfono y archivos PDF.
  - Compresión automática previa en el navegador para optimizar la carga.
  - Almacenamiento seguro en Cloudflare R2 con visor Lightbox integrado.

### 7. Libro de Caja y Reportes Pastorales
- Historial completo con filtros por fecha, tipo (+/-), día de culto (Miércoles / Domingo) y buscador textual.
- **Informe Pastoral Imprimible en PDF**: Formato listo para imprimir con firmas oficiales de supervisión.
- **Exportación a CSV**: Para abrir en Microsoft Excel o Google Sheets.

---

## 🚀 Despliegue en Vercel (Paso a Paso)

El proyecto ya incluye [`vercel.json`](file:///Users/davidmendez/RGDev/RGDev.App.FlujoEfectivo/vercel.json) y los serverless endpoints en [`api/`](file:///Users/davidmendez/RGDev/RGDev.App.FlujoEfectivo/api/) listos para Vercel.

1. Sube tu repositorio a **GitHub**.
2. Entra a [vercel.com](https://vercel.com) y haz clic en **"Add New Project"**.
3. Importa tu repositorio. Vercel detectará automáticamente **Vite**.
4. En la sección **Environment Variables**, agrega las siguientes 8 variables:

| Variable | Valor |
| :--- | :--- |
| `DATABASE_URL` | `postgres://avnadmin:<TU_PASSWORD>@<TU_HOST_AIVEN>:21083/defaultdb?sslmode=require` |
| `AIVEN_PG_URL` | `postgres://avnadmin:<TU_PASSWORD>@<TU_HOST_AIVEN>:21083/defaultdb?sslmode=require` |
| `VITE_AIVEN_PG_URL` | `postgres://avnadmin:<TU_PASSWORD>@<TU_HOST_AIVEN>:21083/defaultdb?sslmode=require` |
| `AUTH_SECRET` | `cadena-secreta-aleatoria-de-minimo-32-caracteres` |
| `R2_ACCOUNT_ID` | `tu_cloudflare_account_id` |
| `R2_BUCKET_NAME` | `gospel` |
| `R2_ACCESS_KEY_ID` | `tu_r2_access_key_id` |
| `R2_SECRET_ACCESS_KEY` | `tu_r2_secret_access_key` |

5. Haz clic en **"Deploy"**. ¡Tu sistema estará en línea con su propio dominio `.vercel.app`!

---

## 🛠️ Comandos de Desarrollo Local

```bash
# Iniciar servidor local
pnpm dev

# Compilar para producción
pnpm build
```
