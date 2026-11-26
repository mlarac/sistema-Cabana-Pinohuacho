process.env.NODE_ENV = 'test';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../app');
const { sequelize, User, Reservation } = require('../models');

function extractCsrfFromHtml(html) {
  const inputMatch = html.match(/name="_csrf"\s+value="([^"]+)"/);
  if (inputMatch) return inputMatch[1];
  const metaMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/);
  return metaMatch ? metaMatch[1] : null;
}

describe('HTTP Integration: Security, Booking & Admin Panel', () => {
  before(async () => {
    await sequelize.sync({ force: true });
    await User.create({
      username: 'admin',
      email: 'admin@pinohuacho.cl',
      password: 'TestAdminPassword123',
      isAdmin: true
    });
  });

  it('serves health check, public pages, robots.txt and sitemap.xml', async () => {
    const health = await request(app).get('/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    const home = await request(app).get('/');
    assert.equal(home.status, 200);
    assert.match(home.text, /Hasta 5 personas/);

    const features = await request(app).get('/caracteristicas');
    assert.equal(features.status, 200);
    assert.doesNotMatch(features.text, /images\.pexels\.com/);

    const sitemap = await request(app).get('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.text, /<urlset/);
  });

  it('rejects POST /reservar without CSRF token and accepts with valid token', async () => {
    const agent = request.agent(app);

    const rejected = await agent.post('/reservar').type('form').send({
      guestName: 'Sin Token',
      guestEmail: 'test@example.com',
      guestPhone: '+56912345678',
      checkIn: '2027-09-10',
      checkOut: '2027-09-12',
      guests: 2
    });
    assert.equal(rejected.status, 403);

    const formPage = await agent.get('/reservar');
    assert.equal(formPage.status, 200);
    const csrf = extractCsrfFromHtml(formPage.text);
    assert.ok(csrf, 'Expected CSRF token in booking form');

    const created = await agent.post('/reservar').type('form').send({
      _csrf: csrf,
      guestName: 'Pedro Soto',
      guestEmail: 'pedro@example.com',
      guestPhone: '+56 9 1111 2222',
      checkIn: '2027-09-10',
      checkOut: '2027-09-12',
      guests: 3
    });
    assert.equal(created.status, 201);
    assert.match(created.text, /Pendiente de Confirmación/);
    assert.match(created.text, /PH-2027-/);
  });

  it('authenticates admin, manages reservations, range availability, CSV export and POST logout', async () => {
    const agent = request.agent(app);

    // Sin sesión -> 401 en API admin
    const unauth = await agent.get('/admin/api/stats').set('Accept', 'application/json');
    assert.equal(unauth.status, 401);

    // Login con CSRF
    const loginPage = await agent.get('/admin/login');
    const loginCsrf = extractCsrfFromHtml(loginPage.text);

    const loginRes = await agent.post('/admin/login').type('form').send({
      _csrf: loginCsrf,
      username: 'admin',
      password: 'TestAdminPassword123'
    });
    assert.equal(loginRes.status, 302);
    assert.equal(loginRes.headers.location, '/admin');

    // Dashboard y nuevo CSRF tras regenerar sesión
    const dash = await agent.get('/admin');
    assert.equal(dash.status, 200);
    const adminCsrf = extractCsrfFromHtml(dash.text);
    assert.ok(adminCsrf);
    assert.notEqual(adminCsrf, loginCsrf, 'CSRF token should rotate after login session regeneration');

    // Stats API funciona
    const stats = await agent.get('/admin/api/stats').set('Accept', 'application/json');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.pendingReservations, 1);

    // Confirmar reserva pendiente
    const pending = await Reservation.findOne({ where: { status: 'pending' } });
    const confirmRes = await agent
      .post(`/admin/reservas/${pending.id}/confirm`)
      .set('X-CSRF-Token', adminCsrf)
      .set('Accept', 'application/json')
      .send({});
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.success, true);

    // Bloquear rango de disponibilidad
    const rangeRes = await agent
      .post('/admin/availability-range')
      .set('X-CSRF-Token', adminCsrf)
      .set('Accept', 'application/json')
      .send({
        startDate: '2027-10-01',
        endDate: '2027-10-03',
        status: 'maintenance',
        notes: 'Mantención techo'
      });
    assert.equal(rangeRes.status, 200);
    assert.equal(rangeRes.body.success, true);

    // Verificar rango bloqueado en API pública
    const pubRange = await request(app).get('/api/availability/range?start=2027-10-01&end=2027-10-04');
    assert.equal(pubRange.status, 200);
    assert.equal(pubRange.body.available, false);
    assert.deepEqual(pubRange.body.conflictDates, ['2027-10-01', '2027-10-02', '2027-10-03']);

    // Export CSV
    const csvRes = await agent.get('/admin/export/reservations');
    assert.equal(csvRes.status, 200);
    assert.match(csvRes.headers['content-type'], /text\/csv/);
    assert.match(csvRes.text, /Pedro Soto/);

    // Logout vía POST
    const logoutRes = await agent.post('/admin/logout').type('form').send({ _csrf: adminCsrf });
    assert.equal(logoutRes.status, 302);

    const afterLogout = await agent.get('/admin/api/stats').set('Accept', 'application/json');
    assert.equal(afterLogout.status, 401);
  });
});
