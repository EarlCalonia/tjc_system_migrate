import React, { useState, useEffect, useCallback } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CCardHeader, CButton, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CNav, CNavItem, CNavLink, CSpinner, CBadge, CFormSelect, CFormInput
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCloudDownload, cilMoney, cilChartLine, cilInbox, cilWarning, cilXCircle, cilArrowThickFromTop, cilCalendar,
  cilSearch, cilReload, cilBarcode, cilHistory, cilFilterX, cilTag, cilClock, cilTruck, cilDollar
} from '@coreui/icons'
import { generateSalesReportPDF, generateInventoryReportPDF, generateReturnsReportPDF, generateDeadStockReportPDF } from '../../utils/pdfGenerator'
import { reportsAPI, suppliersAPI, settingsAPI } from '../../utils/api'

import '../../styles/Admin.css'
import '../../styles/App.css' 
import '../../styles/ReportsPage.css'

// [NEW] Standardized Row Count
const ITEMS_PER_PAGE = 10; 

// --- REUSABLE STAT CARD COMPONENT ---
const StatCard = ({ title, value, icon, gradient, textColor = 'text-white' }) => (
  <CCard className="h-100 border-0 shadow-sm overflow-hidden" style={{ background: gradient }}>
    <CCardBody className="p-4 position-relative d-flex flex-column justify-content-between">
      <div className="position-absolute" style={{ top: '-10px', right: '-15px', opacity: 0.15, transform: 'rotate(15deg)' }}>
         {React.cloneElement(icon, { height: 100, width: 100, className: textColor })}
      </div>
      <div className="position-relative z-1">
        <div className={`text-uppercase fw-bold small mb-2 ${textColor}`} style={{ opacity: 0.8, letterSpacing: '1px' }}>{title}</div>
        <div className={`fw-bold ${textColor}`} style={{ fontSize: '2rem', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
      </div>
    </CCardBody>
  </CCard>
);

const ReportsPage = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('sales')
  const [loading, setLoading] = useState(false)
  const [storeSettings, setStoreSettings] = useState({})

  // FILTERS
  const [reportPeriod, setReportPeriod] = useState('monthly') 
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)) 
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '', label: 'This Month' })
  const [dormancyMonths, setDormancyMonths] = useState(12) 

  const initialFilters = {
    stockStatus: 'All Status',
    brand: 'All Brand', 
    category: 'All Categories',
    returnReason: 'All Reasons',
    productType: 'All', 
    supplier: 'All Suppliers',
    priceRange: 'All Values',
    search: ''
  }
  const [filters, setFilters] = useState(initialFilters)
  const [options, setOptions] = useState({ brands: [], categories: [], suppliers: [] })
  const [reportData, setReportData] = useState([]) 
  const [summary, setSummary] = useState(null)
  
  // [UPDATED] Default Limit to 10
  const [pagination, setPagination] = useState({ page: 1, limit: ITEMS_PER_PAGE, total: 0, total_pages: 1 })
  
  const adminName = localStorage.getItem('username') || 'Admin'
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info' })
  const showMessage = (title, message, color = 'info') => setMsgModal({ visible: true, title, message, color })
  
  const brandHeaderStyle = { fontFamily: 'Oswald, sans-serif', letterSpacing: '1px' };

  // Helper to get current ISO Week string (YYYY-Www)
  const getCurrentISOWeek = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  };

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Improved Date Range Calculation
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
                const [yearStr, weekStr] = filterDate.split('-W');
                if (yearStr && weekStr) {
                    const year = parseInt(yearStr);
                    const week = parseInt(weekStr);
                    const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
                    const dayOfWeek = simpleDate.getDay();
                    const weekStart = simpleDate;
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
      else if (type === 'weekly') setFilterDate(getCurrentISOWeek());
      else if (type === 'monthly') setFilterDate(today.toISOString().slice(0, 7));
      else if (type === 'yearly') setFilterDate(String(today.getFullYear()));
  };

  const handleResetFilters = () => { 
      setFilters(initialFilters); 
      setReportPeriod('monthly'); 
      setFilterDate(new Date().toISOString().slice(0, 7)); 
      setDormancyMonths(12);
      setPagination(p => ({ ...p, page: 1 })); 
  }

  useEffect(() => { 
      const loadOptions = async () => {
          try {
              const [filterRes, supplierRes, settingsRes] = await Promise.all([
                  reportsAPI.getFilterOptions(),
                  suppliersAPI.getAll(),
                  settingsAPI.get()
              ]);
              setOptions({
                  brands: filterRes.success ? filterRes.data.brands : [],
                  categories: filterRes.success ? filterRes.data.categories : [],
                  suppliers: supplierRes.success ? supplierRes.data : []
              });
              if (settingsRes.success) setStoreSettings(settingsRes.data);
          } catch (err) { console.error(err) }
      };
      loadOptions();
  }, [])

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    try {
      const query = { 
        page: pagination.page, 
        limit: pagination.limit, 
        start_date: (activeTab === 'sales' || activeTab === 'returns') ? dateRange.start : undefined, 
        end_date: (activeTab === 'sales' || activeTab === 'returns') ? dateRange.end : undefined 
      }
      
      if (activeTab === 'inventory' || activeTab === 'dead_stock') {
        if (filters.brand !== 'All Brand') query.brand = filters.brand 
        if (filters.category !== 'All Categories') query.category = filters.category
      }
      if (activeTab === 'inventory') {
        if (filters.stockStatus !== 'All Status') query.stock_status = filters.stockStatus
        if (filters.productType && filters.productType !== 'All') query.type = filters.productType
        if (filters.search) query.search = filters.search
      }
      
      if (activeTab === 'dead_stock') {
          query.months = dormancyMonths;
          if (filters.supplier !== 'All Suppliers') query.supplier = filters.supplier;
          if (filters.priceRange !== 'All Values') query.price_range = filters.priceRange;
      }
      
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
        const query = { 
            page: 1, 
            limit: 999999 
        };

        if (activeTab === 'sales' || activeTab === 'returns') {
            query.start_date = dateRange.start;
            query.end_date = dateRange.end;
        }

        if (activeTab === 'returns') {
             if (filters.returnReason !== 'All Reasons') query.returnReason = filters.returnReason;
        }

        if (activeTab === 'inventory' || activeTab === 'dead_stock') {
            if (filters.brand !== 'All Brand') query.brand = filters.brand;
            if (filters.category !== 'All Categories') query.category = filters.category;
        }

        if (activeTab === 'inventory') {
            if (filters.stockStatus !== 'All Status') query.stock_status = filters.stockStatus;
            if (filters.productType && filters.productType !== 'All') query.type = filters.productType;
            if (filters.search) query.search = filters.search;
        }

        if (activeTab === 'dead_stock') {
            query.months = dormancyMonths;
            if (filters.supplier !== 'All Suppliers') query.supplier = filters.supplier;
            if (filters.priceRange !== 'All Values') query.price_range = filters.priceRange;
        }

        let doc;
        if (activeTab === 'sales') { 
            const res = await reportsAPI.getSalesReport(query); 
            doc = await generateSalesReportPDF(res.sales, dateRange.start, dateRange.end, adminName, dateRange.label, storeSettings); 
            doc.save(`Sales_Report.pdf`); 
        }
        else if (activeTab === 'inventory') { 
            const res = await reportsAPI.getInventoryReport(query); 
            doc = await generateInventoryReportPDF(res.inventory || [], dateRange.start, dateRange.end, adminName, storeSettings); 
            doc.save(`Inventory_Report.pdf`); 
        }
        else if (activeTab === 'returns') { 
            const res = await reportsAPI.getReturnsReport(query); 
            doc = await generateReturnsReportPDF(res.returns || [], dateRange.start, dateRange.end, adminName, storeSettings); 
            doc.save(`Returns_Report.pdf`); 
        }
        else if (activeTab === 'dead_stock') { 
            const res = await reportsAPI.getDeadStockReport(query); 
            doc = await generateDeadStockReportPDF(res.deadStock || [], adminName, storeSettings); 
            doc.save(`Dead_Stock_Report.pdf`); 
        }
    } catch (e) { showMessage('Export Error', e.message, 'danger') }
  }

  const renderStatusBadge = (status) => {
     if (status === 'In Stock') return <CBadge color="success" shape="rounded-pill" className="px-3">In Stock</CBadge>
     if (status === 'Low Stock') return <CBadge color="warning" shape="rounded-pill" className="px-3 text-dark">Low Stock</CBadge>
     return <CBadge color="danger" shape="rounded-pill" className="px-3">Out of Stock</CBadge>
  }
  const renderYearOptions = () => { const cy = new Date().getFullYear(); return Array.from({length:10}, (_,i) => cy-i).map(y => <option key={y} value={y}>{y}</option>); }

  // --- RENDER HELPERS ---
  const renderTableHead = () => {
    switch(activeTab) {
      case 'sales': return (<tr><th className="ps-4">Order ID</th><th>Customer</th><th>Product Details</th><th className="text-center">Qty</th><th className="text-end">Total</th><th>Payment</th><th className="text-center">Status</th><th className="text-end pe-4">Date</th></tr>);
      case 'inventory': return (
         <tr>
             <th className="ps-4" style={{width: '18%'}}>Part No. / Type</th>
             <th style={{width: '25%'}}>Product Name</th>
             <th style={{width: '10%'}}>Brand</th>
             <th className="text-center" style={{width: '10%'}}>Stock</th>
             <th className="text-end" style={{width: '12%'}}>Unit Price</th>
             <th className="text-end" style={{width: '12%'}}>Total Value</th>
             <th className="text-center pe-4" style={{width: '13%'}}>Status</th>
         </tr>
      );
      case 'dead_stock': return (
        <tr>
            <th className="ps-4" style={{width: '15%'}}>Type</th>
            <th style={{width: '25%'}}>Product / Detail</th>
            <th style={{width: '15%'}}>Category</th>
            <th className="text-center">Stock</th>
            <th className="text-end">Tied Capital</th>
            <th className="text-end pe-4">Last Activity</th>
        </tr>
      );
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
         <tr key={idx}>
            <td className="ps-4">
                <div className="font-monospace text-brand-navy fw-bold" style={{fontSize: '0.95rem'}}>{row.id}</div>
                <div className="mt-1">
                    {row.requires_serial ? 
                        <CBadge color="info" shape="rounded-pill" className="px-2" style={{fontSize:'0.65rem', border: '1px solid #3399ff'}}>SERIALIZED</CBadge> : 
                        <CBadge color="light" shape="rounded-pill" className="text-dark border px-2" style={{fontSize:'0.65rem', borderColor: '#d8dbe0'}}>STANDARD</CBadge>
                    }
                </div>
            </td>
            <td className="fw-bold text-dark align-middle">{row.productName}</td>
            <td className="text-muted small align-middle">{row.brand}</td>
            <td className="text-center font-monospace fs-6 text-dark align-middle">{Number(row.currentStock).toLocaleString()}</td>
            <td className="text-end font-monospace text-muted align-middle">₱{Number(row.price).toLocaleString()}</td>
            <td className="text-end font-monospace fw-bold text-success align-middle">₱{(Number(row.price) * Number(row.currentStock)).toLocaleString()}</td>
            <td className="text-center pe-4 align-middle">{renderStatusBadge(row.stockStatus)}</td>
         </tr>
       );
       if(activeTab === 'dead_stock') return (
         <tr key={idx}>
            <td className="ps-4">
                {row.type === 'SKU' ? 
                    <CBadge color="secondary" shape="rounded-pill" className="px-3">WHOLE SKU</CBadge> : 
                    <CBadge color="warning" shape="rounded-pill" className="px-3 text-dark">OLD UNIT</CBadge>
                }
            </td>
            <td>
                <div className="fw-bold text-dark">{row.name}</div>
                {row.type === 'Serial' ? 
                    (<div className="small text-danger fw-bold mt-1"><CIcon icon={cilBarcode} size="sm" className="me-1"/> SN: {row.serialNumber}</div>) : 
                    (<div className="small text-muted mt-1"><CIcon icon={cilTag} size="sm" className="me-1"/> Standard Inventory</div>)
                }
                {row.supplier && <div className="small text-muted fst-italic mt-1" style={{fontSize:'0.7rem'}}>From: {row.supplier}</div>}
            </td>
            <td><CBadge className="badge-category" shape="rounded-pill">{row.category}</CBadge></td>
            <td className="text-center font-monospace fs-6 text-dark">{row.currentStock}</td>
            <td className="text-end font-monospace text-danger fw-bold">₱{Number(row.tiedUpValue).toLocaleString()}</td>
            <td className="text-end pe-4">
                <div className="text-dark small fw-bold">{row.lastActivity ? new Date(row.lastActivity).toLocaleDateString() : 'No Activity'}</div>
                <div className="small text-muted fst-italic" style={{fontSize: '0.75rem'}}>Age: {row.daysDormant}</div>
            </td>
         </tr>
       );
       if(activeTab === 'returns') return (
         <tr key={idx}><td className="ps-4 text-danger fw-bold font-monospace">#{row.return_id}</td><td><div className="d-flex flex-column gap-1">{row.items && row.items.length > 0 ? (row.items.map((item, i) => (<div key={i} className="small text-dark" style={{lineHeight: '1.2'}}><span className="fw-bold">• {item.product_name}</span>{item.serial_numbers && (<div className="text-muted ms-2 fst-italic" style={{fontSize:'0.75rem'}}>SN: {item.serial_numbers}</div>)}</div>))) : <span className="text-muted small">-</span>}</div></td><td className="fw-semibold">{row.customer_name}</td><td className="text-muted small fst-italic text-truncate" style={{maxWidth:'150px'}}>{row.return_reason}</td><td className="text-muted small font-monospace">{new Date(row.return_date).toLocaleDateString()}</td><td className="text-end pe-4 font-monospace text-danger fw-bold">- ₱{Number(row.refund_amount).toLocaleString()}</td></tr>
       );
       return null;
    });
  }

  return (
    <CContainer fluid className="px-4 py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3 fade-in-up">
        <div>
            <h2 className="fw-bold text-brand-navy mb-1" style={brandHeaderStyle}>ANALYTICS DASHBOARD</h2>
            <div className="text-medium-emphasis fw-semibold">Real-time system insights and financial reports</div>
        </div>
        <div className="d-flex gap-2">
            <CButton color="danger" className="d-flex align-items-center justify-content-center shadow-sm fw-bold text-white border-0 px-3 transition-all" onClick={handleResetFilters} disabled={loading} style={{height:'45px', borderRadius:'6px', letterSpacing: '0.5px'}}><CIcon icon={cilFilterX} className="me-2"/> RESET</CButton>
            <CButton className="d-flex align-items-center justify-content-center shadow-sm fw-bold text-white border-0 px-3 transition-all" onClick={fetchReportData} disabled={loading} style={{height:'45px', borderRadius:'6px', backgroundColor: 'var(--brand-navy)', letterSpacing: '0.5px'}}><CIcon icon={cilReload} className={`me-2 ${loading ? "fa-spin" : ""}`}/> REFRESH</CButton>
           <CButton className="fw-bold text-white d-flex align-items-center shadow-sm border-0 px-4" onClick={handleExportPDF} style={{height: '45px', borderRadius: '6px', background: 'linear-gradient(135deg, #17334e 0%, #102a43 100%)', letterSpacing: '0.5px'}}><CIcon icon={cilCloudDownload} className="me-2"/> EXPORT REPORT</CButton>
        </div>
      </div>

      {summary && (
        <CRow className="mb-4 g-3 fade-in-up delay-100">
          {activeTab === 'sales' && ( <>
             <CCol sm={6} lg={4}><StatCard title="Total Revenue" value={`₱${Number(summary.totalRevenue||0).toLocaleString()}`} icon={<CIcon icon={cilMoney}/>} gradient="linear-gradient(135deg, #17334e 0%, #0f2438 100%)" /></CCol> 
             <CCol sm={6} lg={4}><StatCard title="Total Sales" value={summary.totalSales || 0} icon={<CIcon icon={cilChartLine}/>} gradient="linear-gradient(135deg, #2eb85c 0%, #1b9e3e 100%)" /></CCol> 
             <CCol sm={6} lg={4}><StatCard title="Avg. Ticket" value={`₱${Number(summary.averageSale||0).toLocaleString()}`} icon={<CIcon icon={cilMoney}/>} gradient="linear-gradient(135deg, #f9b115 0%, #f6960b 100%)" textColor="text-brand-navy" /></CCol> 
          </> )}
          {activeTab === 'inventory' && ( <> 
             <CCol sm={6} lg={3}><StatCard title="Total SKU" value={summary.totalProducts || 0} icon={<CIcon icon={cilInbox}/>} gradient="linear-gradient(135deg, #17334e 0%, #0f2438 100%)" /></CCol> 
             <CCol sm={6} lg={3}><StatCard title="Asset Value" value={`₱${Number(summary.totalInventoryValue||0).toLocaleString()}`} icon={<CIcon icon={cilMoney}/>} gradient="linear-gradient(135deg, #2eb85c 0%, #1b9e3e 100%)" /></CCol> 
             <CCol sm={6} lg={3}><StatCard title="Out of Stock" value={summary.outOfStockProducts || 0} icon={<CIcon icon={cilXCircle}/>} gradient="linear-gradient(135deg, #e55353 0%, #b21f2d 100%)" /></CCol> 
             <CCol sm={6} lg={3}><StatCard title="Low Stock" value={summary.lowStockProducts || 0} icon={<CIcon icon={cilWarning}/>} gradient="linear-gradient(135deg, #f9b115 0%, #f6960b 100%)" textColor="text-brand-navy" /></CCol> 
          </> )}
          {activeTab === 'dead_stock' && ( <> 
             <CCol sm={6}><StatCard title="Dormant Items" value={summary.totalDeadItems || 0} icon={<CIcon icon={cilHistory}/>} gradient="linear-gradient(135deg, #e55353 0%, #b21f2d 100%)" /></CCol> 
             <CCol sm={6}><StatCard title="Est. Tied Capital" value={`₱${Number(summary.totalDeadValue||0).toLocaleString()}`} icon={<CIcon icon={cilMoney}/>} gradient="linear-gradient(135deg, #f9b115 0%, #f6960b 100%)" textColor="text-brand-navy" /></CCol> 
          </> )}
          {activeTab === 'returns' && ( <> 
             <CCol sm={6}><StatCard title="Total Returns" value={summary.totalReturns || 0} icon={<CIcon icon={cilArrowThickFromTop}/>} gradient="linear-gradient(135deg, #e55353 0%, #b21f2d 100%)" /></CCol> 
             <CCol sm={6}><StatCard title="Refunded Value" value={`₱${Number(summary.totalRefundAmount||0).toLocaleString()}`} icon={<CIcon icon={cilMoney}/>} gradient="linear-gradient(135deg, #f9b115 0%, #f6960b 100%)" textColor="text-brand-navy" /></CCol> 
          </> )}
        </CRow>
      )}

      <CCard className="border-0 shadow-sm overflow-hidden fade-in-up delay-200" style={{borderRadius: '8px'}}>
        <CCardHeader className="bg-white p-3 border-bottom">
           <div className="d-flex flex-column flex-xl-row gap-3 justify-content-between align-items-xl-center">
              {/* Tabs */}
              <CNav variant="pills" className="report-pills flex-nowrap overflow-auto pb-2 pb-xl-0">
                <CNavItem><CNavLink href="#" active={activeTab === 'sales'} onClick={() => handleTabChange('sales')}><CIcon icon={cilChartLine} className="me-2"/>Sales</CNavLink></CNavItem>
                <CNavItem><CNavLink href="#" active={activeTab === 'inventory'} onClick={() => handleTabChange('inventory')}><CIcon icon={cilInbox} className="me-2"/>Inventory</CNavLink></CNavItem>
                <CNavItem><CNavLink href="#" active={activeTab === 'dead_stock'} onClick={() => handleTabChange('dead_stock')}><CIcon icon={cilHistory} className="me-2"/>Dead Stock</CNavLink></CNavItem>
                <CNavItem><CNavLink href="#" active={activeTab === 'returns'} onClick={() => handleTabChange('returns')}><CIcon icon={cilArrowThickFromTop} className="me-2"/>Returns</CNavLink></CNavItem>
              </CNav>

              {/* Command Toolbar Filters */}
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-start justify-content-xl-end" style={{minWidth: '600px'}}>
                 {/* Dead Stock Specific - UPDATED WITH FLEXIBLE WIDTHS */}
                 {activeTab === 'dead_stock' && ( 
                    <div className="d-flex gap-2 align-items-center flex-nowrap w-100">
                        {/* 1. Static Criteria (Visual Only) */}
                        <div className="bg-warning bg-opacity-10 px-3 rounded border border-warning d-flex align-items-center flex-shrink-0" style={{height:'45px'}}>
                            <CIcon icon={cilClock} className="text-warning me-2"/>
                            <span className="text-danger small fw-bold text-uppercase text-nowrap ls-1">&gt; 1 YEAR</span>
                        </div>

                        {/* 2. Supplier Dropdown (Flexible) */}
                        <div className="position-relative flex-grow-1" style={{minWidth: '200px'}}>
                           <CFormSelect 
                              className="form-select-sm" 
                              style={{height: '45px', borderColor:'#cbd5e1', paddingLeft:'35px'}} 
                              value={filters.supplier} 
                              onChange={e => setFilters({...filters, supplier: e.target.value})}
                           >
                              <option>All Suppliers</option>
                              {options.suppliers.map((s,i) => <option key={i} value={s.supplier_name || s.name} className="text-truncate">{s.supplier_name || s.name}</option>)}
                           </CFormSelect>
                           <CIcon icon={cilTruck} className="position-absolute text-muted" style={{left:'10px', top:'13px'}} size="sm"/>
                        </div>

                        {/* 3. Price/Value Dropdown (Flexible) */}
                        <div className="position-relative flex-grow-1" style={{minWidth: '150px'}}>
                           <CFormSelect 
                              className="form-select-sm" 
                              style={{height: '45px', borderColor:'#cbd5e1', paddingLeft:'35px'}} 
                              value={filters.priceRange} 
                              onChange={e => setFilters({...filters, priceRange: e.target.value})}
                           >
                              <option>All Values</option>
                              <option value="high">High (&gt;5k)</option>
                              <option value="mid">Mid (1k-5k)</option>
                              <option value="low">Low (&lt;1k)</option>
                           </CFormSelect>
                           <CIcon icon={cilDollar} className="position-absolute text-muted" style={{left:'10px', top:'13px'}} size="sm"/>
                        </div>

                        {/* 4. Category (Flexible) */}
                        <CFormSelect 
                           className="form-select-sm flex-grow-1" 
                           style={{height: '45px', minWidth: '150px', borderColor:'#cbd5e1'}} 
                           value={filters.category} 
                           onChange={e => setFilters({...filters, category: e.target.value})}
                        >
                           <option>All Categories</option>
                           {options.categories.map((c,i) => <option key={i}>{c}</option>)}
                        </CFormSelect>
                    </div> 
                 )}

                 {/* Sales & Returns Date Filters */}
                 {(activeTab === 'sales' || activeTab === 'returns') && (
                    <div className="bg-light p-1 border rounded d-flex align-items-center gap-2 px-2" style={{height:'45px'}}>
                       <CIcon icon={cilCalendar} className="text-secondary"/>
                       <CFormSelect value={reportPeriod} onChange={handlePeriodChange} className="bg-transparent border-0 fw-bold text-brand-navy" style={{outline:'none', fontSize:'0.9rem', cursor:'pointer'}}>
                           <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="custom">Custom</option><option value="all">All Time</option>
                       </CFormSelect>
                       <div style={{width:'1px', height:'20px', backgroundColor:'#cbd5e1'}}></div>
                       <div className="d-flex align-items-center">
                          {reportPeriod === 'daily' && <CFormInput type="date" className="bg-transparent border-0 fw-semibold text-dark" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{outline:'none'}} />}
                          {reportPeriod === 'weekly' && <CFormInput type="week" className="bg-transparent border-0 fw-semibold text-dark" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{outline:'none'}} />}
                          {reportPeriod === 'monthly' && <CFormInput type="month" className="bg-transparent border-0 fw-semibold text-dark" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{outline:'none'}} />}
                          {reportPeriod === 'yearly' && <CFormSelect className="bg-transparent border-0 fw-semibold text-dark" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{outline:'none'}}>{renderYearOptions()}</CFormSelect>}
                          {reportPeriod === 'custom' && <div className="d-flex align-items-center gap-1"><CFormInput type="date" className="bg-transparent border-0 fw-semibold text-dark" style={{width:'110px', outline:'none'}} value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} /><span className="text-muted fw-bold">-</span><CFormInput type="date" className="bg-transparent border-0 fw-semibold text-dark" style={{width:'110px', outline:'none'}} value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} /></div>}
                       </div>
                       
                       {activeTab === 'returns' && ( 
                           <>
                             <div style={{width:'1px', height:'20px', backgroundColor:'#cbd5e1'}} className="mx-1"></div>
                             <CFormSelect className="bg-transparent border-0 fw-semibold text-dark" style={{outline:'none', cursor:'pointer', fontSize:'0.9rem', maxWidth:'120px'}} value={filters.returnReason} onChange={e => setFilters({...filters, returnReason: e.target.value})}>
                                <option value="All Reasons">All Reasons</option><option value="Defective/Damaged">Defective</option><option value="Wrong Item">Wrong Item</option><option value="Not as Described">Not Described</option><option value="Customer Changed Mind">Changed Mind</option><option value="Other">Other</option>
                             </CFormSelect>
                           </> 
                       )}
                    </div>
                 )}

                 {/* Inventory Filters */}
                 {activeTab === 'inventory' && ( 
                    <div className="d-flex gap-2 flex-wrap">
                        {/* [MODIFIED WIDTH] Search Input */}
                        <div className="bg-light rounded px-3 py-0 d-flex align-items-center border flex-grow-1" style={{height: '45px', minWidth: '220px'}}>
                            <CIcon icon={cilSearch} className="text-muted me-2"/>
                            <CFormInput className="border-0 bg-transparent w-100" style={{outline: 'none', fontSize: '0.9rem'}} placeholder="Search..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                        </div>
                        
                        {/* [MODIFIED WIDTH] Product Type */}
                        <CFormSelect style={{height: '45px', width: '150px', borderColor:'#cbd5e1'}} value={filters.productType} onChange={e => setFilters({...filters, productType: e.target.value})}>
                          <option value="All">All Types</option>
                          <option value="Standard">Standard</option>
                          <option value="Serialized">Serialized</option>
                        </CFormSelect>
                        
                        {/* [MODIFIED WIDTH] Stock Status */}
                        <CFormSelect style={{height: '45px', width: '150px', borderColor:'#cbd5e1'}} value={filters.stockStatus} onChange={e => setFilters({...filters, stockStatus: e.target.value})}><option value="All Status">All Status</option><option value="In Stock">In Stock</option><option value="Low Stock">Low Stock</option><option value="Out of Stock">Out of Stock</option></CFormSelect>
                        
                        <CFormSelect style={{height: '45px', width: '130px', borderColor:'#cbd5e1'}} value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})}><option>All Brand</option>{options.brands.map((b,i) => <option key={i}>{b}</option>)}</CFormSelect>
                        <CFormSelect style={{height: '45px', width: '130px', borderColor:'#cbd5e1'}} value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}><option>All Categories</option>{options.categories.map((c,i) => <option key={i}>{c}</option>)}</CFormSelect>
                    </div> 
                 )}
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
                {loading ? ( <tr><td colSpan="8" className="text-center py-5"><CSpinner color="primary"/><div className="mt-2 text-muted small font-monospace">FETCHING DATA...</div></td></tr> ) : reportData.length === 0 ? ( <tr><td colSpan="8" className="text-center py-5"><CIcon icon={cilSearch} size="4xl" className="text-secondary opacity-25 mb-3"/><h6 className="fw-bold mt-2">NO RECORDS FOUND</h6><small className="text-muted">Adjust filters or select a different date range.</small></td></tr> ) : (
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
      
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})} alignment="center">
        <CModalHeader className={`bg-${msgModal.color === 'danger' ? 'brand-navy' : msgModal.color} text-white`}>
            <CModalTitle className="text-white" style={brandHeaderStyle}>{msgModal.title}</CModalTitle>
        </CModalHeader>
        <CModalBody className="fw-bold text-center py-4">{msgModal.message}</CModalBody>
        <CModalFooter className="justify-content-center bg-light border-top-0">
            <CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})} className="fw-bold">Close</CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default ReportsPage