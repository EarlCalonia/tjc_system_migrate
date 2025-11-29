import React, { useState, useEffect } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CButton,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CInputGroup,
  CInputGroupText,
  CWidgetStatsF,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass,
  cilPencil,
  cilInbox,
  cilCheckCircle,
  cilWarning,
  cilXCircle,
  cilList,
  cilPlus,
  cilImage
} from '@coreui/icons'
import { inventoryAPI, serialNumberAPI, suppliersAPI } from '../../utils/api'

// --- CONFIGURATION (Fixed) ---
const ASSET_URL = 'http://localhost:5000'

const InventoryPage = () => {
  // --- STATE ---
  const [products, setProducts] = useState([])
  const [suppliersList, setSuppliersList] = useState([])
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [stockInModal, setStockInModal] = useState({ open: false, product: null })
  
  const [stockInForm, setStockInForm] = useState({
    supplierId: '',
    receivedBy: typeof window !== 'undefined' ? window.localStorage.getItem('username') || '' : '',
    serialNumbers: [''],
    receivedDate: new Date().toISOString().slice(0, 16),
    quantity: 1,
  })

  const [viewSerialsModal, setViewSerialsModal] = useState({ open: false, product: null, serials: [] })
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })

  // --- EFFECTS ---
  useEffect(() => {
    loadProducts()
    loadInventoryStats()
    loadSuppliers()
  }, [])

  // --- HELPERS ---
  const getProductImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${ASSET_URL}${cleanPath}`
  }

  const showMessage = (title, message, color = 'info', onConfirm = null) => {
    setMsgModal({ visible: true, title, message, color, onConfirm })
  }
  const closeMsgModal = () => setMsgModal({ ...msgModal, visible: false })

  // --- API ---
  const loadProducts = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (searchQuery) filters.search = searchQuery
      if (selectedCategory !== 'All') filters.category = selectedCategory
      if (selectedStatus !== 'All') filters.status = selectedStatus
      
      const response = await inventoryAPI.getProducts(filters)
      if (response.success) {
        const productsWithInventory = (response.data.products || []).map((product) => ({
          ...product,
          reorderPoint: product.reorder_point ?? product.reorderPoint ?? 10,
          requires_serial: !!product.requires_serial
        }))
        setProducts(productsWithInventory)
      }
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }

  const loadInventoryStats = async () => {
    try {
      const response = await inventoryAPI.getStats()
      if (response.success) setInventoryStats(response.data)
    } catch (error) { console.error(error) }
  }

  const loadSuppliers = async () => {
    try {
      const res = await suppliersAPI.getAll()
      if (res.success) setSuppliersList(res.data || [])
    } catch (e) { console.error(e) }
  }

  // --- HANDLERS ---
  const handleSingleStockInSubmit = async () => {
    if (!stockInForm.supplierId) return showMessage('Error', 'Please select a supplier', 'warning')
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate
      showMessage('Success', 'Stock added successfully.', 'success', () => {
        setStockInModal({ ...stockInModal, open: false })
        loadProducts()
        loadInventoryStats()
      })
    } catch (e) { showMessage('Error', e.message, 'danger') } 
    finally { setIsSubmitting(false) }
  }

  const handleViewSerials = async (product) => {
    try {
      const res = await serialNumberAPI.getAvailableSerials(product.product_id)
      if (res.success) setViewSerialsModal({ open: true, product, serials: res.data || [] })
    } catch (e) { showMessage('Error', 'Failed to load serials', 'danger') }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
    const stock = product.stock || 0
    const reorderPoint = product.reorderPoint
    let matchesStatus = true
    if (selectedStatus === 'In Stock') matchesStatus = stock > reorderPoint
    if (selectedStatus === 'Low on Stock') matchesStatus = stock <= reorderPoint && stock > 0
    if (selectedStatus === 'Out of Stock') matchesStatus = stock === 0
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <CContainer fluid>
      <div className="mb-4">
        <h2 className="fw-bold text-dark mb-1">Inventory Management</h2>
        <div className="text-medium-emphasis small">Monitor stock levels</div>
      </div>

      <CRow className="mb-4 g-3">
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100" color="primary" icon={<CIcon icon={cilInbox} height={24} />} title="Total Products" value={inventoryStats.totalProducts.toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100" color="success" icon={<CIcon icon={cilCheckCircle} height={24} />} title="In Stock" value={inventoryStats.inStock.toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100" color="warning" icon={<CIcon icon={cilWarning} height={24} />} title="Low Stock" value={inventoryStats.lowStock.toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100" color="danger" icon={<CIcon icon={cilXCircle} height={24} />} title="Out of Stock" value={inventoryStats.outOfStock.toString()} /></CCol>
      </CRow>

      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="p-0">
          <div className="p-3 border-bottom bg-light d-flex flex-wrap gap-3 align-items-center justify-content-between">
             <div className="d-flex gap-2 flex-grow-1" style={{maxWidth: '600px'}}>
                <CInputGroup size="sm">
                  <CInputGroupText className="bg-white border-end-0"><CIcon icon={cilMagnifyingGlass} /></CInputGroupText>
                  <CFormInput className="border-start-0" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </CInputGroup>
                <CFormSelect size="sm" style={{maxWidth: '150px'}} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                  <option value="All">All Categories</option>
                  {[...new Set(products.map(p => p.category))].map(c => <option key={c} value={c}>{c}</option>)}
                </CFormSelect>
                <CFormSelect size="sm" style={{maxWidth: '150px'}} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="All">All Status</option><option value="In Stock">In Stock</option><option value="Low on Stock">Low Stock</option><option value="Out of Stock">Out of Stock</option>
                </CFormSelect>
             </div>
             <CButton color="success" className="text-white fw-bold btn-sm"><CIcon icon={cilPlus} className="me-1"/> Bulk Stock In</CButton>
          </div>

          <div className="inventory-table-container" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <table className="table inventory-table table-hover mb-0 align-middle">
              <thead className="bg-light sticky-top">
                <tr>
                  <th style={{width: '35%'}}>Product</th>
                  <th style={{width: '15%'}}>Category</th>
                  <th className="text-center" style={{width: '10%'}}>Stock</th>
                  <th className="text-center" style={{width: '15%'}}>Status</th>
                  <th className="text-end" style={{width: '25%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">Loading inventory...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">No products found.</td></tr>
                ) : (
                  filteredProducts.map((p) => {
                     const imgUrl = getProductImageUrl(p.image)
                     return (
                      <tr key={p.product_id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div className="inventory-thumbnail-wrapper" style={{width: '48px', height: '48px', flexShrink: 0, borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'hidden', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                               {imgUrl ? (
                                 <img src={imgUrl} alt={p.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} />
                               ) : null}
                               <div style={{display: imgUrl ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9ecef'}}>
                                  <CIcon icon={cilImage} className="text-secondary"/>
                               </div>
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{p.name}</div>
                              <small className="text-muted">{p.brand} | ID: {p.product_id}</small>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-light text-dark border">{p.category}</span></td>
                        <td className="text-center fw-bold fs-6">{p.stock}</td>
                        <td className="text-center">
                           {p.stock === 0 ? <span className="status-badge out-of-stock">Out of Stock</span> : p.stock <= p.reorderPoint ? <span className="status-badge low-stock">Low Stock</span> : <span className="status-badge in-stock">In Stock</span>}
                        </td>
                        <td className="text-end">
                           <div className="d-flex justify-content-end gap-2">
                              <CButton size="sm" color="info" variant="ghost" title="Edit" onClick={() => { setSelectedProduct(p); setIsModalOpen(true); }}><CIcon icon={cilPencil} size="sm"/></CButton>
                              <CButton size="sm" color="success" variant="ghost" title="Stock In" onClick={() => { setStockInModal({open:true, product:p}); setStockInForm({...stockInForm, quantity: 1}); }}><CIcon icon={cilPlus} size="sm"/></CButton>
                              {p.requires_serial && <CButton size="sm" color="secondary" variant="ghost" title="Serials" onClick={() => handleViewSerials(p)}><CIcon icon={cilList} size="sm"/></CButton>}
                           </div>
                        </td>
                      </tr>
                     )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CCardBody>
      </CCard>

      <CModal visible={msgModal.visible} onClose={closeMsgModal} alignment="center">
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={closeMsgModal}>Close</CButton>{msgModal.onConfirm && <CButton color={msgModal.color} onClick={msgModal.onConfirm}>Confirm</CButton>}</CModalFooter>
      </CModal>
      <CModal visible={stockInModal.open} onClose={() => setStockInModal({...stockInModal, open: false})}>
        <CModalHeader><CModalTitle>Stock In: {stockInModal.product?.name}</CModalTitle></CModalHeader>
        <CModalBody>
           <div className="mb-3"><CFormLabel>Supplier</CFormLabel><CFormSelect value={stockInForm.supplierId} onChange={(e) => setStockInForm({...stockInForm, supplierId: e.target.value})}><option value="">Select Supplier</option>{suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</CFormSelect></div>
           <div className="mb-3"><CFormLabel>Quantity</CFormLabel><CFormInput type="number" min="1" value={stockInForm.quantity} onChange={(e) => setStockInForm({...stockInForm, quantity: parseInt(e.target.value) || 1})} /></div>
        </CModalBody>
        <CModalFooter><CButton color="primary" onClick={handleSingleStockInSubmit} disabled={isSubmitting}>Confirm</CButton></CModalFooter>
      </CModal>
      <CModal visible={viewSerialsModal.open} onClose={() => setViewSerialsModal({...viewSerialsModal, open: false})}>
         <CModalHeader><CModalTitle>Serial Numbers</CModalTitle></CModalHeader>
         <CModalBody>{viewSerialsModal.serials.length > 0 ? <ul className="list-group">{viewSerialsModal.serials.map((s, i) => <li key={i} className="list-group-item">{s.serial_number}</li>)}</ul> : <p className="text-center text-muted">No serials found.</p>}</CModalBody>
      </CModal>
    </CContainer>
  )
}

export default InventoryPage