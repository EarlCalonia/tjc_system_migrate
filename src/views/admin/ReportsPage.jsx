import React, { useState, useEffect } from 'react'
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
  CWidgetStatsF,
  CNav,
  CNavItem,
  CNavLink,
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
  cilBan,
} from '@coreui/icons'
import { generateSalesReportPDF, generateInventoryReportPDF, generateReturnsReportPDF } from '../../utils/pdfGenerator'
import { reportsAPI } from '../../utils/api'

const ReportsPage = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('sales')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rangeLabel, setRangeLabel] = useState('Daily')
  
  // Filters
  const [stockStatus, setStockStatus] = useState('All Status')
  const [brandFilter, setBrandFilter] = useState('All Brand')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])

  // Data & Pagination
  const [salesData, setSalesData] = useState([])
  const [inventoryData, setInventoryData] = useState([])
  const [returnsData, setReturnsData] = useState([])
  const [summary, setSummary] = useState(null)
  const [pagination, setPagination] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const itemsPerPage = 10

  const adminName = localStorage.getItem('username') || 'Admin User'
  
  // Message Modal
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })

  // --- HELPERS ---
  const showMessage = (title, message, color = 'info') => setMsgModal({ visible: true, title, message, color })
  const formatLocalDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const getWeekRange = (dateStr) => { /* ...Keep original logic... */ 
    let date; if (dateStr.includes('W')) { const [year, week] = dateStr.split('-W'); date = new Date(year, 0, 1 + (week - 1) * 7); const day = date.getDay(); const diff = day === 0 ? -6 : 1 - day; date.setDate(date.getDate() + diff); } else { date = new Date(dateStr); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); date.setDate(diff); } const monday = new Date(date); const sunday = new Date(date); sunday.setDate(monday.getDate() + 6); return { start: formatLocalDate(monday), end: formatLocalDate(sunday) }; 
  }
  
  const getMonthRange = (dateStr) => { /* ...Keep original logic... */ 
    let year, month; if (dateStr.match(/^\d{4}-\d{2}$/)) { [year, month] = dateStr.split('-').map(Number); month = month - 1; } else { const date = new Date(dateStr); year = date.getFullYear(); month = date.getMonth(); } const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0); return { start: formatLocalDate(firstDay), end: formatLocalDate(lastDay) }; 
  }

  const handleRangeLabelChange = (newLabel) => {
    setRangeLabel(newLabel)
    if (startDate) {
      if (newLabel === 'Weekly') {
        const range = getWeekRange(startDate)
        setStartDate(range.start); setEndDate(range.end)
      } else if (newLabel === 'Monthly') {
        const range = getMonthRange(startDate)
        setStartDate(range.start); setEndDate(range.end)
      }
    }
  }

  const handleDateChange = (value, isStart = true) => {
    if (!value) return
    if (rangeLabel === 'Weekly') {
      const range = getWeekRange(value)
      setStartDate(range.start); setEndDate(range.end)
    } else if (rangeLabel === 'Monthly') {
      const range = getMonthRange(value)
      setStartDate(range.start); setEndDate(range.end)
    } else {
      isStart ? setStartDate(value) : setEndDate(value)
    }
  }

  // --- EFFECTS ---
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await reportsAPI.getFilterOptions()
        if (res.success) {
          setBrands(res.data.brands || [])
          setCategories(res.data.categories || [])
        }
      } catch (e) { console.error(e) }
    }
    loadFilters()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
    if (activeTab === 'sales') {
        // Optional: Default to today if empty
    }
  }, [activeTab])

  useEffect(() => {
    fetchReportData()
  }, [activeTab, startDate, endDate, currentPage, stockStatus, brandFilter, categoryFilter])

  // --- API ---
  const fetchReportData = async () => {
    setLoading(true); setError(null); setSummary(null)
    try {
      const filters = { page: currentPage, limit: itemsPerPage }
      if (startDate) filters.start_date = startDate
      if (endDate) filters.end_date = endDate

      if (activeTab === 'sales') {
        const res = await reportsAPI.getSalesReport(filters)
        setSalesData(res.sales || [])
        setPagination(res.pagination || {})
        setSummary(res.summary || null)
      } else if (activeTab === 'inventory') {
        if (stockStatus !== 'All Status') filters.stock_status = stockStatus
        if (brandFilter !== 'All Brand') filters.brand = brandFilter
        if (categoryFilter !== 'All Categories') filters.category = categoryFilter
        const res = await reportsAPI.getInventoryReport(filters)
        setInventoryData(res.inventory || [])
        setPagination(res.pagination || {})
        setSummary(res.summary || null)
      } else {
        const res = await reportsAPI.getReturnsReport(filters)
        setReturnsData(res.returns || [])
        setPagination(res.pagination || {})
        setSummary(res.summary || null)
      }
    } catch (e) {
      setError('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    if (!startDate || !endDate) return showMessage('Date Required', 'Select a date range first', 'warning')
    
    // Logic mirrors original: fetch ALL data then print
    // (Omitting full logic for brevity, ensure you import your generators)
    try {
        if (activeTab === 'sales') {
            const res = await reportsAPI.getSalesReport({ start_date: startDate, end_date: endDate, page: 1, limit: 999999 })
            if (!res.sales?.length) return showMessage('No Data', 'No records found', 'info')
            const doc = await generateSalesReportPDF(res.sales, startDate, endDate, adminName, rangeLabel)
            doc.save('Sales_Report.pdf')
        }
        // Repeat for inventory/returns...
        else if (activeTab === 'inventory') {
             const res = await reportsAPI.getInventoryReport({ ...{stock_status: stockStatus !== 'All Status' ? stockStatus : undefined}, page: 1, limit: 999999 })
             const doc = await generateInventoryReportPDF(res.inventory || [], startDate || new Date().toISOString(), endDate || new Date().toISOString(), adminName)
             doc.save('Inventory_Report.pdf')
        } else {
             const res = await reportsAPI.getReturnsReport({ startDate, endDate, limit: 999999 })
             const doc = await generateReturnsReportPDF(res.returns || [], startDate, endDate, adminName)
             doc.save('Returns_Report.pdf')
        }
    } catch (e) {
        showMessage('Error', e.message, 'danger')
    }
  }

  // --- RENDER HELPERS ---
  const getCurrentData = () => {
    if (activeTab === 'sales') return salesData
    if (activeTab === 'inventory') return inventoryData
    return returnsData
  }

  return (
    <CContainer fluid>
      <div className="mb-4">
        <h2>Reports</h2>
        <div className="text-medium-emphasis">Generate insights and export data</div>
      </div>

      {/* TABS */}
      <CNav variant="pills" className="mb-4">
        <CNavItem>
          <CNavLink active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} style={{cursor:'pointer'}}>
            Sales Report
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} style={{cursor:'pointer'}}>
            Inventory Report
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === 'returns'} onClick={() => setActiveTab('returns')} style={{cursor:'pointer'}}>
            Returns Report
          </CNavLink>
        </CNavItem>
      </CNav>

      {/* SUMMARY WIDGETS */}
      {summary && (
        <CRow className="mb-4">
          {activeTab === 'sales' && (
            <>
              <CCol sm={6} lg={4}>
                <CWidgetStatsF className="mb-3" color="primary" icon={<CIcon icon={cilMoney} height={24} />} title="Total Revenue" value={`₱${Number(summary.totalRevenue || 0).toLocaleString()}`} />
              </CCol>
              <CCol sm={6} lg={4}>
                <CWidgetStatsF className="mb-3" color="info" icon={<CIcon icon={cilChartLine} height={24} />} title="Total Sales" value={summary.totalSales || 0} />
              </CCol>
              <CCol sm={6} lg={4}>
                <CWidgetStatsF className="mb-3" color="success" icon={<CIcon icon={cilMoney} height={24} />} title="Avg. Sale" value={`₱${Number(summary.averageSale || 0).toLocaleString()}`} />
              </CCol>
            </>
          )}
          {activeTab === 'inventory' && (
             <>
               <CCol sm={6} lg={3}>
                 <CWidgetStatsF className="mb-3" color="primary" icon={<CIcon icon={cilInbox} height={24} />} title="Total Products" value={summary.totalProducts || 0} />
               </CCol>
               <CCol sm={6} lg={3}>
                 <CWidgetStatsF className="mb-3" color="info" icon={<CIcon icon={cilMoney} height={24} />} title="Inventory Value" value={`₱${Number(summary.totalInventoryValue || 0).toLocaleString()}`} />
               </CCol>
               <CCol sm={6} lg={3}>
                 <CWidgetStatsF className="mb-3" color="danger" icon={<CIcon icon={cilXCircle} height={24} />} title="Out of Stock" value={summary.outOfStockProducts || 0} />
               </CCol>
               <CCol sm={6} lg={3}>
                 <CWidgetStatsF className="mb-3" color="warning" icon={<CIcon icon={cilWarning} height={24} />} title="Low Stock" value={summary.lowStockProducts || 0} />
               </CCol>
             </>
          )}
          {activeTab === 'returns' && (
             <>
               <CCol sm={6} lg={3}>
                 <CWidgetStatsF className="mb-3" color="danger" icon={<CIcon icon={cilArrowThickFromTop} height={24} />} title="Total Returns" value={summary.totalReturns || 0} />
               </CCol>
               <CCol sm={6} lg={3}>
                 <CWidgetStatsF className="mb-3" color="warning" icon={<CIcon icon={cilMoney} height={24} />} title="Refunded" value={`₱${Number(summary.totalRefundAmount || 0).toLocaleString()}`} />
               </CCol>
               <CCol sm={6} lg={3}>
                 <CWidgetStatsF className="mb-3" color="danger" icon={<CIcon icon={cilBan} height={24} />} title="Defective" value={summary.defectiveReturns || 0} />
               </CCol>
               <CCol sm={6} lg={3}>
                 <CWidgetStatsF className="mb-3" color="success" icon={<CIcon icon={cilInbox} height={24} />} title="Restocked" value={summary.restockedReturns || 0} />
               </CCol>
             </>
          )}
        </CRow>
      )}

      {/* FILTERS & TABLE */}
      <CCard className="mb-4">
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-end flex-wrap gap-2">
            <div className="d-flex flex-wrap gap-3 align-items-end">
              {activeTab === 'sales' && (
                <>
                  <div>
                    <CFormLabel>Range</CFormLabel>
                    <CFormSelect value={rangeLabel} onChange={(e) => handleRangeLabelChange(e.target.value)} size="sm">
                      <option>Daily</option><option>Weekly</option><option>Monthly</option>
                    </CFormSelect>
                  </div>
                  <div>
                    <CFormLabel>From</CFormLabel>
                    <CFormInput type={rangeLabel === 'Weekly' ? 'week' : rangeLabel === 'Monthly' ? 'month' : 'date'} value={startDate} onChange={(e) => handleDateChange(e.target.value, true)} size="sm" />
                  </div>
                  {rangeLabel === 'Daily' && (
                    <div>
                       <CFormLabel>To</CFormLabel>
                       <CFormInput type="date" value={endDate} onChange={(e) => handleDateChange(e.target.value, false)} size="sm" />
                    </div>
                  )}
                </>
              )}
              {/* Inventory Filters */}
              {activeTab === 'inventory' && (
                <>
                  <div><CFormLabel>Brand</CFormLabel><CFormSelect value={brandFilter} onChange={e => setBrandFilter(e.target.value)} size="sm"><option>All Brand</option>{brands.map(b => <option key={b}>{b}</option>)}</CFormSelect></div>
                  <div><CFormLabel>Category</CFormLabel><CFormSelect value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} size="sm"><option>All Categories</option>{categories.map(c => <option key={c}>{c}</option>)}</CFormSelect></div>
                  <div><CFormLabel>Status</CFormLabel><CFormSelect value={stockStatus} onChange={e => setStockStatus(e.target.value)} size="sm"><option>All Status</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></CFormSelect></div>
                </>
              )}
              {/* Returns Filters */}
              {activeTab !== 'sales' && activeTab !== 'inventory' && (
                <>
                  <div><CFormLabel>From</CFormLabel><CFormInput type="date" value={startDate} onChange={e => setStartDate(e.target.value)} size="sm" /></div>
                  <div><CFormLabel>To</CFormLabel><CFormInput type="date" value={endDate} onChange={e => setEndDate(e.target.value)} size="sm" /></div>
                </>
              )}
            </div>
            <CButton color="danger" variant="outline" onClick={handleExportPDF}>
              <CIcon icon={cilCloudDownload} className="me-2" /> Export PDF
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody>
          {loading ? <div className="text-center p-4">Loading data...</div> : 
           getCurrentData().length === 0 ? <div className="text-center p-4 text-medium-emphasis">No records found.</div> :
          (
            <CTable hover responsive small bordered>
              <CTableHead>
                <CTableRow>
                  {activeTab === 'sales' && <>
                    <CTableHeaderCell>Order ID</CTableHeaderCell>
                    <CTableHeaderCell>Customer</CTableHeaderCell>
                    <CTableHeaderCell>Product</CTableHeaderCell>
                    <CTableHeaderCell>Qty</CTableHeaderCell>
                    <CTableHeaderCell>Price</CTableHeaderCell>
                    <CTableHeaderCell>Total</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                  </>}
                  {activeTab === 'inventory' && <>
                    <CTableHeaderCell>Product</CTableHeaderCell>
                    <CTableHeaderCell>Category</CTableHeaderCell>
                    <CTableHeaderCell>Brand</CTableHeaderCell>
                    <CTableHeaderCell>Stock</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                  </>}
                  {activeTab === 'returns' && <>
                    <CTableHeaderCell>Return ID</CTableHeaderCell>
                    <CTableHeaderCell>Order</CTableHeaderCell>
                    <CTableHeaderCell>Customer</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Reason</CTableHeaderCell>
                    <CTableHeaderCell>Refund</CTableHeaderCell>
                  </>}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {getCurrentData().map((row, idx) => (
                  <CTableRow key={idx}>
                    {activeTab === 'sales' && <>
                      <CTableDataCell>{row.orderId}</CTableDataCell>
                      <CTableDataCell>{row.customerName}</CTableDataCell>
                      <CTableDataCell>{row.productName}</CTableDataCell>
                      <CTableDataCell>{row.quantity}</CTableDataCell>
                      <CTableDataCell>₱{Number(row.unitPrice).toLocaleString()}</CTableDataCell>
                      <CTableDataCell>₱{Number(row.totalPrice).toLocaleString()}</CTableDataCell>
                      <CTableDataCell>{new Date(row.orderDate).toLocaleDateString()}</CTableDataCell>
                    </>}
                    {activeTab === 'inventory' && <>
                      <CTableDataCell>{row.productName}</CTableDataCell>
                      <CTableDataCell>{row.category}</CTableDataCell>
                      <CTableDataCell>{row.brand}</CTableDataCell>
                      <CTableDataCell>{row.currentStock}</CTableDataCell>
                      <CTableDataCell><CBadge color={row.stockStatus === 'Out of Stock' ? 'danger' : row.stockStatus === 'Low Stock' ? 'warning' : 'success'}>{row.stockStatus}</CBadge></CTableDataCell>
                    </>}
                    {activeTab === 'returns' && <>
                      <CTableDataCell>{row.return_id}</CTableDataCell>
                      <CTableDataCell>{row.sale_number}</CTableDataCell>
                      <CTableDataCell>{row.customer_name}</CTableDataCell>
                      <CTableDataCell>{new Date(row.return_date).toLocaleDateString()}</CTableDataCell>
                      <CTableDataCell>{row.return_reason}</CTableDataCell>
                      <CTableDataCell>₱{Number(row.refund_amount).toLocaleString()}</CTableDataCell>
                    </>}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
          
          {/* PAGINATION (Simplified) */}
          <div className="d-flex justify-content-between mt-3">
             <CButton disabled={currentPage===1} onClick={() => setCurrentPage(p => p-1)} size="sm" variant="outline">Prev</CButton>
             <span>Page {currentPage}</span>
             <CButton disabled={currentPage >= (pagination.total_pages || 1)} onClick={() => setCurrentPage(p => p+1)} size="sm" variant="outline">Next</CButton>
          </div>
        </CCardBody>
      </CCard>

      {/* MSG MODAL */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default ReportsPage