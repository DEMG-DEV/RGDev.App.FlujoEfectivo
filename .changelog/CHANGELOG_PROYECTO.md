# 📊 Registro de Avances del Proyecto

> Este documento contiene un resumen claro y sencillo de cada avance realizado en el proyecto.
> Está diseñado para que cualquier persona pueda entender el progreso sin necesidad de conocimientos técnicos.

---

## ✅ Lanzamiento de Versión v1.1.0: Autenticación con Auth.js, gestión de usuarios con roles y optimización con pnpm

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 09:44:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?

1. **Sistema de Acceso y Seguridad con Auth.js**: Se incorporó un sistema moderno de inicio de sesión y registro de cuentas para resguardar la información financiera de la iglesia. Cada usuario cuenta con credenciales protegidas y cifradas en la base de datos de PostgreSQL en Aiven.
2. **Control por Roles Ministeriales**: Se crearon perfiles diferenciados según la labor en la congregación:
   - **Administrador**: Control total y configuración del sistema.
   - **Pastor**: Supervisión general, acceso a libros de caja y firma de informes oficiales.
   - **Tesorero**: Manejo cotidiano del libro de caja, comprobantes de gastos y balance.
   - **Operador de Culto**: Captura ágil de sobres de ofrendas y diezmos durante los cultos.
3. **Gestión Interna de Usuarios**: El Pastor o Administrador ahora puede crear usuarios directamente desde el panel de control del sistema (por ejemplo, dar de alta a un nuevo tesorero o diácono). Estos usuarios pueden ingresar de inmediato a través de la misma pantalla de login sin ninguna diferencia.
4. **Optimización con PNPM**: Se adaptó el proyecto para compilar e instalarse a máxima velocidad utilizando el gestor de paquetes moderno pnpm.

### ¿Qué significa para el proyecto?

- **Mayor Privacidad y Protección de Datos**: La tesorería ya no está expuesta; ahora solo las personas autorizadas por el liderazgo pueden ver o ingresar transacciones.
- **Trazabilidad y Organización**: Se sabe qué rol desempeña cada colaborador dentro del flujo de efectivo.
- **Autonomía para el Liderazgo**: Los pastores pueden invitar, suspender o revocar accesos en cualquier momento con un solo clic.

### ¿Qué va a notar el usuario/cliente?

- Al entrar a la aplicación, se presenta una pantalla de bienvenida e inicio de sesión para ingresar correo y contraseña.
- En la barra superior se muestra el nombre y rol del usuario activo, junto con un botón para cerrar sesión y un acceso exclusivo para gestionar a los miembros del equipo de tesorería.

---

## ✅ Corrección y optimización del proceso de publicación automática en Vercel

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-28 19:12:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?

Se corrigió la configuración de instalación de componentes en la plataforma de Vercel. Existía un archivo secundario antiguo que causaba confusión en los servidores de publicación en la nube al momento de compilar el proyecto. Se unificó todo bajo el instalador estándar oficial para que la plataforma pueda publicar las nuevas versiones automáticamente y sin interrupciones.

### ¿Qué significa para el proyecto?

- **Publicación automática sin fallos**: Ahora cada vez que se sube una actualización a GitHub, Vercel compila e instala todo de forma directa y fluida.
- **Mayor estabilidad en la nube**: Se eliminaron archivos conflictivos redundantes, dejando el repositorio limpio y alineado con los estándares modernos de desarrollo web.

### ¿Qué va a notar el usuario/cliente?

Este cambio es interno y mejora la estructura de publicación en la nube. Permite que la aplicación quede disponible en línea en su dirección web definitiva de forma inmediata.

---

## ✅ Lanzamiento inicial del sistema de tesorería y flujo de efectivo para la iglesia

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-28 10:16:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?

Se construyó por completo la plataforma digital de tesorería eclesiástica para el registro y control transparente de las entradas y salidas de dinero de la congregación. La plataforma permite capturar con agilidad las ofrendas, los diezmos de los hermanos y las siembras comprometidas para proyectos especiales de la iglesia (como construcción, audio o compra de terreno). Además, cuenta con un módulo para registrar los gastos con fotos de los recibos o facturas y generar informes oficiales listos para imprimir y presentar a la junta pastoral.

### ¿Qué significa para el proyecto?

- **Cero pérdidas de tiempo al contar sobres**: Los tesoreros ahora cuentan con un modo rápido que les permite registrar decenas de sobres de un culto en pocos minutos sin tener que escribir la fecha ni el tipo de culto una y otra vez.
- **Transparencia total con evidencias**: Cada gasto que se registre cuenta con su foto o comprobante respaldado en la nube de forma segura, garantizando cuentas claras en todo momento.
- **Control de proyectos pactados**: Cada hermano o familia que se compromete con una meta para un proyecto de la iglesia puede tener su registro de cuánto prometió y cuánto aporta semana tras semana, sabiendo con exactitud cuánto ha avanzado.
- **Listo para uso inmediato en producción**: Se limpiaron todos los datos de prueba anteriores, dejando el sistema en blanco y preparado para comenzar a registrar las operaciones reales de la congregación.

### ¿Qué va a notar el usuario/cliente?

- **Botones directos para Miércoles y Domingo**: Con un solo clic, el sistema sabe automáticamente qué día de culto se está registrando.
- **Tarjetas de control financiero**: Al abrir la aplicación se ve de inmediato el dinero disponible en caja, cuánto ingresó en la semana y la comparación de ofrendas entre el culto de miércoles y los de domingo.
- **Informe Pastoral con firmas**: Una opción para imprimir en papel o guardar en PDF el reporte formal con el membrete de la iglesia y las líneas de firma para el Pastor y el Tesorero.
- **Subida fácil de recibos**: Posibilidad de tomar fotos con el celular o subir archivos de tickets y verlos ampliados en cualquier momento.

---
