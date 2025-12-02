import React, { useEffect, useRef } from 'react'

import { CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'

const MainChart = () => {
  const chartRef = useRef(null)

  useEffect(() => {
    const handleColorSchemeChange = () => {
      if (chartRef.current) {
        setTimeout(() => {
          chartRef.current.options.scales.x.grid.borderColor = getStyle('--cui-border-color-translucent')
          chartRef.current.options.scales.x.grid.color = getStyle('--cui-border-color-translucent')
          chartRef.current.options.scales.x.ticks.color = getStyle('--cui-body-color')
          chartRef.current.options.scales.y.grid.borderColor = getStyle('--cui-border-color-translucent')
          chartRef.current.options.scales.y.grid.color = getStyle('--cui-border-color-translucent')
          chartRef.current.options.scales.y.ticks.color = getStyle('--cui-body-color')
          chartRef.current.update()
        })
      }
    }

    document.documentElement.addEventListener('ColorSchemeChange', handleColorSchemeChange)
    return () =>
      document.documentElement.removeEventListener('ColorSchemeChange', handleColorSchemeChange)
  }, [chartRef])

  return (
    <>
      <CChartLine
        ref={chartRef}
        style={{ height: '300px', marginTop: '40px' }}
        data={{
          labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
          datasets: [
            {
              label: 'Total Revenue (₱)',
              backgroundColor: `rgba(36, 120, 189, 0.1)`, // Brand Blue transparent
              borderColor: '#2478bd', // Brand Blue
              pointHoverBackgroundColor: '#2478bd',
              borderWidth: 2,
              data: [150000, 180000, 165000, 210000, 195000, 230000, 250000],
              fill: true,
            },
            {
              label: 'Net Profit (₱)',
              backgroundColor: 'transparent',
              borderColor: '#28a745', // Success Green
              pointHoverBackgroundColor: '#28a745',
              borderWidth: 2,
              data: [80000, 95000, 85000, 110000, 100000, 125000, 140000],
            },
            {
              label: 'Sales Target (₱)',
              backgroundColor: 'transparent',
              borderColor: '#dc3545', // Danger/Target Red
              pointHoverBackgroundColor: '#dc3545',
              borderWidth: 1,
              borderDash: [8, 5],
              data: [200000, 200000, 200000, 200000, 200000, 200000, 200000],
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true, // Show legend so users know what lines mean
              position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
          },
          scales: {
            x: {
              grid: {
                color: getStyle('--cui-border-color-translucent'),
                drawOnChartArea: false,
              },
              ticks: {
                color: getStyle('--cui-body-color'),
              },
            },
            y: {
              beginAtZero: true,
              border: {
                color: getStyle('--cui-border-color-translucent'),
              },
              grid: {
                color: getStyle('--cui-border-color-translucent'),
              },
              ticks: {
                color: getStyle('--cui-body-color'),
                maxTicksLimit: 5,
                callback: function(value) {
                    return '₱' + value / 1000 + 'k'; // Format Y-axis as Currency
                }
              },
            },
          },
          elements: {
            line: {
              tension: 0.3, // Smoother curve
            },
            point: {
              radius: 2,
              hitRadius: 10,
              hoverRadius: 6,
              hoverBorderWidth: 3,
            },
          },
        }}
      />
    </>
  )
}

export default MainChart