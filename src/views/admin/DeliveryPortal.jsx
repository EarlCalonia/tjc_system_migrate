import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CContainer,
  CRow,
  CCol,
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
  CInputGroup,
  CInputGroupText,
  CNavbar,
  CNavbarBrand,
  CNavbarNav,
  CNavItem,
  CAvatar,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilTruck,
  cilUser,
  cilAccountLogout,
  cilCheckCircle,
  cilDescription,
  cilCloudUpload,
} from '@coreui/icons'
import tcjLogo from '../../assets/tcj_logo.png'
import { salesAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'

const DeliveryPortal = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Rider Info
  const riderName = localStorage.getItem('username') || localStorage.getItem('userEmail') || 'Rider'
  const riderAvatar = localStorage.getItem('avatar')

  // Modals & Selection
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
    localStorage.clear() // Or remove specific keys
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

  // Filtering & Pagination
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

  // --- RENDER ---
  return (
    <div className="min-vh-100 bg-light">
      {/* NAVBAR */}
      <CNavbar colorScheme="dark" className="bg-dark mb-4">
        <CContainer fluid>
          <CNavbarBrand href="#" className="d-flex align-items-center gap-2">
            <img src={tcjLogo} alt="Logo" height="30" />
            <span>Delivery Portal</span>
          </CNavbarBrand>
          <CNavbarNav className="ms-auto d-flex flex-row align-items-center gap-3">
            <div className="d-flex align-items-center text-light gap-2">
              {riderAvatar ? (
                <CAvatar src={riderAvatar.startsWith('http') ? riderAvatar : `http://localhost:5000${riderAvatar}`} size="sm" />
              ) : (
                <CIcon icon={cilUser} />
              )}
              <span className="d-none d-md-inline">{riderName}</span>
            </div>
            <div className="vr text-light opacity-50"></div>
            <CButton color="link" className="text-light text-decoration-none p-0" onClick={handleLogout}>
              <CIcon icon={cilAccountLogout} className="me-1" /> Logout
            </CButton>
          </CNavbarNav>
        </CContainer>
      </CNavbar>

      <CContainer>
        {/* HEADER & SEARCH */}
        <CCard className="mb-4">
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h4 className="mb-0">My Delivery Orders</h4>
                <small className="text-medium-emphasis">Manage assigned deliveries</small>
              </div>
              <div style={{ width: '300px', maxWidth: '100%' }}>
                <CInputGroup>
                  <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                  <CFormInput 
                    placeholder="Search orders..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CInputGroup>
              </div>
            </div>
          </CCardHeader>

          {/* TABLE */}
          <CCardBody>
            {loading ? <div className="text-center py-5"><CSpinner /></div> : 
             error ? <div className="alert alert-danger">{error}</div> : (
              <CTable hover responsive align="middle">
                <CTableHead color="light">
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
                      <CTableDataCell className="fw-bold">{order.id}</CTableDataCell>
                      <CTableDataCell>{order.customerName}</CTableDataCell>
                      <CTableDataCell>
                         <div className="text-truncate" style={{maxWidth: '200px'}} title={order.productList}>
                           {order.productList}
                         </div>
                      </CTableDataCell>
                      <CTableDataCell>
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
                      <CTableDataCell>
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
                         <CButton 
                            size="sm" 
                            color="info" 
                            variant="ghost"
                            className="me-1"
                            onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}
                         >
                           <CIcon icon={cilDescription} />
                         </CButton>
                         <CButton 
                            size="sm" 
                            color="success" 
                            className="text-white"
                            disabled={order.paymentStatus !== 'Paid'}
                            onClick={() => { setSelectedOrder(order); setDeliveryProof(null); setIsCompleteModalOpen(true); }}
                         >
                           <CIcon icon={cilCheckCircle} /> Complete
                         </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
            
            {/* PAGINATION */}
            <div className="d-flex justify-content-between align-items-center mt-3">
               <small className="text-muted">Showing {startIndex + 1}-{Math.min(startIndex + ordersPerPage, filteredOrders.length)} of {filteredOrders.length}</small>
               <div>
                  <CButton size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</CButton>
                  <span className="mx-2">{currentPage}</span>
                  <CButton size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</CButton>
               </div>
            </div>
          </CCardBody>
        </CCard>
      </CContainer>

      {/* VIEW MODAL */}
      <CModal visible={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} size="lg">
        <CModalHeader><CModalTitle>Order {selectedOrder?.id}</CModalTitle></CModalHeader>
        <CModalBody>
          <CRow className="mb-3">
            <CCol md={6}>
               <strong>Customer:</strong> {selectedOrder?.customerName}<br/>
               <strong>Contact:</strong> {selectedOrder?.contact}<br/>
               <strong>Address:</strong> {selectedOrder?.address}
            </CCol>
            <CCol md={6} className="text-md-end">
               <strong>Date:</strong> {selectedOrder?.orderDate}<br/>
               <strong>Status:</strong> {selectedOrder?.orderStatus}<br/>
               <strong>Payment:</strong> {selectedOrder?.paymentStatus}
            </CCol>
          </CRow>
          <CTable bordered small>
            <CTableHead><CTableRow><CTableHeaderCell>Product</CTableHeaderCell><CTableHeaderCell>SN</CTableHeaderCell><CTableHeaderCell>Qty</CTableHeaderCell></CTableRow></CTableHead>
            <CTableBody>
               {selectedOrder?.items?.map((item, i) => (
                  <CTableRow key={i}>
                     <CTableDataCell>{item.product_name}</CTableDataCell>
                     <CTableDataCell>{item.serial_numbers?.join(', ') || 'N/A'}</CTableDataCell>
                     <CTableDataCell>{item.quantity}</CTableDataCell>
                  </CTableRow>
               ))}
            </CTableBody>
          </CTable>
        </CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setIsViewModalOpen(false)}>Close</CButton></CModalFooter>
      </CModal>

      {/* COMPLETE MODAL */}
      <CModal visible={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)}>
        <CModalHeader><CModalTitle>Complete Delivery</CModalTitle></CModalHeader>
        <CModalBody>
           <p>Please upload proof of delivery (photo) to complete this order.</p>
           <CFormLabel>Proof of Delivery</CFormLabel>
           <CFormInput type="file" accept="image/*" onChange={(e) => setDeliveryProof(e.target.files[0])} />
        </CModalBody>
        <CModalFooter>
           <CButton color="secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</CButton>
           <CButton color="success" className="text-white" onClick={handleCompleteDelivery} disabled={uploadingProof || !deliveryProof}>
             {uploadingProof ? <CSpinner size="sm" /> : <><CIcon icon={cilCloudUpload} /> Upload & Complete</>}
           </CButton>
        </CModalFooter>
      </CModal>

      {/* MSG MODAL */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </div>
  )
}

export default DeliveryPortal