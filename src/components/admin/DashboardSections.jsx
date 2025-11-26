import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; 
import { dashboardAPI } from '../../utils/api';
import { Line, Doughnut } from 'react-chartjs-2';
import { getStyle, hexToRgba } from '@coreui/utils';
import { 
  CCard, CCardBody, CCardHeader, CRow, CCol, 
  CTable, CTableBody, CTableHead, CTableHeaderCell, CTableRow, CTableDataCell,
  CBadge, CButton, CButtonGroup, CProgress,
  CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem // IMPORTED Dropdown components
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilInbox } from '@coreui/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement 
} from 'chart.js';

// Register all necessary Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, Filler, ArcElement
);

const formatDate = (dateString, period) => {
  const date = new Date(dateString);
  if (period === 'year') return date.toLocaleDateString('en-US', { month: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CHART_COLORS = ['#2478bd', '#f1ce44', '#28a745', '#fd7e14', '#6f42c1', '#dc3545', '#17a2b8'];

const DashboardSections = () => {
  const [lowStock, setLowStock] = useState([]);
  const [salesPeriod, setSalesPeriod] = useState('week');
  const [salesChartData, setSalesChartData] = useState({ labels: [], datasets: [] });
  const [loadingSales, setLoadingSales] = useState(true);
  const [fastMoving, setFastMoving] = useState([]);
  const [slowMoving, setSlowMoving] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  // Initial state to 'all' to show combined list by default
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

        if (lowStockRes.success) {
          setLowStock((lowStockRes.data || []).map(item => ({
            ...item,
            remaining: Number(item.remaining)
          })));
        }
        if (fastMovingRes.success) setFastMoving(fastMovingRes.data || []);
        if (slowMovingRes.success) setSlowMoving(slowMovingRes.data || []);
        if (salesByCategoryRes.success) setSalesByCategory(salesByCategoryRes.data || []);
      } catch (error) { console.error("Failed to fetch data", error); } finally { setLoading(false); }
    };
    fetchAllData();
  }, []);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoadingSales(true);
        const salesRes = await dashboardAPI.getDailySales({ period: salesPeriod });
        if (salesRes.success) {
          const data = salesRes.data || [];
          const brandColor = getStyle('--cui-primary') || '#2478bd';
          
          setSalesChartData({
            labels: data.map(d => formatDate(d.date, salesPeriod)),
            datasets: [{
              label: 'Revenue',
              backgroundColor: hexToRgba(brandColor, 0.1),
              borderColor: brandColor,
              pointHoverBackgroundColor: brandColor,
              borderWidth: 2,
              data: data.map(d => d.total),
              fill: true,
              tension: 0.4
            }],
          });
        }
      } catch (error) { console.error("Failed sales fetch", error); } finally { setLoadingSales(false); }
    };
    fetchSalesData();
  }, [salesPeriod]);

  const salesChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` ₱ ${context.parsed.y.toLocaleString('en-PH')}`
        }
      }
    },
    scales: {
      x: {
        grid: { drawOnChartArea: false, color: getStyle('--cui-border-color-translucent') },
        ticks: { font: { size: 11 }, maxTicksLimit: 7 }
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#f3f4f7', borderDash: [2, 4] },
        ticks: { 
          callback: (value) => '₱' + (value >= 1000 ? value/1000 + 'k' : value),
          font: { size: 11 },
          maxTicksLimit: 5 
        }
      }
    },
    elements: {
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 4,
      }
    }
  };

  const pieOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    cutout: '75%',
    plugins: { 
      legend: { position: 'right', labels: { usePointStyle: true, padding: 20, font: { size: 11 } } } 
    } 
  };

  const getProductChartData = (data) => ({
    labels: data.map(p => p.name.length > 15 ? p.name.substring(0,15)+'...' : p.name),
    datasets: [{ 
      data: data.map(p => p.total_sold), 
      backgroundColor: CHART_COLORS, 
      borderWidth: 0 
    }],
  });

  const getStockHealth = (stock) => {
    if (stock <= 0) return 0;
    return Math.min((stock / 20) * 100, 100); 
  };

  const filteredStock = lowStock.filter(i => {
    if (stockTab === 'all') return true; 
    if (stockTab === 'low') return i.remaining > 0;
    if (stockTab === 'oos') return i.remaining <= 0;
    return false;
  });
  
  const lowStockCount = lowStock.filter(i => i.remaining > 0).length;
  const oosCount = lowStock.filter(i => i.remaining <= 0).length;
  const totalCriticalCount = lowStock.length;

  // Helper to determine the text label for the dropdown toggle
  const getFilterLabel = () => {
    if (stockTab === 'all') return `All Alerts (${totalCriticalCount})`;
    if (stockTab === 'low') return `Low Stock (${lowStockCount})`;
    if (stockTab === 'oos') return `Out of Stock (${oosCount})`;
  };

  if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <>
      {/* --- ROW 1: Sales Performance & Inventory Health (Tighter margin mb-3) --- */}
      <CRow className="g-4 mb-3"> 
        <CCol xs={12} lg={8}>
          <CCard className="shadow-sm border-0 h-100">
            <CCardHeader className="bg-transparent border-0 d-flex justify-content-between align-items-center pt-4 px-4">
              <div>
                <h5 className="mb-0 text-gray-800">Sales Performance</h5>
                <small className="text-muted">Revenue trends & growth</small>
              </div>
              <CButtonGroup size="sm" role="group">
                {['week', 'month', 'year'].map(period => (
                  <CButton 
                    key={period} 
                    color="primary" 
                    variant={salesPeriod === period ? '' : 'outline'}
                    onClick={() => setSalesPeriod(period)}
                  >
                    {period === 'week' ? '7 Days' : period === 'month' ? '30 Days' : '1 Year'} 
                  </CButton>
                ))}
              </CButtonGroup>
            </CCardHeader>
            <CCardBody className="px-4 pb-4">
              <div style={{ height: '320px', marginTop: '10px' }}>
                {loadingSales ? <div className="text-center pt-5">Loading...</div> : <Line options={salesChartOptions} data={salesChartData} />}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Inventory Health with Dropdown Filter (Narrower: lg={4}) */}
        <CCol xs={12} lg={4}>
          <CCard className="shadow-sm border-0 h-100">
            {/* FIX: Integrated dropdown into the card header */}
            <CCardHeader className="bg-transparent border-0 d-flex justify-content-between align-items-center pt-4 px-4">
              <h5 className="mb-0 text-gray-800">Inventory Health</h5>
              
              <CDropdown variant="btn-group">
                <CDropdownToggle color="primary" size="sm" variant="outline">
                  {getFilterLabel()}
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem onClick={() => setStockTab('all')} active={stockTab === 'all'}>
                    All Alerts ({totalCriticalCount})
                  </CDropdownItem>
                  <CDropdownItem onClick={() => setStockTab('low')} active={stockTab === 'low'}>
                    Low Stock ({lowStockCount})
                  </CDropdownItem>
                  <CDropdownItem onClick={() => setStockTab('oos')} active={stockTab === 'oos'}>
                    Out of Stock ({oosCount})
                  </CDropdownItem>
                  <CDropdownItem divider />
                  <CDropdownItem href="/inventory">
                     View Inventory Page
                  </CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
              
            </CCardHeader>
            <CCardBody className="p-0 d-flex flex-column">
              
              {/* REMOVED: The old CButtonGroup section */}
              
              <div className="table-responsive flex-grow-1">
                <CTable hover align="middle" className="mb-0 border-top">
                  
                  <CTableHead style={{ backgroundColor: '#ffffff' }}> 
                    <CTableRow className="border-bottom border-secondary-subtle">
                      <CTableHeaderCell className="px-4 small fw-semibold text-body-secondary border-bottom-0" style={{width: '50%', backgroundColor: '#ffffff'}}>Item</CTableHeaderCell>
                      <CTableHeaderCell className="px-4 small fw-semibold text-body-secondary border-bottom-0 text-end" style={{backgroundColor: '#ffffff'}}>Availability</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  
                  <CTableBody>
                    {filteredStock.length > 0 ? (
                      filteredStock.slice(0, 5).map((item, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell className="px-4 py-3">
                            <div className="fw-semibold text-dark text-truncate" style={{maxWidth: '120px'}} title={item.name}>{item.name}</div>
                            <div className="small text-muted">ID: {item.product_id}</div>
                          </CTableDataCell>
                          <CTableDataCell className="px-4 py-3">
                            <div className="d-flex justify-content-between align-items-baseline">
                              <div className="fw-semibold">{item.remaining}</div>
                              <div className="small text-muted">units</div>
                            </div>
                            <CProgress 
                              thin 
                              color={item.remaining <= 5 ? 'danger' : 'warning'} 
                              value={getStockHealth(item.remaining)} 
                              className="mt-2" 
                            />
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    ) : (
                      <CTableRow>
                        <CTableDataCell colSpan="2" className="text-center py-5 text-muted">
                          <div className="mb-2"><CIcon icon={cilInbox} size="xl" className="text-light-emphasis"/></div>
                          <small>No items found.</small>
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* --- ROW 2: Sales by Category & Product --- */}
      <CRow className="g-4">
        <CCol xs={12} md={6}>
          <CCard className="shadow-sm border-0 h-100">
            <CCardHeader className="bg-transparent border-0 pt-4 px-4">
              <h5 className="mb-0 text-gray-800">Sales by Category</h5>
            </CCardHeader>
            <CCardBody className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
              {salesByCategory.length > 0 ? 
                <div style={{ width: '100%', maxWidth: '380px' }}>
                  <Doughnut options={pieOptions} data={{
                    labels: salesByCategory.map(c => c.category),
                    datasets: [{ 
                      data: salesByCategory.map(c => c.total_revenue), 
                      backgroundColor: CHART_COLORS, 
                      borderWidth: 2,
                      borderColor: '#ffffff',
                      hoverOffset: 4
                    }]
                  }} />
                </div>
                : <div className="text-muted">No sales data available</div>
              }
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} md={6}>
          <CCard className="shadow-sm border-0 h-100">
            <CCardHeader className="bg-transparent border-0 d-flex justify-content-between align-items-center pt-4 px-4">
              <h5 className="mb-0 text-gray-800">Product Performance</h5>
              <div className="d-flex gap-2">
                 <span 
                   className={`small cursor-pointer text-uppercase fw-bold ${productTab === 'fast' ? 'text-primary border-bottom border-primary border-2' : 'text-muted'}`} 
                   style={{cursor:'pointer', paddingBottom: '2px'}}
                   onClick={() => setProductTab('fast')}
                 >
                   Top Sellers
                 </span>
                 <span className="text-muted small">|</span>
                 <span 
                   className={`small cursor-pointer text-uppercase fw-bold ${productTab === 'slow' ? 'text-primary border-bottom border-primary border-2' : 'text-muted'}`} 
                   style={{cursor:'pointer', paddingBottom: '2px'}}
                   onClick={() => setProductTab('slow')}
                 >
                   Least Sold
                 </span>
              </div>
            </CCardHeader>
            <CCardBody className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
              {(productTab === 'fast' ? fastMoving : slowMoving).length > 0 ? 
                <div style={{ width: '100%', maxWidth: '380px' }}>
                  <Doughnut options={pieOptions} data={getProductChartData(productTab === 'fast' ? fastMoving : slowMoving)} />
                </div>
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