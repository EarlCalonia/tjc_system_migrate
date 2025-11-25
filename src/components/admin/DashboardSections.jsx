import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; 
import { dashboardAPI } from '../../utils/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import { CBadge, CButton, CListGroup, CListGroupItem } from '@coreui/react'; // Added CoreUI components
import CIcon from '@coreui/icons-react';
import { cilPlus, cilCloudDownload, cilCart, cilInbox } from '@coreui/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const currency = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateString, period) => {
  const date = new Date(dateString);
  if (period === 'year') return date.toLocaleDateString('en-US', { month: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CHART_COLORS = ['#2478bd', '#f1ce44', '#28a745', '#fd7e14', '#6f42c1', '#dc3545', '#17a2b8'];
const getChartColors = (count) => {
  const colors = [];
  for (let i = 0; i < count; i++) colors.push(CHART_COLORS[i % CHART_COLORS.length]);
  return colors;
};

const DashboardSections = () => {
  const [lowStock, setLowStock] = useState([]);
  const [salesPeriod, setSalesPeriod] = useState('week');
  const [salesChartData, setSalesChartData] = useState({ labels: [], datasets: [] });
  const [loadingSales, setLoadingSales] = useState(true);
  const [fastMoving, setFastMoving] = useState([]);
  const [slowMoving, setSlowMoving] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [stockTab, setStockTab] = useState('low'); 
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
          const normalizedLowStock = (lowStockRes.data || []).map(item => ({
            ...item,
            remaining: Number(item.remaining),
            threshold: typeof item.threshold === 'undefined' ? item.threshold : Number(item.threshold)
          }));
          setLowStock(normalizedLowStock);
        }
        if (fastMovingRes.success) setFastMoving(fastMovingRes.data || []);
        if (slowMovingRes.success) setSlowMoving(slowMovingRes.data || []);
        if (salesByCategoryRes.success) setSalesByCategory(salesByCategoryRes.data || []);
      } catch (error) { console.error("Failed to fetch dashboard sections:", error); } finally { setLoading(false); }
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
          setSalesChartData({
            labels: data.map(d => formatDate(d.date, salesPeriod)),
            datasets: [{
                label: 'Total Sales (PHP)',
                data: data.map(d => d.total),
                backgroundColor: '#2478bd',
                borderRadius: 4,
                barPercentage: 0.5, // Makes bars thinner
                categoryPercentage: 0.8 
              }],
          });
        }
      } catch (error) { console.error("Failed to fetch sales data:", error); } finally { setLoadingSales(false); }
    };
    fetchSalesData();
  }, [salesPeriod]);

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, ticks: { callback: (value) => '₱' + value } } // Start at 0
    },
    plugins: { legend: { position: 'top' }, title: { display: false } },
  };

  const productPerformanceData = {
    labels: fastMoving.map(p => p.name),
    datasets: [{ label: 'Units Sold', data: fastMoving.map(p => p.total_sold), backgroundColor: getChartColors(fastMoving.length), borderWidth: 1 }],
  };

  const slowMoversData = {
    labels: slowMoving.map(p => p.name),
    datasets: [{ label: 'Units Sold', data: slowMoving.map(p => p.total_sold), backgroundColor: getChartColors(slowMoving.length).reverse(), borderWidth: 1 }],
  };

  const salesByCategoryData = {
    labels: salesByCategory.map(c => c.category),
    datasets: [{ label: 'Total Revenue', data: salesByCategory.map(c => c.total_revenue), backgroundColor: getChartColors(salesByCategory.length), borderWidth: 1 }],
  };

  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } };

  if (loading) return <div className="dashboard-card">Loading dashboard data...</div>;

  return (
    <div>
      <div className="dashboard-row">
        {/* Left: Sales Chart */}
        <div className="dashboard-col" style={{ flex: 2 }}>
          <div className="dashboard-card shadow-sm"> 
            <div className="card-header-action">
              <h4 className="mb-0 text-gray-800">Sales Overview</h4>
              <Link to="/reports" className="btn btn-outline btn-small">View Reports</Link>
            </div>
            <div className="card-tabs" style={{ marginBottom: '15px', borderBottom: '2px solid #e1e8ed' }}>
              {['week', 'month', 'year'].map(period => (
                <button key={period} className={`card-tab-btn ${salesPeriod === period ? 'active' : ''}`} onClick={() => setSalesPeriod(period)}>
                  {period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'Last Year'}
                </button>
              ))}
            </div>
            <div style={{ height: '280px' }}> 
              {loadingSales ? <div className="text-center py-5">Loading chart...</div> : <Bar options={salesChartOptions} data={salesChartData} />}
            </div>
          </div>
        </div>

        {/* Middle: Inventory Alerts */}
        <div className="dashboard-col" style={{ flex: 1 }}>
          <div className="dashboard-card shadow-sm">
            <div className="card-header-action">
              <h4 className="mb-0 text-gray-800">Inventory Alerts</h4>
              <Link to="/inventory">
                 <CButton color="primary" size="sm" variant="outline">Manage</CButton>
              </Link>
            </div>
            <div className="card-tabs">
              <button className={`card-tab-btn ${stockTab === 'low' ? 'active' : ''}`} onClick={() => setStockTab('low')}>Low ({lowStock.filter(i => i.remaining > 0).length})</button>
              <button className={`card-tab-btn ${stockTab === 'out' ? 'active' : ''}`} onClick={() => setStockTab('out')}>Empty ({lowStock.filter(i => i.remaining <= 0).length})</button>
            </div>
            <div className="table-container" style={{maxHeight: '220px', overflowY: 'auto'}}>
              <table className="table table-borderless table-striped">
                <thead className="table-light"><tr><th>Product</th><th className="text-end">Stock</th></tr></thead>
                <tbody>
                  {stockTab === 'low' ? (
                    lowStock.filter(i => i.remaining > 0).length > 0 ? 
                    lowStock.filter(i => i.remaining > 0).map(i => (
                      <tr key={i.product_id}><td>{i.name}</td><td className="text-end"><CBadge color="warning" shape="rounded-pill">{i.remaining} Units</CBadge></td></tr>
                    )) : <tr><td colSpan="2" className="text-center">No items low on stock.</td></tr>
                  ) : (
                    lowStock.filter(i => i.remaining <= 0).length > 0 ? 
                    lowStock.filter(i => i.remaining <= 0).map(i => (
                      <tr key={i.product_id}><td>{i.name}</td><td className="text-end"><CBadge color="danger" shape="rounded-pill">Out of Stock</CBadge></td></tr>
                    )) : <tr><td colSpan="2" className="text-center">All items in stock.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions (NEW) */}
        <div className="dashboard-col" style={{ flex: 0.8 }}>
          <div className="dashboard-card shadow-sm h-100">
            <h4 className="mb-3 text-gray-800">Quick Actions</h4>
            <CListGroup flush>
               <Link to="/sales" style={{textDecoration:'none'}}>
                <CListGroupItem className="d-flex justify-content-between align-items-center action-hover" style={{cursor:'pointer', padding:'12px'}}>
                  <div><CIcon icon={cilCart} className="me-2 text-primary"/> New Sale</div>
                  <CIcon icon={cilPlus} size="sm"/>
                </CListGroupItem>
               </Link>
               <Link to="/inventory" style={{textDecoration:'none'}}>
                <CListGroupItem className="d-flex justify-content-between align-items-center action-hover" style={{cursor:'pointer', padding:'12px'}}>
                  <div><CIcon icon={cilInbox} className="me-2 text-warning"/> Stock In</div>
                  <CIcon icon={cilPlus} size="sm"/>
                </CListGroupItem>
               </Link>
               <Link to="/reports" style={{textDecoration:'none'}}>
                <CListGroupItem className="d-flex justify-content-between align-items-center action-hover" style={{cursor:'pointer', padding:'12px'}}>
                  <div><CIcon icon={cilCloudDownload} className="me-2 text-success"/> Export Report</div>
                  <CIcon icon={cilPlus} size="sm"/>
                </CListGroupItem>
               </Link>
            </CListGroup>
          </div>
        </div>
      </div>

      {/* Row 2: Analytics */}
      <div className="dashboard-row mt-4">
        <div className="dashboard-col" style={{ flex: 1 }}>
          <div className="dashboard-card shadow-sm">
             <h4 className="mb-3">Sales Revenue by Category</h4>
            <div className="chart-container" style={{ height: '300px', position: 'relative' }}>
              {salesByCategory.length > 0 ? <Doughnut options={pieOptions} data={salesByCategoryData} /> : <div className="text-center pt-5">No data yet.</div>}
            </div>
          </div>
        </div>
        
        <div className="dashboard-col" style={{ flex: 1 }}>
          <div className="dashboard-card shadow-sm">
            <div className="card-tabs">
              <button className={`card-tab-btn ${productTab === 'fast' ? 'active' : ''}`} onClick={() => setProductTab('fast')}>Top Sellers</button>
              <button className={`card-tab-btn ${productTab === 'slow' ? 'active' : ''}`} onClick={() => setProductTab('slow')}>Least Selling</button>
            </div>
            <div className="chart-container" style={{ height: '270px', position: 'relative' }}>
              {productTab === 'fast' ? (
                fastMoving.length > 0 ? <Doughnut options={pieOptions} data={productPerformanceData} /> : <div className="text-center pt-5">No sales data yet.</div>
              ) : (
                slowMoving.length > 0 ? <Doughnut options={pieOptions} data={slowMoversData} /> : <div className="text-center pt-5">No sales data yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSections;