import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import { CChartDoughnut } from '@coreui/react-chartjs'
import { dashboardAPI } from '../../utils/api'

const CategoryChart = () => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await dashboardAPI.getSalesByCategory()
        if (response.success && response.data) {
          const labels = response.data.map((item) => item.category)
          const data = response.data.map((item) => item.total_revenue)

          setChartData({
            labels: labels,
            datasets: [
              {
                backgroundColor: [
                  '#2478bd', // Brand Blue
                  '#1b2a4e', // Brand Navy (Dark)
                  '#28a745', // Success Green
                  '#ffc107', // Warning Yellow (Industrial)
                  '#dc3545', // Danger Red
                  '#6c757d', // Gray
                ],
                data: data,
              },
            ],
          })
        }
      } catch (error) {
        console.error('Error fetching category data', error)
      }
    }
    fetchData()
  }, [])

  return (
    <CCard className="mb-4 text-brand-navy" style={{ height: '100%' }}>
      <CCardHeader className="fw-bold small text-uppercase bg-transparent border-0">
        Sales by Category
      </CCardHeader>
      <CCardBody className="d-flex align-items-center justify-content-center">
        <div style={{ width: '100%', maxWidth: '300px' }}>
            <CChartDoughnut
            data={chartData}
            options={{
                plugins: {
                legend: { position: 'bottom' },
                },
                maintainAspectRatio: true,
            }}
            />
        </div>
      </CCardBody>
    </CCard>
  )
}

export default CategoryChart