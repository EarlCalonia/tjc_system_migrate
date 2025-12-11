import jsPDF from 'jspdf';
import logoUrl from '../assets/tcj_logo.png?url';

// ==========================================
// 1. CONFIG & THEME
// ==========================================
const THEME = {
  primary: '#2c3e50',    // Dark Slate Blue (Headers)
  secondary: '#34495e',  // Lighter Blue (Subheaders)
  accent: '#f1f5f9',     // Very Light Grey (Info Boxes & Zebra stripes)
  text: '#333333',       // Dark Grey (Body text)
  lightText: '#7f8c8d',  // Grey (Labels)
  white: '#ffffff',
  line: '#cbd5e1',       // Light border color
};

const LAYOUT = {
  marginX: 15,
  lineHeight: 6,
  headerHeight: 8,
  pageWidth: 210, // A4 width in mm
};

// ==========================================
// 2. HELPERS
// ==========================================

const loadImageAsDataURL = async (url) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `PHP ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

const truncateText = (doc, text, maxWidth) => {
  if (!text) return '';
  const str = String(text);
  if (doc.getTextWidth(str) <= maxWidth) return str;
  
  let len = str.length;
  while (len > 0) {
      const sub = str.substring(0, len) + '...';
      if (doc.getTextWidth(sub) <= maxWidth) return sub;
      len--;
  }
  return '...';
};

// --- NEW DESIGN HELPERS ---

// 1. Draw Top Header (Logo + Store Info) - Same as Receipt
const drawHeader = (doc, logoDataUrl, storeSettings = {}) => {
  const HEADER_Y = 15;
  const LOGO_WIDTH = 25; 
  const LOGO_HEIGHT = 15;
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', LAYOUT.marginX, HEADER_Y, LOGO_WIDTH, LOGO_HEIGHT);
  }
  
  let y = HEADER_Y + 2;
  
  // Store Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(THEME.primary);
  doc.text(storeSettings.store_name || 'TJC AUTO SUPPLY', PAGE_WIDTH - LAYOUT.marginX, y, { align: 'right' });
  
  y += 6;
  
  // Address & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(THEME.lightText);
  doc.text(storeSettings.address || 'San Fernando, Pampanga', PAGE_WIDTH - LAYOUT.marginX, y, { align: 'right' });
  
  y += 5;
  const contactText = `${storeSettings.email || 'tjautosupply@gmail.com'} | ${storeSettings.contact_number || 'N/A'}`;
  doc.text(contactText, PAGE_WIDTH - LAYOUT.marginX, y, { align: 'right' });
  
  return 40; // Return Y position where next element starts
};

// 2. Draw "Receipt Style" Metadata Box
const drawMetadataBox = (doc, y, title, leftCol = [], rightCol = []) => {
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const BOX_HEIGHT = 28;
  const CONTENT_WIDTH = PAGE_WIDTH - (LAYOUT.marginX * 2);

  // Background Box
  doc.setDrawColor(THEME.line);
  doc.setFillColor(THEME.accent);
  doc.roundedRect(LAYOUT.marginX, y, CONTENT_WIDTH, BOX_HEIGHT, 2, 2, 'FD'); // Fill and Draw border

  // Report Title (Top Left of Box)
  let textY = y + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(THEME.primary);
  doc.text(title.toUpperCase(), LAYOUT.marginX + 5, textY);

  // Divider Line inside Box
  doc.setDrawColor(THEME.line);
  doc.line(LAYOUT.marginX + 5, textY + 4, PAGE_WIDTH - LAYOUT.marginX - 5, textY + 4);

  // Columns Data
  textY += 10;
  doc.setFontSize(9);

  // Left Column
  leftCol.forEach((line, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(THEME.lightText);
      const label = line.label + ': ';
      doc.text(label, LAYOUT.marginX + 5, textY + (i * 5));
      
      doc.setFont('helvetica', 'bold'); // Value is bold
      doc.setTextColor(THEME.text);
      doc.text(line.value, LAYOUT.marginX + 5 + doc.getTextWidth(label), textY + (i * 5));
  });

  // Right Column (Aligned to right of box)
  rightCol.forEach((line, i) => {
      const label = line.label + ': ';
      const value = line.value;
      const xPos = PAGE_WIDTH - LAYOUT.marginX - 5;
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(THEME.text);
      doc.text(value, xPos, textY + (i * 5), { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(THEME.lightText);
      doc.text(label, xPos - doc.getTextWidth(value), textY + (i * 5), { align: 'right' });
  });

  return y + BOX_HEIGHT + 10; // Return Y for table start
};


// Helper: Draw Footer
const drawFooter = (doc, adminName) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = 285;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(THEME.line);
    doc.line(LAYOUT.marginX, footerY - 5, pageWidth - LAYOUT.marginX, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(THEME.lightText);
    doc.text(`Generated by: ${adminName} | ${new Date().toLocaleString()}`, LAYOUT.marginX, footerY);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - LAYOUT.marginX, footerY, { align: 'right' });
  }
};

// ==========================================
// 3. REPORT GENERATORS
// ==========================================

// --- SALES REPORT ---
export const generateSalesReportPDF = async (salesData, startDate, endDate, adminName, rangeLabel = 'Daily', storeSettings = {}) => {
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataURL(logoUrl);
  
  // 1. Header
  let yPos = drawHeader(doc, logoDataUrl, storeSettings);

  // 2. Info Box (Receipt Aesthetic)
  const totalSales = salesData.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
  yPos = drawMetadataBox(doc, yPos, 'Sales Performance Report', 
    [
      { label: 'Date Range', value: `${formatDate(startDate)} - ${formatDate(endDate)}` },
      { label: 'Filter', value: rangeLabel }
    ],
    [
      { label: 'Total Revenue', value: formatCurrency(totalSales) },
      { label: 'Transactions', value: salesData.length.toString() }
    ]
  );

  const filteredOrders = salesData || [];
  
  const flattenedData = filteredOrders.map(order => ({
      date: formatDate(order.orderDate),
      name: order.productName, 
      qty: Number(order.quantity) || 0,
      price: Number(order.unitPrice) || 0,
      total: Number(order.totalPrice) || 0,
      payment: order.paymentMethod || 'Cash',
      status: order.paymentStatus || 'Paid'
  }));

  // Page Width: 210mm | Margins: 15mm | Working Width: 180mm
  const cols = {
    date: { x: 15, w: 22 },
    name: { x: 38, w: 55 },
    qty: { x: 100, w: 10 },
    price: { x: 125, w: 20 },
    total: { x: 150, w: 25 },
    pay: { x: 155, w: 20 },
    stat: { x: 195, w: 20 }
  };

  const drawTableHeader = (y) => {
    doc.setFillColor(THEME.primary);
    doc.rect(15, y, 180, 8, 'F'); 
    doc.setTextColor(THEME.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    
    doc.text('Date', cols.date.x + 2, y + 5.5);
    doc.text('Product Name', cols.name.x, y + 5.5);
    doc.text('Qty', cols.qty.x, y + 5.5, { align: 'center' });
    doc.text('Price', cols.price.x, y + 5.5, { align: 'right' });
    doc.text('Total', cols.total.x, y + 5.5, { align: 'right' });
    doc.text('Method', cols.pay.x, y + 5.5, { align: 'left' });
    doc.text('Status', cols.stat.x, y + 5.5, { align: 'right' });
  };

  drawTableHeader(yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  flattenedData.forEach((item, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
      drawTableHeader(yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal'); 
      doc.setFontSize(8); 
    }

    if (index % 2 === 0) {
      doc.setFillColor(THEME.accent);
      doc.rect(15, yPos, 180, 7, 'F');
    }

    doc.setTextColor(THEME.text);
    const name = truncateText(doc, item.name, cols.name.w - 2);

    doc.text(item.date, cols.date.x + 2, yPos + 5);
    doc.text(name, cols.name.x, yPos + 5);
    doc.text(item.qty.toString(), cols.qty.x, yPos + 5, { align: 'center' });
    doc.text(formatCurrency(item.price).replace('PHP ',''), cols.price.x, yPos + 5, { align: 'right' });
    doc.text(formatCurrency(item.total).replace('PHP ',''), cols.total.x, yPos + 5, { align: 'right' });
    
    const payment = truncateText(doc, item.payment, cols.pay.w - 1);
    doc.text(payment, cols.pay.x, yPos + 5, { align: 'left' });
    
    if(item.status !== 'Paid') doc.setTextColor('#e74c3c'); 
    else doc.setTextColor('#27ae60'); 
    doc.text(item.status, cols.stat.x, yPos + 5, { align: 'right' });

    yPos += 7;
  });

  drawFooter(doc, adminName);
  return doc;
};


// --- INVENTORY REPORT ---
export const generateInventoryReportPDF = async (inventoryData, startDate, endDate, adminName, storeSettings = {}) => {
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataURL(logoUrl);
  
  let yPos = drawHeader(doc, logoDataUrl, storeSettings);

  const totalValue = inventoryData.reduce((acc, item) => acc + (item.currentStock * item.price), 0);
  const lowStockCount = inventoryData.filter(i => i.stockStatus === 'Low Stock').length;

  yPos = drawMetadataBox(doc, yPos, 'Current Inventory Valuation', 
    [
      { label: 'Date', value: formatDate(new Date()) },
      { label: 'Total Items', value: inventoryData.length.toString() }
    ],
    [
      { label: 'Total Asset Value', value: formatCurrency(totalValue) },
      { label: 'Low Stock Alerts', value: lowStockCount.toString() }
    ]
  );

  const cols = {
    name: { x: 15, w: 65 }, 
    brand: { x: 82, w: 35 },
    qty: { x: 120, w: 15 },
    price: { x: 150, w: 25 },
    val: { x: 195, w: 25 }
  };

  const drawTableHeader = (y) => {
    doc.setFillColor(THEME.primary);
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(THEME.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    doc.text('Product Name', cols.name.x + 2, y + 5.5);
    doc.text('Brand', cols.brand.x, y + 5.5);
    doc.text('Stock', cols.qty.x, y + 5.5, { align: 'center' });
    doc.text('Unit Price', cols.price.x, y + 5.5, { align: 'right' });
    doc.text('Total Value', cols.val.x, y + 5.5, { align: 'right' });
  };

  drawTableHeader(yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  inventoryData.forEach((item, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
      drawTableHeader(yPos);
      yPos += 8;
    }

    if (index % 2 === 0) {
      doc.setFillColor(THEME.accent);
      doc.rect(15, yPos, 180, 7, 'F');
    }

    const name = truncateText(doc, item.productName, cols.name.w - 2);
    const brand = truncateText(doc, item.brand || '-', cols.brand.w - 2);
    const value = item.currentStock * item.price;

    doc.setTextColor(THEME.text);
    doc.setFont('helvetica', 'normal');
    
    doc.text(name, cols.name.x + 2, yPos + 5);
    doc.text(brand, cols.brand.x, yPos + 5);
    
    if (item.stockStatus !== 'In Stock') doc.setTextColor('#e74c3c');
    doc.text(item.currentStock.toString(), cols.qty.x, yPos + 5, { align: 'center' });
    
    doc.setTextColor(THEME.text);
    doc.text(formatCurrency(item.price).replace('PHP ',''), cols.price.x, yPos + 5, { align: 'right' });
    doc.text(formatCurrency(value).replace('PHP ',''), cols.val.x, yPos + 5, { align: 'right' });

    yPos += 7;
  });

  drawFooter(doc, adminName);
  return doc;
};


// --- SMART DEAD STOCK REPORT ---
export const generateDeadStockReportPDF = async (deadStockData, adminName, storeSettings = {}) => {
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataURL(logoUrl);

  let yPos = drawHeader(doc, logoDataUrl, storeSettings);

  const totalCapital = deadStockData.reduce((acc, item) => acc + (Number(item.tiedUpValue) || 0), 0);

  yPos = drawMetadataBox(doc, yPos, 'Dormant Inventory Report', 
    [
      { label: 'Criteria', value: '> 1 Year Inactivity' },
      { label: 'Items Flagged', value: deadStockData.length.toString() }
    ],
    [
      { label: 'Tied Up Capital', value: formatCurrency(totalCapital) }
    ]
  );

  const cols = {
    name: { x: 15, w: 75 },
    category: { x: 95, w: 35 },
    qty: { x: 135, w: 15 },
    capital: { x: 165, w: 25 },
    dormancy: { x: 195, w: 20 }
  };

  const drawTableHeader = (y) => {
    doc.setFillColor(THEME.primary);
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(THEME.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    
    doc.text('Product / Serial Unit', cols.name.x + 2, y + 5.5);
    doc.text('Category', cols.category.x, y + 5.5);
    doc.text('Stock', cols.qty.x, y + 5.5, { align: 'center' });
    doc.text('Tied Capital', cols.capital.x, y + 5.5, { align: 'right' });
    doc.text('Dormancy', cols.dormancy.x, y + 5.5, { align: 'right' });
  };

  drawTableHeader(yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  deadStockData.forEach((item, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
      drawTableHeader(yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    if (index % 2 === 0) {
      doc.setFillColor(THEME.accent);
      doc.rect(15, yPos, 180, 7, 'F');
    }

    doc.setTextColor(THEME.text);

    let displayName = item.name;
    if(item.type === 'Serial') {
        displayName += ` (SN: ${item.serialNumber})`;
    }
    displayName = truncateText(doc, displayName, cols.name.w - 2);

    doc.text(displayName, cols.name.x + 2, yPos + 5);
    doc.text(truncateText(doc, item.category || '-', cols.category.w - 2), cols.category.x, yPos + 5);
    doc.text(String(item.currentStock), cols.qty.x, yPos + 5, { align: 'center' });
    
    const cap = Number(item.tiedUpValue) || 0;
    doc.text(formatCurrency(cap).replace('PHP ',''), cols.capital.x, yPos + 5, { align: 'right' });
    
    const days = String(item.daysDormant).replace(' days', '');
    doc.text(`${days} d`, cols.dormancy.x, yPos + 5, { align: 'right' });

    yPos += 7;
  });

  drawFooter(doc, adminName);
  return doc;
};


// --- RETURNS REPORT ---
export const generateReturnsReportPDF = async (returnsData, startDate, endDate, adminName, storeSettings = {}) => {
  const doc = new jsPDF();
  const logoDataUrl = await loadImageAsDataURL(logoUrl);

  let yPos = drawHeader(doc, logoDataUrl, storeSettings);

  const totalRefunds = returnsData.reduce((acc, item) => acc + (Number(item.refund_amount) || 0), 0);

  yPos = drawMetadataBox(doc, yPos, 'Returns & Refunds Log', 
    [
      { label: 'Period', value: `${formatDate(startDate)} - ${formatDate(endDate)}` },
      { label: 'Total Returns', value: returnsData.length.toString() }
    ],
    [
      { label: 'Total Refunded', value: formatCurrency(totalRefunds) }
    ]
  );

  // [FIXED] Updated Column Widths to prevent ID overlapping items
  const cols = {
    id: { x: 15, w: 35 },     // Widened for long IDs (was 20)
    items: { x: 53, w: 45 },  // Shifted right (was 40, w50)
    customer: { x: 100, w: 30 }, // Shifted right
    reason: { x: 133, w: 30 },   // Shifted right
    amount: { x: 195, w: 25 }    // Right Aligned
  };

  const drawTableHeader = (y) => {
    doc.setFillColor(THEME.primary);
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(THEME.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    
    doc.text('Return ID', cols.id.x + 2, y + 5.5);
    doc.text('Items Returned', cols.items.x, y + 5.5);
    doc.text('Customer', cols.customer.x, y + 5.5);
    doc.text('Reason', cols.reason.x, y + 5.5);
    doc.text('Refund', cols.amount.x, y + 5.5, { align: 'right' });
  };

  drawTableHeader(yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  returnsData.forEach((item, index) => {
    const itemsList = item.items || [];
    const rowHeight = Math.max(7, (itemsList.length * 4) + 4); 

    if (yPos + rowHeight > 280) {
      doc.addPage();
      yPos = 20;
      drawTableHeader(yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal'); 
      doc.setFontSize(8);
    }

    if (index % 2 === 0) {
      doc.setFillColor(THEME.accent);
      doc.rect(15, yPos, 180, rowHeight, 'F');
    }

    doc.setTextColor(THEME.text);
    
    // [UPDATED] Uses wider column 'w' for truncation
    const idText = truncateText(doc, item.return_id, cols.id.w - 2);
    doc.text(idText, cols.id.x + 2, yPos + 5);
    
    const customer = truncateText(doc, item.customer_name, cols.customer.w - 2);
    doc.text(customer, cols.customer.x, yPos + 5);

    const reason = truncateText(doc, item.return_reason || 'N/A', cols.reason.w - 2);
    doc.text(reason, cols.reason.x, yPos + 5);
    
    const amt = Number(item.refund_amount) || 0;
    doc.text(formatCurrency(amt), cols.amount.x, yPos + 5, { align: 'right' });

    let itemY = yPos + 5;
    if (itemsList.length > 0) {
        itemsList.forEach(prod => {
            let line = `• ${prod.product_name}`;
            if(prod.serial_numbers) line += ` (SN: ${prod.serial_numbers})`;
            line = truncateText(doc, line, cols.items.w - 2);
            doc.text(line, cols.items.x, itemY);
            itemY += 4; 
        });
    } else {
        doc.text('-', cols.items.x, itemY);
    }

    yPos += rowHeight;
  });

  drawFooter(doc, adminName);
  return doc;
};


// --- RECEIPT GENERATOR (Reference Implementation) ---
export const generateSaleReceipt = async ({
  saleNumber,
  customerName,
  items = [],
  totalAmount = 0,
  paymentMethod = 'Cash',
  tenderedAmount = 0,
  changeAmount = 0,
  address = '',
  shippingOption = 'In-Store Pickup',
  createdAt = new Date(),
  storeSettings = {} 
}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  
  const logoDataUrl = await loadImageAsDataURL(logoUrl);

  // 1. Header
  let y = drawHeader(doc, logoDataUrl, storeSettings);

  // 2. Info Box (Receipt Style)
  y = drawMetadataBox(doc, y, 'Official Receipt', 
    [
      { label: 'Customer', value: customerName || 'Walk-in' },
      { label: 'Date', value: formatDate(createdAt) },
      { label: 'Address', value: truncateText(doc, address || shippingOption, 80) }
    ],
    [
      { label: 'Receipt #', value: String(saleNumber) },
      { label: 'Payment', value: paymentMethod }
    ]
  );

  const cols = {
    desc: { x: 15, w: 90 },
    qty: { x: 130, w: 20 },
    price: { x: 160, w: 25 },
    total: { x: 195, w: 25 }
  };

  doc.setFillColor(THEME.primary);
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(THEME.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Item Description', cols.desc.x + 2, y + 5.5);
  doc.text('Qty', cols.qty.x, y + 5.5, { align: 'center' });
  doc.text('Price', cols.price.x, y + 5.5, { align: 'right' });
  doc.text('Amount', cols.total.x, y + 5.5, { align: 'right' });

  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(THEME.text);

  items.forEach((it, index) => {
    if (y > 260) { doc.addPage(); y = 20; }

    if (index % 2 === 0) {
      doc.setFillColor(THEME.accent);
      doc.rect(15, y, 180, 8, 'F');
    }

    const name = it.productName || it.name || '';
    const qty = Number(it.quantity);
    const price = Number(it.price || it.unitPrice);
    const total = qty * price;
    
    const displayName = truncateText(doc, name, cols.desc.w - 5);

    doc.text(displayName, cols.desc.x + 2, y + 5.5);
    doc.text(String(qty), cols.qty.x, y + 5.5, { align: 'center' });
    doc.text(formatCurrency(price).replace('PHP', ''), cols.price.x, y + 5.5, { align: 'right' });
    doc.text(formatCurrency(total).replace('PHP', ''), cols.total.x, y + 5.5, { align: 'right' });

    y += 8;
  });

  y += 5;

  const totalBoxX = 120;
  const totalBoxW = 75;
  
  doc.setDrawColor(THEME.line);
  doc.line(15, y, 195, y); 
  y += 5;

  const drawTotalLine = (label, value, isBold = false, isGrand = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isGrand ? 12 : 10);
    doc.setTextColor(isGrand ? THEME.primary : THEME.text);
    
    doc.text(label, totalBoxX, y + 5);
    doc.text(value, 195, y + 5, { align: 'right' });
    y += isGrand ? 10 : 6;
  };

  drawTotalLine('Subtotal:', formatCurrency(totalAmount));
  
  if (tenderedAmount > 0 && paymentMethod === 'Cash') {
    drawTotalLine('Cash Tendered:', formatCurrency(tenderedAmount));
    drawTotalLine('Change:', formatCurrency(changeAmount));
  }

  y += 2;
  doc.setFillColor(THEME.primary);
  doc.rect(totalBoxX - 5, y, totalBoxW + 5, 10, 'F');
  doc.setTextColor(THEME.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', totalBoxX, y + 7);
  doc.text(formatCurrency(totalAmount), 195, y + 7, { align: 'right' });

  const footerY = 280;
  doc.setFontSize(8);
  doc.setTextColor(THEME.lightText);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });

  return doc;
};