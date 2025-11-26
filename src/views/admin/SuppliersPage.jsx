import React, { useState, useEffect } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import { suppliersAPI } from '../../utils/api'

const SuppliersPage = () => {
  // --- STATE ---
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'Active',
  })
  const [selectedId, setSelectedId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // --- EFFECTS ---
  useEffect(() => {
    fetchSuppliers()
  }, [])

  // --- API ---
  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const res = await suppliersAPI.getAll()
      setSuppliers(res.data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (isEditMode) {
        await suppliersAPI.update(selectedId, formData)
      } else {
        await suppliersAPI.create(formData)
      }
      fetchSuppliers()
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      alert('Operation failed: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      await suppliersAPI.delete(id)
      fetchSuppliers()
    }
  }

  // --- HELPERS ---
  const openAdd = () => {
    resetForm()
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  const openEdit = (supplier) => {
    setFormData(supplier)
    setSelectedId(supplier.id)
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      status: 'Active',
    })
    setSelectedId(null)
  }

  // Pagination
  const totalPages = Math.ceil(suppliers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentSuppliers = suppliers.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  // --- RENDER ---
  return (
    <CContainer fluid>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h2>Supplier Management</h2>
          <div className="text-medium-emphasis">Manage your list of suppliers and sources</div>
        </div>
        <CButton color="primary" onClick={openAdd}>
          <CIcon icon={cilPlus} className="me-2" /> Add Supplier
        </CButton>
      </div>

      <CCard className="mb-4">
        <CCardHeader>All Suppliers</CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>ID</CTableHeaderCell>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Contact Person</CTableHeaderCell>
                  <CTableHeaderCell>Phone</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {currentSuppliers.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan="6" className="text-center">
                      No suppliers found.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  currentSuppliers.map((s) => (
                    <CTableRow key={s.id}>
                      <CTableDataCell>{s.supplier_id}</CTableDataCell>
                      <CTableDataCell className="fw-bold">{s.name}</CTableDataCell>
                      <CTableDataCell>{s.contact_person}</CTableDataCell>
                      <CTableDataCell>{s.phone}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={s.status === 'Active' ? 'success' : 'secondary'}>
                          {s.status}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          size="sm"
                          color="info"
                          variant="ghost"
                          onClick={() => openEdit(s)}
                          className="me-1"
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          size="sm"
                          color="danger"
                          variant="ghost"
                          onClick={() => handleDelete(s.id)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          )}

          {/* PAGINATION */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-medium-emphasis">
              Showing {suppliers.length > 0 ? startIndex + 1 : 0} to{' '}
              {Math.min(startIndex + itemsPerPage, suppliers.length)} of {suppliers.length}
            </small>
            <div>
              <CButton
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </CButton>
              <span className="mx-2">{currentPage}</span>
              <CButton
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </CButton>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* MODAL */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <CModalHeader>
          <CModalTitle>{isEditMode ? 'Edit Supplier' : 'Add Supplier'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Supplier Name</CFormLabel>
            <CFormInput
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Contact Person</CFormLabel>
            <CFormInput
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />
          </div>
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Phone</CFormLabel>
              <CFormInput
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </CCol>
          </CRow>
          <div className="mb-3">
            <CFormLabel>Address</CFormLabel>
            <CFormTextarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setIsModalOpen(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSubmit}>
            Save
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SuppliersPage