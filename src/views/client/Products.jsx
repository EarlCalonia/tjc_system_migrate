import React, { useState, useEffect } from 'react';
import Navbar from '../../components/client/Navbar';
import Footer from '../../components/client/Footer';
import { productAPI } from '../../utils/api'; 
import '../../styles/Products.css'; 

import bg from '../../assets/image-background.png';
import noImageFound from '../../assets/no-image-branded.png';

const ProductSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-image"></div>
    <div className="skeleton-content">
      <div className="skeleton-text short"></div>
      <div className="skeleton-text title"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text short"></div>
    </div>
  </div>
);

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes, brandRes] = await Promise.all([
          productAPI.getProducts(),
          productAPI.getCategories(),
          productAPI.getBrands()
        ]);

        let productList = [];
        if (prodRes?.data?.products && Array.isArray(prodRes.data.products)) productList = prodRes.data.products;
        else if (prodRes?.data && Array.isArray(prodRes.data)) productList = prodRes.data;
        else if (Array.isArray(prodRes)) productList = prodRes;
        setProducts(productList);

        if (catRes?.data) setCategories(catRes.data);
        if (brandRes?.data) setBrands(brandRes.data);

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isNewProduct = (dateString) => {
    if (!dateString) return false;
    const productDate = new Date(dateString);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return productDate > thirtyDaysAgo;
  };

  const filteredProducts = Array.isArray(products) ? products
    .filter((product) => {
      const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
      const matchesBrand = brandFilter === 'All' || product.brand === brandFilter;
      const price = parseFloat(product.price || 0);
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      const matchesPrice = price >= min && price <= max;
      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    })
    .sort((a, b) => {
      if (sortOrder === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
      if (sortOrder === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
      return new Date(b.created_at) - new Date(a.created_at);
    }) : [];

  const StockBadge = ({ quantity }) => {
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) return <span className="stock-badge out">Out of Stock</span>;
    if (qty < 10) return <span className="stock-badge low">Low Stock: {qty}</span>;
    return <span className="stock-badge in">In Stock: {qty}</span>;
  };

  const ProductModal = () => {
    if (!selectedProduct) return null;
    const stockQty = parseInt(selectedProduct.quantity) || 0;
    const stockPercent = Math.min((stockQty / 50) * 100, 100);
    const stockColor = stockQty > 10 ? '#27ae60' : (stockQty > 0 ? '#f39c12' : '#e74c3c');

    const handleGetDirections = () => {
      const address = "Gen Hizon Ext, Santa Lucia, City of San Fernando, Pampanga";
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    };

    return (
      <div className="client-modal-overlay" onClick={() => setSelectedProduct(null)}>
        <div className="client-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Product Specifications</h3>
            <button className="client-modal-close" onClick={() => setSelectedProduct(null)}>×</button>
          </div>
          <div className="product-detail-layout">
            <div className="modal-image-section">
              <img 
                src={selectedProduct.image ? `http://localhost:5000${selectedProduct.image}` : noImageFound} 
                alt={selectedProduct.name}
                className="modal-product-image"
                onError={(e) => { e.target.src = noImageFound; }} 
              />
            </div>
            <div className="modal-info-section">
              <div className="modal-breadcrumbs">{selectedProduct.category || 'General'} › {selectedProduct.brand || 'Generic'}</div>
              <h2 className="modal-title">{selectedProduct.name}</h2>
              
              <div className="modal-price">
                <span className="currency-symbol">₱</span>
                {parseFloat(selectedProduct.price || 0).toLocaleString()}
              </div>
              
              <div className="stock-visualizer">
                <div className="stock-label">
                  <span>Availability</span>
                  <span style={{color: stockColor, fontWeight: 'bold'}}>
                    {stockQty > 0 ? `${stockQty} Units Available` : 'Out of Stock'}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{width: `${stockPercent}%`, backgroundColor: stockColor}}></div>
                </div>
                <small className="stock-note">{stockQty > 0 ? 'Stocks available for immediate pickup.' : 'Please contact us for restocking info.'}</small>
              </div>

              <div className="trust-badges-container">
                <div className="trust-badge">
                  <i className="fas fa-check-circle"></i>
                  <span>Original Surplus</span>
                </div>
                <div className="trust-badge">
                  <i className="fas fa-thumbs-up"></i>
                  <span>Test Before Pay</span>
                </div>
                <div className="trust-badge">
                  <i className="fas fa-wrench"></i>
                  <span>Expert Support</span>
                </div>
              </div>

              <div className="specs-grid">
                <div className="spec-item"><span className="spec-label">Brand</span><span className="spec-value">{selectedProduct.brand || 'N/A'}</span></div>
                <div className="spec-item"><span className="spec-label">ID</span><span className="spec-value">#{selectedProduct.product_id}</span></div>
                <div className="spec-item"><span className="spec-label">Category</span><span className="spec-value">{selectedProduct.category}</span></div>
                {selectedProduct.vehicle_compatibility && (
                  <div className="spec-item"><span className="spec-label">Fitment</span><span className="spec-value">{selectedProduct.vehicle_compatibility}</span></div>
                )}
              </div>
              
              <div className="modal-description-box">
                <h4>Description</h4>
                <p>{selectedProduct.description || 'No description available.'}</p>
              </div>

              <div className="modal-store-footer">
                <div className="store-icon"><i className="fas fa-map-marker-alt"></i></div>
                <div className="store-text">
                  <strong>Available at San Fernando Branch</strong>
                  <p>Gen Hizon Ext, Santa Lucia, Pampanga</p>
                </div>
                <button className="visit-store-btn" onClick={handleGetDirections}>
                  Get Directions <i className="fas fa-external-link-alt" style={{marginLeft:'5px'}}></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="showroom-wrapper">
      <Navbar />
      <ProductModal />

      <header 
        className="showroom-hero"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="hero-content">
          {/* --- UPDATED TEXT --- */}
          <h1>Premium Quality Repairs on a Budget.</h1>
          <p>Your trusted shop for Original Japan & Korean Surplus Parts.</p>
          
          <div className="store-info-banner">
            <i className="fas fa-map-marker-alt"></i> Gen Hizon Ext, Santa Lucia, City of San Fernando, Pampanga
          </div>
        </div>
      </header>

      <div className="showroom-container">
        <button className="mobile-filter-toggle" onClick={() => setShowMobileFilters(true)}>
          <i className="fas fa-filter"></i> Filter Inventory
        </button>

        <aside className={`filters-sidebar ${showMobileFilters ? 'open' : ''}`}>
          <h3>
            Filter Inventory
            <button className="close-filters-btn" onClick={() => setShowMobileFilters(false)}>×</button>
          </h3>
          
          <div className="filter-group">
            <label>Search</label>
            <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Brand</label>
            <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
              <option value="All">All Brands</option>
              {brands.map((brand, i) => <option key={i} value={brand}>{brand}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Price Range (<span className="currency-symbol" style={{fontWeight:'normal'}}>₱</span>)</label>
            <div className="price-inputs">
              <input 
                type="number" 
                placeholder="Min" 
                value={priceRange.min} 
                onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Max" 
                value={priceRange.max} 
                onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </aside>

        <main className="product-grid-section">
          <div className="results-header">
            <span>{loading ? 'Updating...' : `Showing ${filteredProducts.length} items`}</span>
            {(categoryFilter !== 'All' || brandFilter !== 'All' || searchTerm || priceRange.min || priceRange.max) && (
              <button className="clear-filter-btn" onClick={() => {
                setCategoryFilter('All'); setBrandFilter('All'); setSearchTerm(''); setPriceRange({min:'', max:''});
              }}>Clear Filters</button>
            )}
          </div>

          <div className="product-grid">
            {loading ? (
              [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div className="product-card" key={product.id || product._id}>
                  {isNewProduct(product.created_at) && <div className="new-badge">NEW</div>}
                  
                  <div className="card-image-wrapper">
                    <img 
                      src={product.image ? `http://localhost:5000${product.image}` : noImageFound} 
                      alt={product.name}
                      onError={(e) => { e.target.src = noImageFound; }} 
                    />
                    {(parseInt(product.quantity) || 0) > 0 && <div className="store-available-tag">Available In-Store</div>}
                  </div>
                  
                  <div className="card-details">
                    <div className="card-meta">
                      <span className="category-tag">{product.category}</span>
                      <StockBadge quantity={product.quantity} />
                    </div>
                    <h3 className="product-title">{product.name}</h3>
                    <p className="product-desc">{product.description || 'Click for details.'}</p>
                    
                    <div className="card-footer">
                      <span className="price">
                        <span className="currency-symbol">₱</span>
                        {parseFloat(product.price).toLocaleString()}
                      </span>
                      <button className="visit-btn" onClick={() => setSelectedProduct(product)}>View Details</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <i className="fas fa-search"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filters or price range.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Products;