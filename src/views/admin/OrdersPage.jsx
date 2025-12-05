import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CButton, CFormSelect, CModal, CModalHeader,
  CModalTitle, CModalBody, CModalFooter, CWidgetStatsF, CSpinner, CBadge, CFormLabel, 
  CFormInput, CFormTextarea, CFormSwitch, CTooltip, CPagination, CPaginationItem
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass, cilDescription, cilMoney, cilWarning, cilCheckCircle, cilArrowLeft,
  cilSettings, cilTruck, cilXCircle, cilCloudUpload, cilTrash, cilChevronLeft, cilChevronRight, cilBan,
  cilCalendar, cilLocationPin, cilNotes, cilHome, cilCog
} from '@coreui/icons'
import { salesAPI, returnsAPI } from '../../utils/api'

// Import Global Styles
import '../../styles/Admin.css'
import '../../styles/App.css'
import '../../styles/OrdersPage.css' 

const ITEMS_PER_PAGE = 10;

const OrdersPage = () => {
  // --- STATE ---
  const [orders, setOrders] = useState([]); 
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_sales: 0, pendingOrders: 0, paidOrders: 0, total_revenue: 0 });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(''); 
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('All Order Statuses'); 
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All Payment Statuses');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false); 
  
  // Return Logic
  const [orderToReturn, setOrderToReturn] = useState(null); 
  const [returnItems, setReturnItems] = useState([]);
  const [returnForm, setReturnForm] = useState({ reason: 'Defective/Damaged', method: 'Cash', restock: true, notes: '', file: null });
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const fileInputRef = useRef(null);

  // Messaging
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' });

  // --- LIFECYCLE (POLLING) ---
  useEffect(() => {
    fetchOrdersWithItems();
    fetchOrderStats();
    
    // Auto-refresh admin page to see status updates from Driver Portal
    const interval = setInterval(() => {
        fetchOrdersWithItems(true); // Silent update
        fetchOrderStats();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // --- API CALLS ---
  const fetchOrdersWithItems = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await salesAPI.getSales({ limit: 1000 });
      if (!Array.isArray(response)) { setOrders([]); return; }
      
      const ordersWithItems = await Promise.all(response.map(async (order) => {
          try { 
            const itemsResponse = order.items || await salesAPI.getSaleItems(order.id) || []; 
            return { ...order, items: itemsResponse };
          } catch (e) { return { ...order, items: [] }; }
      }));
      
      setOrders(ordersWithItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setTotalItems(ordersWithItems.length);
    } catch (err) { 
        if(!isBackground) setOrders([]); 
    } finally { 
        if(!isBackground) setLoading(false); 
    }
  }

  const fetchOrderStats = async () => {
    try {
      const response = await salesAPI.getSalesStats();
      if (response.success && response.data) {
        setStats({
          total_sales: response.data.total_sales || 0, 
          pendingOrders: response.data.pendingOrders ?? response.data.pending_orders ?? 0,
          paidOrders: response.data.paidOrders ?? response.data.paid_orders ?? 0, 
          total_revenue: response.data.total_revenue || 0,
        });
      }
    } catch (e) {}
  }

  // --- ACTION: MANUAL COMPLETE (Fixing Stuck Orders) ---
  const handleManualCompletion = async (orderId) => {
      if(!window.confirm('Are you sure you want to mark this order as PAID and COMPLETED?')) return;

      // [FIX] Manually advance state for walk-in pickups
      try {
          await salesAPI.updateSale(orderId, { payment_status: 'Paid' });
          await salesAPI.updateSale(orderId, { status: 'Completed' });
          
          setIsModalOpen(false);
          fetchOrdersWithItems(); 
          setMsgModal({ visible: true, title: 'Success', message: 'Order finalized successfully.', color: 'success' });
      } catch (e) {
          setMsgModal({ visible: true, title: 'Error', message: 'Failed to update order.', color: 'danger' });
      }
  }

  // --- RETURN HANDLERS ---
  const handleOpenReturnModal = (order) => { 
      setOrderToReturn(order); 
      const items = order.items.map(item => ({
          ...item,
          return_qty: 0,
          max_qty: item.quantity 
      }));
      setReturnItems(items);
      setReturnForm({ reason: 'Defective/Damaged', method: 'Cash', restock: true, notes: '', file: null });
      if(fileInputRef.current) fileInputRef.current.value = '';
      setIsReturnModalOpen(true); 
  }

  const handleReturnQtyChange = (index, val) => {
      const newItems = [...returnItems];
      let qty = parseInt(val);
      if (isNaN(qty) || qty < 0) qty = 0;
      if (qty > newItems[index].max_qty) qty = newItems[index].max_qty;
      newItems[index].return_qty = qty;
      setReturnItems(newItems);
  }

  const handleProcessReturn = async () => {
      const itemsToProcess = returnItems
          .filter(i => i.return_qty > 0)
          .map(i => ({
              sale_item_id: i.id, 
              product_id: i.product_id,
              quantity: i.return_qty,
              price: i.price
          }));

      if (itemsToProcess.length === 0) {
          setMsgModal({ visible: true, title: 'Validation Error', message: 'Please select at least one item to return (Qty > 0).', color: 'warning' });
          return;
      }

      setIsSubmittingReturn(true);
      try {
          const formData = new FormData();
          formData.append('orderId', orderToReturn.id);
          formData.append('saleNumber', orderToReturn.sale_number);
          formData.append('customerName', orderToReturn.customer_name);
          formData.append('returnReason', returnForm.reason);
          formData.append('refundMethod', returnForm.method);
          formData.append('restocked', returnForm.restock);
          formData.append('additionalNotes', returnForm.notes);
          formData.append('returnItems', JSON.stringify(itemsToProcess));
          if (returnForm.file) formData.append('photoProof', returnForm.file);

          const res = await returnsAPI.processReturn(formData);
          if (res.success) {
              setMsgModal({ visible: true, title: 'Success', message: 'Return processed successfully.', color: 'success' });
              setIsReturnModalOpen(false);
              fetchOrdersWithItems(); 
          } else { throw new Error(res.message); }
      } catch (e) {
          setMsgModal({ visible: true, title: 'Error', message: e.message || 'Failed to process return.', color: 'danger' });
      } finally { setIsSubmittingReturn(false); }
  }

  // --- HELPERS ---
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((order) => {
      const matchesSearch = (order.sale_number || '').toLowerCase().includes(searchQuery.toLowerCase()) || (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedOrderStatus === 'All Order Statuses' || order.status === selectedOrderStatus;
      const matchesPayment = selectedPaymentStatus === 'All Payment Statuses' || (order.payment_status || 'Unpaid') === selectedPaymentStatus;
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchQuery, selectedOrderStatus, selectedPaymentStatus]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const renderStatusBadge = (status) => {
      let color = 'secondary';
      let icon = cilCheckCircle;
      
      if(['Paid', 'Completed'].includes(status)) { color = 'success'; icon = cilCheckCircle; }
      else if(['Pending', 'Unpaid'].includes(status)) { color = 'warning'; icon = cilWarning; }
      else if(status === 'Processing') { color = 'info'; icon = cilSettings; }
      else if(['Cancelled', 'Refunded', 'Returned'].includes(status)) { color = 'danger'; icon = cilBan; }
      else if(status === 'Partially Returned') { color = 'dark'; icon = cilArrowLeft; }

      const textColor = ['warning', 'info', 'light'].includes(color) ? 'text-dark' : 'text-white';
      
      return (
        <CBadge color={color} shape="rounded-pill" className={`px-2 py-1 ${textColor} border`}>
            <CIcon icon={icon} size="sm" className="me-1"/> {status}
        </CBadge>
      );
  }

  // --- TIMELINE LOGIC ---
  const getTimelineStep = (status) => {
    const s = (status || '').toLowerCase();
    if (['cancelled', 'refunded', 'returned'].some(x => s.includes(x))) return -1;
    if (s === 'completed') return 3;
    if (s === 'processing') return 2;
    return 1; 
  };

  const getTimelineStepsConfig = (order) => {
      const type = order?.delivery_type || order?.sale_type || '';
      const isDelivery = type.includes('Delivery');
      const isCompleted = order?.status === 'Completed';

      return [
        { label: 'Order Placed', icon: cilDescription },
        { label: 'Processing', icon: cilCog },
        { 
          // [FIX] Updated Labels
          label: isDelivery 
            ? (isCompleted ? 'Delivered' : 'Out for Delivery') 
            : (isCompleted ? 'Picked Up' : 'Ready for Pickup'),
            
          icon: isDelivery ? cilTruck : (isCompleted ? cilCheckCircle : cilHome)
        }
      ];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const brandHeaderStyle = { fontFamily: 'Oswald, sans-serif', letterSpacing: '1px' };

  // --- PAGINATION ---
  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5; 
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    items.push(
      <CPaginationItem key="prev" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{cursor: 'pointer'}}>
        <CIcon icon={cilChevronLeft} size="sm"/>
      </CPaginationItem>
    );

    if (start > 1) {
      items.push(<CPaginationItem key={1} onClick={() => setCurrentPage(1)} style={{cursor: 'pointer'}}>1</CPaginationItem>);
      if (start > 2) items.push(<CPaginationItem key="e1" disabled>...</CPaginationItem>);
    }

    for (let i = start; i <= end; i++) {
      items.push(
        <CPaginationItem key={i} active={i === currentPage} onClick={() => setCurrentPage(i)} style={{cursor: 'pointer', backgroundColor: i===currentPage ? 'var(--brand-navy)' : '', borderColor: i===currentPage ? 'var(--brand-navy)' : ''}}>
          {i}
        </CPaginationItem>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) items.push(<CPaginationItem key="e2" disabled>...</CPaginationItem>);
      items.push(<CPaginationItem key={totalPages} onClick={() => setCurrentPage(totalPages)} style={{cursor: 'pointer'}}>{totalPages}</CPaginationItem>);
    }

    items.push(
      <CPaginationItem key="next" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{cursor: 'pointer'}}>
        <CIcon icon={cilChevronRight} size="sm"/>
      </CPaginationItem>
    );
    return items;
  };

  return (
    <CContainer fluid className="px-4 py-4 order-status-wrapper">
      <div className="mb-4">
        <h2 className="fw-bold text-brand-navy mb-1" style={brandHeaderStyle}>TRANSACTION HISTORY</h2>
        <div className="text-medium-emphasis fw-semibold">Review orders, payments, and returns status</div>
      </div>

      <CRow className="mb-4 g-3">
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-primary" color="white" icon={<CIcon icon={cilDescription} height={24} className="text-primary"/>} title="Total Orders" value={(stats?.total_sales || 0).toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-warning" color="white" icon={<CIcon icon={cilWarning} height={24} className="text-warning"/>} title="Pending" value={(stats?.pendingOrders || 0).toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-success" color="white" icon={<CIcon icon={cilCheckCircle} height={24} className="text-success"/>} title="Paid" value={(stats?.paidOrders || 0).toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-info" color="white" icon={<CIcon icon={cilMoney} height={24} className="text-info"/>} title="Revenue" value={`₱${Number(stats?.total_revenue || 0).toLocaleString()}`} /></CCol>
      </CRow>

      <CCard className="mb-4 border-0 shadow-sm overflow-hidden">
        <CCardBody className="p-0">
          {/* FILTERS */}
          <div className="p-4 bg-white border-bottom d-flex flex-wrap gap-3 align-items-center">
             <div className="brand-search-wrapper">
                <span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass} /></span>
                <input type="text" className="brand-search-input" placeholder="Search order ID or customer..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1)}} />
             </div>
             <CFormSelect className="brand-select" style={{maxWidth: '220px'}} value={selectedOrderStatus} onChange={(e) => {setSelectedOrderStatus(e.target.value); setCurrentPage(1)}}>
                {['All Order Statuses', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Returned'].map(s=><option key={s} value={s}>{s}</option>)}
             </CFormSelect>
             <CFormSelect className="brand-select" style={{maxWidth: '220px'}} value={selectedPaymentStatus} onChange={(e) => {setSelectedPaymentStatus(e.target.value); setCurrentPage(1)}}>
                {['All Payment Statuses', 'Paid', 'Unpaid', 'Refunded'].map(s=><option key={s} value={s}>{s}</option>)}
             </CFormSelect>
          </div>

          {/* TABLE */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col" className="ps-4" style={{width:'15%'}}>Order ID</th>
                  <th scope="col" style={{width:'25%'}}>Customer</th>
                  <th scope="col" style={{width:'15%'}}>Date</th>
                  <th scope="col" style={{width:'10%'}}>Items</th>
                  <th scope="col" style={{width:'12%'}}>Payment</th>
                  <th scope="col" style={{width:'12%'}}>Status</th>
                  <th scope="col" className="text-end pe-4" style={{width:'11%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5"><CSpinner color="primary" variant="grow"/></td></tr>
                ) : currentOrders.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-5 text-muted">No orders found matching criteria.</td></tr>
                ) : (
                  currentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="ps-4 fw-bold text-brand-blue font-monospace fs-6">{order.sale_number}</td>
                    <td><div className="fw-bold text-dark">{order.customer_name}</div><small className="text-muted">{order.contact || 'No contact'}</small></td>
                    <td className="text-muted">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                    <td><CBadge color="light" className="text-dark border px-3 py-2">{order.items ? order.items.length : 0} items</CBadge></td>
                    <td>{renderStatusBadge(order.payment_status)}</td>
                    <td>{renderStatusBadge(order.status)}</td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        <CTooltip content="View Details">
                            <CButton size="sm" color="primary" variant="outline" onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}><CIcon icon={cilDescription} /></CButton>
                        </CTooltip>
                        {['Completed', 'Partially Returned'].includes(order.status) && (
                           <CTooltip content="Process Return">
                              <CButton size="sm" color="danger" variant="outline" onClick={() => handleOpenReturnModal(order)}><CIcon icon={cilArrowLeft} /></CButton>
                           </CTooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
             <span className="small text-muted fw-semibold">Showing {currentOrders.length} of {filteredOrders.length} orders</span>
             <CPagination className="mb-0 justify-content-end" aria-label="Orders navigation">{renderPaginationItems()}</CPagination>
          </div>
        </CCardBody>
      </CCard>

      {/* --- ORDER DETAILS MODAL --- */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" alignment="center" scrollable>
         <CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white" style={brandHeaderStyle}>ORDER DETAILS</CModalTitle></CModalHeader>
         <CModalBody className="p-0">
            {selectedOrder && (
              <>
                <div className="timeline-section">
                   {getTimelineStep(selectedOrder.status) === -1 ? (
                      <div className="cancelled-message">
                         <CIcon icon={cilBan} size="3xl" />
                         <div>Order {selectedOrder.status}</div>
                      </div>
                   ) : (
                      <div className="stepper-wrapper">
                        {getTimelineStepsConfig(selectedOrder).map((step, i) => {
                           const currentStep = getTimelineStep(selectedOrder.status);
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
                      <div>{selectedOrder.customer_name}</div>
                      <div className="small text-muted fw-normal">{selectedOrder.contact}</div>
                   </div>

                   <div className="detail-item">
                      <label><CIcon icon={cilCalendar} size="sm" className="me-1"/> Date Placed</label>
                      <div className="text-dark small fw-bold">{formatDate(selectedOrder.created_at)}</div>
                   </div>

                   <div className="detail-item">
                      <label><CIcon icon={(selectedOrder.delivery_type || '').includes('Delivery') ? cilTruck : cilHome} size="sm" className="me-1"/> Fulfillment</label>
                      <div className="text-brand-navy">
                          {selectedOrder.sale_type || selectedOrder.delivery_type || 'In-store'}
                      </div>
                   </div>

                   <div className="detail-item">
                      <label>Payment Status</label>
                      <div className={selectedOrder.payment_status === 'Paid' ? 'text-success' : 'text-warning'}>
                          {selectedOrder.payment_status || 'Unpaid'}
                      </div>
                   </div>

                   {(selectedOrder.delivery_type || '').includes('Delivery') && selectedOrder.address && (
                      <div className="detail-item" style={{gridColumn: '1 / -1'}}>
                        <label><CIcon icon={cilLocationPin} size="sm" className="me-1"/> Destination</label>
                        <div className="text-dark small">{selectedOrder.address}</div>
                      </div>
                   )}
                </div>

                <div className="table-wrapper">
                  <table className="order-table">
                    <thead><tr><th className="ps-4">Item</th><th className="text-center">Qty</th><th className="text-end">Price</th><th className="text-end pe-4">Total</th></tr></thead>
                    <tbody>
                      {selectedOrder.items?.map((item, i) => (
                        <tr key={i}>
                          <td className="ps-4">
                              <div className="fw-bold text-dark">{item.product_name}</div>
                              <div className="small text-muted">{item.brand}</div>
                              {item.product_id && <div className="text-muted small" style={{fontSize:'0.7rem'}}>PN: {item.product_id}</div>}
                          </td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end">₱{Number(item.price).toLocaleString()}</td>
                          <td className="text-end fw-bold pe-4">₱{Number(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* [FIX] ACTION BAR for Pending Orders */}
                {selectedOrder.status === 'Pending' && (
                    <div className="p-3 bg-warning bg-opacity-10 border-top d-flex justify-content-between align-items-center">
                        <div className="text-warning-emphasis small fw-bold">
                            <CIcon icon={cilWarning} className="me-2"/> 
                            ACTION REQUIRED
                        </div>
                        
                        {/* If In-Store + Pending, allow manual completion */}
                        {(!selectedOrder.delivery_type?.includes('Delivery')) ? (
                            <CButton color="success" className="text-white fw-bold btn-sm" onClick={() => handleManualCompletion(selectedOrder.id)}>
                                <CIcon icon={cilCheckCircle} className="me-2"/>
                                MARK AS PAID & COMPLETED
                            </CButton>
                        ) : (
                            <div className="small text-muted fst-italic">Waiting for Rider Pickup...</div>
                        )}
                    </div>
                )}

                <div className="table-footer">
                   {selectedOrder.notes && (
                       <div className="text-start mb-3 p-2 bg-light border rounded">
                           <small className="fw-bold text-muted"><CIcon icon={cilNotes} className="me-1"/> Notes:</small>
                           <div className="small text-dark fst-italic">{selectedOrder.notes}</div>
                       </div>
                   )}
                   <div className="grand-total">Total: <span>₱{selectedOrder.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}</span></div>
                </div>
              </>
            )}
         </CModalBody>
         <CModalFooter className="bg-light"><CButton color="secondary" onClick={() => setIsModalOpen(false)}>Close</CButton><CButton color="primary" onClick={() => window.print()} className="d-print-none">Print Invoice</CButton></CModalFooter>
      </CModal>

      {/* --- RETURN MODAL --- */}
      <CModal visible={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} size="lg" alignment="center" backdrop="static" scrollable>
          <CModalHeader className="bg-danger text-white">
              <CModalTitle component="span" style={brandHeaderStyle}>PROCESS RETURN & REFUND</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4 bg-light">
              <div className="d-flex flex-column gap-3">
                  <div className="bg-white p-3 rounded shadow-sm border">
                      <h6 className="fw-bold text-danger mb-3 border-bottom pb-2">1. Select Items to Return</h6>
                      <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0">
                            <thead className="table-light"><tr><th>Product</th><th className="text-center">Sold</th><th className="text-center" style={{width:'120px'}}>Return Qty</th><th className="text-end">Refund Amt</th></tr></thead>
                            <tbody>
                                {returnItems.map((item, idx) => (
                                    <tr key={idx} className={item.return_qty > 0 ? 'table-warning' : ''}>
                                        <td><div className="fw-bold small">{item.product_name}</div><div className="text-muted" style={{fontSize:'0.75rem'}}>{item.product_id}</div></td>
                                        <td className="text-center">{item.max_qty}</td>
                                        <td>
                                            <CFormInput 
                                                type="number" 
                                                min="0" 
                                                max={item.max_qty} 
                                                value={item.return_qty} 
                                                onChange={(e) => handleReturnQtyChange(idx, e.target.value)}
                                                className="text-center form-control-sm"
                                            />
                                        </td>
                                        <td className="text-end fw-bold text-danger">
                                            {item.return_qty > 0 ? `₱${(item.price * item.return_qty).toLocaleString()}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>

                  <div className="bg-white p-3 rounded shadow-sm border">
                       <h6 className="fw-bold text-danger mb-3 border-bottom pb-2">2. Return Details</h6>
                       <CRow className="g-3">
                           <CCol md={6}>
                               <CFormLabel className="small fw-bold">Reason for Return</CFormLabel>
                               <CFormSelect value={returnForm.reason} onChange={e => setReturnForm({...returnForm, reason: e.target.value})}>
                                   <option value="Defective/Damaged">Defective / Damaged</option>
                                   <option value="Wrong Item">Wrong Item Sent</option>
                                   <option value="Not as Described">Not as Described</option>
                                   <option value="Customer Changed Mind">Customer Changed Mind</option>
                                   <option value="Other">Other</option>
                               </CFormSelect>
                           </CCol>
                           <CCol md={6}>
                               <CFormLabel className="small fw-bold">Refund Method</CFormLabel>
                               <CFormSelect value={returnForm.method} onChange={e => setReturnForm({...returnForm, method: e.target.value})}>
                                   <option value="Cash">Cash Refund</option>
                                   <option value="Store Credit">Store Credit</option>
                                   <option value="Original Payment Method">Original Payment Method</option>
                               </CFormSelect>
                           </CCol>
                           <CCol md={12}>
                               <CFormLabel className="small fw-bold">Photo Proof (Optional)</CFormLabel>
                               <CFormInput type="file" accept="image/*" ref={fileInputRef} onChange={(e) => setReturnForm({...returnForm, file: e.target.files[0]})} />
                           </CCol>
                           <CCol md={12}>
                               <CFormLabel className="small fw-bold">Additional Notes</CFormLabel>
                               <CFormTextarea rows={2} value={returnForm.notes} onChange={e => setReturnForm({...returnForm, notes: e.target.value})} placeholder="Enter any specific details..." />
                           </CCol>
                       </CRow>
                  </div>

                  <div className="bg-white p-3 rounded shadow-sm border d-flex justify-content-between align-items-center">
                       <div>
                           <div className="fw-bold text-dark">Restock Items?</div>
                           <div className="small text-muted">If checked, returned items will be added back to inventory stock.</div>
                       </div>
                       <CFormSwitch size="lg" checked={returnForm.restock} onChange={e => setReturnForm({...returnForm, restock: e.target.checked})} />
                  </div>
              </div>
          </CModalBody>
          <CModalFooter className="bg-light">
              <CButton color="secondary" variant="ghost" onClick={() => setIsReturnModalOpen(false)}>Cancel</CButton>
              <CButton color="danger" onClick={handleProcessReturn} disabled={isSubmittingReturn}>
                  {isSubmittingReturn ? <CSpinner size="sm"/> : 'Confirm Return'}
              </CButton>
          </CModalFooter>
      </CModal>
      
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle style={brandHeaderStyle}>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default OrdersPage