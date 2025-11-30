import React, { useMemo, useState } from 'react';
import Navbar from '../../components/client/Navbar';
import Footer from '../../components/client/Footer';
import { salesAPI } from '../../utils/api';
import '../../styles/OrdersPage.css';
import bg from '../../assets/image-background.png';

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OrderStatus = () => {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null); // { header, items }

  // Calculate Grand Total
  const grandTotal = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, it) => sum + Number(it.subtotal || it.totalPrice || 0), 0);
  }, [order]);

  const handleSearch = async () => {
    if (!orderId.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      // 1. Fetch sales list filtered by sale_number
      const list = await salesAPI.getSales({ sale_number: orderId.trim() });
      
      // 2. Strict client-side filter to ensure exact match
      const found = (list || []).find(s => (s.sale_number || '').toLowerCase() === orderId.trim().toLowerCase());
      
      if (!found) {
        setError('Order ID not found. Please check and try again.');
        return;
      }
      
      // 3. Fetch line items
      const items = await salesAPI.getSaleItems(found.id);
      
      setOrder({ header: found, items });
    } catch (e) {
      console.error(e);
      setError('Unable to retrieve order details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // --- Visual Timeline Logic ---
  const getTimelineState = (statusString) => {
    const s = (statusString || '').toLowerCase();
    
    if (s.includes('cancel')) return -1; // Cancelled
    if (s.includes('complete') || s.includes('delivered')) return 4;
    if (s.includes('ship') || s.includes('delivery') || s.includes('ready')) return 3;
    if (s.includes('process') || s.includes('prepar')) return 2;
    return 1; // Default: Placed/Pending
  };

  const currentStep = order ? getTimelineState(order.header.status) : 0;

  const steps = [
    { label: 'Order Placed', icon: 'fas fa-file-invoice' },
    { label: 'Processing', icon: 'fas fa-cogs' },
    { label: 'Ready / Shipped', icon: 'fas fa-truck' },
    { label: 'Completed', icon: 'fas fa-check-circle' }
  ];

  return (
    <div className="order-status-wrapper">
      <Navbar />

      {/* Hero Section */}
      <header className="order-hero" style={{ backgroundImage: `url(${bg})` }}>
        <div className="hero-content">
          <h1>Monitor Your Order</h1>
          <p>Check the real-time status of your repair parts and invoices.</p>
        </div>
      </header>

      <main className="order-container">
        
        {/* Search Card */}
        <section className="search-card">
          
          {/* [FIX] STRUCTURAL CHANGE: Label is now independent */}
          <label className="search-label" htmlFor="orderInput">Enter Order Reference ID</label>
          
          {/* [FIX] STRUCTURAL CHANGE: Row contains ONLY inputs that need alignment */}
          <div className="search-row">
            <input 
              id="orderInput"
              type="text" 
              className="search-input"
              placeholder="Ex. SO-10025"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="check-btn" onClick={handleSearch} disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Monitor Order'}
            </button>
          </div>

          {error && (
            <div className="error-msg">
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}
        </section>

        {/* Order Details Card */}
        {order && (
          <div className="order-card">
            <div className="order-header">
              <h2>Order <span className="order-id-highlight">#{order.header.sale_number}</span></h2>
              <button className="print-btn" onClick={() => window.print()}>
                <i className="fas fa-print"></i> Print Details
              </button>
            </div>

            {/* Timeline */}
            <div className="timeline-section">
              <div className="progress-track">
                {steps.map((step, index) => {
                  const stepNum = index + 1;
                  let statusClass = 'step';
                  
                  if (currentStep === -1) {
                    statusClass += ''; 
                  } else {
                    if (currentStep > stepNum) statusClass += ' completed';
                    if (currentStep === stepNum) statusClass += ' active';
                  }

                  return (
                    <div className={statusClass} key={index}>
                      <div className="step-icon">
                        <i className={step.icon}></i>
                      </div>
                      <div className="step-label">{step.label}</div>
                    </div>
                  );
                })}
              </div>
              
              {currentStep === -1 && (
                <div className="cancelled-message">
                  <i className="fas fa-times-circle"></i> This order has been cancelled.
                </div>
              )}
            </div>

            {/* Information Grid */}
            <div className="details-grid">
              <div className="detail-item">
                <label>Customer</label>
                <div>{order.header.customer_name || 'Walk-in / Guest'}</div>
              </div>
              <div className="detail-item">
                <label>Current Status</label>
                <div style={{ color: currentStep === -1 ? '#c0392b' : 'var(--brand-blue)' }}>
                  {order.header.status}
                </div>
              </div>
              <div className="detail-item">
                <label>Payment Status</label>
                <div>{order.header.payment_status || 'Pending'}</div>
              </div>
              <div className="detail-item">
                <label>Fulfillment Type</label>
                <div>{order.header.delivery_type || 'Standard'}</div>
              </div>
            </div>

            {/* Products Table */}
            <div className="table-wrapper">
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Brand</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.product_name || item.productName}</td>
                      <td>{item.brand || 'N/A'}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{peso(item.price)}</td>
                      <td className="text-right">{peso(item.subtotal || (Number(item.price) * Number(item.quantity)))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <div className="grand-total">
                Total Amount: <span>{peso(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OrderStatus;