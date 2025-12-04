import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; 
import { dashboardAPI } from '../../utils/api';
import { Line, Doughnut } from 'react-chartjs-2';
import { getStyle, hexToRgba } from '@coreui/utils';
import { 
  CCard, CCardBody, CCardHeader, CRow, CCol, 
  CTable, CTableBody, CTableHead, CTableHeaderCell, CTableRow, CTableDataCell,
  CProgress, CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem,
  CSpinner, CBadge, CTooltip
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilInbox, cilFilter, cilArrowRight, cilWarning, cilTrash, cilGraph, cilList, cilChartPie } from '@coreui/icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, Filler, ArcElement 
} from 'chart.js';

// Register Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

const formatDate = (dateString, period) => {
  const date = new Date(dateString);
  if (period === 'year') return date.toLocaleDateString('en-US', { month: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- [BRANDING] COLOR PSYCHOLOGY PALETTES ---

// 1. CATEGORY (Rainbow): Distinct colors for separation
const RAINBOW_COLORS = ['#2478bd', '#f1ce44', '#28a745', '#6f42c1', '#fd7e14', '#20c997', '#dc3545'];

// 2. FAST MOVING (Green): Success, Growth, Flow
const GREEN_PALETTE = ['#1b9e3e', '#2eb85c', '#51cd78', '#81e69e', '#b9f6ca']; 

// 3. SLOW MOVING (Red): Warning, Stoppage, Action Required
const RED_PALETTE = ['#b21f2d', '#e55353', '#ff8787', '#ffaeb0', '#f9e1e5'];

const DashboardSections = () => {
  const [lowStock, setLowStock] = useState([]);
  const [salesPeriod, setSalesPeriod] = useState('week');
  const [salesChartData, setSalesChartData] = useState({ labels: [], datasets: [] });
  const [loadingSales, setLoadingSales] = useState(true);
  const [fastMoving, setFastMoving] = useState([]);
  const [slowMoving, setSlowMoving] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [stockTab, setStockTab] = useState('all'); 
  const [productTab, setProductTab] = useState('fast');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [lowStockRes, fastMovingRes, slowMovingRes, salesByCategoryRes] = await Promise.all([
          dashboardAPI.getLowStockItems(),
          dashboardAPI.getFastMovingProducts(),
          dashboardAPI.getSlowMovingProducts(),
          dashboardAPI.getSalesByCategory()
        ]);

        if (lowStockRes.success) setLowStock((lowStockRes.data || []).map(item => ({ ...item, remaining: Number(item.remaining) })));
        if (fastMovingRes.success) setFastMoving(fastMovingRes.data || []);
        if (slowMovingRes.success) setSlowMoving(slowMovingRes.data || []);
        if (salesByCategoryRes.success) setSalesByCategory(salesByCategoryRes.data || []);
      } catch (error) { console.error("Failed to fetch data", error); } finally { setLoading(false); }
    };
    fetchAllData();
  }, []);

  // --- SALES CHART DATA ---
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoadingSales(true);
        const salesRes = await dashboardAPI.getDailySales({ period: salesPeriod });
        if (salesRes.success) {
          const data = salesRes.data || [];
          const brandColor = '#2478bd'; // Brand Blue
          
          setSalesChartData({
            labels: data.map(d => formatDate(d.date, salesPeriod)),
            datasets: [{
              label: 'Revenue',
              backgroundColor: hexToRgba(brandColor, 0.1), 
              borderColor: brandColor,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: brandColor,
              pointHoverBackgroundColor: brandColor,
              pointHoverBorderColor: '#ffffff',
              borderWidth: 3,
              data: data.map(d => d.total),
              fill: true,
              tension: 0.3 
            }],
          });
        }
      } catch (error) { console.error("Failed sales fetch", error); } finally { setLoadingSales(false); }
    };
    fetchSalesData();
  }, [salesPeriod]);

  const salesChartOptions = {
    maintainAspectRatio: false,
    responsive: true, 
    plugins: { 
      legend: { display: false }, 
      tooltip: { 
        backgroundColor: '#0f2438', 
        titleFont: { family: 'Oswald', size: 14 },
        bodyFont: { family: 'Inter', size: 14 },
        padding: 14, 
        cornerRadius: 4,
        displayColors: false,
        callbacks: { label: (context) => ` Revenue: ₱ ${context.parsed.y.toLocaleString('en-PH')}` } 
      } 
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { font: { size: 12, family: 'Inter', weight: '500' }, color: '#495057' } 
      },
      y: { 
        beginAtZero: true, 
        border: { display: false }, 
        grid: { color: '#e9ecef', borderDash: [5, 5] }, 
        ticks: { 
          callback: (value) => '₱' + (value >= 1000 ? value/1000 + 'k' : value), 
          font: { size: 12, weight: '600', family: 'Inter' },
          color: '#0f2438' 
        } 
      }
    },
    elements: { point: { radius: 4, hitRadius: 10, hoverRadius: 7 } }
  };

  const pieOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    cutout: '60%', 
    plugins: { 
      legend: { 
        position: 'right', 
        labels: { usePointStyle: true, boxWidth: 10, padding: 15, font: { size: 12, family: 'Inter', weight: '500' }, color: '#212529' } 
      } 
    } 
  };

  const getProductChartData = (data, type) => ({
    labels: data.map(p => p.name.length > 15 ? p.name.substring(0,15)+'...' : p.name),
    datasets: [{ 
      data: data.map(p => p.total_sold), 
      // DYNAMIC COLOR LOGIC: Green for Fast, Red for Slow
      backgroundColor: type === 'fast' ? GREEN_PALETTE : RED_PALETTE, 
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  });

  const getStockHealth = (stock) => { if (stock <= 0) return 0; return Math.min((stock / 20) * 100, 100); };

  const filteredStock = lowStock.filter(i => {
    if (stockTab === 'all') return true; 
    if (stockTab === 'low') return i.remaining > 0;
    if (stockTab === 'oos') return i.remaining <= 0;
    return false;
  });

  const getFilterLabel = () => {
    if (stockTab === 'all') return 'All Alerts';
    if (stockTab === 'low') return 'Low Stock';
    if (stockTab === 'oos') return 'Out of Stock';
    return 'Filter';
  };

  if (loading) return <div className="text-center p-5"><CSpinner color="primary"/></div>;

  return (
    <>
      <CRow className="g-4 mb-4"> 
        
        {/* --- 1. SALES PERFORMANCE --- */}
        <CCol xs={12} lg={8}>
          <CCard className="shadow-sm h-100 d-flex flex-column border-0">
            <CCardHeader className="bg-brand-navy border-0 d-flex justify-content-between align-items-center py-3 px-4">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilGraph} className="text-brand-yellow" size="lg"/>
                <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>SALES PERFORMANCE</h5>
              </div>
              <div className="d-flex gap-2">
                {['week', 'month', 'year'].map(period => (
                  <button 
                    key={period} 
                    className={`btn-brand btn-brand-sm ${salesPeriod === period ? 'btn-brand-primary' : 'btn-brand-outline text-white'}`}
                    onClick={() => setSalesPeriod(period)}
                    style={{minWidth: 'auto', padding: '0 12px', border: salesPeriod === period ? 'none' : '1px solid rgba(255,255,255,0.3)'}}
                  >
                    {period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'Last Year'} 
                  </button>
                ))}
              </div>
            </CCardHeader>
            <CCardBody className="px-4 py-4 d-flex flex-column" style={{ minHeight: '400px' }}>
              {loadingSales ? (
                <div className="d-flex align-items-center justify-content-center flex-grow-1"><CSpinner size="sm"/></div>
              ) : (
                <div className="w-100 flex-grow-1 position-relative">
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <Line options={salesChartOptions} data={salesChartData} role="img" aria-label="Sales Chart" />
                    </div>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* --- 2. INVENTORY HEALTH --- */}
        <CCol xs={12} lg={4}>
          <CCard className="shadow-sm h-100 d-flex flex-column border-0">
            <CCardHeader className="bg-brand-navy border-0 d-flex justify-content-between align-items-center py-3 px-4">
              <div className="d-flex align-items-center gap-2">
                 <CIcon icon={cilList} className="text-brand-yellow" size="lg"/>
                 <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>INVENTORY HEALTH</h5>
              </div>
              <CDropdown>
                <CDropdownToggle className="btn-brand btn-brand-outline btn-brand-sm text-white d-flex align-items-center" color="transparent">
                  <CIcon icon={cilFilter} size="sm" className="me-2"/> {getFilterLabel()}
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem onClick={() => setStockTab('all')} active={stockTab === 'all'}>All Alerts</CDropdownItem>
                  <CDropdownItem onClick={() => setStockTab('low')} active={stockTab === 'low'}>Low Stock</CDropdownItem>
                  <CDropdownItem onClick={() => setStockTab('oos')} active={stockTab === 'oos'}>Out of Stock</CDropdownItem>
                  <CDropdownItem divider />
                  <CDropdownItem href="/inventory">View Full Inventory</CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </CCardHeader>
            <div className="table-responsive flex-grow-1">
              <CTable hover align="middle" className="mb-0">
                <CTableHead> 
                  <CTableRow className="bg-light">
                    <CTableHeaderCell className="px-4 small fw-bold text-brand-navy text-uppercase border-bottom-0" style={{width: '60%'}}>Item Details</CTableHeaderCell>
                    <CTableHeaderCell className="px-4 small fw-bold text-brand-navy text-uppercase border-bottom-0 text-end">Status</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredStock.length > 0 ? (
                    filteredStock.slice(0, 5).map((item, idx) => (
                      <CTableRow key={idx}>
                        <CTableDataCell className="px-4 py-3">
                          <div className="fw-bold text-dark text-truncate" style={{maxWidth: '140px'}} title={item.name}>{item.name}</div>
                          <div className="small text-muted fw-semibold">ID: {item.product_id}</div>
                        </CTableDataCell>
                        <CTableDataCell className="px-4 py-3 text-end">
                           <span className={`fw-bold small ${item.remaining <= 0 ? 'text-danger' : 'text-warning'}`}>
                              {item.remaining <= 0 ? 'OUT OF STOCK' : `${item.remaining} Left`}
                           </span>
                           <CProgress thin color={item.remaining <= 5 ? 'danger' : 'warning'} value={getStockHealth(item.remaining)} className="mt-1"/>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  ) : (
                    <CTableRow>
                      <CTableDataCell colSpan="2" className="text-center py-5 text-muted">
                        <CIcon icon={cilInbox} size="xl" className="mb-2 opacity-25"/>
                        <div className="small fw-bold">All systems nominal.</div>
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </div>
            <div className="p-3 border-top bg-white text-center"><Link to="/inventory" className="text-decoration-none small fw-bold text-brand-navy">VIEW FULL REPORT <CIcon icon={cilArrowRight} size="sm"/></Link></div>
          </CCard>
        </CCol>
      </CRow>

      {/* --- ROW 2: Circular Charts --- */}
      <CRow className="g-4">
        {/* --- 3. REVENUE CATEGORY (Rainbow) --- */}
        <CCol xs={12} md={6}>
          <CCard className="shadow-sm border-0 h-100 d-flex flex-column">
            <CCardHeader className="bg-brand-navy border-bottom py-3 px-4 d-flex align-items-center gap-2">
              <CIcon icon={cilChartPie} className="text-brand-yellow" size="lg"/>
              <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>REVENUE BY CATEGORY</h5>
            </CCardHeader>
            <CCardBody className="d-flex align-items-center justify-content-center flex-grow-1 p-4" style={{ minHeight: '300px' }}>
              {salesByCategory.length > 0 ? 
                <div style={{ width: '100%', maxWidth: '350px', position: 'relative', height: '100%' }} role="img" aria-label="Doughnut chart showing sales by category">
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <Doughnut options={pieOptions} data={{
                        labels: salesByCategory.map(c => c.category),
                        datasets: [{ 
                        data: salesByCategory.map(c => c.total_revenue), 
                        backgroundColor: RAINBOW_COLORS, // Restore Rainbow
                        borderWidth: 2,
                        borderColor: '#ffffff'
                        }]
                    }} />
                  </div>
                </div>
                : <div className="text-muted">No sales data available</div>
              }
            </CCardBody>
          </CCard>
        </CCol>

        {/* --- 4. PRODUCT METRICS (Green for Fast, Red for Slow) --- */}
        <CCol xs={12} md={6}>
          <CCard className="shadow-sm border-0 h-100 d-flex flex-column">
            <CCardHeader className="bg-brand-navy border-bottom d-flex justify-content-between align-items-center py-3 px-4">
              <div className="d-flex align-items-center gap-2">
                 <CIcon icon={cilGraph} className="text-brand-yellow" size="lg"/>
                 <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>PRODUCT METRICS</h5>
              </div>
              <div className="d-flex gap-2">
                 <button 
                   className={`btn-brand btn-brand-sm ${productTab === 'fast' ? 'btn-brand-primary' : 'btn-brand-outline text-white'}`} 
                   onClick={() => setProductTab('fast')}
                 >
                   TOP SELLERS
                 </button>
                 <button 
                   className={`btn-brand btn-brand-sm ${productTab === 'slow' ? 'btn-brand-primary' : 'btn-brand-outline text-white'}`} 
                   onClick={() => setProductTab('slow')}
                 >
                   SLOW MOVING
                 </button>
              </div>
            </CCardHeader>
            
            <CCardBody className="d-flex flex-column align-items-center justify-content-center flex-grow-1 p-4" style={{ minHeight: '300px' }}>
              {(productTab === 'fast' ? fastMoving : slowMoving).length > 0 ? 
                <>
                  <div style={{ width: '100%', maxWidth: '350px', flex: 1, position: 'relative' }} role="img" aria-label={productTab === 'fast' ? "Chart of best selling products" : "Chart of slow moving products"}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                         {/* Dynamic Color Logic: Green for Fast, Red for Slow */}
                         <Doughnut options={pieOptions} data={getProductChartData(productTab === 'fast' ? fastMoving : slowMoving, productTab)} />
                    </div>
                  </div>
                </>
                : <div className="text-muted">No data available</div>
              }
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default DashboardSections;