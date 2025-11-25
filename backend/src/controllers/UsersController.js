import bcrypt from 'bcryptjs';
import { getPool } from '../config/database.js';

export class UsersController {
  static async list(req, res) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute('SELECT id, username, first_name, middle_name, last_name, email, role, status, avatar FROM users ORDER BY created_at DESC');
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('List users error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  }

  static async create(req, res) {
    try {
      const { username, first_name, middle_name, last_name, email, password, role = 'staff', status = 'Active' } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'email and password are required' });
      }
      if (!first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'first_name and last_name are required' });
      }
      const pool = getPool();
      const hash = await bcrypt.hash(password, 10);
      const avatarPath = req.file ? `/${req.file.path.replace(/\\/g, '/')}`.replace('src/', '') : null;
      
      // Generate username from name fields if not provided
      const fullUsername = username || `${last_name}, ${first_name}${middle_name ? ' ' + middle_name : ''}`;
      
      await pool.execute(
        'INSERT INTO users (username, first_name, middle_name, last_name, email, password_hash, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [fullUsername, first_name, middle_name || null, last_name, email, hash, role, status, avatarPath]
      );
      res.status(201).json({ success: true, message: 'User created' });
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({ success: false, message: 'Failed to create user' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { username, role, status } = req.body;
      const pool = getPool();
      const updates = [];
      const params = [];
      if (username !== undefined) { updates.push('username = ?'); params.push(username); }
      if (role !== undefined) { updates.push('role = ?'); params.push(role); }
      if (status !== undefined) { updates.push('status = ?'); params.push(status); }
      let avatarPath = null;
      if (req.file) { 
        avatarPath = `/${req.file.path.replace(/\\/g, '/')}`.replace('src/', '');
        updates.push('avatar = ?'); 
        params.push(avatarPath); 
      }
      if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
      params.push(id);
      await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, message: 'User updated', avatar: avatarPath || undefined });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ success: false, message: 'Failed to update user' });
    }
  }
}
