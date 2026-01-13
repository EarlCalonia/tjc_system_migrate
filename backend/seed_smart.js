import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tjsims_db',
};

async function seedSmartData() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('🔌 Connected to database...');

    // 1. FETCH CUSTOMERS (Smart Method)
    let customers = [];
    try {
      const [rows] = await connection.execute(
        `SELECT DISTINCT customer_name, contact, address FROM sales WHERE customer_name IS NOT NULL LIMIT 20`
      );
      if (rows.length > 0) {
        customers = rows;
        console.log(`✅ Found ${customers.length} existing customers to reuse.`);
      }
    } catch (err) {}

    if (customers.length === 0) {
      customers = [
        { customer_name: 'Walk-in Client', contact: '09123456789', address: 'Storefront' },
        { customer_name: 'Loyal Customer A', contact: '09998887777', address: 'City Plaza' },
        { customer_name: 'New Buyer B', contact: '09223334444', address: 'North Avenue' },
      ];
    }

    // 2. FETCH PRODUCTS
    let products = [];
    try {
      const [rows] = await connection.execute('SELECT id, price FROM products LIMIT 50');
      products = rows;
    } catch (err) {}

    // Helpers
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    // Generates Unique Sale Number: SA-20231201-1234
    const generateSaleNumber = () => {
      const datePart = new Date().toISOString().slice(0,10).replace(/-/g, '');
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `SA-${datePart}-${randomPart}`;
    };

    const getPastDate = (daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setHours(Math.floor(Math.random() * 10) + 9); // Random hour 9am-7pm
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    // 3. GENERATE SALES
    // 0 = Today, 1 = Yesterday, etc.
    const scenarios = [0, 0, 0, 1, 3, 3, 5, 7, 10, 15, 20, 25, 30, 45, 60, 150]; 

    console.log('🚀 Generating sales data...');

    for (const daysAgo of scenarios) {
      const customer = getRandom(customers);
      const product = products.length > 0 ? getRandom(products) : null;
      
      const qty = Math.floor(Math.random() * 3) + 1;
      const price = product ? parseFloat(product.price) : (Math.floor(Math.random() * 500) + 100);
      const total = qty * price;
      const saleNo = generateSaleNumber(); // Generate unique ID

      // INSERT SALE (Now includes sale_number)
      const query = `
        INSERT INTO sales 
        (sale_number, customer_name, contact, payment, payment_status, delivery_type, address, landmark, total, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [saleResult] = await connection.execute(query, [
        saleNo, // <--- Fixed: Added Unique Sale Number
        customer.customer_name || customer.name || 'Valued Customer',
        customer.contact || '09000000000',
        ['Cash', 'Gcash'][Math.floor(Math.random() * 2)],
        'Paid',
        'Pickup',
        customer.address || 'N/A',
        'N/A',
        total,
        getPastDate(daysAgo)
      ]);

      // INSERT SALE ITEM
      if (product && saleResult.insertId) {
        try {
           await connection.execute(`
            INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal)
            VALUES (?, ?, ?, ?, ?)
          `, [saleResult.insertId, product.id, qty, price, total]);
        } catch (err) {}
      }
      
      // Small pause to ensure unique timestamps/IDs
      await new Promise(r => setTimeout(r, 10));
    }

    console.log(`✅ Success! Added ${scenarios.length} new sales records.`);
    console.log('📊 Refresh your Admin Dashboard to see the charts.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

seedSmartData();