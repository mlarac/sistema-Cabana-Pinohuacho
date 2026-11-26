const session = require('express-session');
const { Op } = require('sequelize');

/**
 * Store de sesiones sobre Sequelize compatible con SQLite (dev/test) y MySQL (producción).
 */
class SequelizeSessionStore extends session.Store {
  constructor(SessionModel, options = {}) {
    super();
    this.SessionModel = SessionModel;
    this.defaultTtlMs = options.defaultTtlMs || 24 * 60 * 60 * 1000;
    const cleanupIntervalMs = options.cleanupIntervalMs || 60 * 60 * 1000;

    if (process.env.NODE_ENV !== 'test') {
      this._cleanupTimer = setInterval(() => {
        this.clearExpired().catch(() => {});
      }, cleanupIntervalMs);
      if (this._cleanupTimer.unref) {
        this._cleanupTimer.unref();
      }
    }
  }

  _computeExpires(sess) {
    if (sess && sess.cookie && sess.cookie.expires) {
      return new Date(sess.cookie.expires);
    }
    const maxAge = sess && sess.cookie && sess.cookie.maxAge
      ? sess.cookie.maxAge
      : this.defaultTtlMs;
    return new Date(Date.now() + maxAge);
  }

  get(sid, callback) {
    this.SessionModel.findByPk(sid)
      .then((row) => {
        if (!row) return callback(null, null);
        if (row.expires && new Date(row.expires).getTime() <= Date.now()) {
          return this.destroy(sid, () => callback(null, null));
        }
        try {
          const parsed = row.data ? JSON.parse(row.data) : null;
          callback(null, parsed);
        } catch (err) {
          callback(err);
        }
      })
      .catch((err) => callback(err));
  }

  set(sid, sess, callback = () => {}) {
    const expires = this._computeExpires(sess);
    const data = JSON.stringify(sess);
    this.SessionModel.upsert({ sid, expires, data })
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  touch(sid, sess, callback = () => {}) {
    const expires = this._computeExpires(sess);
    this.SessionModel.update({ expires }, { where: { sid } })
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  destroy(sid, callback = () => {}) {
    this.SessionModel.destroy({ where: { sid } })
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  async clearExpired() {
    await this.SessionModel.destroy({
      where: {
        expires: { [Op.lt]: new Date() }
      }
    });
  }
}

module.exports = SequelizeSessionStore;
