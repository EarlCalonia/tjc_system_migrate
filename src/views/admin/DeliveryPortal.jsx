import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CContainer, CCard, CCardBody, CButton, CFormSelect, CFormLabel, CFormInput,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CBadge,
  CNavbar, CNavbarBrand, CNavbarNav, CAvatar, CSpinner, CRow, CCol, CTooltip,
  CCloseButton
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch, cilUser, cilAccountLogout, cilCheckCircle, cilDescription,
  cilCloudUpload, cilTruck, cilLocationPin, cilPhone, cilMoney, cilWarning, cilXCircle
} from '@coreui/icons'

import sidebarIcon from '../../assets/sidebar-icon.png'
import { salesAPI } from '../../utils/api'

import '../../styles/Admin.css'
import '../../styles/App.css'
import '../../styles/DeliveryPortal.css'

const DeliveryPortal = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const riderName = sessionStorage.getItem('username') || 'Rider'
  const riderAvatar = sessionStorage.getItem('avatar')

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [deliveryProof, setDeliveryProof] = useState(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', type: 'info' })

  const ordersPerPage = 10

  useEffect(() => {
    let mounted = true
    const loadData = (isBackground = false) => {
        if (!isBackground) setLoading(true)
        fetchOrders()
          .then((mapped) => { if (mounted) setOrders(mapped) })
          .catch((e) => { if (mounted) setError(e.message) })
          .finally(() => { if (mounted && !isBackground) setLoading(false) })
    }
    loadData(); 
    const interval = setInterval(() => { loadData(true); }, 15000); 
    return () => { mounted = false; clearInterval(interval); }
  }, [])

  const fetchOrders = async () => {
    try {
      const list = await salesAPI.getSales({ delivery_type: 'Company Delivery' })
      const activeDeliveryList = (list || []).filter((s) => ['Pending', 'Processing'].includes(s.status))

      const mappedPromises = activeDeliveryList.map(async (s) => {
        let items = []
        try { items = await salesAPI.getSaleItems(s.id) } catch (e) { console.error(e) }
        return {
          id: s.sale_number,
          saleId: s.id,
          customerName: s.customer_name,
          orderDate: new Date(s.created_at).toLocaleDateString(),
          items: items,
          itemCount: items.length,
          total: s.total,
          paymentStatus: s.payment_status,
          paymentMethod: s.payment,
          orderStatus: s.status,
          address: s.address || '',
          landmark: s.landmark || '', 
          contact: s.contact || '',
          deliveryProof: s.delivery_proof || null,
        }
      })
      const results = await Promise.all(mappedPromises)
      return results.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate))
    } catch (e) { throw new Error(e.message) }
  }

  const showMessage = (title, message, type = 'info') => { setMsgModal({ visible: true, title, message, type }) }
  const handleLogout = () => { sessionStorage.clear(); navigate('/admin/login') }

  const handleOrderStatusChange = async (orderId, newStatus) => {
    const target = orders.find((o) => o.id === orderId)
    if (!target) return
    try {
      await salesAPI.updateSale(target.saleId, { status: newStatus })
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o)))
    } catch (e) { showMessage('Error', e.message, 'error') }
  }

  const handleCompleteDelivery = async () => {
    if (!selectedOrder) return
    if (!deliveryProof) return showMessage('Missing Proof', 'Please upload a photo proof of delivery.', 'warning')
    setUploadingProof(true)
    try {
      await salesAPI.uploadDeliveryProof(selectedOrder.saleId, deliveryProof)
      if (selectedOrder.paymentStatus !== 'Paid') { await salesAPI.updateSale(selectedOrder.saleId, { payment_status: 'Paid' }) }
      await salesAPI.updateSale(selectedOrder.saleId, { status: 'Completed' })
      const updated = await fetchOrders()
      setOrders(updated)
      setDeliveryProof(null)
      setIsCompleteModalOpen(false)
      showMessage('Delivery Successful', `Order ${selectedOrder.id} has been marked as completed.`, 'success')
    } catch (e) { showMessage('Submission Failed', e.message, 'error') } finally { setUploadingProof(false) }
  }

  const filteredOrders = useMemo(() => {
    const s = searchTerm.toLowerCase()
    return orders.filter(o => o.id.toLowerCase().includes(s) || (o.customerName || '').toLowerCase().includes(s) || (o.address || '').toLowerCase().includes(s))
  }, [orders, searchTerm])

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1
  const startIndex = (currentPage - 1) * ordersPerPage
  const currentOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage)
  
  const brandHeaderStyle = { fontFamily: 'Oswald, sans-serif', letterSpacing: '1px', color: '#ffffff', margin: 0 }
  
  const getModalIcon = (type) => {
      if(type === 'success') return <CIcon icon={cilCheckCircle} size="4xl" className="text-success mb-3"/>;
      if(type === 'error') return <CIcon icon={cilXCircle} size="4xl" className="text-danger mb-3"/>;
      return <CIcon icon={cilWarning} size="4xl" className="text-warning-dark mb-3"/>;
  }

  return (
    <div className="delivery-portal-wrapper">
      <CNavbar className="delivery-navbar sticky-top">
        <CContainer fluid className="px-3 d-flex flex-wrap justify-content-between align-items-center">
          <CNavbarBrand href="#" className="d-flex align-items-center gap-2 me-0">
            <img src={sidebarIcon} alt="Logo" height="32" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'}} />
            <div className="vr text-white opacity-25 mx-2" style={{height: '24px'}}></div>
            <span className="text-white fw-bold fs-5 tracking-wide d-none d-sm-block" style={brandHeaderStyle}>DELIVERY PORTAL</span>
            <span className="text-white fw-bold fs-6 tracking-wide d-block d-sm-none" style={brandHeaderStyle}>RIDER APP</span>
          </CNavbarBrand>
          <CNavbarNav className="d-flex flex-row align-items-center gap-2">
            <div className="rider-badge d-flex align-items-center text-white gap-2 px-3 py-1 rounded-pill">
              <CAvatar src={riderAvatar && riderAvatar.startsWith('http') ? riderAvatar : `http://localhost:5000${riderAvatar}`} size="sm" />
              <span className="d-none d-sm-inline small fw-bold text-uppercase">{riderName}</span>
            </div>
            <CButton color="light" variant="ghost" className="text-white btn-sm" onClick={handleLogout}>
              <CIcon icon={cilAccountLogout} />
            </CButton>
          </CNavbarNav>
        </CContainer>
      </CNavbar>

      {/* Note: Standard CContainer + Custom CSS override for Widescreen */}
      <CContainer className="py-3 px-3">
        <div className="d-flex flex-wrap justify-content-between align-items-end mb-3 gap-2">
          <div><h2 className="text-brand-navy mb-0 fw-bold fs-4" style={{...brandHeaderStyle, color: 'var(--brand-navy)'}}>MY ASSIGNMENTS</h2></div>
          <div className="brand-search-wrapper shadow-sm w-100"><span className="brand-search-icon"><CIcon icon={cilSearch}/></span><input type="text" className="brand-search-input" placeholder="Search Order..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </div>

        <CCard className="border-0 shadow-sm mobile-scroll-fix">
          <CCardBody className="p-0">
            {loading ? <div className="text-center py-5"><CSpinner color="primary"/></div> : error ? <div className="alert alert-danger m-3">{error}</div> : (
             <>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="ps-4" style={{width: '15%'}}>Order ID</th>
                      <th style={{width: '20%'}}>Customer</th>
                      <th style={{width: '30%'}}>Delivery Location</th>
                      <th style={{width: '20%'}}>Status</th>
                      <th className="text-end pe-4" style={{width: '15%'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.length === 0 ? (<tr><td colSpan="5" className="text-center py-5 text-muted fw-bold">No active deliveries found.</td></tr>) : (
                      currentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="ps-4" data-label="Order ID">
                             <div className="fw-bold text-brand-blue font-monospace fs-5">{order.id}</div>
                             <div className="small text-muted">{order.orderDate}</div>
                          </td>
                          <td data-label="Customer">
                             <div className="fw-bold text-dark">{order.customerName}</div>
                             <div className="small mt-1"><span className={`badge ${order.paymentStatus === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}`}>{order.paymentStatus} ({order.paymentMethod})</span></div>
                          </td>
                          <td data-label="Location">
                             <div className="d-flex align-items-start gap-2 location-cell">
                                <CIcon icon={cilLocationPin} className="text-danger mt-1 flex-shrink-0"/>
                                <div>
                                   <div className="fw-bold text-dark lh-sm text-wrap">{order.address}</div>
                                   {order.landmark && <div className="small text-muted fst-italic mt-1 text-wrap">Note: {order.landmark}</div>}
                                   <div className="small text-brand-blue mt-1 fw-bold"><CIcon icon={cilPhone} size="sm" className="me-1"/>{order.contact}</div>
                                </div>
                             </div>
                          </td>
                          <td data-label="Status">
                             <div className="d-flex align-items-center status-wrapper">
                               <CFormSelect size="sm" value={order.orderStatus} onChange={(e) => handleOrderStatusChange(order.id, e.target.value)} className={`fw-bold border-2 ${order.orderStatus === 'Processing' ? 'border-success text-success' : 'border-secondary text-muted'}`} style={{fontSize: '0.9rem', height: '40px'}}>
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Out for Delivery 🚚</option>
                               </CFormSelect>
                             </div>
                          </td>
                          <td className="text-end pe-4" data-label="Actions">
                             <div className="d-flex justify-content-end gap-2 action-buttons">
                                <CButton color="primary" variant="outline" className="w-50" onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}><CIcon icon={cilDescription} className="me-1"/> View</CButton>
                                <CButton color="success" className="text-white w-50" disabled={order.orderStatus === 'Pending'} onClick={() => { setSelectedOrder(order); setDeliveryProof(null); setIsCompleteModalOpen(true); }}><CIcon icon={cilCheckCircle} className="me-1"/> Done</CButton>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredOrders.length > 0 && (
                <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
                  <span className="small text-muted fw-semibold">Page {currentPage}</span>
                  <div className="d-flex gap-2"><CButton size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</CButton><CButton size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</CButton></div>
                </div>
              )}
             </>
            )}
          </CCardBody>
        </CCard>
      </CContainer>

      {/* --- VIEW ORDER MODAL --- */}
      <CModal visible={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} size="lg" alignment="center" scrollable>
        <CModalHeader className="delivery-modal-header bg-brand-navy" closeButton={false}>
            <CModalTitle>DELIVERY DETAILS: {selectedOrder?.id}</CModalTitle>
            <CCloseButton className="btn-close-white" onClick={() => setIsViewModalOpen(false)} />
        </CModalHeader>
        <CModalBody className="p-0">
          {selectedOrder && (
            <>
               <div className="p-3 bg-light border-bottom">
                  <div className="d-flex flex-column gap-3">
                      <div className="d-flex justify-content-between align-items-start">
                          <div><small className="text-uppercase text-muted fw-bold">Customer</small><div className="fs-5 fw-bold text-brand-navy">{selectedOrder.customerName}</div><div><CIcon icon={cilPhone} className="me-1"/>{selectedOrder.contact}</div></div>
                          <div className="text-end"><small className="text-uppercase text-muted fw-bold">Total</small><div className="fs-4 fw-bold text-success">₱{Number(selectedOrder.total).toLocaleString()}</div></div>
                      </div>
                      <div className="bg-white p-3 rounded border"><div className="d-flex gap-2"><CIcon icon={cilLocationPin} className="text-danger mt-1 flex-shrink-0"/><div className="text-wrap text-break"><div className="fw-bold text-dark">{selectedOrder.address}</div>{selectedOrder.landmark && <div className="small text-muted fst-italic">Landmark: {selectedOrder.landmark}</div>}</div></div></div>
                  </div>
               </div>
               <div className="p-3">
                  <h6 className="fw-bold text-brand-navy mb-3" style={{color: 'var(--brand-navy)'}}>ITEMS ({selectedOrder.itemCount})</h6>
                  <table className="table table-striped align-middle mb-0 border small"><thead className="bg-white"><tr><th className="ps-2">Product</th><th className="text-center">Qty</th><th className="text-end pe-2">Price</th></tr></thead><tbody>{selectedOrder.items.map((item, i) => (<tr key={i}><td className="ps-2"><div className="fw-bold text-dark text-wrap">{item.product_name}</div><div className="text-muted">{item.brand}</div></td><td className="text-center fw-bold">{item.quantity}</td><td className="text-end pe-2">₱{Number(item.price).toLocaleString()}</td></tr>))}</tbody></table>
               </div>
            </>
          )}
        </CModalBody>
        <CModalFooter className="bg-light"><CButton color="secondary" onClick={() => setIsViewModalOpen(false)}>Close</CButton></CModalFooter>
      </CModal>

      {/* --- COMPLETE DELIVERY MODAL --- */}
      <CModal visible={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} alignment="center" backdrop="static">
        <CModalHeader className="delivery-modal-header bg-success" closeButton={false}>
             <CModalTitle><CIcon icon={cilCheckCircle} className="me-2"/> COMPLETE DELIVERY</CModalTitle>
             <CCloseButton className="btn-close-white" onClick={() => setIsCompleteModalOpen(false)} />
        </CModalHeader>
        <CModalBody className="p-4">
           <div className="text-center mb-4"><div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3"><CIcon icon={cilCloudUpload} size="4xl" className="text-success"/></div><h5 className="fw-bold">Upload Proof of Delivery</h5><p className="text-muted small">Capture a clear photo of the items being received or dropped off.</p></div>
           <div className="mb-4 p-3 border rounded bg-light text-center"><CFormLabel className="fw-bold small text-uppercase d-block mb-2">Select Photo Proof</CFormLabel><CFormInput type="file" accept="image/*" onChange={(e) => setDeliveryProof(e.target.files[0])} /></div>
           {selectedOrder?.paymentStatus === 'Unpaid' && (<div className="alert alert-warning d-flex align-items-center border-warning"><CIcon icon={cilWarning} size="xl" className="me-3 text-warning"/><div><strong className="d-block text-uppercase ls-1">Collect Payment</strong><div className="fs-4 fw-bold text-dark">₱{Number(selectedOrder.total).toLocaleString()}</div><div className="small">Ensure cash is received before completing.</div></div></div>)}
        </CModalBody>
        <CModalFooter className="bg-light"><CButton color="secondary" variant="ghost" onClick={() => setIsCompleteModalOpen(false)}>Cancel</CButton><CButton color="success" className="text-white fw-bold px-4" onClick={handleCompleteDelivery} disabled={uploadingProof || !deliveryProof}>{uploadingProof ? <><CSpinner size="sm" variant="grow" className="me-2"/> Uploading...</> : 'CONFIRM & COMPLETE'}</CButton></CModalFooter>
      </CModal>
      
      {/* MESSAGE MODAL (WCAG FIXED) */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})} alignment="center" size="sm">
        <CModalHeader className={`delivery-modal-header ${msgModal.type === 'success' ? 'bg-success-dark' : msgModal.type === 'error' ? 'bg-danger' : 'bg-info-dark'}`} closeButton={false}>
            <CModalTitle>{msgModal.title.toUpperCase()}</CModalTitle>
            <CCloseButton className="btn-close-white" onClick={() => setMsgModal({...msgModal, visible: false})} />
        </CModalHeader>
        <CModalBody className="p-4 text-center" role="alert">{getModalIcon(msgModal.type)}<div className="fs-5 fw-bold mb-2 text-dark">{msgModal.title}</div><div className="text-dark opacity-75">{msgModal.message}</div></CModalBody>
        <CModalFooter className="bg-light justify-content-center"><CButton color={msgModal.type === 'success' ? 'success' : 'secondary'} className={msgModal.type === 'success' ? 'text-white fw-bold px-4' : ''} onClick={() => setMsgModal({...msgModal, visible: false})}>{msgModal.type === 'success' ? 'Great, Close' : 'Close'}</CButton></CModalFooter>
      </CModal>
    </div>
  )
}

export default DeliveryPortal