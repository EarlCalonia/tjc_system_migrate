import React, { useMemo, useState } from 'react';
import Navbar from '../../components/client/Navbar';
import Footer from '../../components/client/Footer';
import { salesAPI } from '../../utils/api';
import '../../styles/OrdersPage.css'; // Shared CSS
import bg from '../../assets/image-background.png';

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OrderStatus = () => {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null); 

  const grandTotal = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, it) => sum + Number(it.subtotal || it.totalPrice || 0), 0);
  }, [order]);

  const handleSearch = async () => {
    if (!orderId.trim()) return;
    setLoading(true); setError(''); setOrder(null);
    try {
      const list = await salesAPI.getSales({ sale_number: orderId.trim() });
      const found = (list || []).find(s => (s.sale_number || '').toLowerCase() === orderId.trim().toLowerCase());
      
      if (!found) { setError('Order not found. Check your Reference ID.'); return; }
      
      const items = await salesAPI.getSaleItems(found.id);
      setOrder({ header: found, items });
    } catch (e) {
      console.error(e);
      setError('System error. Please try again.');
    } finally { setLoading(false); }
  };

  const getTimelineStep = (status) => {
    const s = (status || '').toLowerCase();
    if (['cancelled', 'refunded', 'returned'].some(x => s.includes(x))) return -1;
    if (s === 'completed') return 3;
    if (s === 'processing') return 2;
    return 1; 
  };

  const currentStep = order ? getTimelineStep(order.header.status) : 0;

  const steps = [
    { label: 'Order Placed', icon: 'fas fa-clipboard-list' },
    { label: 'Processing', icon: 'fas fa-cogs' },
    { label: 'Ready / Completed', icon: 'fas fa-check-circle' }
  ];

  return (
    <div className="order-status-wrapper">
      <Navbar />
      <header className="order-hero" style={{ backgroundImage: `url(${bg})` }}>
        <div className="hero-content">
          {/* [FIX] Terminology: Monitor instead of Track */}
          <h1>Monitor Order</h1>
          <p>Enter your Order Reference ID to see real-time status.</p>
        </div>
      </header>

      <main className="order-container" style={{ marginTop: '-60px' }}>
        {/* Search */}
        <section className="search-card">
          <label className="search-label" htmlFor="orderInput">Reference ID</label>
          <div className="search-row">
            <input 
              id="orderInput" type="text" className="search-input" placeholder="e.g. SL251015001"
              value={orderId} onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="check-btn" onClick={handleSearch} disabled={loading}>
              {/* [FIX] Button text update */}
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'MONITOR'}
            </button>
          </div>
          {error && <div className="error-msg"><i className="fas fa-exclamation-circle"></i> {error}</div>}
        </section>

        {/* Result */}
        {order && (
          <div className="order-card">
            <div className="order-header">
              <h2>#{order.header.sale_number}</h2>
              {/* [FIX] Print Button Removed */}
            </div>

            {/* TIMELINE */}
            <div className="timeline-section">
               {currentStep === -1 ? (
                 <div className="cancelled-message">
                   <i className="fas fa-ban"></i>
                   <div>Order {order.header.status}</div>
                 </div>
               ) : (
                 <div className="progress-track">
                   {steps.map((step, i) => {
                     const stepNum = i + 1;
                     let cls = 'step';
                     if (currentStep > stepNum) cls += ' completed';
                     if (currentStep === stepNum) cls += ' active';
                     return (
                       <div key={i} className={cls}>
                         <div className="step-icon"><i className={step.icon}></i></div>
                         <div className="step-label">{step.label}</div>
                       </div>
                     )
                   })}
                 </div>
               )}
            </div>

            {/* DETAILS */}
            <div className="details-grid">
              <div className="detail-item"><label>Customer</label><div>{order.header.customer_name}</div></div>
              <div className="detail-item"><label>Status</label><div className="text-brand-navy">{order.header.status}</div></div>
              <div className="detail-item"><label>Payment</label><div>{order.header.payment_status}</div></div>
              <div className="detail-item"><label>Type</label><div>{order.header.delivery_type}</div></div>
            </div>

            {/* TABLE */}
            <div className="table-wrapper">
              <table className="order-table">
                <thead><tr><th className="ps-4">Item</th><th>Price</th><th className="text-center">Qty</th><th className="text-end pe-4">Total</th></tr></thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="ps-4">
                        <div className="fw-bold">{item.product_name}</div>
                        <div className="text-muted small">{item.brand}</div>
                      </td>
                      <td>{peso(item.price)}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-end pe-4 fw-bold">{peso(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
               <div className="grand-total">Total: <span>{peso(grandTotal)}</span></div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderStatus;