import bcrypt from 'bcryptjs';
import { getPool } from '../config/database.js';

export class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }
      const pool = getPool();
      let [rows] = await pool.execute('SELECT id, username, email, password_hash, role, status, avatar FROM users WHERE email = ?', [email]);

      // Bootstrap default admin if users table is empty
      if (rows.length === 0) {
        const [countRows] = await pool.execute('SELECT COUNT(*) as cnt FROM users');
        if ((countRows[0]?.cnt || 0) === 0) {
          const defaultHash = await bcrypt.hash('admin', 10);
          await pool.execute(
            "INSERT INTO users (username, email, password_hash, role, status) VALUES ('Admin', 'admin@gmail.com', ?, 'admin', 'Active')",
            [defaultHash]
          );
          // Try to fetch again
          ;[rows] = await pool.execute('SELECT id, username, email, password_hash, role, status, avatar FROM users WHERE email = ?', [email]);
        }
      }

      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const user = rows[0];
      const ok = await bcrypt.compare(password, user.password_hash).catch(() => false);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      if (user.status !== 'Active') {
        return res.status(403).json({ success: false, message: 'User is inactive' });
      }
      res.json({ success: true, data: { id: user.id, username: user.username, email: user.email, role: user.role, status: user.status, avatar: user.avatar } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }

  static async changePassword(req, res) {
    try {
      const { userId, current_password, new_password } = req.body;
      if (!userId || !current_password || !new_password) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
      }
      const pool = getPool();
      const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
      const ok = await bcrypt.compare(current_password, rows[0].password_hash).catch(() => false);
      if (!ok) return res.status(401).json({ success: false, message: 'Current password incorrect' });
      const newHash = await bcrypt.hash(new_password, 10);
      await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
      res.json({ success: true, message: 'Password updated' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  }
}
