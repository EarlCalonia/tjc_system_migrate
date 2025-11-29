import React, { useState, useEffect, useMemo } from 'react'
import {
  CContainer,
  CButton,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilCart, 
  cilTrash, 
  cilMagnifyingGlass, 
  cilPlus, 
  cilMinus,
  cilList,
  cilImage
} from '@coreui/icons'
import { salesAPI, inventoryAPI, settingsAPI, customersAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'

// --- CONFIGURATION (Fixed) ---
const ASSET_URL = 'http://localhost:5000' // Removed '/uploads' to prevent double path

const SalesPage = () => {
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('')
  const [saleItems, setSaleItems] = useState([])
  const [customerType, setCustomerType] = useState('new')

  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('Manila')
  
  const [paymentOption, setPaymentOption] = useState('')
  const [shippingOption, setShippingOption] = useState('In-Store Pickup')
  const [tenderedAmount, setTenderedAmount] = useState('')
  const [gcashRef, setGcashRef] = useState('')
  const [paymentSettings, setPaymentSettings] = useState({})

  const [products, setProducts] = useState([])
  const [backendCustomers, setBackendCustomers] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serialModalVisible, setSerialModalVisible] = useState(false)
  const [selectedProductForSerial, setSelectedProductForSerial] = useState(null)
  const [availableSerials, setAvailableSerials] = useState([])
  const [selectedSerials, setSelectedSerials] = useState({}) 
  const [quantities, setQuantities] = useState({})
  const [msgModal, setMsgModal] = useState({ visible: false, title: '', message: '', color: 'info', onConfirm: null })

  // --- HELPERS ---
  const getSaleTotal = () => saleItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const isCompanyDeliveryAvailable = useMemo(() => getSaleTotal() >= 5000, [saleItems])

  const filteredProducts = products.filter(
    (product) =>
      (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Image Helper (Fixed)
  const getProductImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${ASSET_URL}${cleanPath}`
  }

  // --- EFFECTS ---
  useEffect(() => {
    fetchProductsAndInventory()
    fetchPaymentSettings()
    fetchBackendCustomers()
  }, [])

  useEffect(() => {
    if (paymentOption !== 'Cash') setTenderedAmount('')
    if (paymentOption !== 'GCash') setGcashRef('')
  }, [paymentOption])

  useEffect(() => {
    if (!isCompanyDeliveryAvailable && shippingOption === 'Company Delivery') setShippingOption('In-Store Pickup')
  }, [isCompanyDeliveryAvailable, shippingOption])

  // --- API ---
  const fetchProductsAndInventory = async () => {
    try {
      setLoading(true)
      const response = await inventoryAPI.getProductsWithInventory()
      if (response.success) {
        setProducts((response.data?.products || []).map(p => ({
          ...p,
          stock: Number(p.stock || 0),
          requires_serial: !!p.requires_serial
        })))
      }
    } catch (err) { showMessage('Error', 'Failed to load products.', 'danger') } 
    finally { setLoading(false) }
  }

  const fetchPaymentSettings = async () => {
    try {
      const response = await settingsAPI.get()
      if (response.success) setPaymentSettings(response.data || {})
    } catch (e) {}
  }

  const fetchBackendCustomers = async () => {
    try {
      const response = await customersAPI.getCustomers()
      if (response.success) setBackendCustomers(response.data || [])
    } catch (e) {}
  }

  // --- HANDLERS ---
  const showMessage = (title, message, color = 'info', onConfirm = null) => setMsgModal({ visible: true, title, message, color, onConfirm })
  const closeMsgModal = () => setMsgModal({ ...msgModal, visible: false })

  const handleQuantityChange = (productId, change) => {
    const currentQty = quantities[productId] || 1
    const product = products.find(p => p.product_id === productId)
    if (!product) return

    let newQty = currentQty + change
    if (newQty < 1) newQty = 1
    if (newQty > product.stock) newQty = product.stock

    if (product.requires_serial) {
      const currentSerials = selectedSerials[productId] || []
      if (currentSerials.length > newQty) {
        setSelectedSerials({ ...selectedSerials, [productId]: currentSerials.slice(0, newQty) })
      }
    }
    setQuantities(prev => ({ ...prev, [productId]: newQty }))
  }

  const handleOpenSerialModal = async (product) => {
    setSelectedProductForSerial(product)
    setSerialModalVisible(true)
    try {
      const res = await serialNumberAPI.getAvailableSerials(product.product_id)
      if (res.success) {
        const inCartItem = saleItems.find(i => i.product_id === product.product_id)
        const usedSerials = inCartItem ? (inCartItem.serialNumbers || []) : []
        setAvailableSerials((res.data || []).filter(s => !usedSerials.includes(s.serial_number)))
      }
    } catch (e) { setAvailableSerials([]) }
  }

  const handleSerialSelection = (sn) => {
    const pid = selectedProductForSerial.product_id
    const currentList = selectedSerials[pid] || []
    const targetQty = quantities[pid] || 1

    if (currentList.includes(sn)) {
      setSelectedSerials({ ...selectedSerials, [pid]: currentList.filter(s => s !== sn) })
    } else if (currentList.length < targetQty) {
      setSelectedSerials({ ...selectedSerials, [pid]: [...currentList, sn] })
    }
  }

  const addToSale = (product) => {
    const qty = quantities[product.product_id] || 1
    const serials = selectedSerials[product.product_id] || []

    if (product.requires_serial && serials.length !== qty) return showMessage('Missing Info', `Please select ${qty} serials`, 'warning')
    if (product.stock < qty) return showMessage('Stock Error', 'Insufficient stock.', 'danger')

    const existingItem = saleItems.find(i => i.product_id === product.product_id)
    const newItem = existingItem 
      ? { ...existingItem, quantity: existingItem.quantity + qty, serialNumbers: [...(existingItem.serialNumbers || []), ...serials] }
      : { 
          product_id: product.product_id, 
          name: product.name, 
          brand: product.brand, 
          price: Number(product.price), 
          quantity: qty, 
          serialNumbers: serials,
          image: product.image
        }

    const updatedItems = existingItem 
      ? saleItems.map(i => i.product_id === product.product_id ? newItem : i)
      : [...saleItems, newItem]

    setSaleItems(updatedItems)
    setProducts(products.map(p => p.product_id === product.product_id ? { ...p, stock: p.stock - qty } : p))
    setQuantities(prev => ({ ...prev, [product.product_id]: 1 }))
    setSelectedSerials(prev => ({ ...prev, [product.product_id]: [] }))
  }

  const removeFromSale = (productId) => {
    const item = saleItems.find(i => i.product_id === productId)
    if (!item) return
    setSaleItems(saleItems.filter(i => i.product_id !== productId))
    setProducts(products.map(p => p.product_id === productId ? { ...p, stock: p.stock + item.quantity } : p))
  }

  const confirmSale = async () => {
    if (saleItems.length === 0) return showMessage('Cart Empty', 'Please add items.', 'warning')
    if (!paymentOption) return showMessage('Payment', 'Select a payment method.', 'warning')
    if (customerType === 'new' && (!firstName || !lastName)) return showMessage('Customer', 'Enter name.', 'warning')
    
    setSubmitting(true)
    try {
      const fullName = `${firstName} ${middleName} ${lastName}`.trim()
      const saleData = {
        customer_name: fullName,
        payment: paymentOption,
        delivery_type: shippingOption,
        total: getSaleTotal(),
        items: saleItems,
        tendered: paymentOption === 'Cash' ? tenderedAmount : null,
        reference: paymentOption === 'GCash' ? gcashRef : null,
      }
      const result = await salesAPI.createSale(saleData)
      if (result.success) showMessage('Success', 'Transaction completed!', 'success', () => window.location.reload())
      else throw new Error(result.message)
    } catch (e) { showMessage('Error', e.message || 'Failed.', 'danger') } 
    finally { setSubmitting(false) }
  }

  return (
    <CContainer fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h2 className="mb-0 fw-bold text-dark">Sales Transaction</h2><div className="text-medium-emphasis small">Process orders</div></div>
        <CButton color="primary" className="text-white" variant="outline" size="sm" onClick={() => window.location.reload()}><CIcon icon={cilCart} className="me-2" />New Transaction</CButton>
      </div>

      <div className="sales-content">
        {/* --- PRODUCTS COLUMN --- */}
        <div className="products-section">
          <div className="products-header">
            <h2>Product Catalog</h2>
            <CInputGroup size="sm" style={{ maxWidth: '250px' }}>
              <CInputGroupText className="bg-light border-end-0"><CIcon icon={cilMagnifyingGlass} size="sm"/></CInputGroupText>
              <CFormInput className="border-start-0" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
            </CInputGroup>
          </div>
          
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th style={{width: '40%'}}>Item</th>
                  <th style={{width: '15%'}}>Price</th>
                  <th className="text-center" style={{width: '10%'}}>Stock</th>
                  <th className="text-center" style={{width: '20%'}}>Qty</th>
                  <th className="text-center" style={{width: '5%'}}>#</th>
                  <th className="text-end" style={{width: '10%'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5 text-medium-emphasis">Loading inventory...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-medium-emphasis">No products found</td></tr>
                ) : (
                  filteredProducts.map((product) => {
                    const pid = product.product_id
                    const qty = quantities[pid] || 1
                    const serials = selectedSerials[pid] || []
                    const isStocked = product.stock > 0
                    const imgUrl = getProductImageUrl(product.image)
                    
                    return (
                      <tr key={pid} className={!isStocked ? 'row-disabled' : ''}>
                        {/* NEW: Combined Image & Name Cell */}
                        <td>
                          <div className="product-combo-cell">
                            <div className="product-thumbnail-wrapper">
                              {imgUrl ? (
                                <img src={imgUrl} alt={product.name} className="product-thumbnail" onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} />
                              ) : null}
                              <div className="product-thumbnail-placeholder" style={{display: imgUrl ? 'none' : 'flex'}}>
                                <CIcon icon={cilImage} size="lg" className="text-secondary"/>
                              </div>
                            </div>
                            <div className="product-text-info">
                              <span className="product-name-text">{product.name}</span>
                              <small className="text-medium-emphasis">{product.brand}</small>
                            </div>
                          </div>
                        </td>
                        
                        <td className="fw-bold text-primary">₱{Number(product.price).toLocaleString()}</td>
                        <td className="text-center">
                           {isStocked ? <span className="status-badge in-stock">{product.stock}</span> : <span className="status-badge out-of-stock">0</span>}
                        </td>
                        <td>
                          <div className="quantity-controls">
                            <button className="quantity-btn" disabled={!isStocked} onClick={() => handleQuantityChange(pid, -1)}><CIcon icon={cilMinus} size="sm"/></button>
                            <input className="quantity-input" type="text" readOnly value={qty} />
                            <button className="quantity-btn" disabled={!isStocked} onClick={() => handleQuantityChange(pid, 1)}><CIcon icon={cilPlus} size="sm"/></button>
                          </div>
                        </td>
                        <td className="text-center">
                          {product.requires_serial ? (
                             <div onClick={() => isStocked && handleOpenSerialModal(product)} className={`cursor-pointer badge ${serials.length === qty ? 'bg-success' : 'bg-danger text-white'}`}>
                               {serials.length}/{qty}
                             </div>
                          ) : <span className="text-muted">-</span>}
                        </td>
                        <td className="text-end">
                          <CButton color="primary" size="sm" className="text-white" disabled={!isStocked} onClick={() => addToSale(product)}>Add</CButton>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- CART COLUMN --- */}
        <div className="right-panel">
          <div className="sale-section">
            <div className="sale-header"><h2>Current Sale</h2></div>
            <div className="sale-items">
              {saleItems.length === 0 ? (
                <div className="empty-sale"><CIcon icon={cilCart} size="3xl" className="mb-3 opacity-50"/><span>Cart is empty</span></div>
              ) : (
                saleItems.map((item) => (
                  <div className="sale-item" key={item.product_id}>
                    <div className="sale-item-info">
                      <h4>{item.name}</h4>
                      <small>{item.quantity} x ₱{item.price.toLocaleString()}</small>
                    </div>
                    <div className="sale-item-actions">
                      <span className="sale-item-price">₱{(item.price * item.quantity).toLocaleString()}</span>
                      <button className="remove-btn" onClick={() => removeFromSale(item.product_id)}><CIcon icon={cilTrash} size="sm"/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="sale-total"><span>Total</span><strong>₱{getSaleTotal().toLocaleString()}</strong></div>
          </div>

          <div className="customer-section">
            <h2>Customer</h2>
            <div className="mb-3">
               <CFormCheck inline type="radio" name="ctype" label="New" checked={customerType === 'new'} onChange={() => setCustomerType('new')} />
               <CFormCheck inline type="radio" name="ctype" label="Existing" checked={customerType === 'existing'} onChange={() => setCustomerType('existing')} />
            </div>
            {customerType === 'new' ? (
              <div className="d-grid gap-2">
                <div className="d-flex gap-2">
                   <CFormInput size="sm" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                   <CFormInput size="sm" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <CFormInput size="sm" placeholder="Contact No." value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
                <CFormSelect size="sm" value={address} onChange={e => setAddress(e.target.value)}>
                  <option value="Manila">Manila</option><option value="Pampanga">Pampanga</option><option value="Bulacan">Bulacan</option>
                </CFormSelect>
              </div>
            ) : (
              <CFormSelect size="sm">
                <option>Select Customer...</option>
                {backendCustomers.map((c, i) => <option key={i} value={c.id}>{c.customer_name}</option>)}
              </CFormSelect>
            )}
          </div>

          <div className="payment-shipping-section">
            <h2>Payment</h2>
            <CFormSelect className="mb-2" value={paymentOption} onChange={(e) => setPaymentOption(e.target.value)}>
              <option value="">Method</option><option value="Cash">Cash</option><option value="GCash">GCash</option>
              <option value="Cash on Delivery" disabled={!isCompanyDeliveryAvailable}>COD (Min ₱5k)</option>
            </CFormSelect>
            {paymentOption === 'Cash' && <CInputGroup className="mb-2"><CInputGroupText>₱</CInputGroupText><CFormInput type="number" placeholder="Amount" value={tenderedAmount} onChange={e => setTenderedAmount(e.target.value)} /></CInputGroup>}
            {paymentOption === 'GCash' && <CFormInput className="mb-2" placeholder="Reference No." value={gcashRef} onChange={e => setGcashRef(e.target.value)} />}
            <CButton className="w-100 mt-3 text-white fw-bold" color="success" size="lg" onClick={confirmSale} disabled={submitting}>{submitting ? 'Processing...' : 'CONFIRM SALE'}</CButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CModal visible={msgModal.visible} onClose={closeMsgModal} alignment="center">
        <CModalHeader><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody>{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={closeMsgModal}>Close</CButton>{msgModal.onConfirm && <CButton color={msgModal.color} onClick={msgModal.onConfirm}>Confirm</CButton>}</CModalFooter>
      </CModal>

      <CModal visible={serialModalVisible} onClose={() => setSerialModalVisible(false)} alignment="center">
        <CModalHeader><CModalTitle>Select Serials</CModalTitle></CModalHeader>
        <CModalBody>
          <p>Select <strong>{quantities[selectedProductForSerial?.product_id]}</strong> serials:</p>
          <div className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
            {availableSerials.map((sn) => (
               <button key={sn.serial_number} className={`list-group-item list-group-item-action ${selectedSerials[selectedProductForSerial?.product_id]?.includes(sn.serial_number) ? 'active' : ''}`} onClick={() => handleSerialSelection(sn.serial_number)}>{sn.serial_number}</button>
            ))}
          </div>
        </CModalBody>
        <CModalFooter><CButton color="primary" onClick={() => setSerialModalVisible(false)}>Done</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SalesPage