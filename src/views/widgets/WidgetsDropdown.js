import React from 'react'
import {
  CRow,
  CCol,
  CWidgetStatsA,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowTop, cilArrowBottom, cilBasket, cilMoney, cilWarning, cilTruck } from '@coreui/icons'
import { CChartLine, CChartBar } from '@coreui/react-chartjs'

const WidgetsDropdown = () => {
  return (
    <CRow>
      {/* --- STAT 1: TOTAL INVENTORY --- */}
      <CCol sm={6} xl={3}>
        <CWidgetStatsA
          className="mb-4 pb-2"
          color="primary" // Maps to Brand Blue defined in SCSS
          value={
            <>
              1,245{' '}
              <span className="fs-6 fw-normal">
                (+5% <CIcon icon={cilArrowTop} />)
              </span>
            </>
          }
          title="Total Inventory Items"
          action={<CIcon icon={cilBasket} size="xl" className="text-white text-opacity-75"/>}
          chart={
            <CChartLine
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                datasets: [
                  {
                    label: 'Stock Level',
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255,255,255,.55)',
                    pointBackgroundColor: '#321fdb',
                    data: [65, 59, 84, 84, 51, 55, 40],
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: false } },
                maintainAspectRatio: false,
                scales: {
                  x: { display: false },
                  y: { display: false },
                },
                elements: {
                  line: { borderWidth: 2, tension: 0.4 },
                  point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
                },
              }}
            />
          }
        />
      </CCol>

      {/* --- STAT 2: MONTHLY REVENUE --- */}
      <CCol sm={6} xl={3}>
        <CWidgetStatsA
          className="mb-4 pb-2"
          color="success"
          value={
            <>
              ₱128,400{' '}
              <span className="fs-6 fw-normal">
                (+12% <CIcon icon={cilArrowTop} />)
              </span>
            </>
          }
          title="Monthly Revenue"
          action={<CIcon icon={cilMoney} size="xl" className="text-white text-opacity-75"/>}
          chart={
            <CChartLine
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [
                  {
                    label: 'Revenue',
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255,255,255,.55)',
                    pointBackgroundColor: '#2eb85c',
                    data: [1, 18, 9, 17, 34, 22, 11],
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: false } },
                maintainAspectRatio: false,
                scales: {
                  x: { display: false },
                  y: { display: false },
                },
                elements: {
                  line: { borderWidth: 2, tension: 0.4 },
                  point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
                },
              }}
            />
          }
        />
      </CCol>

      {/* --- STAT 3: LOW STOCK ALERTS --- */}
      <CCol sm={6} xl={3}>
        <CWidgetStatsA
          className="mb-4 pb-2"
          color="warning" // Brand Yellowish/Orange
          value={
            <>
              12 Items{' '}
              <span className="fs-6 fw-normal">
                (Urgent)
              </span>
            </>
          }
          title="Low Stock Alerts"
          action={<CIcon icon={cilWarning} size="xl" className="text-white text-opacity-75"/>}
          chart={
            <CChartBar
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['Oil', 'Tires', 'Lights', 'Brakes', 'Batt', 'Filters', 'Wipers'],
                datasets: [
                  {
                    label: 'Stock Count',
                    backgroundColor: 'rgba(255,255,255,.2)',
                    borderColor: 'rgba(255,255,255,.55)',
                    data: [5, 2, 4, 3, 1, 4, 2],
                    barPercentage: 0.6,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { display: false },
                  y: { display: false },
                },
              }}
            />
          }
        />
      </CCol>

      {/* --- STAT 4: PENDING ORDERS --- */}
      <CCol sm={6} xl={3}>
        <CWidgetStatsA
          className="mb-4 pb-2"
          color="danger"
          value={
            <>
              8 Orders{' '}
              <span className="fs-6 fw-normal">
                (Action Req)
              </span>
            </>
          }
          title="Pending Shipments"
          action={<CIcon icon={cilTruck} size="xl" className="text-white text-opacity-75"/>}
          chart={
            <CChartBar
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                datasets: [
                  {
                    label: 'Orders',
                    backgroundColor: 'rgba(255,255,255,.2)',
                    borderColor: 'rgba(255,255,255,.55)',
                    data: [78, 81, 80, 45, 34, 12, 40],
                    barPercentage: 0.6,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { display: false },
                  y: { display: false },
                },
              }}
            />
          }
        />
      </CCol>
    </CRow>
  )
}

export default WidgetsDropdown