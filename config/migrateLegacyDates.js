/**
 * Script idempotente para migrar database.sqlite desde esquema antiguo (DATETIME)
 * hacia el esquema normalizado (DATEONLY YYYY-MM-DD en America/Santiago + bookingCode + Sessions).
 * Crea automáticamente database.sqlite.bak antes de modificar nada.
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.resolve(__dirname, '../database.sqlite');
const BACKUP_PATH = path.resolve(__dirname, '../database.sqlite.bak');

function toChileYMD(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Convierte formatos como "2026-01-14 03:00:00.000 +00:00" a ISO válido
  const isoCandidate = str.replace(' ', 'T').replace(' +', '+').replace(' -', '-');
  const d = new Date(isoCandidate);
  if (Number.isNaN(d.getTime())) {
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

function generateBookingCode(ymd, id) {
  const year = (ymd && ymd.slice(0, 4)) || String(new Date().getFullYear());
  return `PH-${year}-${String(id).padStart(4, '0')}`;
}

function migrate() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No existe database.sqlite aún; se creará limpio al iniciar la app.');
    return;
  }

  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log(`Respaldo creado en: ${BACKUP_PATH}`);
  } else {
    console.log(`Respaldo previo preservado en: ${BACKUP_PATH}`);
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = OFF;');

  try {
    db.exec('BEGIN TRANSACTION;');

    // 1. Migrar Reservations
    const resCols = db.prepare('PRAGMA table_info(Reservations)').all();
    if (resCols.length > 0) {
      const oldReservations = db.prepare('SELECT * FROM Reservations ORDER BY id ASC').all();

      db.exec(`
        CREATE TABLE Reservations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookingCode VARCHAR(32) UNIQUE,
          guestName VARCHAR(150) NOT NULL,
          guestEmail VARCHAR(150) NOT NULL,
          guestPhone VARCHAR(40) NOT NULL,
          checkIn DATE NOT NULL,
          checkOut DATE NOT NULL,
          guests INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          totalPrice DECIMAL(10,2) NOT NULL,
          notes TEXT,
          UserId INTEGER REFERENCES Users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        );
      `);

      const insertRes = db.prepare(`
        INSERT INTO Reservations_new
          (id, bookingCode, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, status, totalPrice, notes, UserId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const r of oldReservations) {
        const checkIn = toChileYMD(r.checkIn);
        const checkOut = toChileYMD(r.checkOut);
        const bookingCode = r.bookingCode || generateBookingCode(checkIn, r.id);
        insertRes.run(
          r.id,
          bookingCode,
          r.guestName,
          r.guestEmail,
          r.guestPhone,
          checkIn,
          checkOut,
          r.guests,
          r.status || 'pending',
          r.totalPrice,
          r.notes || null,
          r.UserId || null,
          r.createdAt,
          r.updatedAt
        );
      }

      db.exec('DROP TABLE Reservations;');
      db.exec('ALTER TABLE Reservations_new RENAME TO Reservations;');
      db.exec('CREATE INDEX IF NOT EXISTS idx_reservations_dates_status ON Reservations(checkIn, checkOut, status);');
      db.exec('CREATE INDEX IF NOT EXISTS idx_reservations_status ON Reservations(status);');
      console.log(`Migradas ${oldReservations.length} reservas a DATEONLY + bookingCode.`);
    }

    // 2. Migrar Availabilities
    const availCols = db.prepare('PRAGMA table_info(Availabilities)').all();
    if (availCols.length > 0) {
      const oldAvail = db.prepare('SELECT * FROM Availabilities ORDER BY id ASC').all();

      db.exec(`
        CREATE TABLE Availabilities_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'available',
          price DECIMAL(10,2) NOT NULL DEFAULT 50000,
          priceCategory TEXT NOT NULL DEFAULT 'normal',
          notes TEXT,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        );
      `);

      // Deduplicar por fecha YYYY-MM-DD conservando el registro más reciente
      const byDate = new Map();
      for (const a of oldAvail) {
        const ymd = toChileYMD(a.date);
        if (!ymd) continue;
        byDate.set(ymd, { ...a, date: ymd });
      }

      const insertAvail = db.prepare(`
        INSERT INTO Availabilities_new
          (date, status, price, priceCategory, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const a of byDate.values()) {
        insertAvail.run(
          a.date,
          a.status || 'available',
          a.price ?? 50000,
          a.priceCategory || 'normal',
          a.notes || null,
          a.createdAt,
          a.updatedAt
        );
      }

      db.exec('DROP TABLE Availabilities;');
      db.exec('ALTER TABLE Availabilities_new RENAME TO Availabilities;');
      db.exec('CREATE INDEX IF NOT EXISTS idx_availabilities_category ON Availabilities(priceCategory);');
      db.exec('CREATE INDEX IF NOT EXISTS idx_availabilities_status ON Availabilities(status);');
      console.log(`Migrados ${byDate.size} registros de disponibilidad a DATEONLY (default $50.000).`);
    }

    // 3. Crear tabla Sessions si no existe
    db.exec(`
      CREATE TABLE IF NOT EXISTS Sessions (
        sid VARCHAR(128) PRIMARY KEY NOT NULL,
        expires DATETIME,
        data TEXT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON Sessions(expires);
    `);

    db.exec('COMMIT;');
    console.log('Migración legacy completada exitosamente.');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error durante la migración legacy:', err);
    process.exitCode = 1;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
    db.close();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate, toChileYMD };
