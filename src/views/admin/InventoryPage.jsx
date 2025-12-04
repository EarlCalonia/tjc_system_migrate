import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody, CButton, CFormInput, CFormSelect, CFormLabel,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CWidgetStatsF, CSpinner, 
  CBadge, CTooltip, CPagination, CPaginationItem
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass, cilPencil, cilInbox, cilCheckCircle, cilWarning, cilXCircle, 
  cilList, cilPlus, cilImage, cilBarcode, cilTrash, cilTruck, cilChevronLeft, cilChevronRight, cilChevronBottom, cilMinus
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
  
  // --- UNIFIED STOCK IN STATE ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [manifestItems, setManifestItems] = useState([]) 
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [searchedProducts, setSearchedProducts] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false) 
  const [selectedManifestProduct, setSelectedManifestProduct] = useState(null)
  
  // Supplier Combobox
  const [globalSupplierId, setGlobalSupplierId] = useState('')
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('')
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
  const [filteredSuppliers, setFilteredSuppliers] = useState([])

  // Form State
  const [itemForm, setItemForm] = useState({ quantity: 1, serials: [] })
  const [serialInput, setSerialInput] = useState('')
  const serialInputRef = useRef(null)
  const searchWrapperRef = useRef(null)
  const supplierWrapperRef = useRef(null)

  // Sub-Modals
  const [checkManifestSnModal, setCheckManifestSnModal] = useState({ open: false, items: [], productName: '' })
  const [viewSerialsModal, setViewSerialsModal] = useState({ open: false, product: null, serials: [] })
  const [editModal, setEditModal] = useState({ open: false, product: null, reorderPoint: 10 })
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })

  // --- LIFECYCLE ---
  useEffect(() => { loadInventoryStats(); loadSuppliers(); }, [])

  useEffect(() => {
     const t = setTimeout(() => { loadProducts(); }, 300);
     return () => clearTimeout(t);
  }, [currentPage, searchQuery, selectedCategory, selectedStatus]);

  // Click Outside Handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (supplierWrapperRef.current && !supplierWrapperRef.current.contains(event.target)) {
        setShowSupplierSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Product Search Debounce
  useEffect(() => {
    if (selectedManifestProduct && productSearchTerm === selectedManifestProduct.name) return;

    const t = setTimeout(async () => {
        if (productSearchTerm || showSuggestions) {
            fetchProductSuggestions(productSearchTerm);
        }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearchTerm]);

  // Filter Suppliers
  useEffect(() => {
    if (!supplierSearchTerm) {
        setFilteredSuppliers(suppliersList);
    } else {
        const lower = supplierSearchTerm.toLowerCase();
        setFilteredSuppliers(suppliersList.filter(s => 
            (s.name || s.supplier_name).toLowerCase().includes(lower)
        ));
    }
  }, [supplierSearchTerm, suppliersList]);

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
  const fetchProductSuggestions = async (term) => {
      try {
          const res = await inventoryAPI.getProducts({ search: term, limit: 10 });
          if (res.success) {
              setSearchedProducts(res.data.products || []);
          }
      } catch (e) { console.error(e); }
  }

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
      if (res.success) {
          setSuppliersList(res.data || [])
          setFilteredSuppliers(res.data || [])
      }
    } catch (e) { console.error(e) }
  }

  // --- HANDLERS ---
  const handleOpenStockIn = () => {
      setItemForm({ quantity: 1, serials: [] });
      setManifestItems([]);
      setSelectedManifestProduct(null);
      setProductSearchTerm('');
      setSearchedProducts([]); 
      setShowSuggestions(false);
      setSupplierSearchTerm('');
      setGlobalSupplierId('');
      setFilteredSuppliers(suppliersList);
      setShowSupplierSuggestions(false);
      setBulkModalOpen(true);
  }

  // Quantity Stepper Logic
  const updateQuantity = (val) => {
      let newQty = parseInt(val);
      if (isNaN(newQty) || newQty < 1) newQty = 1;
      
      if (selectedManifestProduct?.requires_serial && newQty < itemForm.serials.length) {
          const trimmed = itemForm.serials.slice(0, newQty);
          setItemForm(prev => ({...prev, quantity: newQty, serials: trimmed}));
      } else {
          setItemForm(prev => ({...prev, quantity: newQty}));
      }
  }
  const handleIncrement = () => updateQuantity(itemForm.quantity + 1);
  const handleDecrement = () => { if(itemForm.quantity > 1) updateQuantity(itemForm.quantity - 1); };

  // Product Selection
  const handleProductInputFocus = () => {
      setShowSuggestions(true);
      if (searchedProducts.length === 0) fetchProductSuggestions('');
  }
  const handleSearchInput = (e) => {
      setProductSearchTerm(e.target.value);
      if(selectedManifestProduct && e.target.value !== selectedManifestProduct.name) {
          setSelectedManifestProduct(null);
      }
      setShowSuggestions(true);
  }
  const handleSelectSuggestion = (product) => {
      const cleanProduct = { ...product, requires_serial: !!product.requires_serial };
      setSelectedManifestProduct(cleanProduct);
      setProductSearchTerm(cleanProduct.name);
      setItemForm(prev => ({...prev, serials: []}));
      setShowSuggestions(false);
  }

  // Supplier Selection
  const handleSupplierInputFocus = () => {
      setShowSupplierSuggestions(true);
      if (!globalSupplierId) setFilteredSuppliers(suppliersList);
  }
  const handleSupplierSearchInput = (e) => {
      setSupplierSearchTerm(e.target.value);
      const exactMatch = suppliersList.find(s => (s.name || s.supplier_name) === e.target.value);
      if (!exactMatch) setGlobalSupplierId('');
      setShowSupplierSuggestions(true);
  }
  const handleSelectSupplier = (supplier) => {
      setGlobalSupplierId(supplier.id);
      setSupplierSearchTerm(supplier.name || supplier.supplier_name);
      setShowSupplierSuggestions(false);
  }

  // Manifest Handlers
  const handleAddToManifest = () => {
      if (!selectedManifestProduct) return showMessage('Validation', 'Please select a valid product.', 'warning');
      if (itemForm.quantity < 1) return showMessage('Validation', 'Quantity must be at least 1.', 'warning');
      
      if (selectedManifestProduct.requires_serial) {
          if (itemForm.serials.length !== parseInt(itemForm.quantity)) {
              return showMessage('Serial Mismatch', `You set quantity to ${itemForm.quantity} but scanned ${itemForm.serials.length} serials.`, 'warning');
          }
      }

      const existingIdx = manifestItems.findIndex(i => i.product_id === selectedManifestProduct.product_id);
      
      if (existingIdx >= 0) {
          const updatedItems = [...manifestItems];
          updatedItems[existingIdx].addQuantity += parseInt(itemForm.quantity);
          updatedItems[existingIdx].newSerials = [...updatedItems[existingIdx].newSerials, ...itemForm.serials];
          setManifestItems(updatedItems);
      } else {
          const newItem = {
              ...selectedManifestProduct,
              addQuantity: parseInt(itemForm.quantity),
              newSerials: itemForm.serials
          };
          setManifestItems(prev => [newItem, ...prev]); 
      }
      
      // Reset form
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

  const handleBulkSubmit = async () => {
      if (!globalSupplierId) return showMessage('Missing Info', 'Please select the Supplier.', 'warning');
      if (manifestItems.length === 0) return showMessage('Empty', 'No items in shipment list.', 'warning');
      
      setIsSubmitting(true);
      try {
          const payload = {
              supplier: globalSupplierId, 
              receivedBy: localStorage.getItem('username') || 'Admin', 
              products: manifestItems.map(item => ({ 
                  productId: item.product_id, 
                  quantity: item.addQuantity,
                  serialNumbers: item.newSerials 
              }))
          };

          await inventoryAPI.bulkStockIn(payload);
          
          showMessage('Success', 'Stock received successfully.', 'success', () => {
              setBulkModalOpen(false);
              setManifestItems([]);
              setGlobalSupplierId('');
              loadProducts();
              loadInventoryStats();
          });
      } catch (e) {
          showMessage('Error', e.message || 'Failed to process.', 'danger');
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

  const handleViewSerials = async (product) => {
    setViewSerialsModal({ open: true, product, serials: [] }) 
    setLoadingSerials(true)
    try {
      const res = await serialNumberAPI.getAvailableSerials(product.product_id)
      if (res.success) setViewSerialsModal(prev => ({ ...prev, serials: res.data || [] }))
    } catch (e) { showMessage('Error', 'Failed to load serials', 'danger') } 
    finally { setLoadingSerials(false) }
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

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5; 
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    items.push(
      <CPaginationItem 
        key="prev" 
        disabled={currentPage === 1} 
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        style={{cursor: currentPage === 1 ? 'not-allowed' : 'pointer'}}
      >
        <CIcon icon={cilChevronLeft} size="sm"/>
      </CPaginationItem>
    );

    if (startPage > 1) {
      items.push(<CPaginationItem key={1} onClick={() => setCurrentPage(1)}>1</CPaginationItem>);
      if (startPage > 2) items.push(<CPaginationItem key="ellipsis-start" disabled>...</CPaginationItem>);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <CPaginationItem 
          key={i} 
          active={i === currentPage} 
          onClick={() => setCurrentPage(i)}
          style={{cursor: 'pointer', backgroundColor: i === currentPage ? 'var(--brand-navy)' : '', borderColor: i === currentPage ? 'var(--brand-navy)' : ''}}
        >
          {i}
        </CPaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) items.push(<CPaginationItem key="ellipsis-end" disabled>...</CPaginationItem>);
      items.push(<CPaginationItem key={totalPages} onClick={() => setCurrentPage(totalPages)}>{totalPages}</CPaginationItem>);
    }

    items.push(
      <CPaginationItem 
        key="next" 
        disabled={currentPage === totalPages} 
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        style={{cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'}}
      >
        <CIcon icon={cilChevronRight} size="sm"/>
      </CPaginationItem>
    );

    return items;
  };

  const modalTitleStyle = {
    fontFamily: 'Oswald, sans-serif', 
    textTransform: 'uppercase', 
    letterSpacing: '1px', 
    fontSize: '1.25rem', 
    fontWeight: 700
  };

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
             
             <button className="btn-brand btn-brand-accent" onClick={handleOpenStockIn}>
                <CIcon icon={cilTruck} className="me-2"/> Stock In
             </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col" style={{width: '30%'}}>Product Details</th>
                  <th scope="col" style={{width: '15%'}}>Category</th>
                  {/* UPDATED HEADER */}
                  <th scope="col" className="text-center" style={{width: '15%'}}>Type</th>
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
                        
                        {/* WCAG COMPLIANT BADGES */}
                        <td className="text-center">
                           {p.requires_serial ? (
                              <CBadge 
                                shape="rounded-pill" 
                                className="py-1 px-2"
                                style={{backgroundColor: 'var(--brand-navy)', color: '#fff', border: '1px solid var(--brand-navy)'}}
                              >
                                 <CIcon icon={cilBarcode} size="sm" className="me-1"/> SERIAL
                              </CBadge>
                           ) : (
                              <CBadge 
                                shape="rounded-pill" 
                                className="py-1 px-2"
                                style={{backgroundColor: '#fff', color: 'var(--brand-navy)', border: '1px solid var(--brand-navy)'}}
                              >
                                 <CIcon icon={cilInbox} size="sm" className="me-1"/> STANDARD
                              </CBadge>
                           )}
                        </td>

                        <td className="text-center"><span className="fw-bold fs-5 text-brand-navy">{Number(p.stock ?? 0).toLocaleString()}</span></td>
                        <td className="text-center">{renderStatusBadge(p.computedStatus)}</td>
                        <td className="text-end pe-4">
                           <div className="d-flex justify-content-end gap-2">
                              {p.requires_serial && (
                                <CTooltip content="View Serials">
                                  <button className="btn-brand btn-brand-outline btn-brand-sm" onClick={() => handleViewSerials(p)}>
                                    <CIcon icon={cilList}/>
                                  </button>
                                </CTooltip>
                              )}
                              <CTooltip content="Settings">
                                <button className="btn-brand btn-brand-outline btn-brand-sm" onClick={() => setEditModal({ open: true, product: p, reorderPoint: p.reorderPoint })}>
                                  <CIcon icon={cilPencil}/>
                                </button>
                              </CTooltip>
                           </div>
                        </td>
                      </tr>
                     )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
             <span className="small text-muted fw-semibold">
                Showing {products.length} of {totalItems} items (Page {currentPage} of {totalPages})
             </span>
             <CPagination className="mb-0 justify-content-end" aria-label="Inventory navigation">
                {renderPaginationItems()}
             </CPagination>
          </div>
        </CCardBody>
      </CCard>

      {/* --- UNIFIED STOCK IN MODAL (Industrial Style) --- */}
      <CModal visible={bulkModalOpen} onClose={() => setBulkModalOpen(false)} size="lg" alignment="center" backdrop="static" scrollable>
        <CModalHeader className="bg-brand-navy">
            <CModalTitle component="span" className="text-white" style={modalTitleStyle}>STOCK IN</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4 bg-light">
            <div className="d-flex flex-column gap-4">
                
                {/* 1. SHIPMENT SOURCE */}
                <div className="bg-white p-3 rounded shadow-sm border">
                    <CFormLabel className="fw-bold text-brand-navy mb-1 text-uppercase small ls-1">Shipment Source</CFormLabel>
                    <div className="position-relative" ref={supplierWrapperRef}>
                        <div className="input-group">
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="Select or Search Supplier..." 
                                value={supplierSearchTerm}
                                onChange={handleSupplierSearchInput}
                                onFocus={handleSupplierInputFocus}
                                autoComplete="off"
                            />
                            <span className="input-group-text bg-white text-muted"><CIcon icon={cilChevronBottom}/></span>
                        </div>
                        {showSupplierSuggestions && (
                            <div className="position-absolute w-100 bg-white border rounded shadow-lg" style={{zIndex: 1060, maxHeight: '200px', overflowY: 'auto', marginTop: '2px'}}>
                                {filteredSuppliers.length === 0 ? (
                                    <div className="p-3 text-muted text-center small">No suppliers found.</div>
                                ) : (
                                    filteredSuppliers.map(s => (
                                        <div key={s.id} className="p-2 border-bottom px-3 dropdown-item-custom" onClick={() => handleSelectSupplier(s)}>
                                            <div className="fw-bold text-dark">{s.name || s.supplier_name}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. ITEM ENTRY - GRID LAYOUT */}
                <div className="bg-white p-3 rounded shadow-sm border">
                    <CFormLabel className="fw-bold text-brand-navy mb-3 text-uppercase small ls-1">Add Items</CFormLabel>
                    
                    <CRow className="g-3 mb-3">
                         {/* PRODUCT SEARCH (Col 8) */}
                         <CCol sm={8}>
                             <div className="position-relative" ref={searchWrapperRef}>
                                <label className="text-muted small fw-bold mb-1">Product</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-white"><CIcon icon={cilMagnifyingGlass}/></span>
                                    <input 
                                        type="text"
                                        className="form-control"
                                        placeholder="Search Product..." 
                                        value={productSearchTerm}
                                        onChange={handleSearchInput}
                                        onFocus={handleProductInputFocus}
                                        autoComplete="off"
                                    />
                                </div>
                                {showSuggestions && (
                                    <div className="position-absolute w-100 bg-white border rounded shadow-lg" style={{zIndex: 1050, maxHeight: '250px', overflowY: 'auto', top: '100%', marginTop: '5px'}}>
                                        {searchedProducts.map(p => (
                                            <div key={p.product_id} className="p-2 border-bottom d-flex align-items-center gap-3 dropdown-item-custom" onClick={() => handleSelectSuggestion(p)}>
                                                {p.image ? <img src={getProductImageUrl(p.image)} alt="" style={{width:'35px', height:'35px', objectFit:'cover', borderRadius:'4px'}} /> : <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{width:'35px', height:'35px'}}><CIcon icon={cilImage} className="text-secondary"/></div>}
                                                <div>
                                                    <div className="fw-bold text-dark small">{p.name}</div>
                                                    <div className="small text-muted" style={{fontSize:'0.75rem'}}>ID: {p.product_id} | Stock: {p.stock}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>
                         </CCol>

                         {/* QUANTITY STEPPER (Col 4) */}
                         <CCol sm={4}>
                             <label className="text-muted small fw-bold mb-1">Quantity</label>
                             <div className="input-group">
                                <button className="btn btn-light border" type="button" onClick={handleDecrement}><CIcon icon={cilMinus} size="sm"/></button>
                                <input type="number" className="form-control text-center fw-bold" value={itemForm.quantity} onChange={(e) => updateQuantity(e.target.value)} />
                                <button className="btn btn-light border" type="button" onClick={handleIncrement}><CIcon icon={cilPlus} size="sm"/></button>
                             </div>
                         </CCol>
                    </CRow>
                    
                    {/* SELECTED PRODUCT INDICATOR */}
                    {selectedManifestProduct && (
                        <div className="mb-3 p-2 bg-success bg-opacity-10 border border-success rounded d-flex align-items-center gap-2">
                            <CIcon icon={cilCheckCircle} className="text-success"/>
                            <div className="small text-success fw-bold">{selectedManifestProduct.name}</div>
                            <CButton color="secondary" variant="ghost" size="sm" className="ms-auto" onClick={() => {setSelectedManifestProduct(null); setProductSearchTerm('');}}>
                                <CIcon icon={cilXCircle}/>
                            </CButton>
                        </div>
                    )}

                    {/* SERIAL SCANNER (Strictly Conditional) */}
                    {selectedManifestProduct?.requires_serial && (
                        <div className="p-3 bg-light border rounded mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-brand-blue fw-bold small">SCAN SERIALS</span>
                                <span className="badge bg-secondary">Scanned: {itemForm.serials.length} of {itemForm.quantity}</span>
                            </div>
                            <div className="d-flex gap-2">
                                <CFormInput 
                                    ref={serialInputRef} 
                                    placeholder="Scan Serial + Enter" 
                                    value={serialInput} 
                                    onChange={e => setSerialInput(e.target.value)} 
                                    onKeyDown={handleSerialInput} 
                                    disabled={itemForm.serials.length >= parseInt(itemForm.quantity)}
                                />
                                <CButton color="primary" variant="outline" onClick={() => handleSerialInput({key:'Enter', preventDefault:()=>{}})}>+</CButton>
                            </div>
                            <div className="d-flex flex-wrap gap-1 mt-2">
                                {itemForm.serials.map((s, i) => <CBadge key={i} color="info" shape="rounded-pill">{s}</CBadge>)}
                            </div>
                        </div>
                    )}

                    <button className="btn-brand btn-brand-primary w-100" onClick={handleAddToManifest} disabled={!selectedManifestProduct}>
                        <CIcon icon={cilPlus} className="me-2"/> ADD TO SHIPMENT
                    </button>
                </div>

                {/* 3. SHIPMENT LIST */}
                <div className="bg-white p-3 rounded shadow-sm border">
                    <CFormLabel className="fw-bold text-brand-navy mb-2 text-uppercase small ls-1">Shipment List</CFormLabel>
                    <div className="border rounded overflow-hidden" style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <table className="admin-table mb-0">
                            <thead>
                                <tr>
                                    <th scope="col" style={{width: '50%'}}>Product</th>
                                    <th scope="col" className="text-center" style={{width: '20%'}}>Qty</th>
                                    <th scope="col" className="text-center" style={{width: '30%'}}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {manifestItems.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center text-muted py-4">No items added yet.</td></tr>
                                ) : (
                                    manifestItems.map((item, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div className="fw-bold">{item.name}</div>
                                                <div className="text-muted small">{item.product_id}</div>
                                                {item.requires_serial && (
                                                    <button className="btn btn-sm btn-link text-decoration-none p-0 small" onClick={() => handleCheckManifestSerials(item)}>
                                                        View Serials ({item.newSerials.length})
                                                    </button>
                                                )}
                                            </td>
                                            <td className="text-center fw-bold fs-5">{item.addQuantity}</td>
                                            <td className="text-center">
                                                <CTooltip content="Remove line">
                                                    <CButton size="sm" color="danger" variant="ghost" onClick={() => handleRemoveFromManifest(i)}>
                                                        <CIcon icon={cilTrash}/>
                                                    </CButton>
                                                </CTooltip>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </CModalBody>
        <CModalFooter className="bg-light">
            <button className="btn-brand btn-brand-outline" onClick={() => setBulkModalOpen(false)}>Close</button>
            <button className="btn-brand btn-brand-success" onClick={handleBulkSubmit} disabled={isSubmitting || manifestItems.length === 0}>
                {isSubmitting ? <CSpinner size="sm"/> : 'PROCESS STOCK IN'}
            </button>
        </CModalFooter>
      </CModal>

      {/* Other Modals Remain Unchanged */}
      <CModal visible={checkManifestSnModal.open} onClose={() => setCheckManifestSnModal({...checkManifestSnModal, open: false})} alignment="center" size="sm">
        <CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white" style={modalTitleStyle}>SERIAL NUMBERS</CModalTitle></CModalHeader>
        <CModalBody><ul className="list-group list-group-flush">{checkManifestSnModal.items.map((sn, i) => <li key={i} className="list-group-item px-0 py-2 small fw-bold text-dark">{sn}</li>)}</ul></CModalBody>
      </CModal>

      <CModal visible={viewSerialsModal.open} onClose={() => setViewSerialsModal({...viewSerialsModal, open: false})} alignment="center">
        <CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white" style={modalTitleStyle}>AVAILABLE SERIALS</CModalTitle></CModalHeader>
        <CModalBody className="p-0">{loadingSerials ? <div className="text-center py-4"><CSpinner color="primary"/></div> : viewSerialsModal.serials.length === 0 ? <div className="text-center text-muted py-4">No serials found.</div> : (<ul className="list-group list-group-flush" style={{maxHeight: '400px', overflowY: 'auto'}}>{viewSerialsModal.serials.map((s, i) => (<li key={i} className="list-group-item d-flex justify-content-between align-items-center py-3 px-4"><span className="font-monospace fw-bold text-dark">{s.serial_number}</span><CBadge color="success" shape="rounded-pill">Available</CBadge></li>))}</ul>)}</CModalBody>
        <CModalFooter className="bg-light"><button className="btn-brand btn-brand-outline" onClick={() => setViewSerialsModal({...viewSerialsModal, open: false})}>Close</button></CModalFooter>
      </CModal>

      <CModal visible={editModal.open} onClose={() => setEditModal({...editModal, open: false})} alignment="center">
          <CModalHeader className="bg-brand-navy"><CModalTitle component="span" className="text-white" style={modalTitleStyle}>INVENTORY SETTINGS</CModalTitle></CModalHeader>
          <CModalBody className="p-4"><div className="mb-3"><CFormLabel className="fw-bold text-brand-navy mb-2 text-uppercase small ls-1">Reorder Level</CFormLabel><CFormInput type="number" min="0" value={editModal.reorderPoint} onChange={(e) => setEditModal({...editModal, reorderPoint: e.target.value})} /><div className="form-text mt-2">Alert when stock falls below this number.</div></div></CModalBody>
          <CModalFooter className="bg-light"><button className="btn-brand btn-brand-outline" onClick={() => setEditModal({...editModal, open: false})}>Cancel</button><button className="btn-brand btn-brand-primary" onClick={handleSaveReorderPoint} disabled={isSubmitting}>{isSubmitting ? <CSpinner size="sm"/> : 'SAVE SETTINGS'}</button></CModalFooter>
      </CModal>

      <CModal visible={msgModal.visible} onClose={() => setMsgModal({...msgModal, visible: false})}>
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle component="span" style={modalTitleStyle}>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody className="py-4">{msgModal.message}</CModalBody>
        <CModalFooter className="bg-light">{msgModal.onConfirm ? (<CButton color={msgModal.color} className="text-white" onClick={() => { msgModal.onConfirm(); setMsgModal(p => ({ ...p, visible: false })) }}>Confirm</CButton>) : (<CButton color="secondary" onClick={() => setMsgModal({...msgModal, visible: false})}>Close</CButton>)}</CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default InventoryPage