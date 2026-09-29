# 📊 Registro de Avances del Proyecto

> Este documento contiene un resumen claro y sencillo de cada avance realizado en el proyecto.
> Está diseñado para que cualquier persona pueda entender el progreso sin necesidad de conocimientos técnicos.

---

## ✅ Lanzamiento de Versión v1.3.0: Saldos por mes, saldo acumulado por movimiento y separación de Caja General

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 11:54:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?

1. **Saldos y Balances por Mes**: Se añadió un módulo de auditoría mensual en la vista de Caja General. Permite consultar para cada mes (septiembre, agosto, etc.) con cuánto dinero inició el mes, cuánto ingresó por ofrendas y diezmos, cuánto se gastó, el flujo neto del período y el saldo acumulado al cierre.
2. **Saldo en Cada Movimiento**: Cada transacción del libro diario ahora muestra la columna **Saldo en Caja**, reflejando con exactitud cuánto dinero había en la cuenta tras registrar esa entrada o salida, similar a un estado de cuenta bancario.
3. **Separación de Caja General y Proyectos**: Se renombró la sección a **Libro de Caja General** y se configuró para no mezclar los fondos de proyectos pactados con el dinero operativo cotidiano de la iglesia, garantizando que el balance diario refleje la liquidez real.
4. **Desglose Independiente de Ofrendas, Diezmos y Proyectos en el Resumen**: En la pantalla principal ahora se aprecian tarjetas independientes para cada concepto, junto con una barra visual de distribución proporcional y porcentajes en los cultos de Miércoles vs Domingo.
5. **Exportación Adaptativa a CSV**: Permite descargar tanto el detalle diario de movimientos con sus saldos como la tabla consolidada de saldos mensuales.

### ¿Qué significa para el proyecto?

- **Control Financiero Mes a Mes**: Los pastores y líderes de mayordomía pueden ver en segundos cómo cerró cada mes sin necesidad de calcular manualmente aperturas y cierres.
- **Cuentas Claras y Transparentes**: El dinero de los proyectos especiales se administra en su propio fondo sin desbalancear la tesorería operativa.
- **Trazabilidad Inmediata**: Cualquier auditor o tesorero puede comprobar el impacto directo de cada movimiento en el saldo de la caja.

### ¿Qué va a notar el usuario/cliente?

- En la barra superior, la pestaña ahora se titula **Caja General**.
- En la parte superior de la vista de caja se encuentra un carrusel de tarjetas mensuales con saldos al cierre que permiten filtrar cualquier mes con un solo clic.
- Un control para alternar entre la vista de **Movimientos** y la **Tabla de Saldos por Mes**.
- La nueva columna **Saldo en Caja** en la tabla contable.

---

## ✅ Lanzamiento de Versión v1.2.0: Reportes financieros oficiales en PDF, rediseño estilo Apple, control de gastos en proyectos y traspaso de remanentes a ofrenda

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 11:25:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?

1. **Reporte Financiero Oficial en PDF Imprimible**: Se creó un generador de reportes formales de tesorería listo para imprimir o guardar en PDF tamaño Carta. Presenta con claridad qué dinero ingresa y cuándo (cultos de miércoles, domingos mañana y noche, ofrendas, diezmos), en qué se gasta y cuándo (con estado de comprobantes en Cloudflare R2), y el estado detallado de los proyectos de fe con la lista de hermanos pactantes, sus cuotas cubiertas, adeudos y firmas de supervisión pastoral y fiscal.
2. **Mecanismo de Cierre de Proyectos y Traspaso de Restos a la Ofrenda**: Si un proyecto o campaña concluye y no se gastó el 100% de lo pactado, ahora los administradores pueden finalizar el proyecto y transferir el dinero sobrante a la ofrenda general con el motivo oficial *"Resto del proyecto: [Nombre]"*. El dinero queda debidamente registrado sin desfasar el balance general ni duplicar fondos.
3. **Asignación Directa de Gastos a Proyectos**: Al registrar una compra o pago, ahora se puede indicar a qué proyecto pactado corresponde para saber en todo momento cuánto dinero se ha invertido y cuánto saldo real queda disponible.
4. **Rediseño Completo Inspirado en Estándares de Apple (HIG)**: Se modernizó toda la interfaz para que sea más limpia, intuitiva y rápida. La barra superior ahora es minimalista (~48px), la captura de montos cuenta con atajos de un toque (+50, +100, +200, +500, +1000, +2000), y las tablas financieras cuentan con alineación numérica perfecta.
5. **Mayor Seguridad y Limpieza**: Se retiraron las pantallas públicas de configuración de bases de datos y almacenamiento en la nube, garantizando que las credenciales permanezcan seguras en el servidor.

### ¿Qué significa para el proyecto?

- **Rendición de Cuentas Impecable**: Los pastores y líderes pueden presentar balances impresos profesionales en asambleas generales, comités ministeriales y auditorías en cualquier momento.
- **Total Claridad Contable**: Cada peso que entra por proyectos tiene un destino transparente; los fondos no utilizados regresan formalmente a la tesorería general con un registro auditable.
- **Facilidad y Rapidez de Uso**: Los tesoreros pueden capturar diezmos y ofrendas más rápido y con menos esfuerzo durante los cultos.

### ¿Qué va a notar el usuario/cliente?

- Un botón de **PDF** en la barra superior, en el libro de caja y en el panel principal para generar e imprimir el balance financiero oficial.
- En la sección de proyectos pactados, un botón para "Finalizar Proyecto / Mover Resto" que calcula automáticamente el remanente no gastado y genera el movimiento de traspaso.
- Una barra superior mucho más delgada y elegante, con navegación por pestañas suaves y visualización del saldo en tiempo real.

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
