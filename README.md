# Sistema de Flujo de Efectivo Eclesiástico ⛪💰

Sistema moderno de tesorería y mayordomía financiera para iglesias, diseñado con **React + TypeScript + Vite + Tailwind CSS**, preparado para desplegarse en **Vercel** o **Cloudflare**, con base de datos en **Aiven con PostgreSQL**, autenticación con **Auth.js** y almacenamiento de evidencias (recibos, facturas y tickets) en **Cloudflare R2 Bucket (gospel)**.

### Punto de Referencia de Versión

| Versión | Fecha y Hora (UTC-6) | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **v1.2.0** | 2026-09-29 11:25:00 | David Méndez | Producción / Estable |
| **v1.1.0** | 2026-09-29 09:44:00 | David Méndez | Producción / Estable |

---

## 🌟 Características Principales

### 1. Reporte Financiero Oficial en PDF Vectorial (Impresión de Alta Fidelidad)
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
