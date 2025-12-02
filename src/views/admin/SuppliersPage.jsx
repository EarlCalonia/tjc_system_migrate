import React, { useState, useEffect, useMemo } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CButton, CFormInput, CModal,
  CModalHeader, CModalTitle, CModalBody, CModalFooter, CSpinner, CFormLabel, CTooltip
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilMagnifyingGlass, cilUserPlus, cilPencil, cilTrash, cilTruck, cilPhone,
  cilEnvelopeClosed, cilLocationPin, cilReload, cilAddressBook, cilCheckCircle, cilWarning
} from '@coreui/icons'
import { suppliersAPI } from '../../utils/api'

// [FIX] Import Global Brand Styles
import '../../styles/Admin.css'
import '../../styles/App.css' 
import '../../styles/SuppliersPage.css'

const SuppliersPage = () => {
  // --- STATE ---
  const [suppliers, setSuppliers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState({
    id: null, name: '', contact_person: '', email: '', contact_number: '', address: ''
  })
  
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })

  // --- HELPERS ---
  const showMessage = (title, message, color = 'info', onConfirm = null) => {
    setMsgModal({ visible: true, title, message, color, onConfirm })
  }
  
  const closeMsgModal = () => setMsgModal({ ...msgModal, visible: false })

  // Client-side filtering
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers
    const lowerQ = searchQuery.toLowerCase()
    return suppliers.filter(s => 
      (s.supplier_name || '').toLowerCase().includes(lowerQ) ||
      (s.contact_person || '').toLowerCase().includes(lowerQ) ||
      (s.email || '').toLowerCase().includes(lowerQ)
    )
  }, [suppliers, searchQuery])

  // --- API ---
  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const res = await suppliersAPI.getAll()
      if (res.success) {
        setSuppliers(res.data || [])
      }
    } catch (err) {
      console.error(err)
      showMessage('Error', 'Failed to load suppliers.', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  // --- HANDLERS ---
  const handleAdd = () => {
    setIsEditMode(false)
    setSelectedSupplier({ id: null, name: '', contact_person: '', email: '', contact_number: '', address: '' })
    setModalVisible(true)
  }

  const handleEdit = (supplier) => {
    setIsEditMode(true)
    setSelectedSupplier({ 
        id: supplier.id || supplier.supplier_id,
        name: supplier.supplier_name, 
        contact_person: supplier.contact_person, 
        email: supplier.email,
        contact_number: supplier.contact_number,
        address: supplier.address 
    })
    setModalVisible(true)
  }

  const handleDelete = (id) => {
    showMessage('Confirm Delete', 'Are you sure you want to remove this supplier?', 'warning', async () => {
        try {
            const res = await suppliersAPI.delete(id)
            if (res.success) {
                setSuppliers(prev => prev.filter(s => (s.id || s.supplier_id) !== id))
                closeMsgModal()
            } else {
                throw new Error(res.message)
            }
        } catch (e) {
            showMessage('Error', 'Could not delete supplier.', 'danger')
        }
    })
  }

  const handleSubmit = async () => {
    if (!selectedSupplier.name) return showMessage('Validation', 'Supplier Name is required.', 'warning')
    
    setSubmitting(true)
    try {
      const payload = {
        supplier_name: selectedSupplier.name,
        contact_person: selectedSupplier.contact_person,
        email: selectedSupplier.email,
        contact_number: selectedSupplier.contact_number,
        address: selectedSupplier.address
      }

      let res
      if (isEditMode) {
        res = await suppliersAPI.update(selectedSupplier.id, payload)
      } else {
        res = await suppliersAPI.create(payload)
      }

      if (res.success) {
        showMessage('Success', `Supplier ${isEditMode ? 'updated' : 'added'} successfully!`, 'success')
        setModalVisible(false)
        fetchSuppliers()
      } else {
        throw new Error(res.message)
      }
    } catch (e) {
      showMessage('Error', e.message || 'Operation failed.', 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CContainer fluid>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="fw-bold text-brand-navy mb-0" style={{fontFamily: 'Oswald, sans-serif'}}>SUPPLIER NETWORK</h2>
          <div className="text-muted small">Manage vendors and supply chain partners</div>
        </div>
        {/* [FIX] Branded Primary Button */}
        <button className="btn-brand btn-brand-primary" onClick={handleAdd}>
          <CIcon icon={cilUserPlus} className="me-2" /> Add Supplier
        </button>
      </div>

      {/* TOOLBAR */}
      <CCard className="border-0 shadow-sm mb-4">
        <CCardBody className="bg-light rounded p-3">
          <div className="d-flex gap-2 align-items-center">
             {/* [FIX] Branded Search Bar */}
             <div className="brand-search-wrapper" style={{maxWidth: '350px'}}>
                <span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass}/></span>
                <input 
                  type="text" 
                  className="brand-search-input" 
                  placeholder="Search suppliers..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
             </div>

             <div className="vr mx-2"></div>
             
             {/* [FIX] Branded Outline Button (Icon Only variant logic) */}
             <button 
                className="btn-brand btn-brand-outline" 
                onClick={fetchSuppliers} 
                disabled={loading}
                style={{width: '45px', padding: 0}} // Square button for icon
                title="Reload"
             >
               <CIcon icon={cilReload} spin={loading || undefined} />
             </button>

             <span className="ms-auto text-muted small fw-bold">
                {filteredSuppliers.length} Partners Active
             </span>
          </div>
        </CCardBody>
      </CCard>

      {/* TABLE */}
      <CCard className="border-0 shadow-sm">
        <CCardBody className="p-0">
          <div className="admin-table-container">
            <table className="admin-table table-hover">
              <thead>
                <tr>
                  <th className="ps-4" style={{width: '25%'}}>Supplier Name</th>
                  <th style={{width: '20%'}}>Contact Person</th>
                  <th style={{width: '25%'}}>Contact Details</th>
                  <th style={{width: '20%'}}>Location</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan="5" className="text-center py-5"><CSpinner color="primary" variant="grow"/><div className="mt-2 text-muted small">Loading partners...</div></td></tr>
                ) : filteredSuppliers.length === 0 ? (
                   <tr><td colSpan="5" className="text-center py-5">
                      <div className="opacity-25 mb-3"><CIcon icon={cilTruck} size="4xl"/></div>
                      <div className="text-muted">No suppliers found matching your search.</div>
                   </td></tr>
                ) : (
                   filteredSuppliers.map((supplier) => (
                     <tr key={supplier.id || supplier.supplier_id}>
                       <td className="ps-4">
                          <div className="fw-bold text-brand-navy">{supplier.supplier_name}</div>
                          <small className="text-muted" style={{fontSize: '0.75rem'}}>ID: {supplier.id || supplier.supplier_id}</small>
                       </td>
                       <td>
                         <div className="d-flex align-items-center">
                           <div className="icon-circle me-3"><CIcon icon={cilAddressBook} size="sm"/></div>
                           <span className="fw-semibold text-dark">{supplier.contact_person || 'N/A'}</span>
                         </div>
                       </td>
                       <td>
                         <div className="d-flex flex-column">
                           <div className="contact-info-row">
                             <CIcon icon={cilPhone} className="me-2 text-info" size="sm"/>
                             {supplier.contact_number || '--'}
                           </div>
                           <div className="contact-info-row">
                             <CIcon icon={cilEnvelopeClosed} className="me-2 text-warning" size="sm"/>
                             {supplier.email || '--'}
                           </div>
                         </div>
                       </td>
                       <td>
                         <div className="d-flex align-items-start contact-info-row">
                           <CIcon icon={cilLocationPin} className="me-2 mt-1 text-danger"/>
                           <span className="text-truncate" style={{maxWidth: '200px'}} title={supplier.address}>{supplier.address || 'No Address'}</span>
                         </div>
                       </td>
                       <td className="text-end pe-4">
                          <div className="action-btn-group">
                            {/* [FIX] Branded Small Buttons */}
                            <button className="btn-brand btn-brand-outline btn-brand-sm" onClick={() => handleEdit(supplier)} title="Edit">
                              <CIcon icon={cilPencil}/>
                            </button>
                            <button className="btn-brand btn-brand-danger btn-brand-sm" onClick={() => handleDelete(supplier.id || supplier.supplier_id)} title="Delete">
                              <CIcon icon={cilTrash}/>
                            </button>
                          </div>
                       </td>
                     </tr>
                   ))
                )}
              </tbody>
            </table>
          </div>
        </CCardBody>
      </CCard>

      {/* MODAL (Using Branded buttons in footer) */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} alignment="center" backdrop="static">
        <CModalHeader><CModalTitle className="fw-bold">{isEditMode ? 'Update Supplier' : 'Onboard New Supplier'}</CModalTitle></CModalHeader>
        <CModalBody>
           <div className="mb-3"><CFormLabel>Company Name <span className="text-danger">*</span></CFormLabel><CFormInput value={selectedSupplier.name} onChange={e => setSelectedSupplier({...selectedSupplier, name: e.target.value})} /></div>
           <CRow className="mb-3">
              <CCol md={6}><CFormLabel>Contact Person</CFormLabel><CFormInput value={selectedSupplier.contact_person} onChange={e => setSelectedSupplier({...selectedSupplier, contact_person: e.target.value})} /></CCol>
              <CCol md={6}><CFormLabel>Phone Number</CFormLabel><CFormInput value={selectedSupplier.contact_number} onChange={e => setSelectedSupplier({...selectedSupplier, contact_number: e.target.value})} /></CCol>
           </CRow>
           <div className="mb-3"><CFormLabel>Email Address</CFormLabel><CFormInput type="email" value={selectedSupplier.email} onChange={e => setSelectedSupplier({...selectedSupplier, email: e.target.value})} /></div>
           <div className="mb-3"><CFormLabel>Office Address</CFormLabel><CFormInput value={selectedSupplier.address} onChange={e => setSelectedSupplier({...selectedSupplier, address: e.target.value})} /></div>
        </CModalBody>
        <CModalFooter className="bg-light border-top-0">
          <button className="btn-brand btn-brand-outline" onClick={() => setModalVisible(false)}>Cancel</button>
          <button className="btn-brand btn-brand-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CSpinner size="sm" component="span" aria-hidden="true"/> : (isEditMode ? 'Save Changes' : 'Create Supplier')}
          </button>
        </CModalFooter>
      </CModal>

      {/* Message Modal */}
      <CModal visible={msgModal.visible} onClose={closeMsgModal} alignment="center">
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody className="p-4 text-center"><div className="fs-5">{msgModal.message}</div></CModalBody>
        <CModalFooter className="justify-content-center"><CButton color="secondary" onClick={closeMsgModal}>Close</CButton>{msgModal.onConfirm && <CButton color={msgModal.color} className="text-white" onClick={msgModal.onConfirm}>Confirm</CButton>}</CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SuppliersPage