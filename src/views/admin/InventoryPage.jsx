import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CButton, CFormInput, CFormSelect, CFormLabel,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CInputGroup, CInputGroupText, CWidgetStatsF, CSpinner, CBadge, CTooltip
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass, cilPencil, cilInbox, cilCheckCircle, cilWarning, cilXCircle, cilList, cilPlus, cilImage, cilChevronLeft, cilChevronRight, cilBarcode, cilSave, cilTrash, cilTruck, cilSearch
} from '@coreui/icons'
import { inventoryAPI, serialNumberAPI, suppliersAPI, productAPI } from '../../utils/api'

// Import Global Brand Styles
import '../../styles/Admin.css'
import '../../styles/App.css' 

const ASSET_URL = 'http://localhost:5000'
const ITEMS_PER_PAGE = 10; 

const InventoryPage = () => {
  // --- STATE ---
  const [products, setProducts] = useState([])
  const [suppliersList, setSuppliersList] = useState([])
  const [inventoryStats, setInventoryStats] = useState({ totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingSerials, setLoadingSerials] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  
  // --- RECEIVE STOCK (BULK) STATE ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [manifestItems, setManifestItems] = useState([]) 
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [searchedProducts, setSearchedProducts] = useState([])
  const [selectedManifestProduct, setSelectedManifestProduct] = useState(null)
  
  // Simplified Form
  const [globalSupplierId, setGlobalSupplierId] = useState('')
  const [itemForm, setItemForm] = useState({ quantity: 1, serials: [] })
  const [serialInput, setSerialInput] = useState('')
  const serialInputRef = useRef(null)

  // Check Manifest Serials Modal
  const [checkManifestSnModal, setCheckManifestSnModal] = useState({ open: false, items: [], productName: '' })
  
  // Other Modals
  const [viewSerialsModal, setViewSerialsModal] = useState({ open: false, product: null, serials: [] })
  const [editModal, setEditModal] = useState({ open: false, product: null, reorderPoint: 10 })
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })
  
  const [stockInModal, setStockInModal] = useState({ open: false, product: null }) 
  const [stockInForm, setStockInForm] = useState({ supplierId: '', quantity: 1 })

  // --- LIFECYCLE ---
  useEffect(() => { loadInventoryStats(); loadSuppliers(); }, [])

  useEffect(() => {
     const t = setTimeout(() => { loadProducts(); }, 300);
     return () => clearTimeout(t);
  }, [currentPage, searchQuery, selectedCategory, selectedStatus]);

  // Product Search Debounce
  useEffect(() => {
    if (!productSearchTerm) {
        setSearchedProducts([]);
        return;
    }
    if (selectedManifestProduct && productSearchTerm === selectedManifestProduct.name) return;

    const t = setTimeout(async () => {
        try {
            const res = await inventoryAPI.getProducts({ search: productSearchTerm, limit: 5 });
            if (res.success) setSearchedProducts(res.data.products || []);
        } catch (e) { console.error(e); }
    }, 400);
    return () => clearTimeout(t);
  }, [productSearchTerm, selectedManifestProduct]);

  // --- HELPERS ---
  const getProductImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${ASSET_URL}${path.startsWith('/') ? path : '/' + path}`
  }

  const showMessage = (title, message, color = 'info', onConfirm = null) => setMsgModal({ visible: true, title, message, color, onConfirm })

  const renderStatusBadge = (status) => {
    if (status === 'Out of Stock') return <CBadge color="danger" shape="rounded-pill">Out of Stock</CBadge>
    if (status === 'Low Stock') return <CBadge color="warning" shape="rounded-pill">Low Stock</CBadge>
    return <CBadge color="success" shape="rounded-pill">In Stock</CBadge>
  }

  // --- API CALLS ---
  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const filters = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined
      }

      const response = await inventoryAPI.getProducts(filters)
      
      if (response.success) {
        let fetchedProducts = response.data.products || [];
        const pagination = response.data.pagination || {};
        const total = pagination.totalProducts || response.data.total || fetchedProducts.length;
        
        setProducts(fetchedProducts.map(p => ({
          ...p, 
          reorderPoint: p.reorder_point ?? p.reorderPoint ?? 10, 
          requires_serial: !!p.requires_serial,
          computedStatus: (p.stock || 0) === 0 ? 'Out of Stock' : (p.stock || 0) <= (p.reorder_point || 10) ? 'Low Stock' : 'In Stock'
        })))
        
        setTotalItems(total);
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1);
      }
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }, [currentPage, searchQuery, selectedCategory, selectedStatus])

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

  // --- BULK HANDLERS ---
  const handleAddToManifest = () => {
      if (!selectedManifestProduct) return showMessage('Validation', 'Please search and select a product first.', 'warning');
      if (itemForm.quantity < 1) return showMessage('Validation', 'Quantity must be at least 1.', 'warning');
      
      if (selectedManifestProduct.requires_serial) {
          if (itemForm.serials.length !== parseInt(itemForm.quantity)) {
              return showMessage('Serial Mismatch', `You set quantity to ${itemForm.quantity} but entered ${itemForm.serials.length} serials.`, 'warning');
          }
      }

      const newItem = {
          ...selectedManifestProduct,
          addQuantity: parseInt(itemForm.quantity),
          newSerials: itemForm.serials
      };

      setManifestItems(prev => [newItem, ...prev]); 
      
      // Reset Item Form
      setSelectedManifestProduct(null);
      setProductSearchTerm('');
      setItemForm({ quantity: 1, serials: [] });
      setSerialInput('');
      setSearchedProducts([]);
  }

  const handleRemoveFromManifest = (index) => {
      setManifestItems(prev => prev.filter((_, i) => i !== index));
  }
  
  const handleCheckManifestSerials = (item) => {
      setCheckManifestSnModal({
          open: true,
          items: item.newSerials,
          productName: item.name
      });
  }

  // [CRITICAL FIX] Updated Payload Keys to match Backend Controller (productId)
  const handleBulkSubmit = async () => {
      if (!globalSupplierId) return showMessage('Missing Info', 'Please select the Supplier for this shipment.', 'warning');
      if (manifestItems.length === 0) return showMessage('Empty', 'No items in shipment list.', 'warning');
      
      setIsSubmitting(true);
      try {
          const payload = {
              supplier: globalSupplierId, 
              receivedBy: localStorage.getItem('username') || 'Admin', 
              products: manifestItems.map(item => ({ 
                  // [FIX] Mapped to 'productId' (CamelCase) for backend compatibility
                  productId: item.product_id, 
                  quantity: item.addQuantity,
                  serialNumbers: item.newSerials // [FIX] Mapped to 'serialNumbers'
              }))
          };

          await inventoryAPI.bulkStockIn(payload);
          
          showMessage('Success', 'Shipment received and inventory updated!', 'success', () => {
              setBulkModalOpen(false);
              setManifestItems([]);
              setGlobalSupplierId('');
              loadProducts();
              loadInventoryStats();
          });
      } catch (e) {
          showMessage('Error', e.message || 'Failed to process shipment.', 'danger');
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleSerialInput = (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const sn = serialInput.trim().toUpperCase();
          if (!sn) return;
          if (itemForm.serials.includes(sn)) return showMessage('Duplicate', 'Serial already entered.', 'warning');
          if (itemForm.serials.length >= parseInt(itemForm.quantity)) return showMessage('Limit', 'Quantity limit reached.', 'warning');
          
          setItemForm(prev => ({ ...prev, serials: [...prev.serials, sn] }));
          setSerialInput('');
      }
  }

  // --- OTHER HANDLERS ---
  const handleViewSerials = async (product) => {
    setViewSerialsModal({ open: true, product, serials: [] }) 
    setLoadingSerials(true)
    try {
      const res = await serialNumberAPI.getAvailableSerials(product.product_id)
      if (res.success) setViewSerialsModal(prev => ({ ...prev, serials: res.data || [] }))
    } catch (e) { showMessage('Error', 'Failed to load serials', 'danger') } 
    finally { setLoadingSerials(false) }
  }
  
  const handleSingleStockInSubmit = async () => {
    setStockInModal({ open: false, product: null });
    setSelectedManifestProduct(stockInModal.product);
    setProductSearchTerm(stockInModal.product.name);
    setItemForm({ quantity: 1, serials: [] });
    setBulkModalOpen(true);
  }

  const handleSaveReorderPoint = async () => {
      setIsSubmitting(true)
      try {
          const targetId = editModal.product.product_id;
          await productAPI.updateProduct(targetId, { reorder_point: editModal.reorderPoint })
          showMessage('Success', 'Settings updated.', 'success')
          setEditModal({ ...editModal, open: false })
          loadProducts()
      } catch (e) { showMessage('Error', 'Failed to update.', 'danger') } 
      finally { setIsSubmitting(false) }
  }

  return (
    <CContainer fluid className="px-4 py-4">
      <div className="mb-4">
        <h2 className="fw-bold text-brand-navy mb-1" style={{fontFamily: 'Oswald, sans-serif', letterSpacing: '1px'}}>INVENTORY MANAGEMENT</h2>
        <div className="text-medium-emphasis fw-semibold">Real-time stock monitoring and adjustments</div>
      </div>

      {/* Stats Row */}
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
                <div className="brand-search-wrapper" style={{maxWidth: '350px'}}>
                  <span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass} /></span>
                  <input 
                    type="text" 
                    className="brand-search-input" 
                    placeholder="Search products..." 
                    value={searchQuery} 
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                  />
                </div>
                <select className="brand-select" style={{maxWidth: '200px'}} value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
                  <option value="All">All Categories</option>
                  {[...new Set(products.map(p => p.category).filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="brand-select" style={{maxWidth: '200px'}} value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}>
                  <option value="All">All Status</option><option value="In Stock">In Stock</option><option value="Low Stock">Low Stock</option><option value="Out of Stock">Out of Stock</option>
                </select>
             </div>
             
             <button className="btn-brand btn-brand-accent" onClick={() => setBulkModalOpen(true)}>
                <CIcon icon={cilTruck} className="me-2"/> Receive Stock
             </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col" style={{width: '30%'}}>Product Details</th>
                  <th scope="col" style={{width: '15%'}}>Category</th>
                  <th scope="col" style={{width: '10%'}}>Type</th>
                  <th scope="col" className="text-center" style={{width: '10%'}}>Stock</th>
                  <th scope="col" className="text-center" style={{width: '15%'}}>Status</th>
                  <th scope="col" className="text-end pe-4" style={{width: '20%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5"><CSpinner color="primary"/></td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">No products found.</td></tr>
                ) : (
                  products.map((p) => {
                     const imgUrl = getProductImageUrl(p.image)
                     return (
                      <tr key={p.product_id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                             {imgUrl ? (
                              <div className="table-thumbnail-slot">
                                <img src={imgUrl} alt={p.name} className="table-thumbnail" />
                              </div>
                            ) : (
                                <div className="table-thumbnail-slot placeholder-thumbnail">
                                  <CIcon icon={cilImage} className="text-secondary opacity-50"/>
                                </div>
                            )}
                            <div>
                              <div className="fw-bold text-dark fs-6">{p.name}</div>
                              <div className="small text-muted">
                                <span className="fw-semibold">{p.brand}</span> <span className="mx-1">•</span> {p.product_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-light text-dark border fw-normal px-3 py-2">{p.category}</span></td>
                        <td>{p.requires_serial ? <CBadge color="info" shape="rounded-pill" className="small"><CIcon icon={cilBarcode} size="sm" className="me-1"/> SN</CBadge> : <span className="text-muted small">Standard</span>}</td>
                        <td className="text-center"><span className="fw-bold fs-5 text-brand-navy">{Number(p.stock ?? 0).toLocaleString()}</span></td>
                        <td className="text-center">{renderStatusBadge(p.computedStatus)}</td>
                        <td className="text-end pe-4">
                           <div className="d-flex justify-content-end gap-2">
                              <CTooltip content="Stock In"><button className="btn-brand btn-brand-primary btn-brand-sm" onClick={() => { setSelectedManifestProduct(p); setProductSearchTerm(p.name); setItemForm({ quantity: 1, serials: [] }); setBulkModalOpen(true); }}><CIcon icon={cilPlus}/></button></CTooltip>
                              {p.requires_serial && <CTooltip content="View Serials"><button className="btn-brand btn-brand-outline btn-brand-sm" onClick={() => handleViewSerials(p)}><CIcon icon={cilList}/></button></CTooltip>}
                              <CTooltip content="Quick Edit Settings"><button className="btn-brand btn-brand-outline btn-brand-sm" onClick={() => setEditModal({ open: true, product: p, reorderPoint: p.reorderPoint })}><CIcon icon={cilPencil}/></button></CTooltip>
                           </div>
                        </td>
                      </tr>
                     )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-2 border-top d-flex justify-content-between align-items-center bg-light">
             <span className="small text-muted">Showing {products.length} of {totalItems} (Page {currentPage} of {totalPages})</span>
             <div className="d-flex gap-1">
                <button className="btn-brand btn-brand-outline btn-brand-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><CIcon icon={cilChevronLeft} /> Prev</button>
                <button className="btn-brand btn-brand-outline btn-brand-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next <CIcon icon={cilChevronRight} /></button>
             </div>
          </div>
        </CCardBody>
      </CCard>

      {/* --- RECEIVE SHIPMENT MODAL (VERTICAL) --- */}
      <CModal visible={bulkModalOpen} onClose={() => setBulkModalOpen(false)} size="lg" alignment="center" backdrop="static">
        <CModalHeader><CModalTitle className="fw-bold text-brand-navy">RECEIVE STOCK (INBOUND)</CModalTitle></CModalHeader>
        <CModalBody>
            <div className="vertical-product-form">
                
                {/* STEP 1: SOURCE */}
                <div className="mb-4 p-3 bg-light rounded border">
                    <CFormLabel className="fw-bold text-brand-navy mb-2">1. SHIPMENT SOURCE</CFormLabel>
                    <select className="brand-select w-100" value={globalSupplierId} onChange={e => setGlobalSupplierId(e.target.value)}>
                        <option value="">Select Supplier...</option>
                        {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name || s.supplier_name}</option>)}
                    </select>
                </div>

                {/* STEP 2: ADD ITEMS */}
                <div className="mb-4">
                    <CFormLabel className="fw-bold text-brand-navy mb-2">2. ADD ITEMS TO LIST</CFormLabel>
                    
                    {/* Item Entry Row */}
                    <div className="d-flex gap-3 align-items-start mb-3">
                        <div style={{flex: 2}} className="position-relative">
                            <CFormLabel className="small text-muted fw-bold">Scan or Search Item</CFormLabel>
                            <div className="brand-search-wrapper w-100">
                                <span className="brand-search-icon"><CIcon icon={cilMagnifyingGlass}/></span>
                                <input 
                                    type="text" 
                                    className="brand-search-input" 
                                    placeholder="Type name or ID..." 
                                    value={productSearchTerm} 
                                    onChange={e => setProductSearchTerm(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                            {/* Search Results */}
                            {searchedProducts.length > 0 && !selectedManifestProduct && (
                                <div className="list-group position-absolute w-100 shadow border-0" style={{zIndex: 1050, maxHeight: '200px', overflowY: 'auto', top: '100%'}}>
                                    {searchedProducts.map(p => (
                                        <button key={p.product_id} className="list-group-item list-group-item-action small" 
                                            onClick={() => { setSelectedManifestProduct(p); setProductSearchTerm(p.name); setSearchedProducts([]); setItemForm(prev => ({...prev, serials: []})); }}
                                        >
                                            <div className="fw-bold">{p.name}</div><small>{p.product_id}</small>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{flex: 1}}>
                            <CFormLabel className="small text-muted fw-bold">Quantity</CFormLabel>
                            <CFormInput type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: e.target.value})} style={{height: '45px'}} className="fw-bold text-center"/>
                        </div>
                        <div className="pt-4">
                           <button className="btn-brand btn-brand-primary" onClick={handleAddToManifest} disabled={!selectedManifestProduct}><CIcon icon={cilPlus} className="me-1"/> ADD</button>
                        </div>
                    </div>
                    
                    {/* Serial Scan Area (Conditional) */}
                    {selectedManifestProduct?.requires_serial && (
                        <div className="p-3 border rounded bg-white mb-3 border-info">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="fw-bold text-info small">ENTER SERIAL NUMBERS</span>
                                <CBadge color={itemForm.serials.length == itemForm.quantity ? 'success' : 'warning'}>{itemForm.serials.length} / {itemForm.quantity}</CBadge>
                            </div>
                            <div className="d-flex gap-2">
                                <CFormInput ref={serialInputRef} placeholder="Type Serial + Enter..." value={serialInput} onChange={e => setSerialInput(e.target.value)} onKeyDown={handleSerialInput} disabled={itemForm.serials.length >= parseInt(itemForm.quantity)} />
                                <CButton color="secondary" variant="outline" onClick={() => handleSerialInput({key:'Enter', preventDefault:()=>{}})}>+</CButton>
                            </div>
                            <div className="d-flex flex-wrap gap-1 mt-2">
                                {itemForm.serials.map((s, i) => <CBadge key={i} color="light" className="border text-dark">{s}</CBadge>)}
                            </div>
                        </div>
                    )}
                </div>

                {/* STEP 3: REVIEW LIST */}
                <div className="mb-3">
                    <CFormLabel className="fw-bold text-brand-navy mb-2">3. INCOMING SHIPMENT LIST</CFormLabel>
                    <div className="table-responsive border rounded" style={{maxHeight: '250px'}}>
                        <table className="table table-striped mb-0 align-middle">
                            <thead className="bg-light sticky-top"><tr><th>Product</th><th className="text-center">Qty</th><th>Details</th><th className="text-end"></th></tr></thead>
                            <tbody>
                                {manifestItems.length === 0 ? <tr><td colSpan="4" className="text-center text-muted py-4">List is empty. Add items above.</td></tr> : 
                                    manifestItems.map((item, i) => (
                                        <tr key={i}>
                                            <td><div className="fw-bold">{item.name}</div><small className="text-muted">{item.product_id}</small></td>
                                            <td className="text-center fw-bold fs-5">{item.addQuantity}</td>
                                            <td>
                                                {item.requires_serial ? (
                                                    <button className="btn btn-sm btn-outline-info py-0" onClick={() => handleCheckManifestSerials(item)}>Check SN</button>
                                                ) : '-'}
                                            </td>
                                            <td className="text-end"><CButton size="sm" color="danger" variant="ghost" onClick={() => handleRemoveFromManifest(i)}><CIcon icon={cilTrash}/></CButton></td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </CModalBody>
        <CModalFooter>
            <button className="btn-brand btn-brand-outline" onClick={() => setBulkModalOpen(false)}>Cancel</button>
            <button className="btn-brand btn-brand-success" onClick={handleBulkSubmit} disabled={isSubmitting || manifestItems.length === 0}>
                {isSubmitting ? <CSpinner size="sm"/> : 'Process Shipment'}
            </button>
        </CModalFooter>
      </CModal>

      {/* CHECK MANIFEST SERIALS MODAL */}
      <CModal visible={checkManifestSnModal.open} onClose={() => setCheckManifestSnModal({...checkManifestSnModal, open: false})} alignment="center" size="sm">
        <CModalHeader><CModalTitle className="fs-6 fw-bold">Serials: {checkManifestSnModal.productName}</CModalTitle></CModalHeader>
        <CModalBody>
            <ul className="list-group">
                {checkManifestSnModal.items.map((sn, i) => (
                    <li key={i} className="list-group-item py-1">{sn}</li>
                ))}
            </ul>
        </CModalBody>
        <CModalFooter><CButton color="secondary" size="sm" onClick={() => setCheckManifestSnModal({...checkManifestSnModal, open: false})}>Close</CButton></CModalFooter>
      </CModal>

      {/* Other Modals (View Serials, Edit, Msg, StockInModal) - Unchanged */}
      <CModal visible={viewSerialsModal.open} onClose={() => setViewSerialsModal({...viewSerialsModal, open: false})} alignment="center">
        <CModalHeader><CModalTitle>Available Serials</CModalTitle></CModalHeader>
        <CModalBody>
            {loadingSerials ? <div className="text-center"><CSpinner color="primary"/></div> : 
             viewSerialsModal.serials.length === 0 ? <div className="text-center text-muted">No serials found in stock.</div> : (
                 <ul className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
                     {viewSerialsModal.serials.map((s, i) => (
                         <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                             <span className="font-monospace">{s.serial_number}</span>
                             <CBadge color="success" shape="rounded-pill">Available</CBadge>
                         </li>
                     ))}
                 </ul>
             )
            }
        </CModalBody>
        <CModalFooter><button className="btn-brand btn-brand-outline" onClick={() => setViewSerialsModal({...viewSerialsModal, open: false})}>Close</button></CModalFooter>
      </CModal>

      <CModal visible={editModal.open} onClose={() => setEditModal({...editModal, open: false})} alignment="center">
          <CModalHeader><CModalTitle>Inventory Settings</CModalTitle></CModalHeader>
          <CModalBody>
              <div className="mb-3">
                  <CFormLabel className="fw-bold small text-muted">REORDER POINT</CFormLabel>
                  <CFormInput type="number" min="0" value={editModal.reorderPoint} onChange={(e) => setEditModal({...editModal, reorderPoint: e.target.value})} />
              </div>
          </CModalBody>
          <CModalFooter>
              <button className="btn-brand btn-brand-outline" onClick={() => setEditModal({...editModal, open: false})}>Cancel</button>
              <button className="btn-brand btn-brand-primary" onClick={handleSaveReorderPoint} disabled={isSubmitting}>
                  {isSubmitting ? <CSpinner size="sm"/> : 'Save Settings'}
              </button>
          </CModalFooter>
      </CModal>

      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter>
            {msgModal.onConfirm ? (
                <CButton color={msgModal.color} className="text-white" onClick={() => { msgModal.onConfirm(); setMsgModal(p => ({ ...p, visible: false })) }}>Confirm</CButton>
            ) : (
                <CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton>
            )}
        </CModalFooter>
      </CModal>
      
      <CModal visible={stockInModal.open} onClose={() => setStockInModal({...stockInModal, open: false})}>
         <CModalHeader><CModalTitle>Stock In</CModalTitle></CModalHeader>
         <CModalBody>
            <CFormLabel>Supplier</CFormLabel>
            <CFormSelect value={stockInForm.supplierId} onChange={(e)=>setStockInForm({...stockInForm, supplierId:e.target.value})} className="mb-3"><option value="">Select</option>{suppliersList.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</CFormSelect>
            <CFormLabel>Quantity</CFormLabel>
            <CFormInput type="number" value={stockInForm.quantity} onChange={(e)=>setStockInForm({...stockInForm, quantity:e.target.value})}/>
         </CModalBody>
         <CModalFooter><CButton color="primary" onClick={handleSingleStockInSubmit}>Confirm</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default InventoryPage