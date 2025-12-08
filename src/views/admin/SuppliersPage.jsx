import React, { useState, useEffect, useMemo } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CCardHeader, CButton, CFormInput, CModal,
  CModalHeader, CModalTitle, CModalBody, CModalFooter, CSpinner, CFormLabel, CBadge, CTooltip,
  CPagination, CPaginationItem
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilMagnifyingGlass, cilUserPlus, cilPencil, cilTrash, cilTruck, cilPhone,
  cilEnvelopeClosed, cilLocationPin, cilReload, cilAddressBook, cilCheckCircle, cilBuilding,
  cilChevronLeft, cilChevronRight, cilWarning, cilXCircle, cilStar, cilUser, cilSave, cilX
} from '@coreui/icons'
import { suppliersAPI } from '../../utils/api'

// Import Global Brand Styles
import '../../styles/Admin.css'
import '../../styles/App.css' 
import '../../styles/SuppliersPage.css'

const ITEMS_PER_PAGE = 10;

// --- REUSABLE STAT CARD ---
const StatCard = ({ title, value, icon, gradient, textColor = 'text-white' }) => (
  <CCard className="h-100 border-0 shadow-sm overflow-hidden" style={{ background: gradient }}>
    <CCardBody className="p-4 position-relative d-flex flex-column justify-content-between">
      <div className="position-absolute" style={{ top: '-10px', right: '-15px', opacity: 0.15, transform: 'rotate(15deg)' }}>
         {React.cloneElement(icon, { height: 100, width: 100, className: textColor })}
      </div>
      <div className="position-relative z-1">
        <div className={`text-uppercase fw-bold small mb-2 ${textColor}`} style={{ opacity: 0.8, letterSpacing: '1px' }}>{title}</div>
        <div className={`fw-bold ${textColor}`} style={{ fontSize: '2rem', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
      </div>
    </CCardBody>
  </CCard>
);

const SuppliersPage = () => {
  // --- STATE ---
  const [suppliers, setSuppliers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [modalVisible, setModalVisible] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  
  const [selectedSupplier, setSelectedSupplier] = useState({
    id: null, name: '', contact_person: '', email: '', phone: '', address: ''
  })
  
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null, icon: null })

  // --- STYLES ---
  const brandHeaderStyle = { fontFamily: 'Oswald, sans-serif', letterSpacing: '1px' };

  // --- FILTERS & PAGINATION ---
  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    const lowerQ = searchQuery.toLowerCase();
    return suppliers.filter(s => 
      (s.supplier_name || '').toLowerCase().includes(lowerQ) ||
      (s.contact_person || '').toLowerCase().includes(lowerQ) ||
      (s.email || '').toLowerCase().includes(lowerQ)
    );
  }, [suppliers, searchQuery]);

  const totalItems = filteredSuppliers.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentSuppliers = filteredSuppliers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // --- DERIVED STATS ---
  const newestSupplierName = useMemo(() => {
      if (!suppliers || suppliers.length === 0) return 'N/A';
      const newest = suppliers[suppliers.length - 1]; 
      return newest.supplier_name || 'N/A';
  }, [suppliers]);

  // --- API CALLS ---
  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const res = await suppliersAPI.getAll()
      if (res.success) {
        setSuppliers(res.data || [])
      }
    } catch (err) {
      console.error(err)
      showMessage('Connection Error', 'Failed to load supplier list.', 'danger', null, cilXCircle)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSuppliers() }, [])
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // --- HANDLERS ---
  const showMessage = (title, message, color = 'info', onConfirm = null, icon = null) => {
    setMsgModal({ visible: true, title, message, color, onConfirm, icon })
  }
  
  const closeMsgModal = () => setMsgModal({ ...msgModal, visible: false })

  const handleAdd = () => {
    setIsEditMode(false)
    setSelectedSupplier({ id: null, name: '', contact_person: '', email: '', phone: '', address: '' })
    setModalVisible(true)
  }

  const handleEdit = (supplier) => {
    setIsEditMode(true)
    setSelectedSupplier({ 
        id: supplier.id || supplier.supplier_id,
        name: supplier.supplier_name, 
        contact_person: supplier.contact_person, 
        email: supplier.email,
        phone: supplier.phone || supplier.contact_number || '', 
        address: supplier.address 
    })
    setModalVisible(true)
  }

  const handleDelete = (id) => {
    showMessage('Confirm Removal', 'Are you sure you want to remove this partner? This action cannot be undone.', 'danger', async () => {
        try {
            const res = await suppliersAPI.delete(id)
            if (res.success) {
                setSuppliers(prev => prev.filter(s => (s.id || s.supplier_id) !== id))
                closeMsgModal()
            } else {
                throw new Error(res.message)
            }
        } catch (e) {
            showMessage('Error', 'Could not delete supplier.', 'danger', null, cilXCircle)
        }
    }, cilWarning)
  }

  const handleContactChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setSelectedSupplier({ ...selectedSupplier, phone: value });
  }

  const handleSubmit = async () => {
    if (!selectedSupplier.name) return showMessage('Validation', 'Supplier Name is required.', 'warning', null, cilWarning)
    
    if (selectedSupplier.phone && selectedSupplier.phone.length !== 11) {
        return showMessage('Validation', 'Contact number must be exactly 11 digits.', 'warning', null, cilWarning);
    }
    
    setSubmitting(true)
    try {
      const payload = {
        name: selectedSupplier.name,
        contact_person: selectedSupplier.contact_person,
        email: selectedSupplier.email,
        phone: selectedSupplier.phone, 
        address: selectedSupplier.address
      }

      let res
      if (isEditMode) {
        res = await suppliersAPI.update(selectedSupplier.id, payload)
      } else {
        res = await suppliersAPI.create(payload)
      }

      if (res.success) {
        showMessage('Success', `Supplier ${isEditMode ? 'updated' : 'added'} successfully!`, 'success', null, cilCheckCircle)
        setModalVisible(false)
        fetchSuppliers()
      } else {
        throw new Error(res.message)
      }
    } catch (e) {
      showMessage('Error', e.message || 'Operation failed.', 'danger', null, cilXCircle)
    } finally {
      setSubmitting(false)
    }
  }

  // --- PAGINATION RENDERER ---
  const renderPaginationItems = () => {
    const items = []; const maxVisible = 5; 
    let start = Math.max(1, currentPage - Math.floor(maxVisible/2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    const StyledPageItem = ({ active, disabled, onClick, children }) => (
      <CPaginationItem active={active} disabled={disabled} onClick={onClick} style={{cursor: disabled?'default':'pointer', backgroundColor: active?'#17334e':'transparent', borderColor: active?'#17334e':'#dee2e6', color: active?'#fff':'#17334e', fontWeight: active?'bold':'normal', marginLeft:'4px', borderRadius:'4px'}}>{children}</CPaginationItem>
    );

    items.push(<StyledPageItem key="prev" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>Math.max(1, p-1))}><CIcon icon={cilChevronLeft} size="sm"/></StyledPageItem>);
    if(start>1){ items.push(<StyledPageItem key={1} onClick={()=>setCurrentPage(1)}>1</StyledPageItem>); if(start>2) items.push(<StyledPageItem key="e1" disabled>...</StyledPageItem>); }
    for(let i=start; i<=end; i++) items.push(<StyledPageItem key={i} active={i===currentPage} onClick={()=>setCurrentPage(i)}>{i}</StyledPageItem>);
    if(end<totalPages){ if(end<totalPages-1) items.push(<StyledPageItem key="e2" disabled>...</StyledPageItem>); items.push(<StyledPageItem key={totalPages} onClick={()=>setCurrentPage(totalPages)}>{totalPages}</StyledPageItem>); }
    items.push(<StyledPageItem key="next" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages, p+1))}><CIcon icon={cilChevronRight} size="sm"/></StyledPageItem>);
    return items;
  };

  return (
    <CContainer fluid className="px-4 py-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="fw-bold text-brand-navy mb-1" style={brandHeaderStyle}>SUPPLIER NETWORK</h2>
          <div className="text-medium-emphasis fw-semibold">Manage vendors and supply chain partners</div>
        </div>
        <CButton color="primary" className="btn-brand btn-brand-primary shadow-sm" onClick={handleAdd}>
          <CIcon icon={cilUserPlus} className="me-2" /> Add Supplier
        </CButton>
      </div>

      {/* STAT CARDS */}
      <CRow className="mb-4 g-3">
        <CCol sm={6} lg={6}>
            <StatCard 
                title="Total Partners" 
                value={suppliers.length.toString()} 
                icon={<CIcon icon={cilBuilding}/>} 
                gradient="linear-gradient(135deg, #17334e 0%, #0f2438 100%)" 
            />
        </CCol>
        <CCol sm={6} lg={6}>
            <StatCard 
                title="Newest Partner" 
                value={newestSupplierName} 
                icon={<CIcon icon={cilStar}/>} 
                gradient="linear-gradient(135deg, #2eb85c 0%, #1b9e3e 100%)" 
            />
        </CCol>
      </CRow>

      {/* MAIN TABLE CARD */}
      <CCard className="mb-4 border-0 shadow-sm overflow-hidden">
        {/* COMMAND HEADER */}
        <CCardHeader className="bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold text-brand-navy" style={{fontFamily: 'Oswald', letterSpacing: '1px', fontSize: '1.25rem'}}>
                PARTNER LIST
            </h5>
            <div className="d-flex gap-2">
                <div className="bg-light rounded px-3 py-2 d-flex align-items-center border" style={{minWidth: '300px'}}>
                    <CIcon icon={cilMagnifyingGlass} className="text-muted me-2"/>
                    <input className="border-0 bg-transparent w-100" style={{outline: 'none', fontSize: '0.9rem'}} placeholder="Search suppliers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <button className="btn btn-light border" onClick={fetchSuppliers} title="Reload"><CIcon icon={cilReload}/></button>
            </div>
        </CCardHeader>

        <CCardBody className="p-0">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead className="bg-brand-navy text-white">
                <tr>
                  <th className="ps-4 text-white" style={{width: '25%', position: 'sticky', top: 0}}>Supplier Name</th>
                  <th className="text-white" style={{width: '20%', position: 'sticky', top: 0}}>Contact Person</th>
                  <th className="text-white" style={{width: '25%', position: 'sticky', top: 0}}>Contact Details</th>
                  <th className="text-white" style={{width: '20%', position: 'sticky', top: 0}}>Location</th>
                  <th className="text-end pe-4 text-white" style={{position: 'sticky', top: 0}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan="5" className="text-center py-5"><CSpinner color="primary" variant="grow"/><div className="mt-2 text-muted small">Loading partners...</div></td></tr>
                ) : currentSuppliers.length === 0 ? (
                   <tr><td colSpan="5" className="text-center py-5">
                      <div className="opacity-25 mb-3"><CIcon icon={cilTruck} size="4xl"/></div>
                      <div className="text-muted">No suppliers found matching your search.</div>
                   </td></tr>
                ) : (
                   currentSuppliers.map((supplier) => (
                     <tr key={supplier.id || supplier.supplier_id}>
                       <td className="ps-4">
                          <div className="fw-bold text-brand-navy fs-6">{supplier.supplier_name}</div>
                          <CBadge color="light" className="text-muted border mt-1 font-monospace" style={{fontSize: '0.65rem'}}>ID: {supplier.id || supplier.supplier_id}</CBadge>
                       </td>
                       <td>
                         <div className="d-flex align-items-center">
                           <div className="me-3 bg-light text-brand-blue rounded-circle d-flex align-items-center justify-content-center border" style={{width: '36px', height: '36px'}}>
                              <CIcon icon={cilUserPlus} size="sm"/>
                           </div>
                           <span className="fw-semibold text-dark">{supplier.contact_person || 'N/A'}</span>
                         </div>
                       </td>
                       <td>
                         <div className="d-flex flex-column gap-1">
                           <div className="d-flex align-items-center text-dark small fw-semibold">
                             <CIcon icon={cilPhone} className="me-2 text-success" size="sm"/>
                             {supplier.phone || supplier.contact_number || '--'}
                           </div>
                           <div className="d-flex align-items-center text-muted small">
                             <CIcon icon={cilEnvelopeClosed} className="me-2 text-secondary" size="sm"/>
                             {supplier.email || '--'}
                           </div>
                         </div>
                       </td>
                       <td>
                         <div className="d-flex align-items-start text-dark small">
                           <CIcon icon={cilLocationPin} className="me-2 mt-1 text-danger"/>
                           <span className="text-truncate" style={{maxWidth: '200px'}} title={supplier.address}>{supplier.address || 'No Address'}</span>
                         </div>
                       </td>
                       <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-2">
                            <CTooltip content="Edit Details">
                                <CButton 
                                    size="sm" 
                                    className="text-white shadow-sm d-flex align-items-center justify-content-center" 
                                    style={{width: '32px', height: '32px', padding: 0, backgroundColor: '#17334e', borderColor: '#17334e'}}
                                    onClick={() => handleEdit(supplier)}
                                >
                                    <CIcon icon={cilPencil} size="sm"/>
                                </CButton>
                            </CTooltip>
                            <CTooltip content="Remove Partner">
                                <CButton 
                                    size="sm" 
                                    color="danger" 
                                    className="text-white shadow-sm d-flex align-items-center justify-content-center" 
                                    style={{width: '32px', height: '32px', padding: 0}}
                                    onClick={() => handleDelete(supplier.id || supplier.supplier_id)}
                                >
                                    <CIcon icon={cilTrash} size="sm"/>
                                </CButton>
                            </CTooltip>
                          </div>
                       </td>
                     </tr>
                   ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
             <span className="small text-muted fw-semibold">Showing {currentSuppliers.length} of {totalItems} partners</span>
             <CPagination className="mb-0 justify-content-end">{renderPaginationItems()}</CPagination>
          </div>
        </CCardBody>
      </CCard>

      {/* --- ADD/EDIT MODAL (FIXED VISIBILITY) --- */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} alignment="center" backdrop="static" size="lg">
        <CModalHeader closeButton={false} style={{backgroundColor: '#17334e', borderBottom: '3px solid #f1ce44'}}>
            <div className="d-flex w-100 justify-content-between align-items-center">
                <CModalTitle component="span" className="text-white" style={{...brandHeaderStyle, fontSize: '1.25rem', color: '#ffffff !important'}}>
                    <span style={{color: '#ffffff'}}> {/* Wrapper to force color */}
                        <CIcon icon={isEditMode ? cilPencil : cilUserPlus} className="me-2 text-warning"/>
                        {isEditMode ? 'UPDATE PARTNER' : 'ONBOARD PARTNER'}
                    </span>
                </CModalTitle>
                <button type="button" className="btn btn-link p-0" onClick={() => setModalVisible(false)}>
                    <CIcon icon={cilX} size="lg" style={{color: '#ffffff'}}/>
                </button>
            </div>
        </CModalHeader>
        <CModalBody className="p-4 bg-light">
           <div className="bg-white p-4 rounded shadow-sm border">
               <div className="d-flex align-items-center mb-4">
                   <div className="p-3 bg-light rounded-circle border me-3 text-brand-navy"><CIcon icon={cilBuilding} size="xl"/></div>
                   <div>
                       <h6 className="fw-bold text-dark mb-1">Company Information</h6>
                       <div className="small text-muted">Enter the official details for this supply partner.</div>
                   </div>
               </div>

               <div className="mb-3">
                   <CFormLabel htmlFor="suppName" className="small fw-bold text-muted text-uppercase">Supplier Name <span className="text-danger">*</span></CFormLabel>
                   <div className="input-group">
                       <span className="input-group-text bg-white text-muted"><CIcon icon={cilBuilding}/></span>
                       <CFormInput id="suppName" className="fw-bold border-start-0" value={selectedSupplier.name} onChange={e => setSelectedSupplier({...selectedSupplier, name: e.target.value})} placeholder="e.g. Bosch Automotive" autoFocus />
                   </div>
               </div>

               <CRow className="mb-3 g-3">
                  <CCol md={6}>
                      <CFormLabel htmlFor="contPerson" className="small fw-bold text-muted text-uppercase">Point of Contact</CFormLabel>
                      <div className="input-group">
                          <span className="input-group-text bg-white text-muted"><CIcon icon={cilUser}/></span>
                          <CFormInput id="contPerson" className="border-start-0" value={selectedSupplier.contact_person} onChange={e => setSelectedSupplier({...selectedSupplier, contact_person: e.target.value})} placeholder="e.g. John Doe" />
                      </div>
                  </CCol>
                  <CCol md={6}>
                      <CFormLabel htmlFor="phoneNum" className="small fw-bold text-muted text-uppercase">Contact No.</CFormLabel>
                      <div className="input-group">
                          <span className="input-group-text bg-white text-muted"><CIcon icon={cilPhone}/></span>
                          <CFormInput id="phoneNum" className="border-start-0 font-monospace" value={selectedSupplier.phone} onChange={handleContactChange} placeholder="09123456789" maxLength={11} />
                      </div>
                  </CCol>
               </CRow>

               <div className="mb-3">
                   <CFormLabel htmlFor="emailAdd" className="small fw-bold text-muted text-uppercase">Email Address</CFormLabel>
                   <div className="input-group">
                       <span className="input-group-text bg-white text-muted"><CIcon icon={cilEnvelopeClosed}/></span>
                       <CFormInput id="emailAdd" type="email" className="border-start-0" value={selectedSupplier.email} onChange={e => setSelectedSupplier({...selectedSupplier, email: e.target.value})} placeholder="e.g. purchasing@company.com" />
                   </div>
               </div>

               <div className="mb-0">
                   <CFormLabel htmlFor="offAddr" className="small fw-bold text-muted text-uppercase">Address</CFormLabel>
                   <div className="input-group">
                       <span className="input-group-text bg-white text-muted"><CIcon icon={cilLocationPin}/></span>
                       <CFormInput id="offAddr" className="border-start-0" value={selectedSupplier.address} onChange={e => setSelectedSupplier({...selectedSupplier, address: e.target.value})} placeholder="Full business address" />
                   </div>
               </div>
           </div>
        </CModalBody>
        <CModalFooter className="bg-white border-top pt-3 pb-3">
          <CButton color="secondary" variant="ghost" onClick={() => setModalVisible(false)} className="fw-bold text-medium-emphasis">CANCEL</CButton>
          <CButton style={{backgroundColor: '#17334e', borderColor: '#17334e'}} className="text-white fw-bold px-4 shadow-sm d-flex align-items-center" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CSpinner size="sm" component="span" aria-hidden="true" className="me-2"/> : <CIcon icon={cilSave} className="me-2"/>} {isEditMode ? 'SAVE CHANGES' : 'CREATE PARTNER'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* --- MESSAGE MODAL --- */}
      <CModal visible={msgModal.visible} onClose={closeMsgModal} alignment="center">
        <CModalBody className="p-5 text-center">
            {msgModal.icon ? (
                <div className={`mb-3 text-${msgModal.color}`}><CIcon icon={msgModal.icon} size="4xl" /></div>
            ) : (
                <div className={`mb-3 text-${msgModal.color}`}><CIcon icon={cilWarning} size="4xl" /></div>
            )}
            <h4 className="fw-bold mb-2" style={{fontFamily: 'Oswald, sans-serif'}}>{msgModal.title}</h4>
            <p className="text-muted mb-4">{msgModal.message}</p>
            <div className="d-flex justify-content-center gap-2">
                {msgModal.onConfirm ? (
                    <>
                        <CButton color="secondary" variant="ghost" onClick={closeMsgModal}>Cancel</CButton>
                        <CButton color={msgModal.color} className="text-white fw-bold px-4" onClick={msgModal.onConfirm}>Confirm</CButton>
                    </>
                ) : (
                    <CButton color="secondary" onClick={closeMsgModal}>Close</CButton>
                )}
            </div>
        </CModalBody>
      </CModal>
    </CContainer>
  )
}

export default SuppliersPage