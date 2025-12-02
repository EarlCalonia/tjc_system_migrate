import React, { useState, useEffect, useMemo } from 'react'
import {
  CContainer,
  CButton,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CFormLabel,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CInputGroup,
  CInputGroupText,
  CBadge,
  CSpinner,
  CTooltip
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilCart, 
  cilTrash, 
  cilMagnifyingGlass, 
  cilPlus, 
  cilMinus,
  cilImage,
  cilCreditCard,
  cilUser,
  cilDescription,
  cilCheckCircle,
  cilTruck,
  cilBarcode,
  cilLockLocked
} from '@coreui/icons'
import { salesAPI, inventoryAPI, settingsAPI, customersAPI } from '../../utils/api'
import { serialNumberAPI } from '../../utils/serialNumberApi'
import '../../styles/SalesPage.css' 

const ASSET_URL = 'http://localhost:5000'

const SalesPage = () => {
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('')
  const [saleItems, setSaleItems] = useState([])
  const [customerType, setCustomerType] = useState('new')

  // Customer Details
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('')
  const [region, setRegion] = useState('Manila')
  const [searchClientQuery, setSearchClientQuery] = useState('')

  const [paymentOption, setPaymentOption] = useState('Cash')
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
  const getSaleTotal = () => saleItems.reduce((total, item) => {
    // Handle case where quantity might be empty string during typing
    const qty = typeof item.quantity === 'number' ? item.quantity : 0
    return total + item.price * qty
  }, 0)

  const isCompanyDeliveryAvailable = useMemo(() => getSaleTotal() >= 5000, [saleItems])

  const saleTotal = getSaleTotal()
  const changeDue = paymentOption === 'Cash' && tenderedAmount ? Number(tenderedAmount) - saleTotal : 0
  
  const isPaymentValid = useMemo(() => {
    if (saleItems.length === 0) return false
    if (paymentOption === 'Cash') return Number(tenderedAmount) >= saleTotal
    if (paymentOption === 'GCash') return !!gcashRef
    return true
  }, [saleItems, paymentOption, tenderedAmount, saleTotal, gcashRef])

  const filteredProducts = products.filter(
    (product) =>
      (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    if (!isCompanyDeliveryAvailable && shippingOption === 'Company Delivery') {
      setShippingOption('In-Store Pickup')
    }
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

  const handleExistingClientSelect = (e) => {
    const val = e.target.value
    setSearchClientQuery(val)
    const client = backendCustomers.find(c => c.customer_name === val || c.name === val)
    if (client) {
      const name = client.customer_name || client.name || ''
      const parts = name.trim().split(' ')
      const fName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0]
      const lName = parts.length > 1 ? parts[parts.length - 1] : ''
      setFirstName(client.first_name || fName)
      setLastName(client.last_name || lName)
      setContactNumber(client.contact_number || client.contact || '')
      setAddress(client.address || '')
      setRegion(client.region || 'Manila')
    }
  }

  // Left Panel Quantity Handler
  const handleQuantityChange = (productId, change) => {
    const currentQty = quantities[productId] || 1
    const product = products.find(p => p.product_id === productId)
    if (!product) return
    let newQty = currentQty + change
    if (newQty < 1) newQty = 1
    if (newQty > product.stock) newQty = product.stock
    setQuantities(prev => ({ ...prev, [productId]: newQty }))
  }

  // Right Panel (Cart) Quantity Handler - Supports Typing
  const handleCartQuantityChange = (productId, newQtyStr) => {
    const cartItem = saleItems.find(i => i.product_id === productId)
    const productData = products.find(p => p.product_id === productId)
    if (!cartItem || !productData) return
    if (productData.requires_serial) return

    // 1. Handle Empty Input (User deleting everything)
    if (newQtyStr === '') {
      const oldQty = typeof cartItem.quantity === 'number' ? cartItem.quantity : 0
      // Restore stock immediately so logic stays consistent
      setProducts(prev => prev.map(p => p.product_id === productId ? { ...p, stock: p.stock + oldQty } : p))
      setSaleItems(prev => prev.map(item => item.product_id === productId ? { ...item, quantity: '' } : item))
      return
    }

    // 2. Handle Numeric Input
    let newQty = parseInt(newQtyStr, 10)
    if (isNaN(newQty)) return 

    const oldQty = typeof cartItem.quantity === 'number' ? cartItem.quantity : 0
    const diff = newQty - oldQty

    // Check if enough stock for the INCREASE
    if (diff > 0 && productData.stock < diff) {
       showMessage('Stock Error', `Only ${productData.stock} more units available.`, 'warning')
       return
    }

    setSaleItems(prev => prev.map(item => item.product_id === productId ? { ...item, quantity: newQty } : item))
    setProducts(prev => prev.map(p => p.product_id === productId ? { ...p, stock: p.stock - diff } : p))
  }

  // Handle Input Blur (Reset to 1 if left empty)
  const handleBlurCartQuantity = (productId) => {
    const item = saleItems.find(i => i.product_id === productId)
    if (item && (item.quantity === '' || item.quantity === 0)) {
       handleCartQuantityChange(productId, 1)
    }
  }

  // --- SMART ADD LOGIC ---
  const handleAddProductClick = async (product) => {
    if (product.requires_serial) {
      setSelectedProductForSerial(product)
      setSelectedSerials(prev => ({ ...prev, [product.product_id]: [] }))
      setSerialModalVisible(true)
      try {
        const res = await serialNumberAPI.getAvailableSerials(product.product_id)
        if (res.success) {
          const inCartItem = saleItems.find(i => i.product_id === product.product_id)
          const usedSerials = inCartItem ? (inCartItem.serialNumbers || []) : []
          setAvailableSerials((res.data || []).filter(s => !usedSerials.includes(s.serial_number)))
        }
      } catch (e) { setAvailableSerials([]) }
    } else {
      addToSale(product)
    }
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

  const addToSale = (product, specificSerials = null) => {
    const qty = quantities[product.product_id] || 1
    const serials = specificSerials || []

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
          image: product.image, 
          requires_serial: product.requires_serial 
        }

    const updatedItems = existingItem 
      ? saleItems.map(i => i.product_id === product.product_id ? newItem : i)
      : [...saleItems, newItem]

    setSaleItems(updatedItems)
    setProducts(products.map(p => p.product_id === product.product_id ? { ...p, stock: p.stock - qty } : p))
    setQuantities(prev => ({ ...prev, [product.product_id]: 1 }))
    setSerialModalVisible(false)
  }

  const removeFromSale = (productId) => {
    const item = saleItems.find(i => i.product_id === productId)
    if (!item) return
    // Ensure we convert quantity to a Number (treat '' as 0 for refunding stock)
    const qtyToRestore = Number(item.quantity) || 0
    setSaleItems(saleItems.filter(i => i.product_id !== productId))
    setProducts(products.map(p => p.product_id === productId ? { ...p, stock: p.stock + qtyToRestore } : p))
  }

  const confirmSale = async () => {
    if (!isPaymentValid) return
    if (!firstName) return showMessage('Customer Error', 'Please enter customer name.', 'warning')
    if (shippingOption === 'Company Delivery' && !address) return showMessage('Address Error', 'Delivery requires a full address.', 'warning')
    
    setSubmitting(true)
    try {
      const fullName = `${firstName} ${lastName}`.trim()
      const fullAddress = `${address}, ${region}`
      const saleData = {
        customer_name: fullName,
        payment: paymentOption,
        delivery_type: shippingOption,
        total: saleTotal,
        items: saleItems,
        tendered: paymentOption === 'Cash' ? tenderedAmount : null,
        reference: paymentOption === 'GCash' ? gcashRef : null,
        address: fullAddress
      }
      const result = await salesAPI.createSale(saleData)
      if (result.success) showMessage('Success', 'Transaction completed successfully!', 'success', () => window.location.reload())
      else throw new Error(result.message)
    } catch (e) { showMessage('Error', e.message || 'Failed.', 'danger') } 
    finally { setSubmitting(false) }
  }

  return (
    <CContainer fluid>
      <div className="d-flex justify-content-between align-items-end mb-3">
        <div>
          <h2 className="mb-0 fw-bold text-brand-navy" style={{fontFamily: 'Oswald, sans-serif'}}>SALES TERMINAL</h2>
          <div className="text-medium-emphasis small">Point of Sale</div>
        </div>
        <CButton color="secondary" variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <CIcon icon={cilCart} className="me-2" /> Reset
        </CButton>
      </div>

      <div className="sales-content">
        {/* --- LEFT COLUMN: ITEM CATALOG --- */}
        <div className="products-section">
          <div className="products-header">
            <h2 className="fs-6 mb-0 text-uppercase fw-bold text-brand-navy">Item Lookup</h2>
            <CInputGroup size="sm" style={{ maxWidth: '280px' }}>
              <CInputGroupText className="bg-light border-end-0"><CIcon icon={cilMagnifyingGlass}/></CInputGroupText>
              <CFormInput className="border-start-0 ps-0" placeholder="Scan / Search Item..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus/>
            </CInputGroup>
          </div>
          
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th scope="col" style={{width: '45%'}}>Description</th>
                  <th scope="col" style={{width: '20%'}}>Price</th>
                  <th scope="col" className="text-center" style={{width: '10%'}}>Stock</th>
                  <th scope="col" className="text-center" style={{width: '25%'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-5"><CSpinner color="primary" variant="grow"/><div className="text-muted mt-2">Loading inventory...</div></td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">No items match your search.</td></tr>
                ) : (
                  filteredProducts.map((product) => {
                    const pid = product.product_id
                    const qty = quantities[pid] || 1
                    const isStocked = product.stock > 0
                    const imgUrl = getProductImageUrl(product.image)
                    
                    return (
                      <tr key={pid} className={!isStocked ? 'row-disabled' : ''}>
                        <td>
                          <div className="product-combo-cell">
                            <div className="product-thumbnail-wrapper">
                              {imgUrl ? <img src={imgUrl} alt="" className="product-thumbnail" onError={(e)=>{e.target.style.display='none';e.target.nextSibling.style.display='flex'}} /> : null}
                              <div className="product-thumbnail-placeholder" style={{display: imgUrl ? 'none' : 'flex'}}><CIcon icon={cilImage} className="text-secondary"/></div>
                            </div>
                            <div className="product-text-info">
                              <span className="product-name-text">{product.name}</span>
                              <small className="text-muted">{product.brand}</small>
                              {product.requires_serial && (
                                <CBadge color="info" shape="rounded-pill" className="mt-1" style={{width: 'fit-content', fontSize: '0.65rem'}}>
                                  <CIcon icon={cilBarcode} size="sm" className="me-1"/> Serialized
                                </CBadge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="fw-bold text-brand-navy align-middle">₱{Number(product.price).toLocaleString()}</td>
                        <td className="text-center align-middle">
                           {isStocked ? <span className="badge bg-light text-dark border">{product.stock}</span> : <span className="badge bg-danger text-white">0</span>}
                        </td>
                        <td className="align-middle">
                          <div className="d-flex align-items-center justify-content-end gap-2">
                            <div className="quantity-controls">
                              <button className="quantity-btn" disabled={!isStocked} onClick={() => handleQuantityChange(pid, -1)}>-</button>
                              <input className="quantity-input" readOnly value={qty} aria-label={`Quantity for ${product.name}`}/>
                              <button className="quantity-btn" disabled={!isStocked} onClick={() => handleQuantityChange(pid, 1)}>+</button>
                            </div>
                            <CButton 
                                color="primary" 
                                size="sm" 
                                className="text-white btn-add-cart" 
                                disabled={!isStocked} 
                                onClick={() => handleAddProductClick(product)}
                                aria-label={`Add ${product.name} to order`}
                            >
                              <CIcon icon={cilPlus} />
                            </CButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- RIGHT COLUMN: TRANSACTION PANEL --- */}
        <div className="right-panel">
          <div className="sale-header">
             <h2 className="text-uppercase mb-0 d-flex align-items-center text-brand-navy fs-6">
               <CIcon icon={cilCart} className="me-2 text-primary"/> Current Order
             </h2>
             <span className="badge bg-info text-white">{saleItems.length} Items</span>
          </div>
          
          <div className="sale-items">
            {saleItems.length === 0 ? (
              <div className="empty-sale">
                <div className="p-3 rounded-circle bg-light mb-3"><CIcon icon={cilCart} size="xxl" className="text-secondary opacity-25"/></div>
                <span className="text-muted fw-semibold small">Cart is Empty</span>
              </div>
            ) : (
              saleItems.map((item) => {
                const imgUrl = getProductImageUrl(item.image);
                const isSerialItem = item.requires_serial;

                return (
                <div className="sale-item" key={item.product_id}>
                  {/* Cart Item Image */}
                  <div className="cart-item-image-wrapper">
                    {imgUrl ? <img src={imgUrl} alt="" className="cart-item-image" onError={(e)=>{e.target.style.display='none';e.target.nextSibling.style.display='flex'}} /> : null}
                    <div className="cart-item-image-placeholder" style={{display: imgUrl ? 'none' : 'flex'}}><CIcon icon={cilImage} className="text-secondary" size="sm"/></div>
                  </div>

                  {/* Cart Item Info & Quantity */}
                  <div className="sale-item-info">
                    <div className="fw-bold text-dark text-truncate" style={{fontSize: '0.95rem'}}>{item.name}</div>
                    <div className="d-flex align-items-center justify-content-between mt-1">
                       
                       {/* Quantity Controls */}
                       {isSerialItem ? (
                          <CTooltip content="Quantity cannot be adjusted in cart for serial items. Remove and re-scan.">
                            <div className="cart-qty-controls disabled op-50">
                              <button className="cart-qty-btn" disabled><CIcon icon={cilMinus} size="sm"/></button>
                              <div className="cart-qty-input-wrapper">
                                <CIcon icon={cilLockLocked} size="sm" className="text-muted me-1" style={{width: '10px'}}/>
                                <input className="cart-qty-input" readOnly value={item.quantity} disabled/>
                              </div>
                              <button className="cart-qty-btn" disabled><CIcon icon={cilPlus} size="sm"/></button>
                            </div>
                          </CTooltip>
                       ) : (
                         <div className="cart-qty-controls">
                           <button className="cart-qty-btn" onClick={() => handleCartQuantityChange(item.product_id, (Number(item.quantity) || 0) - 1)}><CIcon icon={cilMinus} size="sm"/></button>
                           <input 
                              className="cart-qty-input" 
                              type="number"
                              min="1"
                              value={item.quantity} 
                              onChange={(e) => handleCartQuantityChange(item.product_id, e.target.value)}
                              onBlur={() => handleBlurCartQuantity(item.product_id)}
                           />
                           <button className="cart-qty-btn" onClick={() => handleCartQuantityChange(item.product_id, (Number(item.quantity) || 0) + 1)}><CIcon icon={cilPlus} size="sm"/></button>
                         </div>
                       )}
                       
                       <span className="small text-muted fw-semibold">₱{item.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="sale-item-actions">
                    <span className="sale-item-price">₱{(item.price * (Number(item.quantity) || 0)).toLocaleString()}</span>
                    <button className="remove-btn" onClick={() => removeFromSale(item.product_id)} aria-label="Remove item"><CIcon icon={cilTrash} size="sm"/></button>
                  </div>
                </div>
              )})
            )}
          </div>
          
          {/* POS BOTTOM ANCHOR */}
          <div className="pos-bottom-anchor">
            <div className="sale-total-banner">
               <div className="d-flex flex-column">
                 <span className="text-uppercase fw-bold small text-muted">Total Amount</span>
                 <strong className="display-total text-brand-navy">₱{saleTotal.toLocaleString()}</strong>
               </div>
               <div className="text-end">
                 {shippingOption === 'Company Delivery' && (
                   <span className="badge bg-warning text-dark"><CIcon icon={cilTruck} className="me-1"/> Delivery</span>
                 )}
               </div>
            </div>

            {/* Client Details (Horizontal) */}
            <div className="pos-section border-bottom-0 pb-0">
              <div className="section-title"><CIcon icon={cilUser} className="me-2 text-brand-navy"/> Client Details</div>
              <div className="mb-2">
                 <CFormCheck inline type="radio" name="ctype" label="New" checked={customerType === 'new'} onChange={() => { setCustomerType('new'); setSearchClientQuery(''); }} />
                 <CFormCheck inline type="radio" name="ctype" label="Existing" checked={customerType === 'existing'} onChange={() => setCustomerType('existing')} />
              </div>
              
              {customerType === 'existing' && (
                <div className="mb-2">
                  <CFormInput 
                    list="clientOptions" 
                    size="sm" 
                    placeholder="Search Client Name..." 
                    value={searchClientQuery} 
                    onChange={handleExistingClientSelect}
                    className="border-primary"
                  />
                  <datalist id="clientOptions">
                    {backendCustomers.map((c, i) => <option key={i} value={c.customer_name} />)}
                  </datalist>
                </div>
              )}

              <div className="row g-2 mb-2">
                 <div className="col-6"><CFormInput size="sm" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={customerType === 'existing'} /></div>
                 <div className="col-6"><CFormInput size="sm" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} disabled={customerType === 'existing'} /></div>
              </div>
              <div className="row g-2 mb-2">
                 <div className="col-6"><CFormInput size="sm" placeholder="Contact No." value={contactNumber} onChange={e => setContactNumber(e.target.value)} /></div>
                 <div className="col-6">
                    <CFormSelect size="sm" value={region} onChange={e => setRegion(e.target.value)}>
                      <option value="Manila">Manila</option><option value="Pampanga">Pampanga</option><option value="Bulacan">Bulacan</option><option value="Cavite">Cavite</option>
                    </CFormSelect>
                 </div>
              </div>
              <div className="mb-2">
                 <CFormInput size="sm" placeholder="Street Address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>

            {/* Payment & Delivery */}
            <div className="pos-section pt-2">
              <div className="row g-2 mb-2">
                 <div className="col-6">
                   <CFormSelect size="sm" value={shippingOption} onChange={(e) => setShippingOption(e.target.value)}>
                     <option value="In-Store Pickup">Pickup</option>
                     <option value="Company Delivery" disabled={!isCompanyDeliveryAvailable}>Delivery {isCompanyDeliveryAvailable ? '(Free)' : '(Min 5k)'}</option>
                   </CFormSelect>
                 </div>
                 <div className="col-6">
                   <CFormSelect size="sm" value={paymentOption} onChange={(e) => setPaymentOption(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="Cash on Delivery" disabled={shippingOption !== 'Company Delivery'}>COD</option>
                  </CFormSelect>
                 </div>
              </div>
              
              {paymentOption === 'Cash' && (
                <div className="mb-2">
                  <CInputGroup size="sm">
                    <CInputGroupText>₱</CInputGroupText>
                    <CFormInput 
                      type="number" 
                      placeholder="Amount Tendered" 
                      value={tenderedAmount} 
                      onChange={e => setTenderedAmount(e.target.value)} 
                      className={tenderedAmount && Number(tenderedAmount) < saleTotal ? 'is-invalid' : ''}
                    />
                  </CInputGroup>
                  {changeDue > 0 && <div className="text-end text-success fw-bold small mt-1">Change: ₱{changeDue.toLocaleString()}</div>}
                </div>
              )}

              {paymentOption === 'GCash' && <CFormInput size="sm" className="mb-2" placeholder="GCash Reference No." value={gcashRef} onChange={e => setGcashRef(e.target.value)} />}
              
              <CButton 
                className="w-100 text-white fw-bold" 
                color={isPaymentValid ? "success" : "secondary"} 
                onClick={confirmSale} 
                disabled={submitting || !isPaymentValid}
              >
                 {submitting ? <><CSpinner size="sm" className="me-2"/> Processing...</> : 
                   !isPaymentValid ? 'ENTER PAYMENT' : 'COMPLETE ORDER'}
              </CButton>
            </div>
          </div>
        </div>
      </div>

      {/* Serial Modal */}
      <CModal visible={serialModalVisible} onClose={() => setSerialModalVisible(false)} alignment="center">
        <CModalHeader><CModalTitle>Scan Serial Numbers</CModalTitle></CModalHeader>
        <CModalBody>
          <div className="alert alert-info py-2 small">
             Please scan or select <strong>{quantities[selectedProductForSerial?.product_id]}</strong> serial numbers for <strong>{selectedProductForSerial?.name}</strong>.
          </div>
          <div className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
            {availableSerials.map((sn) => (
               <button key={sn.serial_number} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedSerials[selectedProductForSerial?.product_id]?.includes(sn.serial_number) ? 'active bg-primary border-primary' : ''}`} onClick={() => handleSerialSelection(sn.serial_number)}>
                 {sn.serial_number}
                 {selectedSerials[selectedProductForSerial?.product_id]?.includes(sn.serial_number) && <CIcon icon={cilCheckCircle} size="sm"/>}
               </button>
            ))}
          </div>
        </CModalBody>
        <CModalFooter>
            <CButton color="secondary" onClick={() => setSerialModalVisible(false)}>Cancel</CButton>
            <CButton 
                color="primary" 
                disabled={selectedSerials[selectedProductForSerial?.product_id]?.length !== quantities[selectedProductForSerial?.product_id]}
                onClick={() => addToSale(selectedProductForSerial, selectedSerials[selectedProductForSerial?.product_id])}
            >
                Confirm & Add
            </CButton>
        </CModalFooter>
      </CModal>

      {/* Msg Modal */}
      <CModal visible={msgModal.visible} onClose={closeMsgModal} alignment="center">
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody className="p-4 fs-5">{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={closeMsgModal}>Close</CButton>{msgModal.onConfirm && <CButton color={msgModal.color} className="text-white" onClick={msgModal.onConfirm}>Confirm</CButton>}</CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SalesPage