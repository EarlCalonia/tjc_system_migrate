import { getPool } from '../config/database.js';

export class Product {
  static async create(productData) {
    const pool = getPool();
    const {
      name, brand, category, price, status, description,
      vehicle_compatibility, image, requires_serial
    } = productData;

    const [maxIdResult] = await pool.execute('SELECT MAX(id) as maxId FROM products');
    const nextId = (maxIdResult[0].maxId || 0) + 1;
    const productId = `P${nextId.toString().padStart(3, '0')}`;

    const [result] = await pool.execute(
      `INSERT INTO products (product_id, name, brand, category, vehicle_compatibility, price, status, description, image, requires_serial, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [productId, name, brand, category, vehicle_compatibility || null, price, status, description, image, requires_serial ? 1 : 0]
    );
    return result.insertId;
  }

  // --- THIS IS THE CRITICAL FIX ---
  static async findAll(filters = {}, limit = 10, offset = 0) {
    const pool = getPool();
    
    let whereClause = ' WHERE 1=1';
    let params = [];
    const { search, category, brand, status } = filters;

    if (search) {
      whereClause += ' AND (name LIKE ? OR product_id LIKE ? OR brand LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category && category !== 'All Categories') {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    if (brand && brand !== 'All Brand') {
      whereClause += ' AND brand = ?';
      params.push(brand);
    }
    if (status && status !== 'All Status') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // [FIX] We use 'stock' here because that is what your tjsims_db.sql uses.
    // We alias it as 'quantity' because that is what your React Frontend expects.
    const quantitySubquery = `(SELECT COALESCE(SUM(stock), 0) FROM inventory WHERE product_id = products.product_id)`;

    const dataQuery = `
      SELECT products.*, 
      ${quantitySubquery} as quantity 
      FROM products 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...params, parseInt(limit), parseInt(offset)];
    const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;

    const [rows] = await pool.execute(dataQuery, dataParams);
    const [countResult] = await pool.execute(countQuery, params);

    // [DEBUG] This prints the first product to your VS Code terminal so you can verify the data.
    if (rows.length > 0) {
      console.log("DEBUG: First Product Fetched:", { 
        name: rows[0].name, 
        inventory_stock: rows[0].quantity // This should show 55, 18, etc.
      });
    }

    return {
      products: rows,
      total: countResult[0].total
    };
  }

  static async findById(id) {
    const pool = getPool();
    // [FIX] Ensure single product lookup also gets the stock
    const quantitySubquery = `(SELECT COALESCE(SUM(stock), 0) FROM inventory WHERE product_id = products.product_id)`;
    
    const [rows] = await pool.execute(
      `SELECT products.*, ${quantitySubquery} as quantity FROM products WHERE product_id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // ... Keep the rest of your methods (update, delete, getters) as they are ...
  static async update(id, productData) {
    const pool = getPool();
    const {
      name, brand, category, price, status, description,
      vehicle_compatibility, image, requires_serial
    } = productData;

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (brand !== undefined) { updates.push('brand = ?'); params.push(brand); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (vehicle_compatibility !== undefined) { updates.push('vehicle_compatibility = ?'); params.push(vehicle_compatibility || null); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (image !== undefined) { updates.push('image = ?'); params.push(image); }
    if (requires_serial !== undefined) { updates.push('requires_serial = ?'); params.push(requires_serial ? 1 : 0); }

    if (updates.length === 0) throw new Error('No fields to update');

    params.push(id);
    const query = `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE product_id = ?`;
    const [result] = await pool.execute(query, params);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const pool = getPool();
    const [prodRows] = await pool.execute('SELECT product_id FROM products WHERE id = ?', [id]);
    if (prodRows.length === 0) return false;
    const productId = prodRows[0].product_id;

    const [refRows] = await pool.execute('SELECT COUNT(*) as cnt FROM sale_items WHERE product_id = ?', [productId]);
    if ((refRows[0]?.cnt || 0) > 0) {
      const err = new Error('PRODUCT_IN_USE');
      err.code = 'PRODUCT_IN_USE';
      throw err;
    }
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  
  static async hasSerialNumbers(productId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM serial_numbers WHERE product_id = ? AND status IN ("sold", "defective")',
      [productId]
    );
    return rows[0].count > 0;
  }
  
  static async getCategories() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT DISTINCT category FROM products ORDER BY category');
    return rows.map(row => row.category);
  }

  static async getBrands() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT name FROM brands ORDER BY name');
    return rows.map(row => row.name);
  }
}