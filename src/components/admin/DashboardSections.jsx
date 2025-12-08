import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; 
import { dashboardAPI, activityLogsAPI } from '../../utils/api'; 
import { Line, Doughnut } from 'react-chartjs-2';
import { hexToRgba } from '@coreui/utils';
import { 
  CCard, CCardBody, CCardHeader, CRow, CCol, 
  CProgress, CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem,
  CSpinner, CBadge, CAvatar
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { 
  cilGraph, cilList, cilChartPie, cilFilter, cilArrowRight, cilInbox, 
  cilWarning, cilHistory, cilUser, cilPencil, cilTrash, cilPlus, cilCheckCircle 
} from '@coreui/icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, Filler, ArcElement 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

// --- UTILS ---
const formatDate = (dateString, period) => {
  const date = new Date(dateString);
  if (period === 'year') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " seconds ago";
};

// --- [BRANDING] INDUSTRIAL COLOR PALETTES ---
const BRAND_NAVY = '#17334e';
const BRAND_YELLOW = '#f1ce44';
const BRAND_RED = '#e55353';
const BRAND_ORANGE = '#f9b115';
const BRAND_GREEN = '#2eb85c';

const CATEGORY_PALETTE = [BRAND_NAVY, BRAND_YELLOW, '#636f83', BRAND_GREEN, BRAND_RED, '#321fdb', '#39f'];
const FAST_PALETTE = [BRAND_NAVY, '#24486b', '#315d88', '#3e72a5', '#4b87c2']; 
const SLOW_PALETTE = ['#b21f2d', '#c93636', '#df4d3f', '#f56448', '#ff7b51'];

const DashboardSections = () => {
  const [lowStock, setLowStock] = useState([]);
  const [salesPeriod, setSalesPeriod] = useState('week');
  const [salesChartData, setSalesChartData] = useState({ labels: [], datasets: [] });
  const [loadingSales, setLoadingSales] = useState(true);
  const [fastMoving, setFastMoving] = useState([]);
  const [slowMoving, setSlowMoving] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]); 
  
  const [stockTab, setStockTab] = useState('all'); 
  const [productTab, setProductTab] = useState('fast');
  const [loading, setLoading] = useState(true);
  
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [lowStockRes, fastMovingRes, slowMovingRes, salesByCategoryRes, activityRes] = await Promise.all([
          dashboardAPI.getLowStockItems(),
          dashboardAPI.getFastMovingProducts(),
          dashboardAPI.getSlowMovingProducts(),
          dashboardAPI.getSalesByCategory(),
          activityLogsAPI.getAll({ limit: 5, page: 1 }) 
        ]);

        if (lowStockRes.success) setLowStock((lowStockRes.data || []).map(item => ({ ...item, remaining: Number(item.remaining) })));
        if (fastMovingRes.success) setFastMoving(fastMovingRes.data || []);
        if (slowMovingRes.success) setSlowMoving(slowMovingRes.data || []);
        if (salesByCategoryRes.success) setSalesByCategory(salesByCategoryRes.data || []);
        if (activityRes.success) setRecentActivity(activityRes.data || []); 

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
          const labels = data.map(d => formatDate(d.date, salesPeriod));
          const values = data.map(d => d.total);
          setSalesChartData({
            labels: labels,
            datasets: [{
              label: 'Revenue',
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(23, 51, 78, 0.4)'); 
                gradient.addColorStop(1, 'rgba(23, 51, 78, 0.0)'); 
                return gradient;
              },
              borderColor: BRAND_NAVY,
              pointBackgroundColor: BRAND_YELLOW,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointHoverBackgroundColor: BRAND_YELLOW,
              pointHoverBorderColor: BRAND_NAVY,
              pointHoverRadius: 6,
              pointRadius: 0,
              pointHitRadius: 10,
              borderWidth: 2,
              data: values,
              fill: true,
              tension: 0.3, 
            }],
          });
        }
      } catch (error) { console.error("Failed sales fetch", error); } finally { setLoadingSales(false); }
    };
    fetchSalesData();
  }, [salesPeriod]);

  // --- Helper to get Icon & Colors based on Action Type ---
  // [FIX] Updated colors and text classes to ensure high contrast (WCAG)
  const getActionIcon = (action) => {
    const act = action.toUpperCase();
    
    // Login/Auth: Use Primary (Blue) with White Text
    if (act.includes('LOGIN') || act.includes('AUTH')) 
      return { icon: cilUser, bg: 'bg-primary', text: 'text-white' };
    
    // Create/Add: Use Success (Green) with White Text
    if (act.includes('CREATE') || act.includes('ADD')) 
      return { icon: cilPlus, bg: 'bg-success', text: 'text-white' };
    
    // Update/Edit: Use Warning (Yellow) with DARK Text (White on Yellow fails WCAG)
    if (act.includes('UPDATE') || act.includes('EDIT')) 
      return { icon: cilPencil, bg: 'bg-warning', text: 'text-dark' };
    
    // Delete: Use Danger (Red) with White Text
    if (act.includes('DELETE') || act.includes('REMOVE')) 
      return { icon: cilTrash, bg: 'bg-danger', text: 'text-white' };
    
    // Default: Secondary (Grey) with Dark Text
    return { icon: cilCheckCircle, bg: 'bg-secondary', text: 'text-dark' };
  };

  const salesChartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: BRAND_NAVY, titleFont: { family: 'Oswald', size: 14 }, bodyFont: { family: 'Inter', size: 13 }, padding: 12, cornerRadius: 2, displayColors: false, callbacks: { label: (context) => ` Revenue: ₱ ${Number(context.parsed.y).toLocaleString('en-PH', {minimumFractionDigits: 2})}` } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter', weight: '600' }, color: '#636f83' } }, y: { beginAtZero: true, border: { display: false }, grid: { color: '#ebedef', borderDash: [4, 4], drawBorder: false }, ticks: { callback: (value) => '₱' + (value >= 1000 ? (value/1000).toFixed(1) + 'k' : value), font: { size: 11, weight: '600', family: 'Inter' }, color: '#636f83', padding: 10 } } }
  };

  const pieOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 15, font: { size: 11, family: 'Inter', weight: '500' }, color: BRAND_NAVY } } } };

  const getProductChartData = (data, type) => ({
    labels: data.map(p => p.name.length > 15 ? p.name.substring(0,15)+'...' : p.name),
    datasets: [{ data: data.map(p => p.total_sold), backgroundColor: type === 'fast' ? FAST_PALETTE : SLOW_PALETTE, borderWidth: 0 }]
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
        {/* 1. SALES PERFORMANCE */}
        <CCol xs={12} lg={8}>
          <CCard className="shadow-sm h-100 d-flex flex-column border-0">
            <CCardHeader className="bg-brand-navy border-0 d-flex justify-content-between align-items-center py-3 px-4">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilGraph} className="text-brand-yellow" size="lg"/>
                <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>SALES PERFORMANCE</h5>
              </div>
              <div className="d-flex gap-2">
                {['week', 'month', 'year'].map(period => (
                  <button key={period} className={`btn btn-sm text-uppercase fw-bold ${salesPeriod === period ? 'bg-brand-yellow text-brand-navy' : 'text-white'}`} onClick={() => setSalesPeriod(period)} style={{ minWidth: 'auto', padding: '4px 12px', border: salesPeriod === period ? 'none' : '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontFamily: 'Inter', letterSpacing: '0.5px' }}>{period === 'week' ? '7 Days' : period === 'month' ? '30 Days' : 'Year'}</button>
                ))}
              </div>
            </CCardHeader>
            <CCardBody className="px-4 py-4 d-flex flex-column" style={{ minHeight: '400px' }}>
              {loadingSales ? <div className="d-flex align-items-center justify-content-center flex-grow-1"><CSpinner size="sm"/></div> : 
                <div className="w-100 flex-grow-1 position-relative">
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}><Line ref={chartRef} options={salesChartOptions} data={salesChartData} /></div>
                </div>
              }
            </CCardBody>
          </CCard>
        </CCol>

        {/* 2. INVENTORY HEALTH */}
        <CCol xs={12} lg={4}>
          <CCard className="shadow-sm h-100 d-flex flex-column border-0">
            <CCardHeader className="bg-brand-navy border-0 d-flex justify-content-between align-items-center py-3 px-4">
              <div className="d-flex align-items-center gap-2">
                 <CIcon icon={cilList} className="text-brand-yellow" size="lg"/>
                 <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>INVENTORY HEALTH</h5>
              </div>
              <CDropdown>
                <CDropdownToggle className="btn btn-sm border-0 text-white d-flex align-items-center text-uppercase fw-bold" color="transparent" style={{fontSize: '0.75rem'}}>
                  <CIcon icon={cilFilter} size="sm" className="me-2"/> {getFilterLabel()}
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem onClick={() => setStockTab('all')} active={stockTab === 'all'}>All Alerts</CDropdownItem>
                  <CDropdownItem onClick={() => setStockTab('low')} active={stockTab === 'low'}>Low Stock</CDropdownItem>
                  <CDropdownItem onClick={() => setStockTab('oos')} active={stockTab === 'oos'}>Out of Stock</CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </CCardHeader>
            <div className="flex-grow-1 overflow-auto custom-scrollbar p-3" style={{ maxHeight: '400px' }}>
              {filteredStock.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {filteredStock.slice(0, 6).map((item, idx) => {
                    const isOOS = item.remaining <= 0;
                    const statusColor = isOOS ? BRAND_RED : BRAND_ORANGE;
                    return (
                      <div key={idx} className="d-flex align-items-center p-2 rounded-2 border bg-light position-relative overflow-hidden">
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: statusColor }}></div>
                        <div className="ms-3 flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <span className="fw-bold text-brand-navy text-truncate" style={{maxWidth: '160px'}} title={item.name}>{item.name}</span>
                            <CBadge color={isOOS ? 'danger' : 'warning'} shape="rounded-pill" style={{fontSize: '0.65rem'}}>{isOOS ? 'OUT OF STOCK' : 'LOW STOCK'}</CBadge>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex flex-column"><span className="small text-muted font-monospace" style={{fontSize: '0.7rem'}}>SKU: {item.product_id}</span></div>
                            <div className="text-end"><div className="fw-bold" style={{color: statusColor, fontFamily: 'Oswald', fontSize: '1.2rem', lineHeight: 1}}>{item.remaining}</div><span className="small text-muted" style={{fontSize: '0.65rem'}}>units left</span></div>
                          </div>
                          {!isOOS && <CProgress className="mt-2" height={4} color="warning" value={getStockHealth(item.remaining)} variant="striped" animated />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                  <div className="p-4 rounded-circle bg-light mb-3"><CIcon icon={cilInbox} size="xxl" className="text-secondary opacity-25"/></div>
                  <h6 className="fw-bold mb-1">Operational Efficiency 100%</h6>
                  <p className="small mb-0">No critical inventory alerts.</p>
                </div>
              )}
            </div>
            <div className="p-3 border-top bg-white text-center"><Link to="/inventory" className="text-decoration-none small fw-bold text-brand-navy d-inline-flex align-items-center letter-spacing-1">FULL INVENTORY REPORT <CIcon icon={cilArrowRight} size="sm" className="ms-1"/></Link></div>
          </CCard>
        </CCol>
      </CRow>

      {/* ROW 2: Circular Charts */}
      <CRow className="g-4 mb-4">
        {/* 3. REVENUE CATEGORY */}
        <CCol xs={12} md={6}>
          <CCard className="shadow-sm border-0 h-100 d-flex flex-column">
            <CCardHeader className="bg-brand-navy border-bottom py-3 px-4 d-flex align-items-center gap-2">
              <CIcon icon={cilChartPie} className="text-brand-yellow" size="lg"/>
              <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>REVENUE BY CATEGORY</h5>
            </CCardHeader>
            <CCardBody className="d-flex align-items-center justify-content-center flex-grow-1 p-4" style={{ minHeight: '300px' }}>
              {salesByCategory.length > 0 ? <div style={{ width: '100%', maxWidth: '350px', position: 'relative', height: '100%' }}><div style={{ position: 'absolute', inset: 0 }}><Doughnut options={pieOptions} data={{ labels: salesByCategory.map(c => c.category), datasets: [{ data: salesByCategory.map(c => c.total_revenue), backgroundColor: CATEGORY_PALETTE, borderWidth: 0 }] }} /></div></div> : <div className="text-muted small fst-italic">No sales data available</div>}
            </CCardBody>
          </CCard>
        </CCol>

        {/* 4. PRODUCT METRICS */}
        <CCol xs={12} md={6}>
          <CCard className="shadow-sm border-0 h-100 d-flex flex-column">
            <CCardHeader className="bg-brand-navy border-bottom d-flex justify-content-between align-items-center py-3 px-4">
              <div className="d-flex align-items-center gap-2">
                 <CIcon icon={cilGraph} className="text-brand-yellow" size="lg"/>
                 <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>PRODUCT METRICS</h5>
              </div>
              <div className="d-flex gap-2">
                 <button className={`btn btn-sm text-uppercase fw-bold ${productTab === 'fast' ? 'bg-brand-yellow text-brand-navy' : 'text-white'}`} onClick={() => setProductTab('fast')} style={{fontSize: '0.75rem', border: productTab === 'fast' ? 'none' : '1px solid rgba(255,255,255,0.2)'}}>Top 5</button>
                 <button className={`btn btn-sm text-uppercase fw-bold ${productTab === 'slow' ? 'bg-brand-yellow text-brand-navy' : 'text-white'}`} onClick={() => setProductTab('slow')} style={{fontSize: '0.75rem', border: productTab === 'slow' ? 'none' : '1px solid rgba(255,255,255,0.2)'}}>Slowest</button>
              </div>
            </CCardHeader>
            <CCardBody className="d-flex flex-column align-items-center justify-content-center flex-grow-1 p-4" style={{ minHeight: '300px' }}>
              {(productTab === 'fast' ? fastMoving : slowMoving).length > 0 ? <div style={{ width: '100%', maxWidth: '350px', flex: 1, position: 'relative' }}><div style={{ position: 'absolute', inset: 0 }}><Doughnut options={pieOptions} data={getProductChartData(productTab === 'fast' ? fastMoving : slowMoving, productTab)} /></div></div> : <div className="text-muted small fst-italic">No data available</div>}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* --- ROW 3: LIVE AUDIT FEED (NEW) --- */}
      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard className="shadow-sm border-0 h-100">
            <CCardHeader className="bg-brand-navy border-0 d-flex justify-content-between align-items-center py-3 px-4">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilHistory} className="text-brand-yellow" size="lg"/>
                <h5 className="mb-0 text-white fw-bold" style={{fontFamily: 'Oswald', letterSpacing: '0.5px'}}>LIVE AUDIT FEED</h5>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="blob red me-2"></div>
                <span className="text-white small fw-bold text-uppercase" style={{fontSize: '0.7rem', opacity: 0.8}}>Live Tracking</span>
              </div>
            </CCardHeader>
            <CCardBody className="p-0">
              <div className="table-responsive">
                {/* [MODIFIED] Added 'table-striped' for Zebra Styling */}
                <table className="table table-hover table-striped align-middle mb-0">
                  <thead className="bg-light text-medium-emphasis">
                    <tr>
                      <th className="px-4 py-3 small fw-bold text-uppercase border-bottom-0">User</th>
                      <th className="px-4 py-3 small fw-bold text-uppercase border-bottom-0">Action</th>
                      <th className="px-4 py-3 small fw-bold text-uppercase border-bottom-0">Details</th>
                      <th className="px-4 py-3 small fw-bold text-uppercase border-bottom-0 text-end">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.length > 0 ? (
                      recentActivity.map((log, idx) => {
                        const { icon, bg, text } = getActionIcon(log.action);
                        return (
                          <tr key={idx} style={{cursor: 'default'}}>
                            {/* User Column */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="d-flex align-items-center">
                                {/* [FIX] Standardized Classes for WCAG */}
                                <div className={`avatar avatar-md ${bg} ${text} d-flex align-items-center justify-content-center rounded-circle shadow-sm`} style={{width: '36px', height: '36px'}}>
                                  <CIcon icon={icon} size="sm" />
                                </div>
                                <div className="ms-3">
                                  <div className="fw-bold text-brand-navy">{log.username || 'System'}</div>
                                  <div className="small text-muted" style={{fontSize: '0.7rem'}}>{log.role || 'Automated'}</div>
                                </div>
                              </div>
                            </td>
                            
                            {/* Action Column */}
                            <td className="px-4 py-3">
                              {/* [FIX] Badge Colors to match Icon */}
                              <CBadge className={`${bg} ${text} text-uppercase border-0`} shape="rounded-pill" style={{fontSize: '0.65rem', letterSpacing: '0.5px'}}>
                                {log.action}
                              </CBadge>
                            </td>

                            {/* Details Column */}
                            <td className="px-4 py-3 text-break">
                              <span className="text-medium-emphasis small fw-semibold">
                                {log.details}
                              </span>
                              {log.entity_id && (
                                <div className="font-monospace text-muted mt-1" style={{fontSize: '0.7rem'}}>
                                  REF: {log.entity_id}
                                </div>
                              )}
                            </td>

                            {/* Time Column */}
                            <td className="px-4 py-3 text-end text-nowrap">
                              <div className="fw-bold text-dark small">{formatTimeAgo(log.created_at)}</div>
                              <div className="text-muted" style={{fontSize: '0.7rem'}}>{new Date(log.created_at).toLocaleTimeString()}</div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-5 text-muted">
                          <CIcon icon={cilHistory} size="xl" className="mb-2 opacity-25"/>
                          <div className="small fw-bold">No recent activity found.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CCardBody>
            <div className="p-3 border-top bg-white text-center">
              <Link to="/activity-logs" className="text-decoration-none small fw-bold text-brand-navy d-inline-flex align-items-center letter-spacing-1">
                VIEW FULL AUDIT LOGS <CIcon icon={cilArrowRight} size="sm" className="ms-1"/>
              </Link>
            </div>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default DashboardSections;