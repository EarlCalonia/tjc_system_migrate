import React, { useState, useEffect, useCallback } from 'react'
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
  CWidgetStatsF,
  CNav,
  CNavItem,
  CNavLink,
  CSpinner,
  CBadge,
  CButtonGroup,
  CInputGroup,
  CInputGroupText,
  CTooltip
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCloudDownload,
  cilMoney,
  cilChartLine,
  cilInbox,
  cilWarning,
  cilXCircle,
  cilArrowThickFromTop,
  cilCalendar,
  cilFilter,
  cilSearch,
  cilReload
} from '@coreui/icons'
import { generateSalesReportPDF, generateInventoryReportPDF, generateReturnsReportPDF } from '../../utils/pdfGenerator'
import { reportsAPI } from '../../utils/api'
// Use global styles
import '../../styles/Admin.css' 
import '../../styles/ReportsPage.css'

const ReportsPage = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('sales')
  const [loading, setLoading] = useState(false)
  
  // Date Filters (Default to This Month)
  const [dateRange, setDateRange] = useState({ start: '', end: '', label: 'Month' })

  // Advanced Filters
  const [filters, setFilters] = useState({
    stockStatus: 'All Status',
    brand: 'All Brand',
    category: 'All Categories',
    search: ''
  })
  
  const [options, setOptions] = useState({ brands: [], categories: [] })

  // Data
  const [reportData, setReportData] = useState([]) 
  const [summary, setSummary] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 })
  
  const adminName = localStorage.getItem('username') || 'Admin'
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })

  // --- HELPERS ---
  const showMessage = (title, message, color = 'info') => setMsgModal({ visible: true, title, message, color })
  
  const formatISODate = (date) => date.toISOString().split('T')[0]

  // --- DATE LOGIC ---
  const applyDatePreset = (preset) => {
    const today = new Date()
    let start, end, label

    switch(preset) {
      case 'today':
        start = end = formatISODate(today)
        label = 'Today'
        break
      case 'week':
        const day = today.getDay()
        const diff = today.getDate() - day + (day === 0 ? -6 : 1) 
        const monday = new Date(today.setDate(diff))
        start = formatISODate(monday)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        end = formatISODate(sunday)
        label = 'This Week'
        break
      case 'month':
        start = formatISODate(new Date(today.getFullYear(), today.getMonth(), 1))
        end = formatISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
        label = 'This Month'
        break
      case 'all':
        start = ''
        end = ''
        label = 'All Time'
        break
      default:
        return
    }
    setDateRange({ start, end, label })
    setPagination(prev => ({ ...prev, page: 1 })) // Reset page
  }

  // --- INITIALIZATION ---
  useEffect(() => {
    reportsAPI.getFilterOptions().then(res => {
      if(res.success) setOptions({ brands: res.data.brands, categories: res.data.categories })
    }).catch(err => console.error("Options Load Error:", err))

    applyDatePreset('month')
  }, [])

  // --- DATA FETCHING ---
  const fetchReportData = useCallback(async () => {
    setLoading(true)
    try {
      const query = { 
        page: pagination.page, 
        limit: pagination.limit,
        start_date: dateRange.start,
        end_date: dateRange.end
      }

      if (activeTab === 'inventory') {
        if (filters.stockStatus !== 'All Status') query.stock_status = filters.stockStatus
        if (filters.brand !== 'All Brand') query.brand = filters.brand
        if (filters.category !== 'All Categories') query.category = filters.category
      }

      let res
      if (activeTab === 'sales') {
        res = await reportsAPI.getSalesReport(query)
        setReportData(res.sales || [])
      } else if (activeTab === 'inventory') {
        res = await reportsAPI.getInventoryReport(query)
        setReportData(res.inventory || [])
      } else {
        res = await reportsAPI.getReturnsReport(query)
        setReportData(res.returns || [])
      }
      
      setPagination(prev => ({ ...prev, ...res.pagination }))
      setSummary(res.summary || null)

    } catch (e) {
      console.error("Report Fetch Error:", e)
      setReportData([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, pagination.page, dateRange, filters])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPagination(prev => ({ ...prev, page: 1 }))
    setReportData([]) 
  }

  // --- EXPORT ---
  const handleExportPDF = async () => {
    if (!reportData.length) return showMessage('No Data', 'Nothing to export.', 'warning')
    try {
        const query = { start_date: dateRange.start, end_date: dateRange.end, page: 1, limit: 999999 }
        if (activeTab === 'inventory') {
            if (filters.stockStatus !== 'All Status') query.stock_status = filters.stockStatus
        }

        let doc;
        if (activeTab === 'sales') {
            const res = await reportsAPI.getSalesReport(query)
            doc = await generateSalesReportPDF(res.sales, dateRange.start, dateRange.end, adminName, dateRange.label)
            doc.save(`Sales_Report_${dateRange.start || 'All'}.pdf`)
        } else if (activeTab === 'inventory') {
             const res = await reportsAPI.getInventoryReport(query)
             doc = await generateInventoryReportPDF(res.inventory || [], dateRange.start, dateRange.end, adminName)
             doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`)
        } else {
             const res = await reportsAPI.getReturnsReport(query)
             doc = await generateReturnsReportPDF(res.returns || [], dateRange.start, dateRange.end, adminName)
             doc.save(`Returns_Report_${dateRange.start || 'All'}.pdf`)
        }
    } catch (e) {
        showMessage('Export Error', e.message, 'danger')
    }
  }

  const renderStatusBadge = (status, type) => {
     let color = 'secondary'
     if (type === 'stock') {
       if (status === 'In Stock') color = 'success'
       else if (status === 'Low Stock') color = 'warning'
       else color = 'danger'
     }
     return <CBadge color={color} shape="rounded-pill" className="px-2">{status}</CBadge>
  }

  return (
    <CContainer fluid>
      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-brand-navy mb-0" style={{fontFamily: 'Oswald, sans-serif'}}>ANALYTICS DASHBOARD</h2>
          <div className="text-muted small">Real-time insights and performance metrics</div>
        </div>
        <div className="d-flex gap-2">
           <CButton color="light" className="border" onClick={fetchReportData} disabled={loading}>
             {/* FIX: Use spin={loading || undefined} to avoid 'false' string error */}
             <CIcon icon={cilReload} spin={loading || undefined}/>
           </CButton>
           <CButton color="primary" className="text-white fw-bold d-flex align-items-center px-3" onClick={handleExportPDF}>
              <CIcon icon={cilCloudDownload} className="me-2"/> Export Report
           </CButton>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      {summary && (
        <CRow className="mb-4 g-3">
          {activeTab === 'sales' && (
            <>
              <CCol sm={4}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="primary" icon={<CIcon icon={cilMoney} height={24}/>} title="Total Revenue" value={`₱${Number(summary.totalRevenue||0).toLocaleString()}`} /></CCol>
              <CCol sm={4}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="info" icon={<CIcon icon={cilChartLine} height={24}/>} title="Total Sales" value={summary.totalSales || 0} /></CCol>
              <CCol sm={4}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="warning" icon={<CIcon icon={cilMoney} height={24}/>} title="Avg. Ticket" value={`₱${Number(summary.averageSale||0).toLocaleString()}`} /></CCol>
            </>
          )}
          {activeTab === 'inventory' && (
             <>
               <CCol sm={3}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="info" icon={<CIcon icon={cilInbox} height={24}/>} title="Total SKU" value={summary.totalProducts || 0} /></CCol>
               <CCol sm={3}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="success" icon={<CIcon icon={cilMoney} height={24}/>} title="Asset Value" value={`₱${Number(summary.totalInventoryValue||0).toLocaleString()}`} /></CCol>
               <CCol sm={3}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="danger" icon={<CIcon icon={cilXCircle} height={24}/>} title="Out of Stock" value={summary.outOfStockProducts || 0} /></CCol>
               <CCol sm={3}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="warning" icon={<CIcon icon={cilWarning} height={24}/>} title="Low Stock" value={summary.lowStockProducts || 0} /></CCol>
             </>
          )}
          {activeTab === 'returns' && (
             <>
               <CCol sm={6}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="danger" icon={<CIcon icon={cilArrowThickFromTop} height={24}/>} title="Total Returns" value={summary.totalReturns || 0} /></CCol>
               <CCol sm={6}><CWidgetStatsF className="shadow-sm border-0 widget-hover" color="warning" icon={<CIcon icon={cilMoney} height={24}/>} title="Refunded Value" value={`₱${Number(summary.totalRefundAmount||0).toLocaleString()}`} /></CCol>
             </>
          )}
        </CRow>
      )}

      {/* MAIN CONTENT CARD */}
      <CCard className="border-0 shadow-sm">
        
        {/* CONTROL TOOLBAR */}
        <CCardHeader className="bg-white p-3 border-bottom">
           <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-end">
              
              {/* 1. TABS */}
              <CNav variant="pills" className="report-pills">
                <CNavItem><CNavLink active={activeTab === 'sales'} onClick={() => handleTabChange('sales')}><CIcon icon={cilChartLine} className="me-2"/>Sales</CNavLink></CNavItem>
                <CNavItem><CNavLink active={activeTab === 'inventory'} onClick={() => handleTabChange('inventory')}><CIcon icon={cilInbox} className="me-2"/>Inventory</CNavLink></CNavItem>
                <CNavItem><CNavLink active={activeTab === 'returns'} onClick={() => handleTabChange('returns')}><CIcon icon={cilArrowThickFromTop} className="me-2"/>Returns</CNavLink></CNavItem>
              </CNav>

              {/* 2. FILTERS */}
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
                 
                 {/* Date Controls (Hidden for Inventory) */}
                 {activeTab !== 'inventory' && (
                    <div className="d-flex bg-light rounded p-1 border align-items-center">
                       <CButtonGroup size="sm" className="me-2 shadow-0">
                          <CButton color={dateRange.label === 'Today' ? 'white' : 'transparent'} className={dateRange.label === 'Today' ? 'shadow-sm text-primary fw-bold' : 'text-muted'} onClick={() => applyDatePreset('today')}>Today</CButton>
                          <CButton color={dateRange.label === 'This Week' ? 'white' : 'transparent'} className={dateRange.label === 'This Week' ? 'shadow-sm text-primary fw-bold' : 'text-muted'} onClick={() => applyDatePreset('week')}>Week</CButton>
                          <CButton color={dateRange.label === 'This Month' ? 'white' : 'transparent'} className={dateRange.label === 'This Month' ? 'shadow-sm text-primary fw-bold' : 'text-muted'} onClick={() => applyDatePreset('month')}>Month</CButton>
                          <CTooltip content="Show All History"><CButton color={dateRange.label === 'All Time' ? 'white' : 'transparent'} className={dateRange.label === 'All Time' ? 'shadow-sm text-primary fw-bold' : 'text-muted'} onClick={() => applyDatePreset('all')}>All</CButton></CTooltip>
                       </CButtonGroup>
                       <div className="vr me-2"></div>
                       <CInputGroup size="sm" style={{width: '260px'}}>
                          <CInputGroupText className="bg-transparent border-0 px-1"><CIcon icon={cilCalendar} size="sm"/></CInputGroupText>
                          <CFormInput type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value, label: 'Custom'})} className="bg-transparent border-0 p-0 text-center small fw-bold" />
                          <span className="text-muted mx-1">-</span>
                          <CFormInput type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value, label: 'Custom'})} className="bg-transparent border-0 p-0 text-center small fw-bold" />
                       </CInputGroup>
                    </div>
                 )}

                 {/* Inventory Specific Filters */}
                 {activeTab === 'inventory' && (
                    <div className="d-flex gap-2">
                      <CFormSelect size="sm" value={filters.stockStatus} onChange={e => setFilters({...filters, stockStatus: e.target.value})} style={{maxWidth:'140px'}}><option>All Status</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></CFormSelect>
                      <CFormSelect size="sm" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} style={{maxWidth:'160px'}}><option>All Categories</option>{options.categories.map((c,i) => <option key={i}>{c}</option>)}</CFormSelect>
                    </div>
                 )}
              </div>
           </div>
        </CCardHeader>

        {/* TABLE BODY */}
        <CCardBody className="p-0">
          <div className="admin-table-container">
            <table className="admin-table table-hover">
              <thead className="bg-light">
                <tr>
                  {activeTab === 'sales' && (
                    <>
                      <th className="ps-4">Order ID</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end pe-4">Total</th>
                      <th className="text-end pe-4">Date</th>
                    </>
                  )}
                  {activeTab === 'inventory' && (
                    <>
                      <th className="ps-4">Product</th>
                      <th>Category</th>
                      <th>Brand</th>
                      <th className="text-center">Stock</th>
                      <th className="text-center pe-4">Status</th>
                    </>
                  )}
                  {activeTab === 'returns' && (
                    <>
                      <th className="ps-4">Return ID</th>
                      <th>Customer</th>
                      <th>Reason</th>
                      <th>Date</th>
                      <th className="text-end pe-4">Refund Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5"><CSpinner color="primary" variant="grow"/><div className="mt-2 text-muted small">Loading data...</div></td></tr>
                ) : reportData.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-5">
                     <div className="mb-2 text-secondary opacity-25"><CIcon icon={cilSearch} size="4xl"/></div>
                     <h6 className="text-muted">No records found</h6>
                     <small className="text-muted">Try selecting "All Time" or adjusting your filters.</small>
                  </td></tr>
                ) : (
                  reportData.map((row, idx) => (
                    <tr key={idx}>
                      {activeTab === 'sales' && (
                        <>
                          {/* Support camelCase or snake_case to ensure data shows */}
                          <td className="ps-4 font-monospace text-primary small fw-bold">{row.orderId || row.order_id || row.sale_number}</td>
                          <td className="fw-semibold text-dark">{row.customerName || row.customer_name}</td>
                          <td className="text-muted">{row.productName || row.product_name}</td>
                          <td className="text-center"><CBadge color="light" className="text-dark border">{row.quantity}</CBadge></td>
                          <td className="text-end text-muted">₱{Number(row.unitPrice || row.unit_price || 0).toLocaleString()}</td>
                          <td className="text-end fw-bold text-brand-navy">₱{Number(row.totalPrice || row.total_price || 0).toLocaleString()}</td>
                          <td className="text-end pe-4 small text-muted">{row.orderDate ? new Date(row.orderDate).toLocaleDateString() : (row.created_at ? new Date(row.created_at).toLocaleDateString() : '-')}</td>
                        </>
                      )}
                      {activeTab === 'inventory' && (
                        <>
                          <td className="ps-4 fw-bold text-dark">{row.productName || row.name}</td>
                          <td><CBadge color="light" className="text-dark fw-normal border">{row.category}</CBadge></td>
                          <td className="text-muted">{row.brand}</td>
                          <td className="text-center fw-bold fs-6">{row.currentStock || row.current_stock}</td>
                          <td className="text-center pe-4">{renderStatusBadge(row.stockStatus || row.stock_status, 'stock')}</td>
                        </>
                      )}
                      {activeTab === 'returns' && (
                        <>
                          <td className="ps-4 text-danger small font-monospace">{row.return_id || row.id}</td>
                          <td className="fw-semibold">{row.customer_name || row.customerName}</td>
                          <td className="text-muted small text-truncate" style={{maxWidth:'200px'}}>{row.return_reason || row.reason}</td>
                          <td className="text-muted">{new Date(row.return_date || row.created_at).toLocaleDateString()}</td>
                          <td className="text-end pe-4 fw-bold text-danger">₱{Number(row.refund_amount || row.amount || 0).toLocaleString()}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="p-2 border-top d-flex justify-content-end bg-light align-items-center">
             <span className="small text-muted me-3">Page {pagination.current_page || pagination.page || 1} of {pagination.total_pages || 1}</span>
             <CButtonGroup size="sm">
                <CButton color="white" className="border" disabled={(pagination.current_page || pagination.page || 1) === 1} onClick={() => setPagination(p => ({...p, page: p.page - 1}))}>Prev</CButton>
                <CButton color="white" className="border" disabled={(pagination.current_page || pagination.page || 1) >= (pagination.total_pages || 1)} onClick={() => setPagination(p => ({...p, page: p.page + 1}))}>Next</CButton>
             </CButtonGroup>
          </div>
        </CCardBody>
      </CCard>

      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default ReportsPage