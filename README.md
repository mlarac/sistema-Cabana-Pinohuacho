# Cabaña Pino Huacho - Sistema de Reservas

Sistema web completo para la gestión de reservas de **Cabaña Pino Huacho** en la IX Región de la Araucanía, Chile.

## Características Principales

### Sitio Web Público
- **Portada optimizada** con imágenes WebP, mapa de ubicación con acceso a Google Maps y botón directo de WhatsApp.
- **Calendario en tiempo real** con tarifas visibles por noche y selección de rangos multi-mes.
- **Características y galería real** (capacidad hasta **5 personas / 2 habitaciones**) con visor lightbox nativo.
- **Formulario de reserva en 3 pasos**: crea solicitudes en estado **Pendiente (`pending`)** con código único (`PH-YYYY-XXXX`), notificación por correo al huésped y al administrador.
- **Consulta de reserva** (`/consultar-reserva`) por código y correo electrónico.
- **SEO local**: Open Graph, JSON-LD `LodgingBusiness`, `robots.txt` y `/sitemap.xml`.

### Panel de Administración (`/admin`)
- **Dashboard** con métricas reales (excluyendo canceladas) y actualización automática vía `/admin/api/stats`.
- **Gestión completa de reservas**: búsqueda, filtro por estado, confirmar pendientes, editar, crear reservas manuales, cancelar (liberando fechas) y exportar a CSV.
- **Calendario maestro**: actualizar disponibilidad por día o por rango de fechas (mantenimiento / bloqueo manual).
- **Gestión de precios**: tarifas por categoría (normal, fin de semana, temporada alta, feriado, especial), por rango de fechas o por día individual.

### Seguridad
- Protección **CSRF** por sesión en todos los formularios y llamadas `POST`.
- Sesiones persistentes en base de datos (`SequelizeSessionStore`, compatible con **SQLite** y **MySQL**), `httpOnly`, `sameSite: 'lax'` y regeneración de sesión en login.
- **Rate limiting** en `/admin/login`, `/reservar` y `/api/*`.
- **Helmet** con CSP estricta (sin scripts inline), escape HTML en correos y protección contra CSV formula injection.
- Transacciones de base de datos para evitar dobles reservas (overbooking) y fechas normalizadas en `DATEONLY` (`YYYY-MM-DD`).

## Tecnologías Utilizadas
- **Backend**: Node.js + Express.js
- **Base de datos**: Sequelize ORM — **SQLite** en desarrollo/tests y **MySQL (`mysql2`)** en producción
- **Vistas**: EJS (`express-ejs-layouts`) + Bootstrap 5
- **Autenticación**: `express-session` + `bcryptjs`
- **Validación y Email**: `express-validator` + `nodemailer`
- **Pruebas**: `node:test` + `supertest`

## Instalación y Configuración

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Edita `.env` con tus datos de contacto, correo y credenciales.

3. **Inicializar / migrar la base de datos**
   - En un entorno nuevo (desarrollo SQLite o producción MySQL):
     ```bash
     npm run db:migrate
     npm run db:seed
     ```
   - Si actualizas una base `database.sqlite` antigua (con fechas `DATETIME`):
     ```bash
     npm run db:migrate:dates
     ```
     *(crea respaldo automático en `database.sqlite.bak` antes de convertir a `DATEONLY`)*.

4. **Optimizar imágenes a WebP**
   ```bash
   npm run images:optimize
   ```

5. **Ejecutar pruebas automatizadas**
   ```bash
   npm test
   ```

6. **Iniciar el servidor**
   ```bash
   # Desarrollo
   npm run dev

   # Producción
   npm start
   ```

## Producción con MySQL

Configura las siguientes variables en `.env` (o en tu plataforma de despliegue):

```env
NODE_ENV=production
TZ=America/Santiago
SESSION_SECRET=clave-aleatoria-de-al-menos-32-caracteres
DATABASE_URL=mysql://usuario:password@host:3306/cabana_pinohuacho
# O alternativamente: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, DB_SSL=true
```

Luego ejecuta las migraciones y el seeder inicial:
```bash
NODE_ENV=production npm run db:migrate
NODE_ENV=production npm run db:seed
```

El endpoint de salud está disponible en `/health` y la documentación Swagger en `/api-docs` (en producción requiere sesión de administrador).
