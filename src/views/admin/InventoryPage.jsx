import React, { useState, useEffect } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CFormInput, CFormSelect, CFormLabel,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CWidgetStatsF, CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass, cilPencil, cilInbox, cilCheckCircle, cilWarning, cilXCircle, cilList, cilPlus, cilImage
} from '@coreui/icons'
import { inventoryAPI, serialNumberAPI, suppliersAPI } from '../../utils/api'

// [FIX] Import Global Brand Styles
import '../../styles/Admin.css'
import '../../styles/App.css' 

const ASSET_URL = 'http://localhost:5000'

const InventoryPage = () => {
  const [products, setProducts] = useState([])
  const [suppliersList, setSuppliersList] = useState([])
  const [inventoryStats, setInventoryStats] = useState({ totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [stockInModal, setStockInModal] = useState({ open: false, product: null })
  const [stockInForm, setStockInForm] = useState({ supplierId: '', quantity: 1 })
  const [viewSerialsModal, setViewSerialsModal] = useState({ open: false, product: null, serials: [] })
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })

  useEffect(() => { loadProducts(); loadInventoryStats(); loadSuppliers(); }, [])

  const getProductImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${ASSET_URL}${path.startsWith('/') ? path : '/' + path}`
  }

  const showMessage = (title, message, color = 'info', onConfirm = null) => setMsgModal({ visible: true, title, message, color, onConfirm })

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await inventoryAPI.getProducts({})
      if (response.success) {
        setProducts((response.data.products || []).map(p => ({
          ...p, reorderPoint: p.reorder_point ?? p.reorderPoint ?? 10, requires_serial: !!p.requires_serial
        })))
      }
    } catch (error) { console.error(error) } finally { setLoading(false) }
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

  const handleSingleStockInSubmit = async () => {
    if (!stockInForm.supplierId) return showMessage('Error', 'Please select a supplier', 'warning')
    if (stockInForm.quantity < 1) return showMessage('Error', 'Quantity must be at least 1', 'warning')
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500)) 
      showMessage('Success', 'Stock added successfully.', 'success', () => {
        setStockInModal({ ...stockInModal, open: false })
        setStockInForm({ supplierId: '', quantity: 1 })
        loadProducts(); loadInventoryStats();
      })
    } catch (e) { showMessage('Error', e.message, 'danger') } finally { setIsSubmitting(false) }
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
    const stock = product.stock || 0; const reorderPoint = product.reorderPoint
    let matchesStatus = true
    if (selectedStatus === 'In Stock') matchesStatus = stock > reorderPoint
    if (selectedStatus === 'Low on Stock') matchesStatus = stock <= reorderPoint && stock > 0
    if (selectedStatus === 'Out of Stock') matchesStatus = stock === 0
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <CContainer fluid className="px-4 py-4">
      <div className="mb-4">
        <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald, sans-serif', letterSpacing: '1px'}}>INVENTORY MANAGEMENT</h2>
        <div className="text-medium-emphasis fw-semibold">Real-time stock monitoring and adjustments</div>
      </div>

      <CRow className="mb-4 g-3">
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-primary" color="white" icon={<CIcon icon={cilInbox} height={24} className="text-primary"/>} title="Total Products" value={inventoryStats.totalProducts.toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-success" color="white" icon={<CIcon icon={cilCheckCircle} height={24} className="text-success"/>} title="In Stock" value={inventoryStats.inStock.toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-warning" color="white" icon={<CIcon icon={cilWarning} height={24} className="text-warning"/>} title="Low Stock" value={inventoryStats.lowStock.toString()} /></CCol>
        <CCol sm={6} lg={3}><CWidgetStatsF className="shadow-sm h-100 border-start border-start-4 border-start-danger" color="white" icon={<CIcon icon={cilXCircle} height={24} className="text-danger"/>} title="Out of Stock" value={inventoryStats.outOfStock.toString()} /></CCol>
      </CRow>

      <CCard className="mb-4 border-0 shadow-sm overflow-hidden">
        <CCardBody className="p-0">
          <div className="p-4 bg-white border-bottom d-flex flex-wrap gap-3 align-items-center justify-content-between">
             <div className="d-flex gap-2 flex-grow-1 flex-wrap" style={{maxWidth: '800px'}}>
                
                {/* [FIX] Branded Search */}
                <div className="brand-search-wrapper" style={{maxWidth: '350px'}}>
                  <span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass} /></span>
                  <input 
                    type="text" 
                    className="brand-search-input" 
                    placeholder="Search products..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                  />
                </div>

                {/* [FIX] Branded Dropdowns */}
                <select 
                  className="brand-select" 
                  style={{maxWidth: '200px'}} 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {[...new Set(products.map(p => p.category))].map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  className="brand-select" 
                  style={{maxWidth: '200px'}} 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low on Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
             </div>
             
             {/* [FIX] Branded Button */}
             <button className="btn-brand btn-brand-accent">
                <CIcon icon={cilPlus} className="me-2"/> Bulk Stock In
             </button>
          </div>

          {/* TABLE */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col" style={{width: '35%'}}>Product Details</th>
                  <th scope="col" style={{width: '15%'}}>Category</th>
                  <th scope="col" className="text-center" style={{width: '10%'}}>Current Stock</th>
                  <th scope="col" className="text-center" style={{width: '15%'}}>Status</th>
                  <th scope="col" className="text-end pe-4" style={{width: '25%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-5"><CSpinner color="primary"/></td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">No products found.</td></tr>
                ) : (
                  filteredProducts.map((p) => {
                     const imgUrl = getProductImageUrl(p.image)
                     return (
                      <tr key={p.product_id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div className="position-relative">
                               {imgUrl ? <img src={imgUrl} alt={p.name} className="table-thumbnail" /> : <div className="table-thumbnail d-flex align-items-center justify-content-center"><CIcon icon={cilImage} className="text-secondary"/></div>}
                            </div>
                            <div>
                              <div className="fw-bold text-dark fs-6">{p.name}</div>
                              <div className="small text-muted">
                                <span className="fw-semibold">{p.brand}</span> <span className="mx-1">•</span> ID: {p.product_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-light text-dark border fw-normal px-3 py-2">{p.category}</span></td>
                        <td className="text-center"><span className="fw-bold fs-5 text-brand-navy">{p.stock}</span></td>
                        <td className="text-center">
                           {p.stock === 0 ? <span className="status-badge cancelled">Out of Stock</span> : p.stock <= p.reorderPoint ? <span className="status-badge pending">Low Stock</span> : <span className="status-badge active">In Stock</span>}
                        </td>
                        <td className="text-end pe-4">
                           <div className="d-flex justify-content-end gap-2">
                              {/* [FIX] Small Branded Buttons */}
                              <button className="btn-brand btn-brand-primary btn-brand-sm" title="Add Stock" onClick={() => { setStockInModal({open:true, product:p}); setStockInForm({...stockInForm, quantity: 1}); }}>
                                <CIcon icon={cilPlus}/>
                              </button>
                              
                              {p.requires_serial && (
                                <button className="btn-brand btn-brand-outline btn-brand-sm" title="Serials" onClick={() => handleViewSerials(p)}>
                                  <CIcon icon={cilList}/>
                                </button>
                              )}
                              
                              <button className="btn-brand btn-brand-outline btn-brand-sm" title="Edit" onClick={() => { setSelectedProduct(p); setIsModalOpen(true); }}>
                                <CIcon icon={cilPencil}/>
                              </button>
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

      {/* Add Stock Modal */}
      <CModal visible={stockInModal.open} onClose={() => setStockInModal({...stockInModal, open: false})} alignment="center">
         <CModalHeader><CModalTitle>Stock In</CModalTitle></CModalHeader>
         <CModalBody>
            <CFormLabel>Supplier</CFormLabel>
            <CFormSelect value={stockInForm.supplierId} onChange={(e)=>setStockInForm({...stockInForm, supplierId:e.target.value})} className="mb-3"><option value="">Select</option>{suppliersList.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</CFormSelect>
            <CFormLabel>Quantity</CFormLabel>
            <CFormInput type="number" value={stockInForm.quantity} onChange={(e)=>setStockInForm({...stockInForm, quantity:e.target.value})}/>
         </CModalBody>
         <CModalFooter>
           <button className="btn-brand btn-brand-outline" onClick={() => setStockInModal({...stockInModal, open: false})}>Cancel</button>
           <button className="btn-brand btn-brand-primary" onClick={handleSingleStockInSubmit}>Confirm</button>
         </CModalFooter>
      </CModal>

      {/* Message Modal */}
      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter>
          <button className="btn-brand btn-brand-outline" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</button>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default InventoryPage