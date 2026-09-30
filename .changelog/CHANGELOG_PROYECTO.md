# 📊 Registro de Avances del Proyecto

> Este documento contiene un resumen claro y sencillo de cada avance realizado en el proyecto.
> Está diseñado para que cualquier persona pueda entender el progreso sin necesidad de conocimientos técnicos.

---

## ✅ Lanzamiento de Versión v1.7.0: Analítica visual con gráficos interactivos, entorno local Docker de pruebas y Libro de Caja estilizado

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 21:26:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?
1. **Gráficos Dinámicos y Analítica Visual Interactiva**: El panel principal de Resumen ahora incluye un moderno gráfico interactivo en forma de rosquilla (Donut Chart) que permite ver con un toque la proporción exacta de Ofrendas, Diezmos y Proyectos. Además, se sumó una gráfica de barras con la evolución financiera de cada mes que revela ingresos, egresos y balance neto al pasar el cursor o pulsar sobre cada mes.
2. **Comparativa Visual de Cultos (Miércoles vs Domingo)**: Una nueva barra proporcional muestra visualmente qué porcentaje del ingreso total corresponde a las reuniones de mitad de semana y a los cultos dominicales.
3. **Entorno de Pruebas Seguro con Docker**: Se creó un sistema de desarrollo local totalmente aislado mediante Docker. Los desarrolladores pueden levantar una copia idéntica de la base de datos de la iglesia en su computadora con un solo comando, respaldar datos con un clic y probar nuevas funciones sin alterar jamás la información real que está en la nube.
4. **Saldos por Mes y Filtros Más Compactos en Libro de Caja**: Se reorganizó la vista contable con un diseño mucho más limpio y cómodo para pantallas medianas y móviles, facilitando la consulta de cierres mensuales sin ocupar espacio excesivo.
5. **Píldoras de Balance Financiero y Rescate de Filtros**: La barra de filtros ahora muestra en tiempo real y en un formato compacto el total de entradas, gastos y balance neto de la búsqueda actual, junto con un botón para restablecer filtros al instante.

### ¿Qué significa para el proyecto?
- **Claridad ejecutiva para pastores y líderes**: La información financiera ahora entra por los ojos; es fácil explicar a la congregación o a los directivos cómo se distribuyen los ingresos con gráficos claros y profesionales.
- **Seguridad total para los datos de la iglesia**: Los desarrolladores pueden experimentar y validar cambios sin peligro de alterar accidentalmente los registros reales de tesorería.

---

## ✅ Lanzamiento de Versión v1.6.0: Experiencia móvil nativa estilo Apple, barra inferior accesible y mayor agilidad interactiva

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 13:35:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?
1. **Navegación Móvil Nativa al Alcance del Pulgar (iOS Bottom Tab Bar)**: Se rediseñó la experiencia en teléfonos inteligentes implementando una barra de navegación fija en la parte inferior de la pantalla, con el mismo estilo y fluidez que las aplicaciones de Apple para iPhone. Ahora es posible cambiar de vista con una sola mano entre Resumen, Caja General, Entradas, Gastos y Pactos.
2. **Botón Flotante Inteligente sin Bloqueos**: El botón flotante de acciones rápidas (+ Entrada, - Gasto, PDF) ahora se acomoda automáticamente por encima de la barra inferior en teléfonos, evitando tapar datos, tablas o botones en pantallas móviles.
3. **Indicador Visual de Carga al Cambiar Categorías**: Al reclasificar un movimiento en el Libro de Caja, el icono de flecha se convierte al instante en un pequeño círculo giratorio que confirma que el cambio se está guardando en la base de datos, evitando que se presione dos veces por accidente.
4. **Pantalla de Búsqueda Amigable sin Registros**: Si al filtrar o buscar fechas no hay movimientos, el sistema muestra una tarjeta explicativa atractiva con un botón directo para "Restablecer todos los filtros".
5. **Teclado Numérico Automático con Decimales en Teléfonos**: Al capturar ofrendas, diezmos o gastos en un teléfono móvil, el teclado numérico de iOS y Android se despliega de inmediato con punto decimal, agilizando el tecleo de importes.
6. **Botones de Toque Más Cómodos y Accesibles**: Se incrementó el tamaño de los botones de edición y eliminación para que sean fáciles y precisos de presionar con los dedos en cualquier pantalla táctil.

### ¿Qué significa para el proyecto?
- **Comodidad extrema para tesoreros en culto**: El conteo y la captura de sobres desde un teléfono inteligente ahora es tan rápido y natural como usar una app nativa de iOS.
- **Cero confusiones visuales**: La interfaz siempre indica con claridad cuándo se está guardando un cambio y ofrece botones de rescate inmediato al filtrar información.

---

## ✅ Lanzamiento de Versión v1.5.0: Cambio ágil de categorías, dock flotante ergonómico, confidencialidad en diezmos y reporte mes a mes

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 13:14:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?
1. **Cambio Inmediato y Permanente de Categorías**: Se agregó un selector desplegable directo en cada fila del Libro de Caja. Ahora el tesorero puede reclasificar cualquier ingreso o gasto con un solo clic, y el cambio se guarda inmediatamente en la base de datos de manera definitiva, sin perderse ni regresar al valor anterior al actualizar la página.
2. **Barra Superior (Navbar) Más Limpia y Dock Flotante**: Se simplificó el menú superior para ofrecer una vista mucho más despejada y profesional. Los botones de acción rápida para registrar entradas, gastos e imprimir informes se reubicaron en un dock flotante interactivo, siempre al alcance del usuario.
3. **Reporte Financiero por Mes o Total General**: Se incorporó un control que permite consultar de inmediato un mes específico (con selector directo de mes) o ver el consolidado general de todo el historial.
4. **Privacidad y Confidencialidad en Diezmos**: En apego a la discreción ministerial y pastoral, en el informe oficial impreso y en PDF, los nombres de las personas que entregan diezmos aparecen protegidos como "Confidencial", manteniendo la transparencia de los montos sin exponer públicamente datos personales.
5. **Incorporación del Secretario General en las Firmas**: Se sumó la firma oficial del Secretario General al bloque de validación ministerial (Pastor Principal, Secretario General, Tesorero General y Comité de Auditoría).
6. **Reporte Ejecutivo Mes a Mes**: Al consultar el Total General o el año, se despliega una tabla comparativa con los ingresos (ofrendas y diezmos), gastos y balance neto de cada mes. Las tablas de detalle mantienen su orden cronológico continuo y ordenado por fecha.

### ¿Qué significa para el proyecto?
- **Agilidad operativa**: Menos clics para corregir clasificaciones de movimientos contables y registrar operaciones diarias.
- **Privacidad y formalidad eclesiástica**: Respaldo institucional completo con 4 firmas ministeriales y protección de la identidad de los diezmantistas en asambleas y reuniones públicas.
- **Claridad gerencial**: Visión ejecutiva mes a mes para evaluar el crecimiento financiero y la mayordomía congregacional.

---

## ✅ Lanzamiento de Versión v1.4.1: Reporte PDF perfectamente alineado con Resumen y Caja General

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 12:16:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?
1. **Saldos Idénticos en el Reporte PDF**: El informe oficial en PDF ahora refleja con total exactitud las cifras del Resumen General y del Libro de Caja General. Las entradas de caja suman únicamente las ofrendas y diezmos operativos, y el balance neto coincide centavo a centavo con la liquidez real de la caja general.
2. **Separación Contable Transparente de Proyectos**: Los aportes a proyectos pactados ya no se mezclan con las ofrendas ordinarias en la primera tabla. Ahora tienen su propia sub-tabla detallada dentro de la sección de Proyectos Pactados, mostrando con nombre y apellido cada recibo y aporte del período sin distorsionar la caja operativa.
3. **Franja Ejecutiva de Desglose**: Se añadió una barra de indicadores ejecutivos al reporte PDF que muestra los montos y porcentajes de Ofrendas y Diezmos, así como el desglose exacto de lo recaudado en cultos de Miércoles vs Domingo.
4. **Opción de Imprimir Libro Diario con Saldos**: Se incluyó un selector que permite imprimir también la bitácora completa de movimientos de caja con su respectiva columna de "Saldo en Caja" acumulado paso a paso.
5. **Descarga de Datos en CSV Sincronizada**: La exportación en formato de hoja de cálculo CSV genera la información con la misma separación nítida y estructurada.

### ¿Qué significa para el proyecto?
- **Claridad total ante la congregación y líderes**: El informe impreso o en PDF coincide exactamente con lo que el pastor y los tesoreros ven en la pantalla principal.
- **Auditoría sin confusiones**: Cada fondo (Caja General y Proyectos) mantiene su independencia y propósito contable intacto.

---

## ✅ Lanzamiento de Versión v1.4.0: Sincronización de saldos en resumen, reporte oficial en PDF de alta fidelidad y visualización de contraseña

| Campo | Detalle |
|-------|---------|
| **Fecha** | 2026-09-29 12:10:00 |
| **Responsable** | David Méndez |

### ¿Qué se realizó?
1. **Sincronización Total de Saldos Contables**: El balance mostrado en la pantalla principal (Resumen General) y en el distintivo superior ("CAJA") ahora coincide de forma idéntica con el Libro de Caja General (-$662.00), deduciendo los gastos únicamente de las entradas corrientes (ofrendas y diezmos) y manteniendo los proyectos pactados como un fondo separado.
2. **Corrección Matemática en Cultos de Miércoles vs Domingo**: Se corrigió el cálculo de recaudación por día de servicio, eliminando la duplicación cruzada de ofrendas. Ahora cada culto refleja exactamente lo que se recaudó en su respectivo día.
3. **Reporte Financiero Oficial en PDF Mejorado**: Se perfeccionó la diagramación para impresión en PDF tamaño Carta. Al imprimir el reporte oficial, toda la interfaz de la página web se oculta por completo, comenzando directamente en la página 1 con el membrete institucional íntegro y sin divisiones a la mitad de página.
4. **Impresión Directa y Membrete en Libro de Caja**: El Libro de Caja General ahora cuenta con un botón para imprimir directamente la tabla con formato formal de auditoría, totales en el pie de tabla y espacio para tres firmas ministeriales (Pastor Principal, Tesorero General y Comité de Auditoría).
5. **Visibilidad de Contraseña en el Login**: Se añadió un botón con icono de ojo para mostrar u ocultar la contraseña al iniciar sesión o registrarse.

### ¿Qué significa para el proyecto?
- **Cero discrepancias en tesorería**: El pastor y los líderes de mayordomía verán exactamente la misma cifra de saldo en cualquier pantalla del sistema.
- **Reportes ejecutivos listos para asamblea**: Los documentos impresos o exportados a PDF tienen un acabado profesional tipo estado de cuenta bancario/eclesiástico.
- **Mayor facilidad de acceso**: Los usuarios pueden verificar lo que escriben en su contraseña antes de iniciar sesión.

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
