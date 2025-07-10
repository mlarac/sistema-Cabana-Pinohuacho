# Cabaña Pino Huacho - Sistema de Reservas

Sistema web completo para la gestión de reservas de una cabaña en Pino Huacho, IX Región de la Araucanía, Chile.

## Características Principales

### 🏠 Sitio Web Público
- **Página de inicio** con hero section atractivo y galería de fotos
- **Sección de características** detallada con comodidades y especificaciones
- **Sistema de reservas** con calendario interactivo
- **Diseño responsive** optimizado para móviles y desktop
- **Confirmación automática** por email

### 🔧 Panel de Administración
- **Dashboard** con estadísticas y métricas clave
- **Gestión de reservas** (ver, cancelar, modificar)
- **Calendario maestro** para gestionar disponibilidad
- **Autenticación segura** para administradores
- **Interfaz intuitiva** y fácil de usar

### 🛠 Tecnologías Utilizadas
- **Backend**: Node.js + Express.js
- **Base de datos**: SQLite con Sequelize ORM
- **Frontend**: Pug templates + Bootstrap 5
- **Autenticación**: Express-session + bcryptjs
- **Email**: Nodemailer para confirmaciones
- **Validación**: Express-validator

## Instalación y Configuración

### Prerrequisitos
- Node.js 16+ 
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd pino-huacho-cabin
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Inicializar la base de datos**
```bash
npm run db:migrate
npm run db:seed
```

5. **Iniciar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Configuración de Email

Para habilitar las confirmaciones por email, configura las siguientes variables en `.env`:

```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicacion
```

**Nota**: Para Gmail, necesitas generar una contraseña de aplicación en lugar de usar tu contraseña normal.

## Estructura del Proyecto

```
├── app.js                 # Archivo principal del servidor
├── models/               # Modelos de Sequelize
│   ├── index.js
│   ├── User.js
│   ├── Reservation.js
│   └── Availability.js
├── controllers/          # Controladores de rutas
│   ├── homeController.js
│   ├── reservationController.js
│   ├── adminController.js
│   └── authController.js
├── routes/              # Definición de rutas
│   └── index.js
├── views/               # Templates Pug
│   ├── layout.pug
│   ├── index.pug
│   ├── features.pug
│   ├── booking.pug
│   └── admin/
├── public/              # Archivos estáticos
│   ├── css/
│   ├── js/
│   └── images/
└── seeders/            # Datos iniciales
```

## Uso del Sistema

### Para Visitantes
1. **Explorar la cabaña**: Ver fotos y características
2. **Verificar disponibilidad**: Consultar el calendario
3. **Hacer reserva**: Completar formulario y recibir confirmación
4. **Recibir confirmación**: Email automático con detalles

### Para Administradores
1. **Acceder al panel**: `/admin/login` (usuario: admin, contraseña: admin123)
2. **Ver dashboard**: Estadísticas y reservas próximas
3. **Gestionar reservas**: Ver, cancelar o modificar reservas
4. **Actualizar calendario**: Marcar fechas como ocupadas o en mantenimiento

## Personalización

### Cambiar Precios
Edita el archivo `controllers/reservationController.js`:
```javascript
const pricePerNight = 150000; // Cambiar precio por noche en CLP
```

### Modificar Capacidad
Actualiza el modelo `Reservation.js`:
```javascript
guests: {
  type: DataTypes.INTEGER,
  validate: {
    min: 1,
    max: 6 // Cambiar capacidad máxima
  }
}
```

### Personalizar Emails
Modifica la función `sendConfirmationEmail` en `reservationController.js`.

## Seguridad

- ✅ Validación de datos de entrada
- ✅ Protección contra inyección SQL (Sequelize ORM)
- ✅ Sesiones seguras
- ✅ Contraseñas hasheadas
- ✅ Validación de formularios
- ✅ Protección CSRF básica

## Producción

### Variables de Entorno Importantes
```env
NODE_ENV=production
SESSION_SECRET=clave-super-secreta-para-produccion
DATABASE_URL=postgresql://... # Para PostgreSQL en producción
```

### Recomendaciones
- Usar PostgreSQL en lugar de SQLite
- Configurar HTTPS
- Implementar rate limiting
- Configurar logs apropiados
- Usar un servicio de email profesional

## Soporte

Para soporte técnico o consultas sobre el sistema, contacta al desarrollador.

## Licencia

Este proyecto está desarrollado específicamente para Cabaña Pino Huacho.