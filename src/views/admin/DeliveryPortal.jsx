import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CContainer,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
  CNavbar,
  CNavbarBrand,
  CNavbarNav,
  CAvatar,
  CSpinner,
  CRow,
  CCol
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilUser,
  cilAccountLogout,
  cilCheckCircle,
  cilDescription,
  cilCloudUpload,
} from '@coreui/icons'
import tcjLogo from '../../assets/tcj_logo.png'
import { salesAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'

// [FIX] Global Styles
import '../../styles/App.css'
import '../../styles/DeliveryPortal.css' // Ensure local styles are loaded

const DeliveryPortal = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const riderName = localStorage.getItem('username') || localStorage.getItem('userEmail') || 'Rider'
  const riderAvatar = localStorage.getItem('avatar')

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [deliveryProof, setDeliveryProof] = useState(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })

  const ordersPerPage = 10

  // --- EFFECTS ---
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchOrders()
      .then((mapped) => { if (mounted) setOrders(mapped) })
      .catch((e) => { if (mounted) setError(e.message) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  // --- API & LOGIC ---
  const fetchOrders = async () => {
    try {
      const list = await salesAPI.getSales({ delivery_type: 'Company Delivery' })
      const activeDeliveryList = (list || []).filter(
        (s) => s.status === 'Pending' || s.status === 'Processing' || s.status === 'Out for Delivery',
      )

      const mappedPromises = activeDeliveryList.map(async (s) => {
        let productListString = 'See details'
        let items = []
        try {
          const itemsResponse = await salesAPI.getSaleItems(s.id)
          const serialsResponse = await serialNumberAPI.getBySaleId(s.id)
          const allSerials = serialsResponse.data || []
          items = itemsResponse.map((item) => {
            const serial_numbers = allSerials
              .filter((sn) => sn.sale_item_id === item.id)
              .map((sn) => sn.serial_number)
            return { ...item, serial_numbers }
          })
          productListString = (items || [])
            .map((item) => `${item.product_name} (x${item.quantity})`)
            .join(', ')
        } catch (e) {
          console.error(`Failed items fetch for ${s.id}`, e)
        }
        return {
          id: s.sale_number,
          saleId: s.id,
          customerName: s.customer_name,
          orderDate: new Date(s.created_at).toLocaleDateString(),
          productList: productListString,
          items: items,
          paymentStatus: s.payment_status,
          paymentMethod: s.payment,
          orderStatus: s.status,
          address: s.address || '',
          contact: s.contact || '',
          deliveryProof: s.delivery_proof || null,
        }
      })
      return await Promise.all(mappedPromises)
    } catch (e) {
      throw new Error(e.message)
    }
  }

  const showMessage = (title, message, color = 'info') => {
    setMsgModal({ visible: true, title, message, color })
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/admin/login')
  }

  const handlePaymentStatusChange = async (orderId, newStatus) => {
    const target = orders.find((o) => o.id === orderId)
    if (!target) return
    try {
      await salesAPI.updateSale(target.saleId, { payment_status: newStatus })
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: newStatus } : o)))
      if (newStatus === 'Paid') showMessage('Success', 'Payment marked as Paid', 'success')
    } catch (e) {
      showMessage('Error', e.message, 'danger')
    }
  }

  const handleOrderStatusChange = async (orderId, newStatus) => {
    const target = orders.find((o) => o.id === orderId)
    if (!target) return
    try {
      await salesAPI.updateSale(target.saleId, { status: newStatus })
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o)))
    } catch (e) {
      showMessage('Error', e.message, 'danger')
    }
  }

  const handleCompleteDelivery = async () => {
    if (!selectedOrder) return
    if (!deliveryProof) return showMessage('Missing Proof', 'Upload proof first', 'warning')
    
    setUploadingProof(true)
    try {
      await salesAPI.uploadDeliveryProof(selectedOrder.saleId, deliveryProof)
      await salesAPI.updateSale(selectedOrder.saleId, { status: 'Completed' })
      
      const updated = await fetchOrders()
      setOrders(updated)
      
      setDeliveryProof(null)
      setIsCompleteModalOpen(false)
      showMessage('Success', 'Delivery Completed', 'success')
    } catch (e) {
      showMessage('Error', e.message, 'danger')
    } finally {
      setUploadingProof(false)
    }
  }

  const filteredOrders = useMemo(() => {
    const s = searchTerm.toLowerCase()
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(s) ||
        (o.customerName || '').toLowerCase().includes(s) ||
        (o.productList || '').toLowerCase().includes(s),
    )
  }, [orders, searchTerm])

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1
  const startIndex = (currentPage - 1) * ordersPerPage
  const currentOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage)

  return (
    <div className="delivery-portal">
      {/* NAVBAR */}
      <CNavbar className="delivery-navbar mb-4">
        <CContainer fluid>
          <CNavbarBrand href="#" className="d-flex align-items-center gap-2">
            <img src={tcjLogo} alt="Logo" height="30" />
            <span className="text-white fw-bold d-none d-sm-inline" style={{fontFamily: 'Oswald'}}>DELIVERY PORTAL</span>
          </CNavbarBrand>
          <CNavbarNav className="ms-auto d-flex flex-row align-items-center gap-3">
            <div className="d-flex align-items-center text-white gap-2">
              {riderAvatar ? (
                <CAvatar src={riderAvatar.startsWith('http') ? riderAvatar : `http://localhost:5000${riderAvatar}`} size="sm" />
              ) : (
                <CIcon icon={cilUser} />
              )}
              <span className="d-none d-md-inline font-monospace">{riderName}</span>
            </div>
            <div className="vr text-white opacity-50"></div>
            <CButton color="link" className="text-white text-decoration-none p-0 fw-bold" onClick={handleLogout}>
              <CIcon icon={cilAccountLogout} className="me-1" /> Logout
            </CButton>
          </CNavbarNav>
        </CContainer>
      </CNavbar>

      <CContainer>
        {/* HEADER & SEARCH */}
        <CCard className="mb-4 shadow-sm border-0">
          <CCardHeader className="bg-white border-bottom py-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h4 className="mb-0 text-brand-navy" style={{fontFamily: 'Oswald'}}>MY DELIVERY TASKS</h4>
                <small className="text-muted">Manage assigned deliveries</small>
              </div>
              
              {/* Branded Search Bar */}
              <div className="brand-search-wrapper" style={{ width: '300px', maxWidth: '100%' }}>
                  <span className="brand-search-icon"><CIcon icon={cilSearch}/></span>
                  <input 
                    type="text" 
                    className="brand-search-input" 
                    placeholder="Search orders..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
              </div>
            </div>
          </CCardHeader>

          {/* TABLE */}
          <CCardBody>
            {loading ? <div className="text-center py-5"><CSpinner color="primary"/></div> : 
             error ? <div className="alert alert-danger">{error}</div> : (
              <CTable hover responsive align="middle" className="delivery-table mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Order ID</CTableHeaderCell>
                    <CTableHeaderCell>Customer</CTableHeaderCell>
                    <CTableHeaderCell>Details</CTableHeaderCell>
                    <CTableHeaderCell>Payment</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {currentOrders.map((order) => (
                    <CTableRow key={order.id}>
                      <CTableDataCell data-label="Order ID" className="fw-bold text-primary">{order.id}</CTableDataCell>
                      <CTableDataCell data-label="Customer">{order.customerName}</CTableDataCell>
                      <CTableDataCell data-label="Details">
                         <div className="text-truncate" style={{maxWidth: '200px'}} title={order.productList}>
                           {order.productList}
                         </div>
                      </CTableDataCell>
                      <CTableDataCell data-label="Payment">
                        {order.paymentStatus === 'Unpaid' ? (
                          <CFormSelect 
                            size="sm" 
                            value={order.paymentStatus} 
                            onChange={(e) => handlePaymentStatusChange(order.id, e.target.value)}
                            className={order.paymentStatus === 'Paid' ? 'text-success fw-bold' : 'text-warning fw-bold'}
                          >
                            <option value="Unpaid">Unpaid (COD)</option>
                            <option value="Paid">Paid (COD)</option>
                          </CFormSelect>
                        ) : (
                          <CBadge color="success">Paid ({order.paymentMethod})</CBadge>
                        )}
                      </CTableDataCell>
                      <CTableDataCell data-label="Status">
                         <CFormSelect 
                            size="sm"
                            value={order.orderStatus}
                            onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                         >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                         </CFormSelect>
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                         <div className="d-flex justify-content-end gap-2">
                           <CButton 
                              size="sm" 
                              color="info" 
                              variant="ghost"
                              onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}
                              title="View Details"
                           >
                             <CIcon icon={cilDescription} />
                           </CButton>
                           <CButton 
                              size="sm" 
                              color="success" 
                              className="text-white"
                              disabled={order.paymentStatus !== 'Paid'}
                              onClick={() => { setSelectedOrder(order); setDeliveryProof(null); setIsCompleteModalOpen(true); }}
                              title="Complete Order"
                           >
                             <CIcon icon={cilCheckCircle} /> <span className="d-none d-sm-inline ms-1">Complete</span>
                           </CButton>
                         </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
            
            {/* PAGINATION */}
            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
               <small className="text-muted">Showing {startIndex + 1}-{Math.min(startIndex + ordersPerPage, filteredOrders.length)} of {filteredOrders.length}</small>
               <div>
                  <CButton size="sm" variant="outline" color="dark" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</CButton>
                  <span className="mx-3 fw-bold">{currentPage}</span>
                  <CButton size="sm" variant="outline" color="dark" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</CButton>
               </div>
            </div>
          </CCardBody>
        </CCard>
      </CContainer>

      {/* VIEW MODAL - Force White Header Text */}
      <CModal visible={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} size="lg">
        <CModalHeader className="bg-brand-navy text-white">
          <CModalTitle className="text-white" style={{fontFamily: 'Oswald'}}>ORDER DETAILS: {selectedOrder?.id}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="mb-3">
            <CCol md={6}>
               <h6 className="text-uppercase text-muted small fw-bold">Customer Info</h6>
               <p className="mb-1"><strong>Name:</strong> {selectedOrder?.customerName}</p>
               <p className="mb-1"><strong>Contact:</strong> {selectedOrder?.contact}</p>
               <p className="mb-1"><strong>Address:</strong> {selectedOrder?.address}</p>
            </CCol>
            <CCol md={6} className="text-md-end">
               <h6 className="text-uppercase text-muted small fw-bold">Order Info</h6>
               <p className="mb-1"><strong>Date:</strong> {selectedOrder?.orderDate}</p>
               <p className="mb-1"><strong>Status:</strong> <CBadge color="info">{selectedOrder?.orderStatus}</CBadge></p>
               <p className="mb-1"><strong>Payment:</strong> <CBadge color={selectedOrder?.paymentStatus === 'Paid' ? 'success' : 'warning'}>{selectedOrder?.paymentStatus}</CBadge></p>
            </CCol>
          </CRow>
          <h6 className="text-uppercase text-muted small fw-bold mt-4 mb-2">Items</h6>
          <CTable bordered small hover>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Product Name</CTableHeaderCell>
                <CTableHeaderCell>Serial Numbers</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Qty</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
               {selectedOrder?.items?.map((item, i) => (
                  <CTableRow key={i}>
                     <CTableDataCell className="fw-bold">{item.product_name}</CTableDataCell>
                     <CTableDataCell className="font-monospace small text-primary">
                        {item.serial_numbers?.length > 0 ? item.serial_numbers.join(', ') : <span className="text-muted">N/A</span>}
                     </CTableDataCell>
                     <CTableDataCell className="text-center">{item.quantity}</CTableDataCell>
                  </CTableRow>
               ))}
            </CTableBody>
          </CTable>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setIsViewModalOpen(false)}>Close</CButton>
        </CModalFooter>
      </CModal>

      {/* COMPLETE MODAL - Force White Header Text */}
      <CModal visible={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)}>
        <CModalHeader className="bg-success text-white">
          <CModalTitle className="text-white" style={{fontFamily: 'Oswald'}}>COMPLETE DELIVERY</CModalTitle>
        </CModalHeader>
        <CModalBody>
           <div className="text-center mb-4">
             <CIcon icon={cilCheckCircle} size="4xl" className="text-success mb-2" />
             <h5>Ready to complete?</h5>
             <p className="text-muted">Please upload the proof of delivery image to finalize this order.</p>
           </div>
           <CFormLabel className="fw-bold">Upload Proof of Delivery</CFormLabel>
           <CFormInput type="file" accept="image/*" onChange={(e) => setDeliveryProof(e.target.files[0])} />
        </CModalBody>
        <CModalFooter>
           <CButton color="secondary" variant="ghost" onClick={() => setIsCompleteModalOpen(false)}>Cancel</CButton>
           <CButton color="success" className="text-white fw-bold" onClick={handleCompleteDelivery} disabled={uploadingProof || !deliveryProof}>
             {uploadingProof ? <CSpinner size="sm" /> : <><CIcon icon={cilCloudUpload} className="me-2"/> Confirm & Upload</>}
           </CButton>
        </CModalFooter>
      </CModal>

      {/* MSG MODAL */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}>
          <CModalTitle className="text-white">{msgModal.title}</CModalTitle>
        </CModalHeader>
        <CModalBody className="fw-bold">{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </div>
  )
}

export default DeliveryPortal