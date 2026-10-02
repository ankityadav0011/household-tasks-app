const { AppError } = require('../utils/errors');

const toDto = (row) => ({
  name: row.name,
  mobile: row.mobile,
  address: row.address,
  businessName: row.business_name,
});

function createProfileService({ db, now = Date.now }) {
  function get(userId) {
    const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
    if (!row) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile has not been created yet.');
    return toDto(row);
  }

  // Insert, or update if the user already has a profile.
  function save(userId, { name, mobile, address, businessName }) {
    db.prepare(
      `INSERT INTO profiles (user_id, name, mobile, address, business_name, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         name = excluded.name,
         mobile = excluded.mobile,
         address = excluded.address,
         business_name = excluded.business_name,
         updated_at = excluded.updated_at`,
    ).run(userId, name, mobile, address, businessName, now());
    return get(userId);
  }

  return { get, save };
}

module.exports = { createProfileService };
