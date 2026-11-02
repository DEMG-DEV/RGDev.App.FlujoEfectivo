# Política de Seguridad 🛡️

En el **Sistema de Flujo de Efectivo Eclesiástico**, la integridad financiera, la privacidad ministerial y la protección de los datos de la congregación son nuestra más alta prioridad, guiados por el principio ético de **2 Corintios 8:21**: *"Procurando hacer las cosas honradamente, no sólo delante del Señor sino también delante de los hombres"*.

---

## Versiones Soportadas

Mantenemos activamente parches de seguridad para las siguientes versiones:

| Versión | Soportada | Estado de Parches |
| :--- | :---: | :--- |
| **v1.9.x** | ✅ Sí | Versión en producción activa. Parches inmediatos. |
| **v1.8.x** | ⚠️ Parcial | Solo parches críticos de vulnerabilidad. |
| **< v1.8.0** | ❌ No | Obsoleta. Se recomienda actualizar a v1.9.0+. |

---

## Principios de Seguridad Implementados

1. **Confidencialidad Congregacional de Diezmos:**
   - La identidad de los miembros que entregan diezmos se anonimiza en vistas públicas e informes oficiales bajo la denominación ministerial *"Confidencial"*, asegurando que la fidelidad de cada creyente quede reservada al pastor y tesorero.
2. **Autenticación Fuerte:**
   - Hashing criptográfico irreversible de contraseñas con `bcryptjs` (salt rounds >= 10).
   - Control de sesiones seguras mediante `Auth.js` con tokens firmados con `AUTH_SECRET`.
3. **Aislamiento de Almacenamiento en Cloudflare R2:**
   - Subida segura de comprobantes fiscales, tickets y recibos a Cloudflare R2 mediante credenciales segregadas con permisos mínimos de bucket (`PutObject`, `GetObject`, `DeleteObject`).
4. **Protección de Base de Datos:**
   - Consultas parametrizadas en PostgreSQL (`pg` pool) que mitigan 100% ataques de inyección SQL (SQL Injection).
   - Conexiones SSL obligatorias (`sslmode=require`) para bases de datos en la nube (Aiven Cloud).
   - Entorno Docker local aislado en puerto no convencional (`5433`) para evitar cualquier colisión con producción.

---

## Reporte Responsable de Vulnerabilidades

Si descubres una posible vulnerabilidad de seguridad en este repositorio, **te pedimos que NO abras un Issue público** para evitar la divulgación prematura.

Por favor, sigue estos pasos:

1. **Notificación Privada:**
   - Envía un correo electrónico a **david.mendez@rgdev.com** (o al correo de contacto del administrador) con el asunto `[SECURITY] Vulnerabilidad en Flujo de Efectivo Eclesiástico`.
   - Incluye una descripción detallada del hallazgo, pasos para reproducirlo y un vector de ataque teórico (*Proof of Concept*).
2. **Tiempos de Respuesta:**
   - **Recepción y acuse:** Menos de 48 horas.
   - **Evaluación y remediación:** Menos de 7 días naturales para vulnerabilidades críticas.
3. **Divulgación Coordinada:**
   - Una vez liberado el parche correctivo en la rama principal y publicado el release, se publicará un agradecimiento formal y una nota técnica de mitigación.

¡Agradecemos tu compromiso con la seguridad de la iglesia y la mayordomía financiera!
