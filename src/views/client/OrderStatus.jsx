import React, { useMemo, useState } from 'react';
import Navbar from '../../components/client/Navbar';
import Footer from '../../components/client/Footer';
import { salesAPI } from '../../utils/api';
import '../../styles/OrdersPage.css'; 
import bg from '../../assets/image-background.png';

import CIcon from '@coreui/icons-react';
import { 
  cilDescription, 
  cilCog, 
  cilTruck, 
  cilBan, 
  cilWarning,
  cilLocationPin,
  cilCalendar,
  cilNotes,
  cilHome, 
  cilCheckCircle
} from '@coreui/icons';

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

  // --- DYNAMIC LOGIC ---
  const type = order?.header.delivery_type || order?.header.sale_type || '';
  const isDelivery = type.includes('Delivery');
  
  // [FIX] Shifted Labels for better UX
  const steps = [
    { 
      label: 'Order Placed', 
      icon: cilDescription 
    },
    { 
      // Step 2 is the "Action" Phase
      label: isDelivery ? 'Out for Delivery' : 'Processing', 
      icon: isDelivery ? cilTruck : cilCog 
    },
    { 
      // Step 3 is the "Final" Phase
      label: isDelivery ? 'Delivered' : 'Picked Up',
      icon: isDelivery ? cilCheckCircle : cilHome 
    }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="order-status-wrapper">
      <Navbar />
      <header className="order-hero" style={{ backgroundImage: `url(${bg})` }}>
        <div className="hero-content">
          <h1>{order ? 'Order Details' : 'Monitor Order'}</h1>
          <p>Enter your Order Reference ID to see real-time status.</p>
        </div>
      </header>

      <main className="order-container" style={{ marginTop: '-60px' }}>
        <section className="search-card">
          <label className="search-label" htmlFor="orderInput">Reference ID</label>
          <div className="search-row">
            <input 
              id="orderInput" type="text" className="search-input" placeholder="e.g. SL251015001"
              value={orderId} onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              aria-label="Order Reference ID"
            />
            <button className="check-btn" onClick={handleSearch} disabled={loading} aria-label="Monitor Order Status">
              {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : 'CHECK'}
            </button>
          </div>
          {error && <div className="error-msg" role="alert"><CIcon icon={cilWarning} className="me-2"/>{error}</div>}
        </section>

        {order && (
          <div className="order-card">
            <div className="order-header">
              <h2>#{order.header.sale_number}</h2>
            </div>

            <div className="timeline-section">
               {currentStep === -1 ? (
                 <div className="cancelled-message" role="alert">
                   <CIcon icon={cilBan} size="3xl" />
                   <div>Order {order.header.status}</div>
                 </div>
               ) : (
                 <div className="stepper-wrapper">
                   {steps.map((step, i) => {
                     const stepNum = i + 1;
                     let cls = 'stepper-item';
                     if (currentStep > stepNum) cls += ' completed';
                     else if (currentStep === stepNum) cls += ' active';

                     return (
                       <div key={i} className={cls}>
                         <div className="step-counter">
                            <CIcon icon={step.icon} size="lg"/>
                         </div>
                         <div className="step-name">{step.label}</div>
                       </div>
                     )
                   })}
                 </div>
               )}
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <label>Customer</label>
                <div>{order.header.customer_name}</div>
              </div>
              
              <div className="detail-item">
                <label><CIcon icon={cilCalendar} size="sm" className="me-1"/> Date Placed</label>
                <div className="text-dark small">{formatDate(order.header.created_at || order.header.date)}</div>
              </div>

              <div className="detail-item">
                <label><CIcon icon={isDelivery ? cilTruck : cilHome} size="sm" className="me-1"/> Fulfillment</label>
                <div className="text-brand-navy">
                    {order.header.sale_type || order.header.delivery_type || 'In-store'}
                </div>
              </div>

              <div className="detail-item">
                <label>Payment Status</label>
                <div className={order.header.payment_status === 'Paid' ? 'text-success' : 'text-warning'}>
                    {order.header.payment_status || 'Unpaid'}
                </div>
              </div>

              {isDelivery && (order.header.address || order.header.shipping_address) && (
                  <div className="detail-item" style={{gridColumn: '1 / -1'}}>
                    <label><CIcon icon={cilLocationPin} size="sm" className="me-1"/> Destination</label>
                    <div className="text-dark small">{order.header.address || order.header.shipping_address}</div>
                  </div>
              )}
            </div>

            <div className="table-wrapper">
              <table className="order-table" aria-label="Order Items">
                <thead><tr><th className="ps-4">Item</th><th>Price</th><th className="text-center">Qty</th><th className="text-end pe-4">Total</th></tr></thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="ps-4">
                        <div className="fw-bold">{item.product_name}</div>
                        <div className="text-muted small">{item.brand}</div>
                        {item.product_id && <div className="text-muted small" style={{fontSize:'0.7rem'}}>PN: {item.product_id}</div>}
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
               {order.header.notes && (
                   <div className="text-start mb-3 p-2 bg-light border rounded">
                       <small className="fw-bold text-muted"><CIcon icon={cilNotes} className="me-1"/> Notes:</small>
                       <div className="small text-dark fst-italic">{order.header.notes}</div>
                   </div>
               )}
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