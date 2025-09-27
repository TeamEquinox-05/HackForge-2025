import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface SalesItem {
  id: string;
  name: string;
  batch: string;
  barcode: string;
  expiryDate: string;
  qty: number;
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  discount: number;
  amount: number;
}

interface ProductBatch {
  _id: string;
  product_name: string;
  batch_number: string;
  barcode: string;
  expiry_date?: string;
  mrp: number;
  tax_rate: number;
  quantity_in_stock: number;
  purchase_rate: number;
}

const Sales = () => {
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<ProductBatch[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billNo, setBillNo] = useState('');
  const [discount, setDiscount] = useState(0); // Discount in percentage
  const [paymentMethod, setPaymentMethod] = useState('CARD');

  // Generate auto-incrementing bill number
  const generateBillNumber = async () => {
    try {
      // Get the next bill number from backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/sales/next-bill-number`);
      if (response.ok) {
        const data = await response.json();
        return data.billNumber;
      } else {
        // Fallback to timestamp-based if API fails
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = Date.now().toString().slice(-6);
        return `BILL-${dateStr}-${timeStr}`;
      }
    } catch (error) {
      console.error('Error generating bill number:', error);
      // Fallback to timestamp-based
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = Date.now().toString().slice(-6);
      return `BILL-${dateStr}-${timeStr}`;
    }
  };

  // Search products from backend
  const searchProducts = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setProducts([]);
      return;
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/sales/search-products?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  // Handle product selection
  const handleProductSelect = (product: ProductBatch) => {
    const newItem: SalesItem = {
      id: Date.now().toString(),
      name: product.product_name,
      batch: product.batch_number,
      barcode: product.barcode || '',
      expiryDate: product.expiry_date ? new Date(product.expiry_date).toISOString().slice(0, 10) : '',
      qty: 1,
      sellingPrice: product.mrp, // Default to MRP
      mrp: product.mrp,
      taxRate: product.tax_rate,
      discount: 0,
      amount: product.mrp
    };
    
    setSalesItems(prev => [...prev, newItem]);
    setSearchTerm('');
    setProducts([]);
    setShowProductDropdown(false);
  };

  // Update item quantity
  const updateItemQty = (id: string, qty: number) => {
    if (qty <= 0) return;
    
    setSalesItems(prev => prev.map(item => {
      if (item.id === id) {
        const amount = item.sellingPrice * qty;
        return { ...item, qty, amount };
      }
      return item;
    }));
  };

  // Update item selling price
  const updateItemPrice = (id: string, sellingPrice: number) => {
    setSalesItems(prev => prev.map(item => {
      if (item.id === id) {
        const amount = sellingPrice * item.qty;
        return { ...item, sellingPrice, amount };
      }
      return item;
    }));
  };



  // Remove item
  const removeItem = (id: string) => {
    setSalesItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = salesItems.reduce((sum, item) => sum + item.amount, 0);
  // Calculate total tax amount from all items (tax is already included in MRP)
  const tax = salesItems.reduce((sum, item) => {
    const itemTaxRate = item.taxRate / 100; // Convert percentage to decimal
    const itemTax = item.amount * (itemTaxRate / (1 + itemTaxRate)); // Extract tax component from MRP
    return sum + itemTax;
  }, 0);
  // Calculate discount amount from percentage
  const discountAmount = subtotal * (discount / 100);
  const finalTotal = subtotal - discountAmount; // Apply percentage-based discount

  // Initialize bill number on component mount
  useEffect(() => {
    const initializeBillNumber = async () => {
      const newBillNo = await generateBillNumber();
      setBillNo(newBillNo);
    };
    initializeBillNumber();
  }, []);

  // Handle search term changes
  useEffect(() => {
    searchProducts(searchTerm);
    setShowProductDropdown(searchTerm.length >= 2);
  }, [searchTerm]);

  // Process sale
  const processSale = async () => {
    // Validation checks
    if (salesItems.length === 0) {
      alert('Please add items to the sales list before completing the sale.');
      return;
    }

    if (!billNo) {
      alert('Bill number is required. Please wait for it to generate.');
      return;
    }

    // Check if any item has zero or negative quantity
    const invalidItems = salesItems.filter(item => item.qty <= 0 || item.sellingPrice <= 0);
    if (invalidItems.length > 0) {
      alert('Please ensure all items have valid quantity and price.');
      return;
    }

    // Confirm sale
    const confirmMessage = `Confirm Sale:\nBill: ${billNo}\nItems: ${salesItems.length}\nTotal: ₹${finalTotal.toFixed(2)}\nPayment: ${paymentMethod}`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const saleData = {
        date,
        customerName: customerName || 'Cash Customer',
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
        billNo: billNo,
        items: salesItems,
        subtotal: subtotal,
        discountPercentage: discount,
        discountAmount: discountAmount,
        tax: tax, // Tax component within MRP
        total: finalTotal, // Subtotal - Discount
        paymentMethod: paymentMethod
      };

      // Show loading state
      const completeButton = document.querySelector('[data-complete-sale]') as HTMLButtonElement;
      if (completeButton) {
        completeButton.textContent = 'Processing...';
        completeButton.disabled = true;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Success feedback
        alert(`✅ Sale Completed Successfully!\n\n📋 Bill Number: ${billNo}\n💰 Total Amount: ₹${finalTotal.toFixed(2)}\n💳 Payment Method: ${paymentMethod}\n👤 Customer: ${customerName || 'Cash Customer'}`);
        
        // Print receipt option
        if (confirm('Would you like to print the receipt?')) {
          printReceipt(saleData, result.sale._id);
        }

        // Reset form for next sale
        setSalesItems([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setDiscount(0);
        setPaymentMethod('CARD');
        
        // Generate new bill number for next sale
        const newBillNo = await generateBillNumber();
        setBillNo(newBillNo);
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process sale');
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Sale Failed\n\nError: ${errorMessage}\n\nPlease check your connection and try again.`);
    } finally {
      // Restore button state
      const completeButton = document.querySelector('[data-complete-sale]') as HTMLButtonElement;
      if (completeButton) {
        completeButton.textContent = 'Complete Sale';
        completeButton.disabled = false;
      }
    }
  };

  // Print receipt function
  const printReceipt = (saleData: any, saleId?: string) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
      alert('Could not open receipt window. Please check your popup blocker.');
      return;
    }
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${saleData.billNo}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .bill-info { margin-bottom: 20px; }
          .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items th, .items td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
          .items th { background-color: #f5f5f5; }
          .total-section { border-top: 2px solid #000; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .final-total { font-weight: bold; font-size: 1.2em; }
          .footer { text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print { body { margin: 0; padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>StockPilot</h2>
          <p>Sales Receipt</p>
        </div>
        
        <div class="bill-info">
          <p><strong>Bill No:</strong> ${saleData.billNo}</p>
          <p><strong>Date:</strong> ${new Date(saleData.date).toLocaleDateString()}</p>
          <p><strong>Customer:</strong> ${saleData.customerName}</p>
          ${saleData.customerPhone ? `<p><strong>Phone:</strong> ${saleData.customerPhone}</p>` : ''}
          <p><strong>Payment:</strong> ${saleData.paymentMethod}</p>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${saleData.items.map((item: any) => `
              <tr>
                <td>${item.name}<br><small>Batch: ${item.batch}</small></td>
                <td>${item.qty}</td>
                <td>₹${item.sellingPrice.toFixed(2)}</td>
                <td>₹${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${saleData.subtotal.toFixed(2)}</span>
          </div>
          ${saleData.discountPercentage > 0 ? `
            <div class="total-row">
              <span>Discount (${saleData.discountPercentage}%):</span>
              <span>-₹${saleData.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row">
            <span>Tax (included):</span>
            <span>₹${saleData.tax.toFixed(2)}</span>
          </div>
          <div class="total-row final-total">
            <span>Total Amount:</span>
            <span>₹${saleData.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p><small>Generated on ${new Date().toLocaleString()}</small></p>
        </div>
      </body>
      </html>
    `;
    
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sales</h1>
          <div className="text-lg font-semibold">
            Total: ₹{finalTotal.toFixed(2)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales & Checkout Area */}
          <div className="lg:col-span-2">
            {/* Header with Search */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Sales & Checkout</h2>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
                  </svg>
                  Start Scan
                </Button>
              </div>
              
              {/* Bill No and Date */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4 w-96">
                  <div>
                    <label className="block text-sm font-medium mb-2">Bill No</label>
                    <Input
                      value={billNo}
                      readOnly
                      className="bg-gray-50"
                      placeholder="Auto-generated"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Search for products by name or SKU"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                {/* Product Dropdown */}
                {showProductDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {products.length > 0 ? (
                      products.map((product) => (
                        <div
                          key={product._id}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleProductSelect(product)}
                        >
                          <div className="font-semibold">{product.product_name}</div>
                          <div className="text-sm text-gray-600">
                            Batch: {product.batch_number} | Stock: {product.quantity_in_stock} | MRP: ₹{product.mrp} | Tax: {product.tax_rate}%
                          </div>
                        </div>
                      ))
                    ) : searchTerm.length >= 2 ? (
                      <div className="px-4 py-3 text-gray-500">
                        No products found
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Sales Items Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-6">
              <div className="overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesItems.length > 0 ? (
                      salesItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">Batch: {item.batch}</div>
                            {item.expiryDate && (
                              <div className="text-sm text-orange-600">Exp: {item.expiryDate}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.sellingPrice}
                              onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                              className="w-20 text-sm"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full"
                                onClick={() => updateItemQty(item.id, Math.max(1, item.qty - 1))}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </Button>
                              <span className="w-8 text-center text-sm font-medium text-gray-900">{item.qty}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full"
                                onClick={() => updateItemQty(item.id, item.qty + 1)}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V18M6 12h12" />
                                </svg>
                              </Button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">₹{item.amount.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                              onClick={() => removeItem(item.id)}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No items added to sale
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Name</label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Enter email (optional)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Checkout */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Checkout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Discount</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={discount}
                        onChange={e => setDiscount(Number(e.target.value))}
                        className="w-16 text-right text-sm"
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-400">%</span>
                      <span className="font-medium text-gray-900">₹{discountAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax included</span>
                    <span className="font-medium text-gray-900">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-blue-600">₹{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Payment Method</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['CASH', 'CARD', 'UPI'].map((method) => (
                      <Button
                        key={method}
                        variant={paymentMethod === method ? "default" : "outline"}
                        size="sm"
                        className={`text-xs ${paymentMethod === method ? 'bg-gray-900 hover:bg-gray-800 text-white' : ''}`}
                        onClick={() => setPaymentMethod(method)}
                      >
                        {method}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={processSale}
                  disabled={salesItems.length === 0}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 text-base font-semibold mt-6"
                  data-complete-sale
                >
                  Complete Sale
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Sales;