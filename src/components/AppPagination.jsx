import React from 'react'
import { CPagination, CPaginationItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChevronLeft, cilChevronRight } from '@coreui/icons'
import PropTypes from 'prop-types'

const AppPagination = ({ currentPage, totalPages, onPageChange }) => {
  // Guard clause: Don't render if there's only 1 page or no data
  if (!totalPages || totalPages <= 1) return null

  const renderPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    // Previous Button
    items.push(
      <CPaginationItem
        key="prev"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
        aria-label="Previous"
      >
        <CIcon icon={cilChevronLeft} size="sm" />
      </CPaginationItem>
    )

    // First Page + Ellipsis
    if (startPage > 1) {
      items.push(
        <CPaginationItem key={1} onClick={() => onPageChange(1)} style={{ cursor: 'pointer' }}>
          1
        </CPaginationItem>
      )
      if (startPage > 2) {
        items.push(
          <CPaginationItem key="ellipsis-start" disabled>
            ...
          </CPaginationItem>
        )
      }
    }

    // Page Numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <CPaginationItem
          key={i}
          active={i === currentPage}
          onClick={() => onPageChange(i)}
          style={{
            cursor: 'pointer',
            backgroundColor: i === currentPage ? 'var(--brand-navy)' : '',
            borderColor: i === currentPage ? 'var(--brand-navy)' : '',
            color: i === currentPage ? '#fff' : '',
          }}
        >
          {i}
        </CPaginationItem>
      )
    }

    // Last Page + Ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <CPaginationItem key="ellipsis-end" disabled>
            ...
          </CPaginationItem>
        )
      }
      items.push(
        <CPaginationItem key={totalPages} onClick={() => onPageChange(totalPages)} style={{ cursor: 'pointer' }}>
          {totalPages}
        </CPaginationItem>
      )
    }

    // Next Button
    items.push(
      <CPaginationItem
        key="next"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
        aria-label="Next"
      >
        <CIcon icon={cilChevronRight} size="sm" />
      </CPaginationItem>
    )

    return items
  }

  return (
    <CPagination className="mb-0 justify-content-end" aria-label="Page navigation">
      {renderPaginationItems()}
    </CPagination>
  )
}

AppPagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
}

export default AppPagination