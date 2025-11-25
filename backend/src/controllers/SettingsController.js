import { getPool } from '../config/database.js';

export class SettingsController {
  static async getSettings(req, res) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute('SELECT * FROM app_settings ORDER BY id LIMIT 1');
      const s = rows[0] || null;
      res.json({ success: true, data: s });
    } catch (err) {
      console.error('Get settings error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
  }

  static async updateBusinessInfo(req, res) {
    try {
      const { store_name, address, contact_number, email } = req.body;
      const pool = getPool();
      const [rows] = await pool.execute('SELECT id FROM app_settings ORDER BY id LIMIT 1');
      if (rows.length === 0) {
        await pool.execute(
          'INSERT INTO app_settings (store_name, address, contact_number, email) VALUES (?,?,?,?)',
          [store_name || '', address || '', contact_number || '', email || '']
        );
      } else {
        await pool.execute(
          'UPDATE app_settings SET store_name=?, address=?, contact_number=?, email=? WHERE id=?',
          [store_name || '', address || '', contact_number || '', email || '', rows[0].id]
        );
      }
      res.json({ success: true, message: 'Business information saved' });
    } catch (err) {
      console.error('Update business info error:', err);
      res.status(500).json({ success: false, message: 'Failed to save business information' });
    }
  }

  static async updatePreferences(req, res) {
    try {
      const { cash_enabled, gcash_enabled, cod_enabled } = req.body;
      const pool = getPool();
      const [rows] = await pool.execute('SELECT id FROM app_settings ORDER BY id LIMIT 1');
      if (rows.length === 0) {
        await pool.execute(
          'INSERT INTO app_settings (store_name, address, contact_number, email, cash_enabled, gcash_enabled, cod_enabled) VALUES ("", "", "", "", ?, ?, ?)',
          [cash_enabled ? 1 : 0, gcash_enabled ? 1 : 0, cod_enabled ? 1 : 0]
        );
      } else {
        await pool.execute(
          'UPDATE app_settings SET cash_enabled=?, gcash_enabled=?, cod_enabled=? WHERE id=?',
          [cash_enabled ? 1 : 0, gcash_enabled ? 1 : 0, cod_enabled ? 1 : 0, rows[0].id]
        );
      }
      res.json({ success: true, message: 'Preferences saved' });
    } catch (err) {
      console.error('Update preferences error:', err);
      res.status(500).json({ success: false, message: 'Failed to save preferences' });
    }
  }
}
