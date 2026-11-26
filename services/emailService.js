const nodemailer = require('nodemailer');
const cabin = require('../config/cabin');
const { formatCLDate, formatCLP } = require('./dateUtils');

let cachedTransporter = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmailConfigured() {
  return Boolean(
    process.env.NODE_ENV !== 'test' &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    !process.env.EMAIL_USER.includes('your-email') &&
    !process.env.EMAIL_USER.includes('tu-email')
  );
}

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return cachedTransporter;
}

async function sendMailSafe(mailOptions) {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'email_not_configured' };
  }
  try {
    await getTransporter().sendMail({
      from: `"${cabin.name}" <${process.env.EMAIL_USER}>`,
      ...mailOptions
    });
    return { sent: true };
  } catch (error) {
    console.error('Error enviando correo:', error.message);
    return { sent: false, reason: error.message };
  }
}

async function sendReservationReceivedEmail(reservation) {
  const safeName = escapeHtml(reservation.guestName);
  const safeCode = escapeHtml(reservation.bookingCode || `#${reservation.id}`);
  const safeNotes = reservation.notes ? `<p><strong>Notas:</strong> ${escapeHtml(reservation.notes)}</p>` : '';

  return sendMailSafe({
    to: reservation.guestEmail,
    subject: `Solicitud de Reserva Recibida (${safeCode}) - ${cabin.name}`,
    html: `
      <h2>¡Recibimos tu solicitud de reserva!</h2>
      <p>Estimado/a ${safeName},</p>
      <p>Hemos registrado tu solicitud de reserva en <strong>${escapeHtml(cabin.name)}</strong> con estado <strong>Pendiente de Confirmación</strong>.</p>
      <h3>Detalles de la Solicitud:</h3>
      <ul>
        <li><strong>Código de reserva:</strong> ${safeCode}</li>
        <li><strong>Fecha de entrada:</strong> ${formatCLDate(reservation.checkIn)} (${cabin.checkInTime})</li>
        <li><strong>Fecha de salida:</strong> ${formatCLDate(reservation.checkOut)} (${cabin.checkOutTime})</li>
        <li><strong>Huéspedes:</strong> ${reservation.guests}</li>
        <li><strong>Total estimado:</strong> ${formatCLP(reservation.totalPrice)} CLP</li>
      </ul>
      ${safeNotes}
      <p>Nos pondremos en contacto contigo para coordinar el abono y confirmar definitivamente tu estadía.</p>
      <p>También puedes consultar el estado de tu reserva en cualquier momento ingresando tu código y correo en nuestro sitio web.</p>
      <p>Saludos cordiales,<br>Equipo ${escapeHtml(cabin.name)}<br>${escapeHtml(cabin.contact.phone)}</p>
    `
  });
}

async function sendAdminNewReservationEmail(reservation) {
  const adminTo = cabin.contact.notifyEmail;
  if (!adminTo) return { sent: false, reason: 'no_admin_email' };

  const safeName = escapeHtml(reservation.guestName);
  const safeEmail = escapeHtml(reservation.guestEmail);
  const safePhone = escapeHtml(reservation.guestPhone);
  const safeCode = escapeHtml(reservation.bookingCode || `#${reservation.id}`);
  const safeNotes = escapeHtml(reservation.notes || 'Sin notas');

  return sendMailSafe({
    to: adminTo,
    subject: `[Nueva Solicitud ${safeCode}] ${safeName} (${formatCLDate(reservation.checkIn)} - ${formatCLDate(reservation.checkOut)})`,
    html: `
      <h2>Nueva solicitud de reserva pendiente</h2>
      <ul>
        <li><strong>Código:</strong> ${safeCode}</li>
        <li><strong>Huésped:</strong> ${safeName}</li>
        <li><strong>Email:</strong> ${safeEmail}</li>
        <li><strong>Teléfono:</strong> ${safePhone}</li>
        <li><strong>Fechas:</strong> ${formatCLDate(reservation.checkIn)} al ${formatCLDate(reservation.checkOut)}</li>
        <li><strong>Huéspedes:</strong> ${reservation.guests}</li>
        <li><strong>Total estimado:</strong> ${formatCLP(reservation.totalPrice)} CLP</li>
        <li><strong>Notas:</strong> ${safeNotes}</li>
      </ul>
      <p>Ingresa al panel de administración para confirmar o gestionar esta reserva.</p>
    `
  });
}

async function sendReservationConfirmedEmail(reservation) {
  const safeName = escapeHtml(reservation.guestName);
  const safeCode = escapeHtml(reservation.bookingCode || `#${reservation.id}`);

  return sendMailSafe({
    to: reservation.guestEmail,
    subject: `¡Reserva Confirmada! (${safeCode}) - ${cabin.name}`,
    html: `
      <h2>¡Tu reserva ha sido confirmada!</h2>
      <p>Estimado/a ${safeName},</p>
      <p>Te confirmamos que tu reserva <strong>${safeCode}</strong> en <strong>${escapeHtml(cabin.name)}</strong> está <strong>CONFIRMADA</strong>.</p>
      <ul>
        <li><strong>Entrada:</strong> ${formatCLDate(reservation.checkIn)} desde las ${cabin.checkInTime}</li>
        <li><strong>Salida:</strong> ${formatCLDate(reservation.checkOut)} hasta las ${cabin.checkOutTime}</li>
        <li><strong>Huéspedes:</strong> ${reservation.guests}</li>
        <li><strong>Total:</strong> ${formatCLP(reservation.totalPrice)} CLP</li>
      </ul>
      <p>¡Te esperamos en ${escapeHtml(cabin.location)}!</p>
    `
  });
}

async function sendReservationCancelledEmail(reservation) {
  const safeName = escapeHtml(reservation.guestName);
  const safeCode = escapeHtml(reservation.bookingCode || `#${reservation.id}`);

  return sendMailSafe({
    to: reservation.guestEmail,
    subject: `Reserva Cancelada (${safeCode}) - ${cabin.name}`,
    html: `
      <h2>Reserva Cancelada</h2>
      <p>Estimado/a ${safeName},</p>
      <p>Te informamos que la reserva <strong>${safeCode}</strong> (${formatCLDate(reservation.checkIn)} al ${formatCLDate(reservation.checkOut)}) ha sido cancelada.</p>
      <p>Si crees que se trata de un error o deseas reprogramar, contáctanos al ${escapeHtml(cabin.contact.phone)}.</p>
    `
  });
}

module.exports = {
  escapeHtml,
  isEmailConfigured,
  sendReservationReceivedEmail,
  sendAdminNewReservationEmail,
  sendReservationConfirmedEmail,
  sendReservationCancelledEmail
};
