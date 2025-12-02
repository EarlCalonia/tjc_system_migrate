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
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilCart, 
  cilTrash, 
  cilMagnifyingGlass, 
  cilPlus, 
  cilMinus,
  cilList,
  cilImage,
  cilCreditCard,
  cilUser,
  cilDescription,
  cilCheckCircle,
  cilTruck
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

  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('') // Full Street Address
  const [region, setRegion] = useState('Manila') // Region/City Dropdown
  
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
  const getSaleTotal = () => saleItems.reduce((total, item) => total + item.price * item.quantity, 0)
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
    // Auto-reset shipping if criteria not met
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
    if (!isPaymentValid) return
    if (customerType === 'new' && (!firstName || !lastName)) return showMessage('Customer Error', 'Please enter customer name.', 'warning')
    if (shippingOption === 'Company Delivery' && !address) return showMessage('Address Error', 'Delivery requires a full address.', 'warning')
    
    setSubmitting(true)
    try {
      const fullName = `${firstName} ${middleName} ${lastName}`.trim()
      // Combine Address + Region
      const fullAddress = customerType === 'new' ? `${address}, ${region}` : 'Registered Address'

      const saleData = {
        customer_name: fullName,
        payment: paymentOption,
        delivery_type: shippingOption,
        total: saleTotal,
        items: saleItems,
        tendered: paymentOption === 'Cash' ? tenderedAmount : null,
        reference: paymentOption === 'GCash' ? gcashRef : null,
        address: fullAddress // Sending the full address
      }

      const result = await salesAPI.createSale(saleData)
      if (result.success) showMessage('Success', 'Transaction completed successfully!', 'success', () => window.location.reload())
      else throw new Error(result.message)
    } catch (e) { showMessage('Error', e.message || 'Failed.', 'danger') } 
    finally { setSubmitting(false) }
  }

  return (
    <CContainer fluid>
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="mb-1 fw-bold text-brand-navy" style={{fontFamily: 'Oswald, sans-serif'}}>SALES TERMINAL</h2>
          <div className="text-medium-emphasis small">Point of Sale System</div>
        </div>
        <CButton color="primary" className="text-white fw-bold" size="sm" onClick={() => window.location.reload()}>
          <CIcon icon={cilCart} className="me-2" /> Reset Terminal
        </CButton>
      </div>

      <div className="sales-content">
        {/* --- LEFT COLUMN: ITEM LOOKUP --- */}
        <div className="products-section">
          <div className="products-header">
            <h2 className="fs-5 mb-0 text-uppercase fw-bold text-brand-navy">Item Lookup</h2>
            <CInputGroup size="sm" style={{ maxWidth: '280px' }}>
              <CInputGroupText className="bg-light border-end-0"><CIcon icon={cilMagnifyingGlass}/></CInputGroupText>
              <CFormInput className="border-start-0 ps-0" placeholder="Scan or Search Item..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search Products" autoFocus/>
            </CInputGroup>
          </div>
          
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th scope="col" style={{width: '40%'}}>Description</th>
                  <th scope="col" style={{width: '15%'}}>Unit Price</th>
                  <th scope="col" className="text-center" style={{width: '10%'}}>Stock</th>
                  <th scope="col" className="text-center" style={{width: '20%'}}>Quantity</th>
                  <th scope="col" className="text-center" style={{width: '5%'}}>SN</th>
                  <th scope="col" className="text-end" style={{width: '10%'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5"><CSpinner color="primary" variant="grow"/><div className="text-muted mt-2">Loading items...</div></td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">No items found</td></tr>
                ) : (
                  filteredProducts.map((product) => {
                    const pid = product.product_id
                    const qty = quantities[pid] || 1
                    const serials = selectedSerials[pid] || []
                    const isStocked = product.stock > 0
                    const imgUrl = getProductImageUrl(product.image)
                    
                    return (
                      <tr key={pid} className={!isStocked ? 'row-disabled' : ''}>
                        <td>
                          <div className="product-combo-cell">
                            <div className="product-thumbnail-wrapper">
                              {imgUrl ? <img src={imgUrl} alt={product.name} className="product-thumbnail" onError={(e)=>{e.target.style.display='none';e.target.nextSibling.style.display='flex'}} /> : null}
                              <div className="product-thumbnail-placeholder" style={{display: imgUrl ? 'none' : 'flex'}}><CIcon icon={cilImage} className="text-secondary"/></div>
                            </div>
                            <div className="product-text-info">
                              <span className="product-name-text">{product.name}</span>
                              <small className="text-muted">{product.brand}</small>
                            </div>
                          </div>
                        </td>
                        <td className="fw-bold text-brand-navy">₱{Number(product.price).toLocaleString()}</td>
                        <td className="text-center">
                           {isStocked ? <CBadge color="success" shape="rounded-pill">{product.stock}</CBadge> : <CBadge color="danger" shape="rounded-pill">0</CBadge>}
                        </td>
                        <td>
                          <div className="quantity-controls">
                            <button className="quantity-btn" disabled={!isStocked} onClick={() => handleQuantityChange(pid, -1)}><CIcon icon={cilMinus} size="sm"/></button>
                            <input className="quantity-input" type="text" readOnly value={qty} aria-label="Qty"/>
                            <button className="quantity-btn" disabled={!isStocked} onClick={() => handleQuantityChange(pid, 1)}><CIcon icon={cilPlus} size="sm"/></button>
                          </div>
                        </td>
                        <td className="text-center">
                          {product.requires_serial ? (
                             <div onClick={() => isStocked && handleOpenSerialModal(product)} className={`cursor-pointer badge ${serials.length === qty ? 'bg-info text-white' : 'bg-warning text-dark'}`} style={{cursor:'pointer'}}>
                               {serials.length}/{qty}
                             </div>
                          ) : <span className="text-muted">-</span>}
                        </td>
                        <td className="text-end">
                          <CButton color="primary" size="sm" className="text-white fw-bold" disabled={!isStocked} onClick={() => addToSale(product)}><CIcon icon={cilPlus} size="sm"/></CButton>
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
             <h2 className="text-uppercase mb-0 d-flex align-items-center text-brand-navy">
               <CIcon icon={cilDescription} className="me-2"/> Summary
             </h2>
          </div>
          <div className="sale-items">
            {saleItems.length === 0 ? (
              <div className="empty-sale">
                <div className="p-4 rounded-circle bg-light mb-3"><CIcon icon={cilCart} size="3xl" className="text-secondary"/></div>
                <span className="text-muted fw-semibold">Cart is Empty</span>
                <small className="text-muted">Scan or select items to begin</small>
              </div>
            ) : (
              saleItems.map((item) => (
                <div className="sale-item" key={item.product_id}>
                  <div className="sale-item-info">
                    <div className="fw-bold text-dark">{item.name}</div>
                    <div className="small text-muted d-flex justify-content-between mt-1">
                       <span>{item.quantity} x ₱{item.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="sale-item-actions">
                    <span className="sale-item-price">₱{(item.price * item.quantity).toLocaleString()}</span>
                    <button className="remove-btn" onClick={() => removeFromSale(item.product_id)}><CIcon icon={cilTrash} size="sm"/></button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="sale-total-banner">
             <span className="text-uppercase fw-bold">Total Due</span>
             <strong className="display-total">₱{saleTotal.toLocaleString()}</strong>
          </div>

          {/* --- CLIENT DETAILS --- */}
          <div className="pos-section">
            <div className="section-title"><CIcon icon={cilUser} className="me-2 text-brand-navy"/> Client Details</div>
            <div className="mb-2">
               <CFormCheck inline type="radio" name="ctype" label="New Client" checked={customerType === 'new'} onChange={() => setCustomerType('new')} />
               <CFormCheck inline type="radio" name="ctype" label="Existing Client" checked={customerType === 'existing'} onChange={() => setCustomerType('existing')} />
            </div>
            {customerType === 'new' ? (
              <div className="d-grid gap-2">
                <div className="d-flex gap-2">
                   <CFormInput size="sm" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                   <CFormInput size="sm" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <CFormInput size="sm" placeholder="Contact Number" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
                
                {/* [FIX] Address Text Field */}
                <CFormInput size="sm" placeholder="Street Address / Landmark" value={address} onChange={e => setAddress(e.target.value)} />
                
                {/* [FIX] Region Dropdown */}
                <CFormSelect size="sm" value={region} onChange={e => setRegion(e.target.value)} aria-label="Region">
                  <option value="Manila">Manila</option><option value="Pampanga">Pampanga</option><option value="Bulacan">Bulacan</option><option value="Cavite">Cavite</option>
                </CFormSelect>
              </div>
            ) : (
              <CFormSelect size="sm">
                <option>Select Registered Client...</option>
                {backendCustomers.map((c, i) => <option key={i} value={c.id}>{c.customer_name}</option>)}
              </CFormSelect>
            )}
          </div>

          {/* --- PAYMENT & SHIPPING --- */}
          <div className="pos-section flex-grow-1">
            <div className="section-title"><CIcon icon={cilCreditCard} className="me-2 text-brand-navy"/> Payment & Delivery</div>
            
            {/* [FIX] Delivery Method Selector */}
            <div className="mb-2">
               <CFormLabel className="small text-muted mb-1">Delivery Method</CFormLabel>
               <CFormSelect size="sm" value={shippingOption} onChange={(e) => setShippingOption(e.target.value)}>
                 <option value="In-Store Pickup">In-Store Pickup</option>
                 <option value="Company Delivery" disabled={!isCompanyDeliveryAvailable}>
                    Company Delivery {isCompanyDeliveryAvailable ? '(Free)' : '(Min ₱5k Order)'}
                 </option>
               </CFormSelect>
            </div>

            <div className="mb-2">
              <CFormLabel className="small text-muted mb-1">Payment Method</CFormLabel>
              <CFormSelect size="sm" value={paymentOption} onChange={(e) => setPaymentOption(e.target.value)}>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Cash on Delivery" disabled={shippingOption !== 'Company Delivery'}>COD (Delivery Only)</option>
              </CFormSelect>
            </div>
            
            {paymentOption === 'Cash' && (
              <>
                <CInputGroup className="mb-2">
                  <CInputGroupText>₱</CInputGroupText>
                  <CFormInput 
                    type="number" 
                    placeholder="Amount Tendered" 
                    value={tenderedAmount} 
                    onChange={e => setTenderedAmount(e.target.value)} 
                    className={tenderedAmount && Number(tenderedAmount) < saleTotal ? 'is-invalid' : ''}
                  />
                </CInputGroup>
                {changeDue > 0 && (
                  <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded border">
                    <span className="small fw-bold text-muted">CHANGE:</span>
                    <span className="fw-bold text-success fs-5">₱{changeDue.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}

            {paymentOption === 'GCash' && <CFormInput className="mb-2" placeholder="GCash Reference No." value={gcashRef} onChange={e => setGcashRef(e.target.value)} />}
            
            <CButton 
              className="w-100 mt-3 text-white fw-bold py-2" 
              color={isPaymentValid ? "success" : "secondary"} 
              size="lg" 
              onClick={confirmSale} 
              disabled={submitting || !isPaymentValid}
            >
               {submitting ? <><CSpinner size="sm" className="me-2"/> Processing...</> : 
                 !isPaymentValid ? 'ENTER PAYMENT' : 'COMPLETE ORDER'}
            </CButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CModal visible={msgModal.visible} onClose={closeMsgModal} alignment="center">
        <CModalHeader className={`bg-${msgModal.color} text-white`}><CModalTitle>{msgModal.title}</CModalTitle></CModalHeader>
        <CModalBody className="p-4 fs-5">{msgModal.message}</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={closeMsgModal}>Close</CButton>{msgModal.onConfirm && <CButton color={msgModal.color} className="text-white" onClick={msgModal.onConfirm}>Confirm</CButton>}</CModalFooter>
      </CModal>

      <CModal visible={serialModalVisible} onClose={() => setSerialModalVisible(false)} alignment="center">
        <CModalHeader><CModalTitle>Select Serial Numbers</CModalTitle></CModalHeader>
        <CModalBody>
          <p className="text-muted">Required: <strong>{quantities[selectedProductForSerial?.product_id]}</strong></p>
          <div className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
            {availableSerials.map((sn) => (
               <button key={sn.serial_number} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedSerials[selectedProductForSerial?.product_id]?.includes(sn.serial_number) ? 'active bg-primary border-primary' : ''}`} onClick={() => handleSerialSelection(sn.serial_number)}>
                 {sn.serial_number}
                 {selectedSerials[selectedProductForSerial?.product_id]?.includes(sn.serial_number) && <CIcon icon={cilCheckCircle} size="sm"/>}
               </button>
            ))}
          </div>
        </CModalBody>
        <CModalFooter><CButton color="primary" onClick={() => setSerialModalVisible(false)}>Done Selecting</CButton></CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SalesPage