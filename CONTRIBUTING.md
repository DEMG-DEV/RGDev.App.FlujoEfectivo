# Guía de Contribución 🛠️

¡Gracias por tu interés en contribuir al **Sistema de Flujo de Efectivo Eclesiástico**! Tu apoyo permite que congregaciones de todo el mundo administren sus recursos con excelencia, transparencia y fidelidad contable.

---

## 📋 Tabla de Contenidos

1. [Código de Conducta](#-código-de-conducta)
2. [Cómo Empezar](#-cómo-empezar)
3. [Desarrollo Local y Docker](#-desarrollo-local-y-docker)
4. [Flujo de Trabajo con Git y Ramas](#-flujo-de-trabajo-con-git-y-ramas)
5. [Estilo de Código y Buenas Prácticas](#-estilo-de-código-y-buenas-prácticas)
6. [Reporte de Errores (Bugs)](#-reporte-de-errores-bugs)
7. [Sugerencia de Mejoras](#-sugerencia-de-mejoras)
8. [Envío de Pull Requests](#-envío-de-pull-requests)

---

## 📜 Código de Conducta

Al participar en este proyecto, te comprometes a respetar y seguir nuestro [Código de Conducta](CODE_OF_CONDUCT.md). Mantengamos una actitud servicial, respetuosa y constructiva.

---

## 🚀 Cómo Empezar

### Requisitos Previos
- **Node.js**: v18.0.0 o superior (recomendado v20 LTS).
- **pnpm** (recomendado) o **npm**.
- **Docker & Docker Compose** (opcional pero muy recomendado para bases de datos locales).

### Instalación Rápida
```bash
# 1. Clona el repositorio
git clone https://github.com/DEMG-DEV/RGDev.App.FlujoEfectivo.git
cd RGDev.App.FlujoEfectivo

# 2. Instala dependencias
pnpm install # o npm install

# 3. Configura variables de entorno
cp .env.example .env
# Modifica .env con tus credenciales locales o remotas
```

---

## 🐳 Desarrollo Local y Docker

Para garantizar que tus pruebas nunca alteren la base de datos de producción en Aiven, el proyecto incluye un entorno Docker preconfigurado:

```bash
# Iniciar PostgreSQL local aislado en el puerto 5433
pnpm docker:up

# Ejecutar el servidor de desarrollo apuntando a la base local
pnpm dev:local

# Detener el contenedor al terminar
pnpm docker:down
```

---

## 🌿 Flujo de Trabajo con Git y Ramas

1. Haz un Fork del repositorio y clona tu bifurcación.
2. Crea una rama temática descriptiva a partir de `main`:
   ```bash
   git checkout -b feature/nombre-de-la-mejora
   # o
   git checkout -b fix/correccion-del-bug
   ```
3. Convención de ramas recomendada:
   - `feature/` para nuevas funcionalidades.
   - `fix/` o `bugfix/` para resolución de errores.
   - `docs/` para mejoras de documentación.
   - `refactor/` para refactorización sin cambios en comportamiento externo.

---

## 🎨 Estilo de Código y Buenas Prácticas

1. **TypeScript Estricto:** Asegúrate de tipar interfaces y tipos en `src/types/index.ts`. No uses `any` a menos que sea estrictamente necesario.
2. **Apple Human Interface Guidelines (HIG):**
   - Uso de bordes suaves (`rounded-2xl`, `rounded-3xl`), fondos con desenfoque de cristal (`backdrop-blur-xl bg-white/90`), sombras difusas y colores semánticos sobrios.
   - Preservar números tabulares (`tabular-nums`) para montos monetarios.
   - Garantizar un touch target mínimo de 44x44px en móviles y soporte de safe areas.
3. **Verificación Previa a Commit:**
   Antes de abrir un PR, ejecuta siempre:
   ```bash
   pnpm run build # Verifica TypeScript (tsc -b) y compilación Vite
   ```
   El comando debe terminar con **0 errores**.

---

## 🐛 Reporte de Errores (Bugs)

Si encuentras un error o inconsistencia contable:
1. Revisa la sección de [Issues](https://github.com/DEMG-DEV/RGDev.App.FlujoEfectivo/issues) para verificar si ya fue reportado.
2. Si es nuevo, utiliza la plantilla oficial de **Bug Report** proporcionando:
   - Pasos detallados para reproducir el problema.
   - Comportamiento observado vs comportamiento esperado.
   - Capturas de pantalla o logs de consola del navegador si aplican.
   - Navegador y sistema operativo utilizado.

---

## 💡 Sugerencia de Mejoras

Las propuestas de nuevas características eclesiásticas (nuevos reportes, filtros, integraciones) son bienvenidas:
- Utiliza la plantilla de **Feature Request** explicando el valor que aportará a la administración de las iglesias.

---

## 📤 Envío de Pull Requests

1. Asegúrate de que tu rama esté actualizada con el último `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Completa todos los puntos de la plantilla [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
3. Mantén los commits atómicos y claros con mensajes convencionales (`feat: ...`, `fix: ...`, `docs: ...`).
4. Solicita la revisión a los mantenedores del proyecto.

¡Gracias por edificar este proyecto con tu talento y esfuerzo! 🙏
