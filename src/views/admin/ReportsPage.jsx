import React, { useState, useEffect, useCallback } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CCardHeader, CButton, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CWidgetStatsF, CNav, CNavItem, CNavLink, CSpinner, CBadge, CTooltip, CFormSelect
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCloudDownload, cilMoney, cilChartLine, cilInbox, cilWarning, cilXCircle, cilArrowThickFromTop, cilCalendar,
  cilSearch, cilReload, cilBarcode, cilHistory, cilFilterX
} from '@coreui/icons'
import { generateSalesReportPDF, generateInventoryReportPDF, generateReturnsReportPDF, generateDeadStockReportPDF } from '../../utils/pdfGenerator'
import { reportsAPI } from '../../utils/api'

import '../../styles/Admin.css'
import '../../styles/App.css' 
import '../../styles/ReportsPage.css'

const ReportsPage = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('sales')
  const [loading, setLoading] = useState(false)
  
  // FILTERS
  const [reportPeriod, setReportPeriod] = useState('monthly') 
  // Default date state
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)) 
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '', label: 'This Month' })

  // Dead Stock Specific Filter
  const [dormancyMonths, setDormancyMonths] = useState(6) 

  const initialFilters = {
    stockStatus: 'All Status',
    brand: 'All Brand', 
    category: 'All Categories',
    returnReason: 'All Reasons',
    isSerializedOnly: false,
    search: ''
  }
  const [filters, setFilters] = useState(initialFilters)
  const [options, setOptions] = useState({ brands: [], categories: [] })
  const [reportData, setReportData] = useState([]) 
  const [summary, setSummary] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 })
  
  const adminName = localStorage.getItem('username') || 'Admin'
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })
  const showMessage = (title, message, color = 'info') => setMsgModal({ visible: true, title, message, color })
  
  // [FIX] Helper to get current ISO Week string (YYYY-Www)
  const getCurrentISOWeek = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      // Ensure zero padding for single digit weeks
      return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  };

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // [FIX] Improved Date Range Calculation
  useEffect(() => {
    calculateDateRange();
  }, [reportPeriod, filterDate, customRange]);

  const calculateDateRange = () => {
    let start = '', end = '', label = '';

    switch (reportPeriod) {
        case 'daily':
            if (filterDate) { start = filterDate; end = filterDate; }
            break;
        case 'weekly':
            if (filterDate) {
                // [FIX] Robust Week Parsing
                const [yearStr, weekStr] = filterDate.split('-W');
                if (yearStr && weekStr) {
                    const year = parseInt(yearStr);
                    const week = parseInt(weekStr);
                    
                    // Simple ISO week calculation
                    const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
                    const dayOfWeek = simpleDate.getDay();
                    const weekStart = simpleDate;
                    
                    // Align to Monday
                    if (dayOfWeek <= 4) weekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
                    else weekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());
                    
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    
                    start = formatLocalDate(weekStart); 
                    end = formatLocalDate(weekEnd);
                }
            }
            break;
        case 'monthly':
            if (filterDate) {
                const [y, m] = filterDate.split('-');
                const firstDay = new Date(y, m - 1, 1);
                const lastDay = new Date(y, m, 0);
                start = formatLocalDate(firstDay); end = formatLocalDate(lastDay);
            }
            break;
        case 'yearly':
            if (filterDate) { start = `${filterDate}-01-01`; end = `${filterDate}-12-31`; }
            break;
        case 'custom':
            start = customRange.start; end = customRange.end;
            break;
        default: break;
    }
    setDateRange(prev => {
        if (prev.start !== start || prev.end !== end) { 
            setPagination(p => ({ ...p, page: 1 })); 
            return { start, end, label }; 
        }
        return prev;
    });
  };

  const handlePeriodChange = (e) => {
      const type = e.target.value;
      setReportPeriod(type);
      const today = new Date();
      
      if (type === 'daily') setFilterDate(formatLocalDate(today));
      else if (type === 'weekly') setFilterDate(getCurrentISOWeek()); // [FIX] Use Helper
      else if (type === 'monthly') setFilterDate(today.toISOString().slice(0, 7));
      else if (type === 'yearly') setFilterDate(String(today.getFullYear()));
  };

  const toggleSerializedFilter = () => { setFilters(prev => ({ ...prev, isSerializedOnly: !prev.isSerializedOnly })); setPagination(prev => ({ ...prev, page: 1 })); }
  const handleResetFilters = () => { setFilters(initialFilters); setReportPeriod('monthly'); setFilterDate(new Date().toISOString().slice(0, 7)); setDormancyMonths(6); setPagination(p => ({ ...p, page: 1 })); }

  useEffect(() => { reportsAPI.getFilterOptions().then(res => { if(res.success) setOptions({ brands: res.data.brands, categories: res.data.categories }) }).catch(err => console.error(err)) }, [])

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    try {
      const query = { page: pagination.page, limit: pagination.limit, start_date: (activeTab === 'sales' || activeTab === 'returns') ? dateRange.start : undefined, end_date: (activeTab === 'sales' || activeTab === 'returns') ? dateRange.end : undefined }
      
      if (activeTab === 'inventory' || activeTab === 'dead_stock') {
        if (filters.brand !== 'All Brand') query.brand = filters.brand 
        if (filters.category !== 'All Categories') query.category = filters.category
      }
      if (activeTab === 'inventory') {
        if (filters.stockStatus !== 'All Status') query.stock_status = filters.stockStatus
        if (filters.isSerializedOnly) query.requires_serial = true 
        if (filters.search) query.search = filters.search
      }
      if (activeTab === 'dead_stock') query.months = dormancyMonths;
      if (activeTab === 'returns' && filters.returnReason !== 'All Reasons') query.returnReason = filters.returnReason;

      let res
      if (activeTab === 'sales') { res = await reportsAPI.getSalesReport(query); setReportData(res.sales || []) }
      else if (activeTab === 'inventory') { res = await reportsAPI.getInventoryReport(query); setReportData(res.inventory || []) }
      else if (activeTab === 'returns') { res = await reportsAPI.getReturnsReport(query); setReportData(res.returns || []) }
      else if (activeTab === 'dead_stock') { res = await reportsAPI.getDeadStockReport(query); setReportData(res.deadStock || []) }
      
      if (res.pagination) setPagination(prev => ({ ...prev, ...res.pagination }))
      setSummary(res.summary || null)
    } catch (e) { console.error("Report Fetch Error:", e); setReportData([]) } finally { setLoading(false) }
  }, [activeTab, pagination.page, dateRange, filters, dormancyMonths])

  useEffect(() => { fetchReportData() }, [fetchReportData])

  const handleTabChange = (tab) => { setActiveTab(tab); setPagination(prev => ({ ...prev, page: 1 })); setReportData([]) }

  const handleExportPDF = async () => {
    if (!reportData.length) return showMessage('No Data', 'Nothing to export.', 'warning')
    try {
        const query = { start_date: dateRange.start, end_date: dateRange.end, page: 1, limit: 999999, ...filters }
        if (activeTab === 'dead_stock') query.months = dormancyMonths;
        if (activeTab === 'returns' && filters.returnReason !== 'All Reasons') query.returnReason = filters.returnReason;

        let doc;
        if (activeTab === 'sales') { const res = await reportsAPI.getSalesReport(query); doc = await generateSalesReportPDF(res.sales, dateRange.start, dateRange.end, adminName, dateRange.label); doc.save(`Sales_Report.pdf`); }
        else if (activeTab === 'inventory') { const res = await reportsAPI.getInventoryReport(query); doc = await generateInventoryReportPDF(res.inventory || [], dateRange.start, dateRange.end, adminName); doc.save(`Inventory_Report.pdf`); }
        else if (activeTab === 'returns') { const res = await reportsAPI.getReturnsReport(query); doc = await generateReturnsReportPDF(res.returns || [], dateRange.start, dateRange.end, adminName); doc.save(`Returns_Report.pdf`); }
        else if (activeTab === 'dead_stock') { const res = await reportsAPI.getDeadStockReport(query); doc = await generateDeadStockReportPDF(res.deadStock || [], adminName); doc.save(`Dead_Stock_Report.pdf`); }
    } catch (e) { showMessage('Export Error', e.message, 'danger') }
  }

  const renderStatusBadge = (status) => {
     if (status === 'In Stock') return <CBadge className="badge-stock-high" shape="rounded-pill">In Stock</CBadge>
     if (status === 'Low Stock') return <CBadge className="badge-stock-low" shape="rounded-pill">Low Stock</CBadge>
     return <CBadge className="badge-stock-out" shape="rounded-pill">Out of Stock</CBadge>
  }
  const renderYearOptions = () => { const cy = new Date().getFullYear(); return Array.from({length:10}, (_,i) => cy-i).map(y => <option key={y} value={y}>{y}</option>); }

  // --- RENDER HELPERS ---
  const renderTableHead = () => {
    switch(activeTab) {
      case 'sales': return (<tr><th className="ps-4">Order ID</th><th>Customer</th><th>Product Details</th><th className="text-center">Qty</th><th className="text-end">Total</th><th>Payment</th><th className="text-center">Status</th><th className="text-end pe-4">Date</th></tr>);
      case 'inventory': return (<tr><th className="ps-4" style={{width: '30%'}}>Product Name</th><th style={{width: '10%'}}>Brand</th><th className="text-center" style={{width: '10%'}}>Stock</th><th className="text-end" style={{width: '15%'}}>Unit Price</th><th className="text-end" style={{width: '15%'}}>Total Value</th><th className="text-center pe-4" style={{width: '20%'}}>Status</th></tr>);
      case 'dead_stock': return (<tr><th className="ps-4" style={{width: '35%'}}>Product / Serial</th><th style={{width: '15%'}}>Category</th><th className="text-center">Stock</th><th className="text-end">Tied Capital</th><th className="text-end pe-4">Last Activity</th></tr>);
      case 'returns': return (<tr><th className="ps-4">Return ID</th><th style={{width:'30%'}}>Items Returned</th><th>Customer</th><th>Reason</th><th>Date</th><th className="text-end pe-4">Refund Amount</th></tr>);
      default: return null;
    }
  }

  const renderTableRows = () => {
    return reportData.map((row, idx) => {
       if(activeTab === 'sales') return (
         <tr key={idx}><td className="ps-4 font-monospace text-brand-navy fw-bold">#{row.orderId || row.order_id}</td><td className="fw-semibold text-dark">{row.customerName}</td><td><span className="text-product-detail">{row.productName}</span></td><td className="text-center"><span className="fw-bold text-dark bg-light px-2 py-1 rounded">{row.quantity}</span></td><td className="text-end font-monospace text-brand-navy fw-bold">₱{Number(row.totalPrice).toLocaleString()}</td><td><div className="small fw-bold">{row.paymentMethod}</div></td><td className="text-center"><span className={`badge ${row.paymentStatus === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}`}>{row.paymentStatus}</span></td><td className="text-end pe-4 small text-muted font-monospace">{row.orderDate ? new Date(row.orderDate).toLocaleDateString() : '-'}</td></tr>
       );
       if(activeTab === 'inventory') return (
         <tr key={idx}><td className="ps-4 fw-bold text-dark">{row.productName}</td><td className="text-muted small">{row.brand}</td><td className="text-center font-monospace fs-6 text-dark">{Number(row.currentStock).toLocaleString()}</td><td className="text-end font-monospace text-muted">₱{Number(row.price).toLocaleString()}</td><td className="text-end font-monospace fw-bold text-success">₱{(Number(row.price) * Number(row.currentStock)).toLocaleString()}</td><td className="text-center pe-4">{renderStatusBadge(row.stockStatus)}</td></tr>
       );
       if(activeTab === 'dead_stock') return (
         <tr key={idx}><td className="ps-4"><div className="fw-bold text-dark">{row.name}</div>{row.type === 'Serial' ? (<div className="small text-danger fw-bold"><CIcon icon={cilBarcode} size="sm" className="me-1"/> SN: {row.serialNumber}</div>) : (<div className="small text-muted">{row.brand}</div>)}</td><td><CBadge className="badge-category" shape="rounded-pill">{row.category}</CBadge></td><td className="text-center font-monospace fs-6 text-dark">{row.currentStock}{row.type === 'Serial' && <span className="ms-1 text-muted small">(1)</span>}</td><td className="text-end font-monospace text-danger fw-bold">₱{Number(row.tiedUpValue).toLocaleString()}</td><td className="text-end pe-4"><div className="text-dark small fw-bold">{row.lastActivity ? new Date(row.lastActivity).toLocaleDateString() : 'No Activity'}</div><div className="small text-muted fst-italic">Dormant: {row.daysDormant}</div></td></tr>
       );
       if(activeTab === 'returns') return (
         <tr key={idx}><td className="ps-4 text-danger fw-bold font-monospace">#{row.return_id}</td><td><div className="d-flex flex-column gap-1">{row.items && row.items.length > 0 ? (row.items.map((item, i) => (<div key={i} className="small text-dark" style={{lineHeight: '1.2'}}><span className="fw-bold">• {item.product_name}</span>{item.serial_numbers && (<div className="text-muted ms-2 fst-italic" style={{fontSize:'0.75rem'}}>SN: {item.serial_numbers}</div>)}</div>))) : <span className="text-muted small">-</span>}</div></td><td className="fw-semibold">{row.customer_name}</td><td className="text-muted small fst-italic text-truncate" style={{maxWidth:'150px'}}>{row.return_reason}</td><td className="text-muted small font-monospace">{new Date(row.return_date).toLocaleDateString()}</td><td className="text-end pe-4 font-monospace text-danger fw-bold">- ₱{Number(row.refund_amount).toLocaleString()}</td></tr>
       );
       return null;
    });
  }

  return (
    <CContainer fluid>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3">
        <div><h2 className="report-header-title mb-0">ANALYTICS DASHBOARD</h2><div className="text-muted small">Real-time system insights and exportable reports</div></div>
        <div className="d-flex gap-2">
           <button className="btn btn-light border d-flex align-items-center justify-content-center text-danger" onClick={handleResetFilters} disabled={loading} style={{width:'42px',height:'42px',borderRadius:'6px'}} title="Reset"><CIcon icon={cilFilterX}/></button>
           <button className="btn btn-light border d-flex align-items-center justify-content-center text-secondary" onClick={fetchReportData} disabled={loading} style={{width:'42px',height:'42px',borderRadius:'6px'}} title="Refresh"><CIcon icon={cilReload} className={loading ? "fa-spin" : ""}/></button>
           <CButton className="fw-bold text-white d-flex align-items-center bg-brand-navy border-0" style={{borderRadius:'6px'}} onClick={handleExportPDF}><CIcon icon={cilCloudDownload} className="me-2"/> EXPORT REPORT</CButton>
        </div>
      </div>

      {summary && (
        <CRow className="mb-4 g-3">
          {activeTab === 'sales' && ( <> <CCol sm={4}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="primary" icon={<CIcon icon={cilMoney} height={24}/>} title="Total Revenue" value={`₱${Number(summary.totalRevenue||0).toLocaleString()}`} /></CCol> <CCol sm={4}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="info" icon={<CIcon icon={cilChartLine} height={24}/>} title="Total Sales" value={summary.totalSales || 0} /></CCol> <CCol sm={4}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="warning" icon={<CIcon icon={cilMoney} height={24} className="text-dark"/>} title="Avg. Ticket" value={<span className="text-dark">₱{Number(summary.averageSale||0).toLocaleString()}</span>} /></CCol> </> )}
          {activeTab === 'inventory' && ( <> <CCol sm={3}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="info" icon={<CIcon icon={cilInbox} height={24}/>} title="Total SKU" value={summary.totalProducts || 0} /></CCol> <CCol sm={3}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="success" icon={<CIcon icon={cilMoney} height={24} className="text-white"/>} title="Asset Value" value={<span className="text-white">₱{Number(summary.totalInventoryValue||0).toLocaleString()}</span>} /></CCol> <CCol sm={3}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="danger" icon={<CIcon icon={cilXCircle} height={24} className="text-white"/>} title="Out of Stock" value={<span className="text-white">{summary.outOfStockProducts || 0}</span>} /></CCol> <CCol sm={3}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="warning" icon={<CIcon icon={cilWarning} height={24} className="text-dark"/>} title="Low Stock" value={<span className="text-dark">{summary.lowStockProducts || 0}</span>} /></CCol> </> )}
          {activeTab === 'dead_stock' && ( <> <CCol sm={6}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="danger" icon={<CIcon icon={cilHistory} height={24} className="text-white"/>} title="Dormant Items" value={<span className="text-white">{summary.totalDeadItems || 0}</span>} /></CCol> <CCol sm={6}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="warning" icon={<CIcon icon={cilMoney} height={24} className="text-dark"/>} title="Est. Tied Capital" value={<span className="text-dark">₱{Number(summary.totalDeadValue||0).toLocaleString()}</span>} /></CCol> </> )}
          {activeTab === 'returns' && ( <> <CCol sm={6}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="danger" icon={<CIcon icon={cilArrowThickFromTop} height={24} className="text-white"/>} title="Total Returns" value={<span className="text-white">{summary.totalReturns || 0}</span>} /></CCol> <CCol sm={6}><CWidgetStatsF className="widget-hover shadow-sm border-0" color="warning" icon={<CIcon icon={cilMoney} height={24} className="text-dark"/>} title="Refunded Value" value={<span className="text-dark">₱{Number(summary.totalRefundAmount||0).toLocaleString()}</span>} /></CCol> </> )}
        </CRow>
      )}

      <CCard className="border-0 shadow-sm overflow-hidden" style={{borderRadius: '8px'}}>
        <CCardHeader className="bg-white p-3 border-bottom">
           <div className="d-flex flex-column flex-xl-row gap-3 justify-content-between align-items-xl-center">
              <CNav variant="pills" className="report-pills flex-nowrap overflow-auto pb-2 pb-xl-0">
                <CNavItem><CNavLink href="#" active={activeTab === 'sales'} onClick={() => handleTabChange('sales')}><CIcon icon={cilChartLine} className="me-2"/>Sales</CNavLink></CNavItem>
                <CNavItem><CNavLink href="#" active={activeTab === 'inventory'} onClick={() => handleTabChange('inventory')}><CIcon icon={cilInbox} className="me-2"/>Inventory</CNavLink></CNavItem>
                <CNavItem><CNavLink href="#" active={activeTab === 'dead_stock'} onClick={() => handleTabChange('dead_stock')}><CIcon icon={cilHistory} className="me-2"/>Dead Stock</CNavLink></CNavItem>
                <CNavItem><CNavLink href="#" active={activeTab === 'returns'} onClick={() => handleTabChange('returns')}><CIcon icon={cilArrowThickFromTop} className="me-2"/>Returns</CNavLink></CNavItem>
              </CNav>
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-start justify-content-xl-end">
                 {activeTab === 'dead_stock' && ( <div className="d-flex gap-2 flex-wrap align-items-center"><div className="d-flex align-items-center bg-light px-3 py-1 rounded border" style={{height:'45px'}}><span className="text-muted small me-2 fw-bold text-uppercase">Dormancy:</span><select className="bg-transparent border-0 fw-bold text-danger" value={dormancyMonths} onChange={e => setDormancyMonths(e.target.value)} style={{outline:'none', cursor:'pointer', minWidth: '100px'}}><option value="3">3 Months</option><option value="6">6 Months</option><option value="12">1 Year</option><option value="24">2 Years</option></select></div><select className="brand-select" value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})}><option>All Brand</option>{options.brands.map((b,i) => <option key={i}>{b}</option>)}</select><select className="brand-select" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}><option>All Categories</option>{options.categories.map((c,i) => <option key={i}>{c}</option>)}</select></div> )}
                 {(activeTab === 'sales' || activeTab === 'returns') && (
                    <div className="period-filter-group">
                       <CIcon icon={cilCalendar} className="text-secondary ms-2"/>
                       <CFormSelect value={reportPeriod} onChange={handlePeriodChange} className="period-select"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="custom">Custom</option><option value="all">All Time</option></CFormSelect>
                       <div className="period-divider"></div>
                       <div className="period-input-wrapper px-2">
                          {reportPeriod === 'daily' && <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />}
                          {reportPeriod === 'weekly' && <input type="week" value={filterDate} onChange={e => setFilterDate(e.target.value)} />}
                          {reportPeriod === 'monthly' && <input type="month" value={filterDate} onChange={e => setFilterDate(e.target.value)} />}
                          {reportPeriod === 'yearly' && <select className="border-0 bg-transparent fw-bold text-main" value={filterDate} onChange={e => setFilterDate(e.target.value)}>{renderYearOptions()}</select>}
                          {reportPeriod === 'custom' && <div className="d-flex align-items-center gap-2"><input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} style={{maxWidth: '110px'}} /><span className="text-muted fw-bold">-</span><input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} style={{maxWidth: '110px'}} /></div>}
                       </div>
                       {activeTab === 'returns' && ( <><div className="period-divider"></div><select className="bg-transparent border-0 fw-bold px-2" style={{outline:'none', cursor:'pointer', fontSize:'0.9rem'}} value={filters.returnReason} onChange={e => setFilters({...filters, returnReason: e.target.value})}><option value="All Reasons">All Reasons</option><option value="Defective/Damaged">Defective</option><option value="Wrong Item">Wrong Item</option><option value="Not as Described">Not as Described</option><option value="Customer Changed Mind">Changed Mind</option><option value="Other">Other</option></select></> )}
                    </div>
                 )}
                 {activeTab === 'inventory' && ( <div className="d-flex gap-2 flex-wrap"><div className="brand-search-wrapper" style={{maxWidth:'200px'}}><span className="brand-search-icon"><CIcon icon={cilSearch} /></span><input type="text" className="brand-search-input" placeholder="Search..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} /></div><CButton onClick={toggleSerializedFilter} className={`btn-toggle-filter ${filters.isSerializedOnly ? 'active' : ''}`}><CIcon icon={cilBarcode} /> {filters.isSerializedOnly ? 'Serialized Only' : 'All Items'}</CButton><select className="brand-select" value={filters.stockStatus} onChange={e => setFilters({...filters, stockStatus: e.target.value})}><option>All Status</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select><select className="brand-select" value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})}><option>All Brand</option>{options.brands.map((b,i) => <option key={i}>{b}</option>)}</select><select className="brand-select" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}><option>All Categories</option>{options.categories.map((c,i) => <option key={i}>{c}</option>)}</select></div> )}
              </div>
           </div>
        </CCardHeader>

        <CCardBody className="p-0">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                {renderTableHead()}
              </thead>
              <tbody>
                {loading ? ( <tr><td colSpan="8" className="text-center py-5"><CSpinner color="primary"/><div className="mt-2 text-muted small font-monospace">FETCHING DATA...</div></td></tr> ) : reportData.length === 0 ? ( <tr><td colSpan="8" className="text-center py-5"><CIcon icon={cilSearch} size="4xl" className="text-secondary opacity-25 mb-3"/><h6 className="text-secondary fw-bold mt-2">NO RECORDS FOUND</h6><small className="text-muted">Adjust filters or select a different date range.</small></td></tr> ) : (
                  renderTableRows()
                )}
              </tbody>
            </table>
          </div>
          <div className="p-2 border-top d-flex justify-content-end align-items-center bg-light">
             <span className="small text-muted me-3">Page {pagination.current_page || pagination.page || 1} of {pagination.total_pages || 1}</span>
             <div className="btn-group gap-2"><button className="btn-pagination" disabled={(pagination.current_page || pagination.page || 1) === 1} onClick={() => setPagination(p => ({...p, page: p.page - 1}))}>Prev</button><button className="btn-pagination" disabled={(pagination.current_page || pagination.page || 1) >= (pagination.total_pages || 1)} onClick={() => setPagination(p => ({...p, page: p.page + 1}))}>Next</button></div>
          </div>
        </CCardBody>
      </CCard>
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}><CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle className="text-white">{msgModal.title}</CModalTitle></CModalHeader><CModalBody className="fw-bold text-center py-4">{msgModal.message}</CModalBody><CModalFooter><CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton></CModalFooter></CModal>
    </CContainer>
  )
}

export default ReportsPage