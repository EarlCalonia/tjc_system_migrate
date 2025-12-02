import React from 'react'

import {
  CAvatar,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardFooter,
  CCol,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cibCcMastercard,
  cibCcVisa,
  cilCloudDownload,
  cilPeople,
  cilCart,
} from '@coreui/icons'

// Sample Avatars (You can keep these or replace with placeholders)
import avatar1 from 'src/assets/images/avatars/1.jpg'
import avatar2 from 'src/assets/images/avatars/2.jpg'
import avatar3 from 'src/assets/images/avatars/3.jpg'

import WidgetsDropdown from '../widgets/WidgetsDropdown'
import MainChart from './MainChart'

const Dashboard = () => {
  // [DATA] Replaced generic "Traffic" data with "Recent Orders" mock data
  const recentOrders = [
    {
      avatar: { src: avatar1, status: 'success' },
      client: { name: 'Jayson Statham', id: '#ORD-001' },
      items: { count: 12, desc: 'Brake Pads, Oil Filter...' },
      amount: { value: '₱ 4,500', paid: true },
      method: { name: 'Mastercard', icon: cibCcMastercard },
      activity: '2 mins ago',
    },
    {
      avatar: { src: avatar2, status: 'danger' },
      client: { name: 'Dwayne Johnson', id: '#ORD-002' },
      items: { count: 1, desc: 'Car Battery (Motolite)' },
      amount: { value: '₱ 8,200', paid: false },
      method: { name: 'Visa', icon: cibCcVisa },
      activity: '5 mins ago',
    },
    {
      avatar: { src: avatar3, status: 'warning' },
      client: { name: 'Vin Diesel', id: '#ORD-003' },
      items: { count: 45, desc: 'Wholesale Tires (x40)' },
      amount: { value: '₱ 120,000', paid: true },
      method: { name: 'Cash', icon: cilMoney }, // Assuming custom icon or text
      activity: '1 hour ago',
    },
  ]

  return (
    <>
      <WidgetsDropdown className="mb-4" />
      
      {/* --- MAIN CHART SECTION --- */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol sm={5}>
              <h4 id="traffic" className="card-title mb-0">
                Sales Overview
              </h4>
              <div className="small text-body-secondary">January - July 2025</div>
            </CCol>
            <CCol sm={7} className="d-none d-md-block">
              <CButton color="primary" className="float-end">
                <CIcon icon={cilCloudDownload} /> Download Report
              </CButton>
              <CButtonGroup className="float-end me-3">
                {['Day', 'Month', 'Year'].map((value) => (
                  <CButton
                    color="outline-secondary"
                    key={value}
                    className="mx-0"
                    active={value === 'Month'}
                  >
                    {value}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          </CRow>
          <MainChart />
        </CCardBody>
        <CCardFooter>
          <CRow className="text-center">
            <CCol md={3} className="mb-sm-2 mb-0">
              <div className="text-body-secondary">Gross Sales</div>
              <div className="fw-semibold">₱ 29,703</div>
              <CProgress thin className="mt-2" color="success" value={40} />
            </CCol>
            <CCol md={3} className="mb-sm-2 mb-0">
              <div className="text-body-secondary">Net Profit</div>
              <div className="fw-semibold">₱ 24,093</div>
              <CProgress thin className="mt-2" color="info" value={20} />
            </CCol>
            <CCol md={3} className="mb-sm-2 mb-0">
              <div className="text-body-secondary">Orders</div>
              <div className="fw-semibold">78</div>
              <CProgress thin className="mt-2" color="warning" value={60} />
            </CCol>
            <CCol md={3} className="mb-sm-2 mb-0">
              <div className="text-body-secondary">Returns</div>
              <div className="fw-semibold">5</div>
              <CProgress thin className="mt-2" color="danger" value={80} />
            </CCol>
          </CRow>
        </CCardFooter>
      </CCard>

      {/* --- RECENT ORDERS TABLE --- */}
      <CRow>
        <CCol xs>
          <CCard className="mb-4">
            <CCardBody>
                <h4 className="card-title mb-4">Recent Transactions</h4>
              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      <CIcon icon={cilPeople} />
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Client</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Items</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Amount</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      Payment
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Time</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentOrders.map((item, index) => (
                    <CTableRow key={index}>
                      <CTableDataCell className="text-center">
                        <CAvatar size="md" src={item.avatar.src} status={item.avatar.status} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="fw-bold">{item.client.name}</div>
                        <div className="small text-body-secondary text-nowrap">
                          {item.client.id}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="fw-semibold">{item.items.count} Items</div>
                        <div className="small text-body-secondary">{item.items.desc}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="fw-bold text-success">{item.amount.value}</div>
                        <div className="small text-body-secondary">
                            {item.amount.paid ? 'Paid' : 'Unpaid'}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CIcon size="xl" icon={item.method.icon} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="small text-body-secondary">{item.activity}</div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

const cilMoney = ['512 512', '<path fill="var(--ci-primary-color, currentColor)" d="M448,64H64C28.654,64,0,92.654,0,128V384c0,35.346,28.654,64,64,64H448c35.346,0,64-28.654,64-64V128C512,92.654,483.346,64,448,64ZM480,384c0,17.645-14.355,32-32,32H64c-17.645,0-32-14.355-32-32V128c0-17.645,14.355-32,32-32H448c17.645,0,32,14.355,32,32Z"/><path fill="var(--ci-primary-color, currentColor)" d="M256,152a104,104,0,1,0,104,104A104.118,104.118,0,0,0,256,152Zm0,176a72,72,0,1,1,72-72A72.081,72.081,0,0,1,256,328Z"/><path fill="var(--ci-primary-color, currentColor)" d="M64,128h32v32H64Z"/><path fill="var(--ci-primary-color, currentColor)" d="M416,128h32v32H416Z"/><path fill="var(--ci-primary-color, currentColor)" d="M64,352h32v32H64Z"/><path fill="var(--ci-primary-color, currentColor)" d="M416,352h32v32H416Z"/>']

export default Dashboard