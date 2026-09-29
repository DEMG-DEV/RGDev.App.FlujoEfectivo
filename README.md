# Sistema de Flujo de Efectivo Eclesiástico ⛪💰

Sistema moderno de tesorería y mayordomía financiera para iglesias, diseñado con **React + TypeScript + Vite + Tailwind CSS**, preparado para desplegarse en **Vercel** o **Cloudflare**, con base de datos en **Aiven con PostgreSQL**, autenticación con **Auth.js** y almacenamiento de evidencias (recibos, facturas y tickets) en **Cloudflare R2 Bucket (gospel)**.

### Punto de Referencia de Versión

| Versión | Fecha y Hora (UTC-6) | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **v1.1.0** | 2026-09-29 09:44:00 | David Méndez | Producción / Estable |

---

## 🌟 Características Principales

### 1. Autenticación Segura y Control de Usuarios (Auth.js)
- **Autenticación con Auth.js (`@auth/core`)**: Integración robusta basada en credenciales (email + contraseña) con sesiones seguras vía JWT / Cookies HTTP-Only.
- **Roles Eclesiásticos**:
  - 👑 **Administrador (`admin`)**: Acceso total al sistema, configuración y gestión de usuarios. El primer usuario registrado es promovido automáticamente a Super Admin.
  - ✝️ **Pastor (`pastor`)**: Acceso a libros de caja, reportes pastorales oficiales y visión ejecutiva.
  - 💼 **Tesorero (`tesorero`)**: Registro continuo de ofrendas, diezmos, pactos y gastos con comprobantes.
  - 📋 **Operador (`operador`)**: Captura ágil de cultos y sobres en tiempo real.
- **Gestión Interna de Usuarios**: Los pastores y administradores pueden crear, activar/desactivar o eliminar usuarios directamente desde el sistema con contraseñas encriptadas mediante `bcrypt`.

### 2. Captura Rápida de Entradas (Ingresos)
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

### 3. Proyectos Pactados con Valor Semanal
- Registro de proyectos de fe (ej. *Construcción de Templo*, *Nuevo Sistema de Audio*, *Terreno Anexo*).
- Cada hermano o familia pacta:
  - **Monto Total Pactado** (Meta individual).
  - **Cuota Semanal Acordada** (Aporte periódico pactado).
- Seguimiento visual de cumplimiento y semanas pagadas.

### 4. Registro de Gastos y Salidas con Evidencia en Cloudflare R2
- Selección de la fecha exacta del gasto.
- Categorías eclesiásticas configuradas.
- Concepto y proveedor beneficiario.
- **Subida de Evidencia al Bucket `gospel` de Cloudflare R2**:
  - Admite fotos de recibos/tickets tomadas con el teléfono y archivos PDF.
  - Compresión automática previa en el navegador para optimizar la carga.
  - Almacenamiento seguro en Cloudflare R2 con visor Lightbox integrado.

### 5. Libro de Caja y Reportes Pastorales
- Historial completo con filtros por fecha, tipo (+/-), día de culto (Miércoles / Domingo) y buscador textual.
- **Informe Pastoral Imprimible**: Diseño limpio listo para imprimir en PDF con membrete oficial y espacio de firmas para el Pastor Principal y el Tesorero.
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
