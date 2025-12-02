import React, { useState, useEffect, useMemo } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CButton, CFormSelect, CModal, CModalHeader,
  CModalTitle, CModalBody, CModalFooter, CWidgetStatsF, CSpinner, CBadge
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass, cilDescription, cilMoney, cilWarning, cilCheckCircle, cilArrowLeft
} from '@coreui/icons'
import { salesAPI, returnsAPI } from '../../utils/api'

// Import Global Styles
import '../../styles/Admin.css'
import '../../styles/App.css' 

const ASSET_URL = 'http://localhost:5000'

const OrdersPage = () => {
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total_sales: 0, pendingOrders: 0, paidOrders: 0, total_revenue: 0 })
  const [searchQuery, setSearchQuery] = useState(''); const [selectedOrderStatus, setSelectedOrderStatus] = useState('All Order Statuses'); const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All Payment Statuses')
  const [currentPage, setCurrentPage] = useState(1); const itemsPerPage = 10 
  const [selectedOrder, setSelectedOrder] = useState(null); const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false); const [orderToReturn, setOrderToReturn] = useState(null); const [returnItems, setReturnItems] = useState([])
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })

  useEffect(() => { fetchOrdersWithItems(); fetchOrderStats(); }, [])

  const fetchOrdersWithItems = async () => {
    setLoading(true)
    try {
      const response = await salesAPI.getSales({ limit: 1000 })
      if (!Array.isArray(response)) { setOrders([]); return }
      const ordersWithItems = await Promise.all(response.map(async (order) => {
          try { const itemsResponse = await salesAPI.getSaleItems(order.id) || []; return { ...order, items: itemsResponse } } catch (e) { return { ...order, items: [] } }
      }))
      setOrders(ordersWithItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (err) { setOrders([]) } finally { setLoading(false) }
  }

  const fetchOrderStats = async () => {
    try {
      const response = await salesAPI.getSalesStats()
      if (response.success && response.data) {
        setStats({
          total_sales: response.data.total_sales || 0, pendingOrders: response.data.pendingOrders ?? response.data.pending_orders ?? 0,
          paidOrders: response.data.paidOrders ?? response.data.paid_orders ?? 0, total_revenue: response.data.total_revenue || 0,
        })
      }
    } catch (e) {}
  }

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return []
    return orders.filter((order) => {
      const matchesSearch = (order.sale_number || '').toLowerCase().includes(searchQuery.toLowerCase()) || (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = selectedOrderStatus === 'All Order Statuses' || order.status === selectedOrderStatus
      const matchesPayment = selectedPaymentStatus === 'All Payment Statuses' || (order.payment_status || 'Unpaid') === selectedPaymentStatus
      return matchesSearch && matchesStatus && matchesPayment
    })
  }, [orders, searchQuery, selectedOrderStatus, selectedPaymentStatus])

  const startIndex = (currentPage - 1) * itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

  const handleOpenReturnModal = (order) => { setOrderToReturn(order); setIsReturnModalOpen(true) }

  return (
    <CContainer fluid className="px-4 py-4">
      <div className="mb-4">
        <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald, sans-serif', letterSpacing: '1px'}}>TRANSACTION HISTORY</h2>
        <div className="text-medium-emphasis fw-semibold">Review orders, payments, and returns</div>
      </div>

      <CRow className="mb-4 g-3">
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-primary" color="white" icon={<CIcon icon={cilDescription} height={24} className="text-primary"/>} title="Total Orders" value={(stats?.total_sales || 0).toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-warning" color="white" icon={<CIcon icon={cilWarning} height={24} className="text-warning"/>} title="Pending" value={(stats?.pendingOrders || 0).toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-success" color="white" icon={<CIcon icon={cilCheckCircle} height={24} className="text-success"/>} title="Paid" value={(stats?.paidOrders || 0).toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-info" color="white" icon={<CIcon icon={cilMoney} height={24} className="text-info"/>} title="Revenue" value={`₱${Number(stats?.total_revenue || 0).toLocaleString()}`} /></CCol>
      </CRow>

      <CCard className="mb-4 border-0 shadow-sm overflow-hidden">
        <CCardBody className="p-0">
          
          {/* CONTROL BAR */}
          <div className="p-4 bg-white border-bottom d-flex flex-wrap gap-3 align-items-center">
             
             {/* 1. Branded Search */}
             <div className="brand-search-wrapper">
                <span className="brand-search-icon">
                  <CIcon icon={cilMagnifyingGlass} />
                </span>
                <input 
                  type="text" 
                  className="brand-search-input" 
                  placeholder="Search order ID or customer..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
             </div>

             {/* 2. Branded Dropdowns */}
             <CFormSelect 
                className="brand-select" 
                style={{maxWidth: '220px'}} 
                value={selectedOrderStatus} 
                onChange={(e) => setSelectedOrderStatus(e.target.value)}
             >
                {['All Order Statuses', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Returned'].map(s=><option key={s} value={s}>{s}</option>)}
             </CFormSelect>

             <CFormSelect 
                className="brand-select" 
                style={{maxWidth: '220px'}} 
                value={selectedPaymentStatus} 
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
             >
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
                  <th scope="col" style={{width:'15%'}}>Payment</th>
                  <th scope="col" style={{width:'10%'}}>Status</th>
                  <th scope="col" className="text-end pe-4" style={{width:'10%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5"><CSpinner color="primary" variant="grow"/></td></tr>
                ) : currentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="ps-4 fw-bold text-primary fs-6">{order.sale_number}</td>
                    <td>
                      <div className="fw-bold text-dark">{order.customer_name}</div>
                      <small className="text-muted">{order.contact || 'No contact'}</small>
                    </td>
                    <td className="text-muted">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                    <td><CBadge color="light" className="text-dark border px-3 py-2">{order.items ? order.items.length : 0} items</CBadge></td>
                    <td>
                       <span className={`status-badge ${order.payment_status === 'Paid' ? 'active' : 'pending'}`}>{order.payment_status}</span>
                    </td>
                    <td>
                       <span className={`status-badge ${order.status === 'Completed' ? 'active' : order.status === 'Cancelled' ? 'cancelled' : 'pending'}`}>{order.status}</span>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        <CButton size="sm" color="info" variant="ghost" title="View" onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}><CIcon icon={cilDescription} /></CButton>
                        {['Completed', 'Partially Returned'].includes(order.status) && (
                          <CButton size="sm" color="danger" variant="ghost" title="Return" onClick={() => handleOpenReturnModal(order)}><CIcon icon={cilArrowLeft} /></CButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
             <CButton variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)}>Prev</CButton>
             <span className="small fw-bold text-muted">Page {currentPage} of {totalPages || 1}</span>
             <CButton variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p+1)}>Next</CButton>
          </div>
        </CCardBody>
      </CCard>

      {/* Modals */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" alignment="center">
         <CModalHeader><CModalTitle>Order Details</CModalTitle></CModalHeader>
         <CModalBody>
            {selectedOrder && (
              <div>
                <h5>Order #{selectedOrder.sale_number}</h5>
                <p>Customer: {selectedOrder.customer_name}</p>
                <table className="table">
                  <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
                  <tbody>
                    {selectedOrder.items?.map((item, i) => (
                      <tr key={i}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>₱{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
         </CModalBody>
         <CModalFooter><CButton color="secondary" onClick={() => setIsModalOpen(false)}>Close</CButton></CModalFooter>
      </CModal>
      
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default OrdersPage