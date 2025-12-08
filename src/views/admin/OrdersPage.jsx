import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CButton, CFormSelect, CModal, CModalHeader,
  CModalTitle, CModalBody, CModalFooter, CSpinner, CBadge, CFormLabel, 
  CFormInput, CFormTextarea, CFormSwitch, CTooltip, CPagination, CPaginationItem, CFormCheck,
  CCardHeader
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass, cilDescription, cilMoney, cilWarning, cilCheckCircle, cilArrowLeft,
  cilSettings, cilTruck, cilBan, cilCalendar, cilLocationPin, cilNotes, cilHome, cilCog, 
  cilBarcode, cilHistory, cilUser, cilChevronLeft, cilChevronRight, cilXCircle, cilCloudUpload, 
  cilLockLocked, cilShieldAlt
} from '@coreui/icons'
import { salesAPI, returnsAPI, serialNumberAPI, activityLogsAPI, authAPI } from '../../utils/api'

// Import Global Styles
import '../../styles/Admin.css'
import '../../styles/App.css'
import '../../styles/OrdersPage.css' 

const ITEMS_PER_PAGE = 10;

// ==========================================
// 1. HELPER FUNCTIONS (GLOBAL SCOPE)
// ==========================================

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
    return [
      { label: 'Order Placed', icon: cilDescription },
      { label: 'Processing', icon: cilCog },
      { label: isDelivery ? (order?.status === 'Completed' ? 'Delivered' : 'Out for Delivery') : (order?.status === 'Completed' ? 'Picked Up' : 'Ready for Pickup'), icon: isDelivery ? cilTruck : (order?.status === 'Completed' ? cilCheckCircle : cilHome) }
    ];
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const renderStatusBadge = (status) => {
    let color = 'secondary';
    if(['Paid', 'Completed'].includes(status)) color = 'success';
    else if(['Pending', 'Unpaid'].includes(status)) color = 'warning';
    else if(status === 'Processing') color = 'info';
    else if(['Cancelled', 'Refunded', 'Returned'].includes(status)) color = 'danger';
    return <CBadge color={color} shape="rounded-pill" className="px-2">{status}</CBadge>;
};

// ==========================================
// 2. REUSABLE COMPONENTS
// ==========================================

const StatCard = ({ title, value, icon, gradient, textColor = 'text-white' }) => (
  <CCard className="h-100 border-0 shadow-sm overflow-hidden" style={{ background: gradient }}>
    <CCardBody className="p-4 position-relative d-flex flex-column justify-content-between">
      <div className="position-absolute" style={{ top: '-10px', right: '-15px', opacity: 0.15, transform: 'rotate(15deg)' }}>
         {React.cloneElement(icon, { height: 100, width: 100, className: textColor })}
      </div>
      <div className="position-relative z-1">
        <div className={`text-uppercase fw-bold small mb-2 ${textColor}`} style={{ opacity: 0.8, letterSpacing: '1px' }}>{title}</div>
        <div className={`fw-bold ${textColor}`} style={{ fontSize: '1.8rem', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
      </div>
    </CCardBody>
  </CCard>
);

// ==========================================
// 3. MAIN COMPONENT
// ==========================================

const OrdersPage = () => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState(null); 
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // History & Logs
  const [orderReturnHistory, setOrderReturnHistory] = useState([]);
  const [orderAuditLogs, setOrderAuditLogs] = useState([]); 
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Return Logic
  const [orderToReturn, setOrderToReturn] = useState(null); 
  const [returnItems, setReturnItems] = useState([]);
  const [returnForm, setReturnForm] = useState({ reason: 'Factory Defect', method: 'Cash', restock: true, notes: '', file: null });
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const fileInputRef = useRef(null);

  // Admin Auth State
  const [adminAuth, setAdminAuth] = useState({ email: '', password: '', loading: false, error: '' });

  // Messaging
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', icon: null });

  const brandHeaderStyle = { fontFamily: 'Oswald, sans-serif', letterSpacing: '1px' };

  // --- LIFECYCLE ---
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try { setCurrentUser(JSON.parse(storedUser)); } catch (e) {}
    }
    fetchOrdersWithItems();
    fetchOrderStats();
    const interval = setInterval(() => { fetchOrdersWithItems(true); fetchOrderStats(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- API CALLS ---
  const fetchOrdersWithItems = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await salesAPI.getSales({ limit: 1000 });
      if (!Array.isArray(response)) { setOrders([]); return; }
      const sortedOrders = response.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(sortedOrders);
      setTotalItems(sortedOrders.length);
    } catch (err) { if(!isBackground) setOrders([]); } 
    finally { if(!isBackground) setLoading(false); }
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

  // --- ACTIONS ---
  const handleManualCompletion = async (orderId) => {
      if(!window.confirm('Mark this order as PAID and COMPLETED?')) return;
      try {
          await salesAPI.updateSale(orderId, { payment_status: 'Paid' });
          await salesAPI.updateSale(orderId, { status: 'Completed' });
          setIsModalOpen(false);
          fetchOrdersWithItems(); 
          setMsgModal({ visible: true, title: 'Order Completed', message: 'The order has been successfully finalized.', color: 'success', icon: cilCheckCircle });
      } catch (e) {
          setMsgModal({ visible: true, title: 'Update Failed', message: 'Could not update the order status.', color: 'danger', icon: cilXCircle });
      }
  }

  const handleViewDetails = async (order) => {
      setSelectedOrder(order);
      setOrderReturnHistory([]);
      setOrderAuditLogs([]);
      setIsModalOpen(true);
      setLoadingHistory(true);
      try {
          const serialRes = await serialNumberAPI.getBySaleId(order.id);
          const serialsMap = {};
          if (serialRes.success) {
              serialRes.data.forEach(sn => {
                  if(!serialsMap[sn.sale_item_id]) serialsMap[sn.sale_item_id] = [];
                  serialsMap[sn.sale_item_id].push(sn.serial_number);
              });
          }
          const logsRes = await activityLogsAPI.getAll({ search: order.sale_number });
          if (logsRes.success) setOrderAuditLogs(logsRes.data.logs || []);
          if (['Returned', 'Partially Returned', 'Completed'].includes(order.status)) {
              const returnRes = await returnsAPI.getReturnsByOrder(order.id);
              if (returnRes.success) setOrderReturnHistory(returnRes.data || []);
          }
          const enrichedItems = order.items.map(item => ({ ...item, serial_numbers: serialsMap[item.id] || [] }));
          setSelectedOrder({ ...order, items: enrichedItems });
      } catch (e) { console.error("Details fetch error", e); } 
      finally { setLoadingHistory(false); }
  }

  // --- RETURN LOGIC ---
  const handleOpenReturnModal = async (order) => { 
      setOrderToReturn(order); 
      let soldSerials = [];
      try {
        const serialRes = await serialNumberAPI.getBySaleId(order.id);
        if(serialRes.success) soldSerials = serialRes.data;
      } catch(e) {}
      const items = order.items.map(item => {
          const itemSerials = soldSerials.filter(s => s.product_id === item.product_id);
          return { ...item, return_qty: 0, max_qty: item.quantity, is_serialized: itemSerials.length > 0, available_serials: itemSerials, selected_serials: [] };
      });
      setReturnItems(items);
      setReturnForm({ reason: 'Factory Defect', method: 'Cash', restock: true, notes: '', file: null });
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

  const handleSerialSelection = (itemIndex, serialNumber, isChecked) => {
      const newItems = [...returnItems];
      const item = newItems[itemIndex];
      if (isChecked) item.selected_serials = [...item.selected_serials, serialNumber];
      else item.selected_serials = item.selected_serials.filter(s => s !== serialNumber);
      item.return_qty = item.selected_serials.length;
      setReturnItems(newItems);
  }

  // --- VALIDATION & SUBMISSION ---
  const initiateReturnProcess = () => {
    const invalidSerialItem = returnItems.find(i => i.is_serialized && i.return_qty > 0 && i.selected_serials.length !== i.return_qty);
    if (invalidSerialItem) { return setMsgModal({ visible: true, title: 'Validation Error', message: `Select exactly ${invalidSerialItem.return_qty} serials for ${invalidSerialItem.product_name}.`, color: 'warning', icon: cilWarning }); }
    const hasItems = returnItems.some(i => i.return_qty > 0);
    if (!hasItems) return setMsgModal({ visible: true, title: 'Empty Selection', message: 'Please select items to return.', color: 'warning', icon: cilWarning });

    if (!returnForm.file) { return setMsgModal({ visible: true, title: 'Proof Required', message: 'You must upload a photo proof of the item to process a return.', color: 'warning', icon: cilCloudUpload }); }

    // Role Validation (Case Insensitive)
    const userRole = (currentUser?.role || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin', 'administrator'].includes(userRole);

    if (!isAdmin) {
        setAdminAuth({ email: '', password: '', loading: false, error: '' });
        setIsAuthModalOpen(true);
    } else {
        submitReturn();
    }
  };

  const handleAdminAuthorize = async () => {
      if (!adminAuth.email || !adminAuth.password) { return setAdminAuth(prev => ({...prev, error: 'Please enter valid credentials.'})); }
      setAdminAuth(prev => ({...prev, loading: true, error: ''}));
      try {
          const res = await authAPI.login(adminAuth.email, adminAuth.password);
          if (res.success) {
             const userObj = res.data || {};
             const role = (userObj.role || '').toLowerCase();
             if (['admin', 'superadmin', 'administrator'].includes(role)) {
                 setIsAuthModalOpen(false);
                 submitReturn(); // Proceed to submit
             } else { setAdminAuth(prev => ({...prev, error: 'Authorization denied. Account is not an Admin.'})); }
          } else { setAdminAuth(prev => ({...prev, error: 'Invalid credentials.'})); }
      } catch (e) { setAdminAuth(prev => ({...prev, error: 'Authorization failed. Check network.'})); } 
      finally { setAdminAuth(prev => ({...prev, loading: false})); }
  };

  const submitReturn = async () => {
      setIsSubmittingReturn(true);
      try {
          // [FIX] Ensure NO fields are undefined to prevent 500 error
          const itemsToProcess = returnItems
              .filter(i => i.return_qty > 0)
              .map(i => ({ 
                 saleItemId: i.id, 
                 productId: i.product_id, 
                 productName: i.product_name || i.name || 'Unknown Item', // Fallback for name
                 sku: i.sku ? i.sku : null, // Explicit NULL if undefined
                 quantity: Number(i.return_qty), 
                 price: Number(i.price || 0), 
                 serialNumbers: i.selected_serials || [] 
              }));

          const formData = new FormData();
          formData.append('orderId', orderToReturn.id);
          formData.append('saleNumber', orderToReturn.sale_number);
          formData.append('customerName', orderToReturn.customer_name || 'Walk-in');
          // Add processedBy for logs
          formData.append('processedBy', currentUser?.username || 'System');
          
          Object.keys(returnForm).forEach(key => { 
             if(key !== 'file') formData.append(key === 'reason' ? 'returnReason' : (key === 'method' ? 'refundMethod' : (key === 'restock' ? 'restocked' : 'additionalNotes')), returnForm[key]); 
          });
          
          // Stringify the array
          formData.append('returnItems', JSON.stringify(itemsToProcess)); 
          
          if (returnForm.file) formData.append('photoProof', returnForm.file);

          const res = await returnsAPI.processReturn(formData);
          if (res.success) {
              setMsgModal({ visible: true, title: 'Return Processed', message: 'The return has been authorized and recorded successfully.', color: 'success', icon: cilCheckCircle });
              setIsReturnModalOpen(false);
              fetchOrdersWithItems(); 
          } else { throw new Error(res.message); }
      } catch (e) { 
          console.error("Return Error:", e);
          setMsgModal({ visible: true, title: 'Processing Error', message: e.message || 'Failed to process return. Check server logs.', color: 'danger', icon: cilXCircle }); 
      } 
      finally { setIsSubmittingReturn(false); }
  }

  // --- RENDER HELPERS ---
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = (order.sale_number || '').toLowerCase().includes(searchQuery.toLowerCase()) || (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedOrderStatus === 'All Order Statuses' || order.status === selectedOrderStatus;
      const matchesPayment = selectedPaymentStatus === 'All Payment Statuses' || (order.payment_status || 'Unpaid') === selectedPaymentStatus;
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchQuery, selectedOrderStatus, selectedPaymentStatus]);

  const currentOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5; 
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    const StyledPageItem = ({ active, disabled, onClick, children }) => (
      <CPaginationItem active={active} disabled={disabled} onClick={onClick} style={{ cursor: disabled ? 'default' : 'pointer', backgroundColor: active ? '#17334e' : 'transparent', borderColor: active ? '#17334e' : '#dee2e6', color: active ? '#fff' : '#17334e', fontWeight: active ? 'bold' : 'normal', marginLeft: '4px', borderRadius: '4px' }}>{children}</CPaginationItem>
    );

    items.push(<StyledPageItem key="prev" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><CIcon icon={cilChevronLeft} size="sm"/></StyledPageItem>);
    if (start > 1) { items.push(<StyledPageItem key={1} onClick={() => setCurrentPage(1)}>1</StyledPageItem>); if (start > 2) items.push(<StyledPageItem key="e1" disabled>...</StyledPageItem>); }
    for (let i = start; i <= end; i++) { items.push(<StyledPageItem key={i} active={i === currentPage} onClick={() => setCurrentPage(i)}>{i}</StyledPageItem>); }
    if (end < totalPages) { if (end < totalPages - 1) items.push(<StyledPageItem key="e2" disabled>...</StyledPageItem>); items.push(<StyledPageItem key={totalPages} onClick={() => setCurrentPage(totalPages)}>{totalPages}</StyledPageItem>); }
    items.push(<StyledPageItem key="next" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}><CIcon icon={cilChevronRight} size="sm"/></StyledPageItem>);
    return items;
  };

  return (
    <CContainer fluid className="px-4 py-4 order-status-wrapper">
      <div className="mb-4 fade-in-up">
        <h2 className="fw-bold text-brand-navy mb-1" style={brandHeaderStyle}>TRANSACTION HISTORY</h2>
        <div className="text-medium-emphasis fw-semibold">Review orders, payments, and returns status</div>
      </div>

      {/* STAT CARDS */}
      <CRow className="mb-4 g-3 fade-in-up delay-100">
        <CCol sm={6} lg={3}><StatCard title="Total Orders" value={stats.total_sales} icon={<CIcon icon={cilDescription}/>} gradient="linear-gradient(135deg, #17334e 0%, #0f2438 100%)" /></CCol>
        <CCol sm={6} lg={3}><StatCard title="Pending" value={stats.pendingOrders} icon={<CIcon icon={cilWarning}/>} gradient="linear-gradient(135deg, #f9b115 0%, #f6960b 100%)" textColor="text-brand-navy"/></CCol>
        <CCol sm={6} lg={3}><StatCard title="Completed" value={stats.paidOrders} icon={<CIcon icon={cilCheckCircle}/>} gradient="linear-gradient(135deg, #2eb85c 0%, #1b9e3e 100%)" /></CCol>
        <CCol sm={6} lg={3}><StatCard title="Revenue" value={`₱${Number(stats.total_revenue).toLocaleString()}`} icon={<CIcon icon={cilMoney}/>} gradient="linear-gradient(135deg, #321fdb 0%, #2417a8 100%)" /></CCol>
      </CRow>

      {/* --- MAIN TABLE CARD --- */}
      <CCard className="mb-4 border-0 shadow-sm overflow-hidden fade-in-up delay-200">
        <CCardHeader className="bg-white p-3 border-bottom">
          <div className="d-flex align-items-center gap-3 w-100">
             <div className="bg-light rounded px-3 py-2 d-flex align-items-center border flex-grow-1">
                <CIcon icon={cilMagnifyingGlass} className="text-muted me-2"/>
                <input className="border-0 bg-transparent w-100" style={{outline:'none', fontSize:'0.9rem'}} placeholder="Search orders..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1)}} />
             </div>
             <div className="d-flex gap-2 flex-shrink-0">
                 <CFormSelect className="form-select-sm" value={selectedOrderStatus} onChange={(e) => setSelectedOrderStatus(e.target.value)} style={{width:'220px', borderColor:'#e9ecef', cursor:'pointer'}}>{['All Order Statuses', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Returned'].map(s=><option key={s} value={s}>{s}</option>)}</CFormSelect>
                 <CFormSelect className="form-select-sm" value={selectedPaymentStatus} onChange={(e) => setSelectedPaymentStatus(e.target.value)} style={{width:'220px', borderColor:'#e9ecef', cursor:'pointer'}}>{['All Payment Statuses', 'Paid', 'Unpaid', 'Refunded'].map(s=><option key={s} value={s}>{s}</option>)}</CFormSelect>
             </div>
          </div>
        </CCardHeader>
        <div className="admin-table-container">
            <table className="admin-table">
              <thead><tr><th className="ps-4">Order ID</th><th>Customer</th><th>Date</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-end pe-4">Actions</th></tr></thead>
              <tbody>{loading ? <tr><td colSpan="7" className="text-center py-5"><CSpinner color="primary"/></td></tr> : currentOrders.length === 0 ? <tr><td colSpan="7" className="text-center py-5 text-muted">No orders found matching criteria.</td></tr> : currentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="ps-4 fw-bold text-brand-blue font-monospace fs-6">{order.sale_number}</td>
                    <td><div className="fw-bold text-dark">{order.customer_name}</div><small className="text-muted">{order.contact || '-'}</small></td>
                    <td className="text-muted small">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td><CBadge color="light" className="text-dark border px-3 py-2">{order.items ? order.items.length : 0} items</CBadge></td>
                    <td>{renderStatusBadge(order.payment_status)}</td>
                    <td>{renderStatusBadge(order.status)}</td>
                    <td className="text-end pe-4"><div className="d-flex justify-content-end gap-2"><CTooltip content="View Details"><CButton size="sm" className="d-flex align-items-center gap-2 fw-bold text-white shadow-sm" style={{ background: '#17334e', border: 'none', fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => handleViewDetails(order)}><CIcon icon={cilDescription} size="sm"/> VIEW</CButton></CTooltip>{['Completed', 'Partially Returned'].includes(order.status) && (<CTooltip content="Process Return"><CButton size="sm" color="danger" className="d-flex align-items-center gap-2 fw-bold text-white shadow-sm" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => handleOpenReturnModal(order)}><CIcon icon={cilArrowLeft} size="sm"/> RETURN</CButton></CTooltip>)}</div></td>
                  </tr>
                ))}</tbody>
            </table>
        </div>
        <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white"><div className="small text-muted fw-semibold">Showing <span className="text-dark fw-bold">{Math.min(filteredOrders.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to <span className="text-dark fw-bold">{Math.min(filteredOrders.length, currentPage * ITEMS_PER_PAGE)}</span> of <span className="text-brand-navy fw-bold">{filteredOrders.length}</span> results</div><CPagination className="mb-0 justify-content-end">{renderPaginationItems()}</CPagination></div>
      </CCard>

      {/* --- ORDER DETAILS MODAL (WITH STEPPER) --- */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" alignment="center" scrollable>
         <CModalHeader className="bg-brand-navy"><CModalTitle className="text-white" style={brandHeaderStyle}>ORDER #{selectedOrder?.sale_number}</CModalTitle></CModalHeader>
         <CModalBody className="p-0 bg-light">
            {selectedOrder && (
              <>
                <div className="timeline-section p-3 bg-white border-bottom">{getTimelineStep(selectedOrder.status) === -1 ? (<div className="text-center text-danger py-3"><CIcon icon={cilBan} size="3xl" className="mb-2"/><div className="fw-bold">Order {selectedOrder.status}</div></div>) : (<div className="stepper-wrapper">{getTimelineStepsConfig(selectedOrder).map((step, i) => { const currentStep = getTimelineStep(selectedOrder.status); const stepNum = i + 1; let cls = 'stepper-item'; if (currentStep > stepNum) cls += ' completed'; else if (currentStep === stepNum) cls += ' active'; return (<div key={i} className={cls}><div className="step-counter"><CIcon icon={step.icon} size="lg"/></div><div className="step-name">{step.label}</div></div>) })}</div>)}</div>
                <div className="p-4 bg-white border-bottom"><CRow className="g-3"><CCol sm={6}><h6 className="text-muted small fw-bold text-uppercase">Customer Info</h6><div className="fw-bold text-brand-navy fs-5">{selectedOrder.customer_name}</div><div className="d-flex align-items-center gap-2 text-muted small"><CIcon icon={cilLocationPin}/> {selectedOrder.address || 'Walk-in'}</div></CCol><CCol sm={6} className="text-sm-end"><h6 className="text-muted small fw-bold text-uppercase">Order Info</h6><div className="mb-1">{renderStatusBadge(selectedOrder.status)} {renderStatusBadge(selectedOrder.payment_status)}</div><div className="small text-muted">{new Date(selectedOrder.created_at).toLocaleString()}</div></CCol></CRow></div>
                <div className="p-4"><h6 className="fw-bold text-brand-navy mb-3">ORDERED ITEMS</h6><div className="bg-white rounded border shadow-sm overflow-hidden"><table className="table mb-0"><thead className="bg-light"><tr><th className="ps-4">Product</th><th className="text-center">Qty</th><th className="text-end pe-4">Total</th></tr></thead><tbody>{selectedOrder.items?.map((item, i) => (<tr key={i}><td className="ps-4"><div className="fw-bold">{item.product_name}</div>{item.serial_numbers?.length > 0 && <div className="small text-primary font-monospace mt-1"><CIcon icon={cilBarcode} size="sm"/> {item.serial_numbers.join(', ')}</div>}</td><td className="text-center">{item.quantity}</td><td className="text-end pe-4 fw-bold">₱{Number(item.price * item.quantity).toLocaleString()}</td></tr>))}</tbody><tfoot className="bg-light"><tr><td colSpan="2" className="text-end fw-bold py-3">GRAND TOTAL</td><td className="text-end fw-bold text-brand-navy fs-5 py-3 pe-4">₱{Number(selectedOrder.total || 0).toLocaleString()}</td></tr></tfoot></table></div></div>
                {!loadingHistory && (<div className="px-4 pb-4">{orderAuditLogs.length > 0 && (<div className="mb-4"><h6 className="fw-bold text-brand-navy mb-3"><CIcon icon={cilHistory} className="me-2"/>AUDIT TRAIL</h6><div className="list-group border-0 shadow-sm">{orderAuditLogs.map((log, idx) => (<div key={idx} className="list-group-item border-start border-start-4 border-start-info p-3"><div className="d-flex justify-content-between"><small className="fw-bold text-brand-navy">{log.action}</small><small className="text-muted">{new Date(log.created_at).toLocaleString()}</small></div><div className="small text-muted mt-1">{log.details} <span className="fw-bold">by {log.username}</span></div></div>))}</div></div>)}{orderReturnHistory.length > 0 && (<div><h6 className="fw-bold text-danger mb-3 border-bottom pb-2"><CIcon icon={cilHistory} className="me-2"/> RETURN HISTORY</h6>{orderReturnHistory.map((ret) => (<div key={ret.return_id} className="bg-white p-3 rounded shadow-sm border mb-2 border-danger border-start-4"><div className="d-flex justify-content-between mb-2"><span className="fw-bold text-danger small">ID: {ret.return_id}</span><span className="text-muted small">{new Date(ret.return_date).toLocaleDateString()}</span></div><div className="small text-dark mb-2"><strong>Reason:</strong> {ret.return_reason}</div></div>))}</div>)}</div>)}
                <div className="table-footer">{selectedOrder.notes && (<div className="text-start mb-3 p-2 bg-light border rounded"><small className="fw-bold text-muted"><CIcon icon={cilNotes} className="me-1"/> Notes:</small><div className="small text-dark fst-italic">{selectedOrder.notes}</div></div>)}<div className="grand-total">Total: <span>₱{selectedOrder.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}</span></div></div>
              </>
            )}
         </CModalBody>
         <CModalFooter className="bg-white"><CButton color="secondary" onClick={() => setIsModalOpen(false)}>Close</CButton><CButton color="primary" onClick={() => window.print()} className="d-print-none">Print Invoice</CButton></CModalFooter>
      </CModal>

      {/* --- RETURN MODAL --- */}
      <CModal visible={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} size="lg" alignment="center" backdrop="static" scrollable>
          <CModalHeader className="text-white" style={{ background: '#e55353' }}>
              <CModalTitle style={{ fontFamily: 'Oswald', letterSpacing: '1px' }}><CIcon icon={cilArrowLeft} className="me-2"/>PROCESS RETURN</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4 bg-light">
              <div className="bg-white p-0 rounded shadow-sm border mb-4 overflow-hidden">
                   <div className="bg-white border-bottom p-3"><h6 className="mb-0 fw-bold text-danger">1. SELECT ITEMS TO RETURN</h6></div>
                   <div className="table-responsive">
                     <table className="table table-hover align-middle mb-0">
                         <thead className="bg-light"><tr><th className="ps-4">Product</th><th className="text-center">Sold</th><th className="text-center" style={{width:'180px'}}>Return Qty</th></tr></thead>
                         <tbody>
                            {returnItems.map((item, idx) => (
                                <tr key={idx} className={item.return_qty > 0 ? 'bg-warning bg-opacity-10' : ''}>
                                    <td className="ps-4"><div className="fw-bold text-dark small">{item.product_name}</div>{item.is_serialized && item.available_serials && (<div className="mt-1">{item.available_serials.map(sn => (<CFormCheck key={sn.id} id={`sn-${sn.id}`} label={<span className="small font-monospace text-muted">{sn.serial_number}</span>} checked={item.selected_serials.includes(sn.serial_number)} onChange={(e) => handleSerialSelection(idx, sn.serial_number, e.target.checked)}/>))}</div>)}</td>
                                    <td className="text-center"><span className="badge bg-light text-dark border">{item.max_qty}</span></td>
                                    <td className="text-center pe-3">{!item.is_serialized ? (<CFormInput type="number" min="0" max={item.max_qty} value={item.return_qty} onChange={(e) => handleReturnQtyChange(idx, e.target.value)} className="text-center form-control-sm fw-bold text-danger"/>) : (<span className="badge bg-danger">{item.return_qty}</span>)}</td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                   </div>
              </div>
              <div className="bg-white p-0 rounded shadow-sm border overflow-hidden">
                   <div className="bg-white border-bottom p-3"><h6 className="mb-0 fw-bold text-danger">2. RETURN DETAILS</h6></div>
                   <div className="p-4">
                     <CRow className="g-3">
                         <CCol md={6}>
                             <CFormLabel className="small text-muted fw-bold text-uppercase">Reason for Return</CFormLabel>
                             <CFormSelect size="sm" value={returnForm.reason} onChange={e=>setReturnForm({...returnForm, reason: e.target.value})}>
                                 <option>Factory Defect</option><option>Damaged in Transit</option><option>Wrong Item Sent</option><option>Compatibility Issue</option><option>Missing Components</option>
                             </CFormSelect>
                         </CCol>
                         <CCol md={6}>
                             <CFormLabel className="small text-muted fw-bold text-uppercase">Refund Method</CFormLabel>
                             <CFormSelect size="sm" value={returnForm.method} onChange={e=>setReturnForm({...returnForm, method: e.target.value})}>
                                 <option>Cash</option><option>GCash</option>
                             </CFormSelect>
                         </CCol>
                         <CCol md={12}>
                             <CFormLabel className="small text-muted fw-bold text-uppercase">Photo Proof <span className="text-danger">*</span></CFormLabel>
                             <div className="input-group input-group-sm"><span className="input-group-text bg-light"><CIcon icon={cilCloudUpload}/></span><CFormInput type="file" accept="image/*" ref={fileInputRef} onChange={(e) => setReturnForm({...returnForm, file: e.target.files[0]})} required /></div>
                             <div className="form-text small">Mandatory for all returns.</div>
                         </CCol>
                         <CCol md={12}>
                             <CFormLabel className="small text-muted fw-bold text-uppercase">Additional Notes</CFormLabel>
                             <CFormTextarea rows={2} value={returnForm.notes} onChange={e => setReturnForm({...returnForm, notes: e.target.value})} placeholder="Enter any specific details..." />
                         </CCol>
                         <CCol md={12} className="pt-2"><CFormSwitch label="Add items back to inventory stock?" checked={returnForm.restock} onChange={e=>setReturnForm({...returnForm, restock: e.target.checked})} id="restockSwitch"/></CCol>
                     </CRow>
                   </div>
              </div>
          </CModalBody>
          {/* [MODERNIZED FOOTER: WCAG + BRANDING] */}
          <CModalFooter className="bg-light border-top">
              <div className="d-flex w-100 justify-content-between">
                  <CButton 
                    color="secondary" 
                    variant="ghost" 
                    onClick={() => setIsReturnModalOpen(false)} 
                    className="fw-bold text-medium-emphasis" 
                    style={{ minWidth: '100px' }}
                  >
                    CANCEL
                  </CButton>
                  <CButton 
                    color="danger" 
                    onClick={initiateReturnProcess} 
                    disabled={isSubmittingReturn} 
                    className="text-white fw-bold shadow-sm px-4 d-flex align-items-center"
                    style={{ minWidth: '180px', backgroundColor: '#d32f2f', borderColor: '#d32f2f' }}
                  >
                      {isSubmittingReturn ? <CSpinner size="sm" className="me-2"/> : <CIcon icon={cilCheckCircle} className="me-2"/>} {isSubmittingReturn ? 'PROCESSING...' : 'CONFIRM RETURN'}
                  </CButton>
              </div>
          </CModalFooter>
      </CModal>

      {/* --- ADMIN AUTH MODAL (MODERNIZED & SECURE LOOK) --- */}
      <CModal visible={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} alignment="center" backdrop="static">
        <CModalHeader className="border-0 text-white" style={{ backgroundColor: '#17334e' }}>
            <CModalTitle style={{ fontFamily: 'Oswald', letterSpacing: '1px' }}>
                <CIcon icon={cilLockLocked} className="me-2 text-warning"/> MANAGER AUTHORIZATION
            </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-0">
            <div className="bg-light p-4 border-bottom">
                <div className="d-flex align-items-center mb-3">
                    <div className="p-3 bg-white rounded-circle shadow-sm me-3 text-danger"><CIcon icon={cilShieldAlt} size="xl"/></div>
                    <div>
                        <h6 className="fw-bold text-dark mb-1">Security Override Required</h6>
                        <div className="small text-muted" style={{ lineHeight: '1.4' }}>Refunds require administrative approval. Please enter supervisor credentials to proceed.</div>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-white">
                <div className="mb-3">
                    <CFormLabel htmlFor="adminEmail" className="small text-muted fw-bold text-uppercase">Supervisor Email</CFormLabel>
                    <div className="input-group"><span className="input-group-text bg-light border-end-0"><CIcon icon={cilUser}/></span><CFormInput id="adminEmail" type="email" className="border-start-0 ps-1" placeholder="name@company.com" value={adminAuth.email} onChange={e => setAdminAuth({...adminAuth, email: e.target.value})} autoFocus /></div>
                </div>
                <div className="mb-4">
                    <CFormLabel htmlFor="adminPass" className="small text-muted fw-bold text-uppercase">Password</CFormLabel>
                    <div className="input-group"><span className="input-group-text bg-light border-end-0"><CIcon icon={cilLockLocked}/></span><CFormInput id="adminPass" type="password" className="border-start-0 ps-1" placeholder="••••••••" value={adminAuth.password} onChange={e => setAdminAuth({...adminAuth, password: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleAdminAuthorize()} /></div>
                </div>
                {adminAuth.error && <div className="alert alert-danger d-flex align-items-center small py-2 px-3 mb-0"><CIcon icon={cilWarning} className="me-2"/><div>{adminAuth.error}</div></div>}
            </div>
        </CModalBody>
        <CModalFooter className="bg-white border-top-0 pt-0 pb-4 px-4">
            <div className="d-flex w-100 justify-content-between">
                <CButton color="secondary" variant="ghost" onClick={() => setIsAuthModalOpen(false)} className="fw-bold text-medium-emphasis">CANCEL</CButton>
                <CButton style={{ backgroundColor: '#17334e', borderColor: '#17334e' }} className="text-white fw-bold px-4 d-flex align-items-center shadow-sm" onClick={handleAdminAuthorize} disabled={adminAuth.loading}>{adminAuth.loading ? <CSpinner size="sm" className="me-2"/> : <CIcon icon={cilCheckCircle} className="me-2"/>} AUTHORIZE</CButton>
            </div>
        </CModalFooter>
      </CModal>

      {/* --- MESSAGE MODAL --- */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})} alignment="center">
        <CModalBody className="p-5 text-center">
            {msgModal.icon && (<div className={`mb-3 text-${msgModal.color}`}><CIcon icon={msgModal.icon} size="4xl" /></div>)}
            <h4 className="fw-bold mb-2" style={{fontFamily: 'Oswald, sans-serif'}}>{msgModal.title}</h4>
            <p className="text-muted mb-4">{msgModal.message}</p>
            <CButton color={msgModal.color} className="text-white fw-bold px-4 py-2" onClick={() => setMsgModal({...msgModal, visible: false})} style={{borderRadius: '50px'}}>ACKNOWLEDGE</CButton>
        </CModalBody>
      </CModal>
    </CContainer>
  )
}

export default OrdersPage