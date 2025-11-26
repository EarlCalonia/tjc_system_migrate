import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  CFormTextarea,
  CFormCheck,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
  CInputGroup,
  CInputGroupText,
  CWidgetStatsF,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass,
  cilCart,
  cilDescription,
  cilTruck,
  cilMoney,
  cilWarning,
  cilCheckCircle,
  cilArrowLeft,
  cilPrint,
} from '@coreui/icons'
import { salesAPI, returnsAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'
import { generateSaleReceipt } from '../../utils/pdfGenerator'

const OrdersPage = () => {
  // --- STATE ---
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
  const itemsPerPage = 5

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null) // View Order Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [orderToReturn, setOrderToReturn] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnReason, setReturnReason] = useState('')
  const [refundMethod, setRefundMethod] = useState('Cash')
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false)
  const [photoProof, setPhotoProof] = useState(null)
  const [additionalNotes, setAdditionalNotes] = useState('')
  
  const [isViewReturnsModalOpen, setIsViewReturnsModalOpen] = useState(false)
  const [returnsForOrder, setReturnsForOrder] = useState([])
  
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [receiptData, setReceiptData] = useState(null)

  // Generic Message Modal
  const [msgModal, setMsgModal] = useState({
    visible: false,
    title: '',
    message: '',
    color: 'info',
  })

  // --- EFFECTS ---
  useEffect(() => {
    fetchOrdersWithItems()
    fetchOrderStats()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedOrderStatus, selectedPaymentStatus])

  // --- API CALLS ---
  const fetchOrdersWithItems = async () => {
    setLoading(true)
    try {
      const response = await salesAPI.getSales({ limit: 1000 })
      const ordersWithItems = await Promise.all(
        response.map(async (order) => {
          try {
            const itemsResponse = await salesAPI.getSaleItems(order.id)
            const serialsResponse = await serialNumberAPI.getBySaleId(order.id)
            const allSerials = serialsResponse.data || []
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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderStats = async () => {
    try {
      const response = await salesAPI.getSalesStats()
      if (response.success) {
        setStats({
          total_sales: response.data.total_sales,
          pendingOrders: response.data.pending_orders,
          paidOrders: response.data.paid_orders,
          total_revenue: response.data.total_revenue,
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  // --- LOGIC & CALCULATIONS ---
  const showMessage = (title, message, color = 'info') => {
    setMsgModal({ visible: true, title, message, color })
  }

  const orderStatuses = ['All Order Statuses', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Returned', 'Partially Returned']
  const paymentStatuses = ['All Payment Statuses', 'Paid', 'Unpaid', 'Refunded', 'Partially Refunded']

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Return Logic
  const handleOpenReturnModal = (order) => {
    const items = order.items || []
    const initReturnItems = items
      .map((item) => ({
        saleItemId: item.id,
        productId: item.product_id,
        productName: item.product_name,
        sku: item.sku || '',
        price: parseFloat(item.price || 0),
        orderedQuantity: parseInt(item.quantity || 0) - parseInt(item.returned_quantity || 0),
        soldSerials: item.serial_numbers || [],
        selectedSerials: [],
        returnQuantity: 0,
        selected: false,
      }))
      .filter((item) => item.orderedQuantity > 0)

    setOrderToReturn(order)
    setReturnItems(initReturnItems)
    setReturnReason('')
    setRefundMethod('Cash')
    setPhotoProof(null)
    setIsReturnModalOpen(true)
  }

  const handleReturnItemToggle = (index) => {
    setReturnItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const newSelected = !item.selected
        return {
          ...item,
          selected: newSelected,
          selectedSerials: [],
          returnQuantity: newSelected && item.soldSerials.length === 0 ? item.orderedQuantity : 0,
        }
      }),
    )
  }

  const handleReturnQuantityChange = (index, val) => {
    const qty = parseInt(val) || 0
    setReturnItems((prev) =>
      prev.map((item, i) => {
        if (i !== index || item.soldSerials.length > 0) return item
        return { ...item, returnQuantity: Math.min(Math.max(0, qty), item.orderedQuantity) }
      }),
    )
  }

  const handleSerialToggle = (itemIndex, serial) => {
    setReturnItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item
        const selected = item.selectedSerials
        const newSelected = selected.includes(serial)
          ? selected.filter((s) => s !== serial)
          : [...selected, serial]
        return {
          ...item,
          selectedSerials: newSelected,
          returnQuantity: newSelected.length,
          selected: newSelected.length > 0,
        }
      }),
    )
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
      } else {
        throw new Error(res.message)
      }
    } catch (e) {
      showMessage('Error', e.message, 'danger')
    } finally {
      setIsSubmittingReturn(false)
    }
  }

  const handleViewReturns = async (order) => {
    try {
      const res = await returnsAPI.getReturnsByOrder(order.id)
      if (res.success) {
        setReturnsForOrder(res.data || [])
        setIsViewReturnsModalOpen(true)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // --- RENDER ---
  return (
    <CContainer fluid>
      {/* HEADER */}
      <div className="mb-4">
        <h2>Transaction History</h2>
        <div className="text-medium-emphasis">Review and process orders</div>
      </div>

      {/* STATS */}
      <CRow className="mb-4">
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="primary"
            icon={<CIcon icon={cilDescription} height={24} />}
            title="Total Orders"
            value={stats.total_sales.toString()}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="warning"
            icon={<CIcon icon={cilWarning} height={24} />}
            title="Pending"
            value={stats.pendingOrders.toString()}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="success"
            icon={<CIcon icon={cilCheckCircle} height={24} />}
            title="Paid"
            value={stats.paidOrders.toString()}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="info"
            icon={<CIcon icon={cilMoney} height={24} />}
            title="Revenue"
            value={`₱${Number(stats.total_revenue).toLocaleString()}`}
          />
        </CCol>
      </CRow>

      {/* FILTERS */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="g-3">
            <CCol md={4}>
              <CInputGroup>
                <CInputGroupText><CIcon icon={cilMagnifyingGlass} /></CInputGroupText>
                <CFormInput
                  placeholder="Search order # or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </CInputGroup>
            </CCol>
            <CCol md={4}>
              <CFormSelect value={selectedOrderStatus} onChange={(e) => setSelectedOrderStatus(e.target.value)}>
                {orderStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={4}>
              <CFormSelect value={selectedPaymentStatus} onChange={(e) => setSelectedPaymentStatus(e.target.value)}>
                {paymentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* TABLE */}
      <CCard className="mb-4">
        <CCardBody>
          {loading ? <div className="text-center py-4">Loading...</div> : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Order ID</CTableHeaderCell>
                  <CTableHeaderCell>Customer</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Items</CTableHeaderCell>
                  <CTableHeaderCell>Payment</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {currentOrders.map((order) => (
                  <CTableRow key={order.id}>
                    <CTableDataCell>{order.sale_number}</CTableDataCell>
                    <CTableDataCell>{order.customer_name}</CTableDataCell>
                    <CTableDataCell>{new Date(order.created_at).toLocaleDateString()}</CTableDataCell>
                    <CTableDataCell>
                      <small>{order.items.map(i => i.product_name).join(', ').slice(0, 50)}...</small>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={order.payment_status === 'Paid' ? 'success' : 'warning'}>
                        {order.payment_status}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="info" shape="rounded-pill">{order.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButton size="sm" color="primary" variant="ghost" onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}>
                        <CIcon icon={cilDescription} />
                      </CButton>
                      {['Returned', 'Partially Returned'].includes(order.status) && (
                        <CButton size="sm" color="warning" variant="ghost" onClick={() => handleViewReturns(order)}>
                          <CIcon icon={cilArrowLeft} />
                        </CButton>
                      )}
                      {['Completed', 'Partially Returned'].includes(order.status) && (
                        <CButton size="sm" color="danger" variant="ghost" onClick={() => handleOpenReturnModal(order)}>
                          <CIcon icon={cilArrowLeft} /> Return
                        </CButton>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
          {/* Pagination Controls (Same reusable logic) */}
          <div className="d-flex justify-content-between mt-3">
             {/* ... Simplified Pagination ... */}
             <CButton disabled={currentPage===1} onClick={() => setCurrentPage(p => p-1)} size="sm" variant="outline">Prev</CButton>
             <span>Page {currentPage} of {totalPages}</span>
             <CButton disabled={currentPage===totalPages} onClick={() => setCurrentPage(p => p+1)} size="sm" variant="outline">Next</CButton>
          </div>
        </CCardBody>
      </CCard>

      {/* --- MODALS --- */}

      {/* VIEW ORDER MODAL */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <CModalHeader><CModalTitle>Order Details: {selectedOrder?.sale_number}</CModalTitle></CModalHeader>
        <CModalBody>
          {selectedOrder && (
            <>
              <CRow className="mb-4">
                <CCol md={6}>
                  <h5>Customer</h5>
                  <p className="mb-1">Name: {selectedOrder.customer_name}</p>
                  <p className="mb-1">Contact: {selectedOrder.contact}</p>
                  <p className="mb-1">Address: {selectedOrder.address}</p>
                </CCol>
                <CCol md={6}>
                  <h5>Info</h5>
                  <p className="mb-1">Date: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  <p className="mb-1">Payment: {selectedOrder.payment}</p>
                  <p className="mb-1">Delivery: {selectedOrder.delivery_type}</p>
                </CCol>
              </CRow>
              <CTable bordered small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Item</CTableHeaderCell>
                    <CTableHeaderCell>Qty</CTableHeaderCell>
                    <CTableHeaderCell>Price</CTableHeaderCell>
                    <CTableHeaderCell>Total</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {selectedOrder.items.map((item, i) => (
                    <CTableRow key={i}>
                      <CTableDataCell>
                        {item.product_name}
                        {item.serial_numbers?.length > 0 && <div className="small text-muted">SN: {item.serial_numbers.join(', ')}</div>}
                      </CTableDataCell>
                      <CTableDataCell>{item.quantity}</CTableDataCell>
                      <CTableDataCell>₱{Number(item.price).toLocaleString()}</CTableDataCell>
                      <CTableDataCell>₱{Number(item.price * item.quantity).toLocaleString()}</CTableDataCell>
                    </CTableRow>
                  ))}
                  <CTableRow>
                    <CTableDataCell colSpan="3" className="text-end fw-bold">Total</CTableDataCell>
                    <CTableDataCell className="fw-bold">₱{Number(selectedOrder.total).toLocaleString()}</CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setIsModalOpen(false)}>Close</CButton>
          <CButton color="info" onClick={() => handlePrintReceipt(selectedOrder)}>
            <CIcon icon={cilPrint} className="me-2" /> Print Receipt
          </CButton>
        </CModalFooter>
      </CModal>

      {/* RETURN MODAL */}
      <CModal visible={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} size="xl">
        <CModalHeader><CModalTitle>Process Return: {orderToReturn?.sale_number}</CModalTitle></CModalHeader>
        <CModalBody>
          <h5>Select Items</h5>
          <CTable bordered>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Select</CTableHeaderCell>
                <CTableHeaderCell>Product</CTableHeaderCell>
                <CTableHeaderCell>Ordered</CTableHeaderCell>
                <CTableHeaderCell>Return Qty</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {returnItems.map((item, idx) => (
                <CTableRow key={idx}>
                  <CTableDataCell>
                    <CFormCheck checked={item.selected} onChange={() => handleReturnItemToggle(idx)} disabled={item.soldSerials.length > 0} />
                  </CTableDataCell>
                  <CTableDataCell>
                    {item.productName}
                    {item.soldSerials.length > 0 && (
                      <div className="mt-2">
                        <small>Select Serials:</small>
                        {item.soldSerials.map(sn => (
                          <CFormCheck key={sn} label={sn} checked={item.selectedSerials.includes(sn)} onChange={() => handleSerialToggle(idx, sn)} />
                        ))}
                      </div>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>{item.orderedQuantity}</CTableDataCell>
                  <CTableDataCell>
                    <CFormInput 
                      type="number" 
                      size="sm" 
                      style={{width:'80px'}} 
                      value={item.returnQuantity} 
                      onChange={(e) => handleReturnQuantityChange(idx, e.target.value)} 
                      disabled={!item.selected || item.soldSerials.length > 0} 
                    />
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
          <CRow className="mt-3">
            <CCol md={6}>
              <CFormLabel>Reason</CFormLabel>
              <CFormSelect value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
                <option value="">Select Reason</option>
                <option value="Defective">Defective</option>
                <option value="Wrong Item">Wrong Item</option>
                <option value="Other">Other</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Photo Proof</CFormLabel>
              <CFormInput type="file" onChange={(e) => setPhotoProof(e.target.files[0])} />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setIsReturnModalOpen(false)}>Cancel</CButton>
          <CButton color="danger" onClick={handleSubmitReturn}>Confirm Return</CButton>
        </CModalFooter>
      </CModal>

      {/* MESSAGE MODAL */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default OrdersPage;