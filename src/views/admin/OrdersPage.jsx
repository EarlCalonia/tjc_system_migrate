import React, { useState, useEffect, useMemo } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CButton,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormCheck,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CInputGroup,
  CInputGroupText,
  CWidgetStatsF,
  CBadge
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass,
  cilDescription,
  cilMoney,
  cilWarning,
  cilCheckCircle,
  cilArrowLeft,
  cilPrint,
  cilImage
} from '@coreui/icons'

// --- IMPORTS ---
import { salesAPI, returnsAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'
import { generateSaleReceipt } from '../../utils/pdfGenerator'

// --- CONFIGURATION ---
const ASSET_URL = 'http://localhost:5000'

const OrdersPage = () => {
  // --- STATE ---
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Initial state prevents "undefined" errors before API loads
  const [stats, setStats] = useState({
    total_sales: 0,
    pendingOrders: 0,
    paidOrders: 0,
    total_revenue: 0,
  })

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('All Order Statuses')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All Payment Statuses')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [orderToReturn, setOrderToReturn] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnReason, setReturnReason] = useState('')
  const [refundMethod, setRefundMethod] = useState('Cash')
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false)
  const [photoProof, setPhotoProof] = useState(null)
  
  const [isViewReturnsModalOpen, setIsViewReturnsModalOpen] = useState(false)
  const [returnsForOrder, setReturnsForOrder] = useState([])
  
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })

  // --- EFFECTS ---
  useEffect(() => {
    fetchOrdersWithItems()
    fetchOrderStats()
  }, [])

  // --- HELPERS ---
  const getProductImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${ASSET_URL}${cleanPath}`
  }

  const showMessage = (title, message, color = 'info') => {
    setMsgModal({ visible: true, title, message, color })
  }

  // --- API CALLS ---
  const fetchOrdersWithItems = async () => {
    setLoading(true)
    try {
      if (!salesAPI || !salesAPI.getSales) {
        throw new Error('Sales API not initialized')
      }

      const response = await salesAPI.getSales({ limit: 1000 })
      
      if (!Array.isArray(response)) {
        setOrders([])
        return
      }

      const ordersWithItems = await Promise.all(
        response.map(async (order) => {
          try {
            const itemsResponse = await salesAPI.getSaleItems(order.id) || []
            
            let allSerials = []
            try {
              if (serialNumberAPI && serialNumberAPI.getBySaleId) {
                const serialsResponse = await serialNumberAPI.getBySaleId(order.id)
                allSerials = serialsResponse.data || []
              }
            } catch (e) { /* Ignore serial fetch errors */ }
            
            const itemsWithSerials = itemsResponse.map((item) => {
              const serial_numbers = allSerials
                .filter((s) => s.sale_item_id === item.id)
                .map((s) => s.serial_number)
              return { ...item, serial_numbers }
            })
            return { ...order, items: itemsWithSerials }
          } catch (e) {
            return { ...order, items: [] }
          }
        }),
      )
      setOrders(ordersWithItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (err) {
      console.error("Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderStats = async () => {
    try {
      if(salesAPI && salesAPI.getSalesStats) {
        const response = await salesAPI.getSalesStats()
        if (response.success && response.data) {
          // FIX: Explicitly map backend keys to state keys with fallbacks
          setStats({
            total_sales: response.data.total_sales || 0,
            // Check for both camelCase and snake_case to be safe
            pendingOrders: response.data.pendingOrders ?? response.data.pending_orders ?? 0,
            paidOrders: response.data.paidOrders ?? response.data.paid_orders ?? 0,
            total_revenue: response.data.total_revenue || 0,
          })
        }
      }
    } catch (e) { console.error(e) }
  }

  // --- FILTERING ---
  const orderStatuses = ['All Order Statuses', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Returned', 'Partially Returned']
  const paymentStatuses = ['All Payment Statuses', 'Paid', 'Unpaid', 'Refunded', 'Partially Refunded']

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        (order.sale_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        selectedOrderStatus === 'All Order Statuses' || order.status === selectedOrderStatus
      const matchesPayment =
        selectedPaymentStatus === 'All Payment Statuses' ||
        (order.payment_status || 'Unpaid') === selectedPaymentStatus
      return matchesSearch && matchesStatus && matchesPayment
    })
  }, [orders, searchQuery, selectedOrderStatus, selectedPaymentStatus])

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)

  // --- HANDLERS ---
  const handlePrintReceipt = async (order) => {
    if (!order) return
    try {
      const doc = await generateSaleReceipt({
        saleNumber: order.sale_number,
        customerName: order.customer_name,
        items: order.items,
        totalAmount: Number(order.total),
        paymentMethod: order.payment,
        tenderedAmount: Number(order.total),
        address: order.address,
        shippingOption: order.delivery_type,
        createdAt: new Date(order.created_at),
      })
      doc.save(`${order.sale_number}_receipt.pdf`)
    } catch (e) {
      showMessage('Error', 'Failed to generate PDF', 'danger')
    }
  }

  const handleOpenReturnModal = (order) => {
    const items = order.items || []
    const initReturnItems = items
      .map((item) => ({
        saleItemId: item.id,
        productId: item.product_id,
        productName: item.product_name,
        price: parseFloat(item.price || 0),
        orderedQuantity: parseInt(item.quantity || 0) - parseInt(item.returned_quantity || 0),
        soldSerials: item.serial_numbers || [],
        selectedSerials: [],
        returnQuantity: 0,
        selected: false,
        image: item.image 
      }))
      .filter((item) => item.orderedQuantity > 0)

    setOrderToReturn(order)
    setReturnItems(initReturnItems)
    setIsReturnModalOpen(true)
  }

  const handleSubmitReturn = async () => {
    if (isSubmittingReturn) return
    const itemsToReturn = returnItems.filter((i) => i.selected && i.returnQuantity > 0)
    if (itemsToReturn.length === 0) return showMessage('Error', 'Select items to return', 'warning')
    
    setIsSubmittingReturn(true)
    try {
      const fd = new FormData()
      fd.append('orderId', orderToReturn.id)
      fd.append('returnReason', returnReason)
      fd.append('refundMethod', refundMethod)
      fd.append('processedBy', localStorage.getItem('username') || 'Admin')
      if (photoProof) fd.append('photoProof', photoProof)
      
      const itemsPayload = itemsToReturn.map((i) => ({
        saleItemId: i.saleItemId,
        productId: i.productId,
        quantity: i.returnQuantity,
        serialNumbers: i.selectedSerials,
      }))
      fd.append('returnItems', JSON.stringify(itemsPayload))

      const res = await returnsAPI.processReturn(fd)
      if (res.success) {
        setIsReturnModalOpen(false)
        showMessage('Success', 'Return processed', 'success')
        fetchOrdersWithItems()
        fetchOrderStats()
      } else { throw new Error(res.message) }
    } catch (e) { showMessage('Error', e.message, 'danger') } 
    finally { setIsSubmittingReturn(false) }
  }

  const handleViewReturns = async (order) => {
    try {
      const res = await returnsAPI.getReturnsByOrder(order.id)
      if (res.success) {
        setReturnsForOrder(res.data || [])
        setIsViewReturnsModalOpen(true)
      }
    } catch (e) { console.error(e) }
  }

  // --- RENDER ---
  return (
    <CContainer fluid>
      <div className="mb-4">
        <h2 className="fw-bold text-dark mb-1">Transaction History</h2>
        <div className="text-medium-emphasis small">Review and process orders</div>
      </div>

      {/* STATS - Safe Accessors Added */}
      <CRow className="mb-4 g-3">
        <CCol sm={6} lg={3}>
          <CWidgetStatsF className="shadow-sm h-100" color="primary" icon={<CIcon icon={cilDescription} height={24} />} title="Total Orders" value={(stats.total_sales || 0).toString()} />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF className="shadow-sm h-100" color="warning" icon={<CIcon icon={cilWarning} height={24} />} title="Pending" value={(stats.pendingOrders || 0).toString()} />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF className="shadow-sm h-100" color="success" icon={<CIcon icon={cilCheckCircle} height={24} />} title="Paid" value={(stats.paidOrders || 0).toString()} />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF className="shadow-sm h-100" color="info" icon={<CIcon icon={cilMoney} height={24} />} title="Revenue" value={`₱${Number(stats.total_revenue || 0).toLocaleString()}`} />
        </CCol>
      </CRow>

      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="p-0">
          <div className="p-3 border-bottom bg-light d-flex flex-wrap gap-3">
             <CInputGroup size="sm" style={{maxWidth: '250px'}}>
                <CInputGroupText className="bg-white border-end-0"><CIcon icon={cilMagnifyingGlass} /></CInputGroupText>
                <CFormInput className="border-start-0" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             </CInputGroup>
             <CFormSelect size="sm" style={{maxWidth: '200px'}} value={selectedOrderStatus} onChange={(e) => setSelectedOrderStatus(e.target.value)}>{orderStatuses.map(s=><option key={s} value={s}>{s}</option>)}</CFormSelect>
             <CFormSelect size="sm" style={{maxWidth: '200px'}} value={selectedPaymentStatus} onChange={(e) => setSelectedPaymentStatus(e.target.value)}>{paymentStatuses.map(s=><option key={s} value={s}>{s}</option>)}</CFormSelect>
          </div>

          <div className="table-responsive" style={{maxHeight: '65vh'}}>
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light sticky-top">
                <tr>
                  <th className="ps-4">Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="7" className="text-center py-5 text-muted">Loading...</td></tr> : currentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="ps-4 fw-bold text-primary">{order.sale_number}</td>
                    <td>
                      <div className="fw-semibold">{order.customer_name}</div>
                      <small className="text-muted">{order.contact || 'No contact'}</small>
                    </td>
                    <td className="text-muted small">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td><small className="text-dark">{order.items ? order.items.length : 0} items</small></td>
                    <td>
                       <span className={`status-badge ${order.payment_status === 'Paid' ? 'paid' : 'pending'}`}>
                         {order.payment_status}
                       </span>
                    </td>
                    <td>
                       <span className={`status-badge ${order.status === 'Completed' ? 'completed' : order.status === 'Cancelled' ? 'cancelled' : 'processing'}`}>
                         {order.status}
                       </span>
                    </td>
                    <td className="text-end pe-4">
                      <CButton size="sm" color="primary" variant="ghost" onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}>
                        <CIcon icon={cilDescription} />
                      </CButton>
                      {['Completed', 'Partially Returned'].includes(order.status) && (
                        <CButton size="sm" color="danger" variant="ghost" title="Return" onClick={() => handleOpenReturnModal(order)}>
                          <CIcon icon={cilArrowLeft} />
                        </CButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
             <CButton size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)}>Prev</CButton>
             <span className="small text-muted">Page {currentPage} of {Math.max(1, Math.ceil(filteredOrders.length/itemsPerPage))}</span>
             <CButton size="sm" variant="outline" disabled={currentPage >= Math.ceil(filteredOrders.length/itemsPerPage)} onClick={() => setCurrentPage(p => p+1)}>Next</CButton>
          </div>
        </CCardBody>
      </CCard>

      {/* VIEW ORDER MODAL */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <CModalHeader><CModalTitle>Order Details: {selectedOrder?.sale_number}</CModalTitle></CModalHeader>
        <CModalBody>
          {selectedOrder && (
            <>
              <CRow className="mb-4">
                <CCol md={6}>
                  <h6 className="text-uppercase text-medium-emphasis small fw-bold">Customer</h6>
                  <p className="mb-1 fw-bold">{selectedOrder.customer_name}</p>
                  <p className="mb-0 small text-muted">{selectedOrder.address}</p>
                </CCol>
                <CCol md={6} className="text-end">
                  <h6 className="text-uppercase text-medium-emphasis small fw-bold">Summary</h6>
                  <p className="mb-1"><span className="text-muted">Total:</span> <span className="fw-bold fs-5 text-primary">₱{Number(selectedOrder.total).toLocaleString()}</span></p>
                  <p className="mb-0 small"><span className="text-muted">Method:</span> {selectedOrder.payment}</p>
                </CCol>
              </CRow>
              <div className="table-responsive border rounded">
                <table className="table mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-3">Item</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Price</th>
                      <th className="text-end pe-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, i) => {
                      const imgUrl = getProductImageUrl(item.product_image || item.image)
                      return (
                        <tr key={i}>
                          <td className="ps-3">
                             <div className="d-flex align-items-center gap-3">
                               <div style={{width:'40px', height:'40px', flexShrink:0, borderRadius:'6px', border:'1px solid #eee', overflow:'hidden', background:'#f9f9f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                  {imgUrl ? <img src={imgUrl} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <CIcon icon={cilImage} className="text-secondary opacity-25"/>}
                               </div>
                               <div>
                                 <div className="fw-semibold">{item.product_name}</div>
                                 {item.serial_numbers?.length > 0 && <div className="small text-muted" style={{fontSize:'0.75rem'}}>SN: {item.serial_numbers.join(', ')}</div>}
                               </div>
                             </div>
                          </td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end">₱{Number(item.price).toLocaleString()}</td>
                          <td className="text-end pe-3 fw-bold">₱{Number(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setIsModalOpen(false)}>Close</CButton>
          <CButton color="info" className="text-white" onClick={() => handlePrintReceipt(selectedOrder)}>
            <CIcon icon={cilPrint} className="me-2" /> Receipt
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Generic Message Modal */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>

    </CContainer>
  )
}

export default OrdersPage