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

    // 1. Fetch Real Customers
    const [customers] = await connection.execute('SELECT * FROM customers');
    if (customers.length === 0) {
      console.log('⚠️ No customers found. Using dummy customer data.');
      customers.push({ 
        name: 'Walk-in Customer', 
        contact: '09123456789', 
        address: 'Store', 
        landmark: 'N/A' 
      });
    } else {
      console.log(`✅ Found ${customers.length} existing customers.`);
    }

    // 2. Fetch Real Products (to link items)
    const [products] = await connection.execute('SELECT id, price FROM products LIMIT 10');
    if (products.length === 0) {
      console.log('⚠️ No products found. Sales will be created without items.');
    } else {
      console.log(`✅ Found ${products.length} products to use in orders.`);
    }

    // Helper: Random item from array
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    // Helper: Past Date Generator
    const getPastDate = (daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    // 3. Define Scenarios (Days Ago)
    const scenarios = [0, 0, 1, 3, 5, 15, 20, 30, 60, 120]; 

    console.log('🚀 Generating sales...');

    for (const daysAgo of scenarios) {
      const customer = getRandom(customers);
      const product = products.length > 0 ? getRandom(products) : null;
      
      // Calculate random totals
      const qty = Math.floor(Math.random() * 5) + 1;
      const price = product ? parseFloat(product.price) : 500;
      const total = qty * price;

      // INSERT SALE
      // Note: Removed 'user_id' based on your previous error
      const [saleResult] = await connection.execute(`
        INSERT INTO sales 
        (customer_name, contact, payment, payment_status, delivery_type, address, landmark, total, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customer.name || customer.customer_name, // Try both column names
        customer.contact || customer.contact_number || '09000000000',
        ['Cash', 'Gcash', 'Bank Transfer'][Math.floor(Math.random() * 3)],
        'Paid',
        'Pickup',
        customer.address || 'N/A',
        customer.landmark || 'N/A',
        total,
        getPastDate(daysAgo)
      ]);

      const saleId = saleResult.insertId;

      // INSERT SALE ITEM (If products exist)
      if (product) {
        // Check if 'sale_items' or 'order_items' table exists (assuming sale_items based on standard practice)
        try {
           await connection.execute(`
            INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal)
            VALUES (?, ?, ?, ?, ?)
          `, [saleId, product.id, qty, price, total]);
        } catch (err) {
          // Ignore if table name differs, the main dashboard works off the 'sales' table anyway
        }
      }
    }

    console.log('✅ Success! Dashboard populated with real customer data.');
    console.log('📊 Refresh your Admin Dashboard to see the charts.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

seedSmartData();