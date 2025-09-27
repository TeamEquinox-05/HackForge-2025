const ProductBatch = require('../models/Product_batches');
const Sale = require('../models/Sales');
const SaleItem = require('../models/Sale_items');
const Product = require('../models/Products');

// Search products for sales
const searchProductsForSales = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search || search.length < 2) {
      return res.json([]);
    }

    const searchRegex = new RegExp(search, 'i');
    
    // First find products that match the search term
    const matchingProducts = await Product.find({
      product_name: { $regex: searchRegex }
    });

    const productIds = matchingProducts.map(p => p._id);

    // Then find product batches for those products or by barcode
    const productBatches = await ProductBatch.find({
      $and: [
        { quantity_in_stock: { $gt: 0 } }, // Only products with stock
        {
          $or: [
            { product_id: { $in: productIds } }, // Match by product ID
            { barcode: { $regex: searchRegex } } // Or by barcode
          ]
        }
      ]
    }).populate('product_id', 'product_name').sort({ 'product_id.product_name': 1 }).limit(10);

    // Transform the data to include product_name directly
    const transformedProducts = productBatches.map(batch => ({
      _id: batch._id,
      product_name: batch.product_id.product_name,
      batch_number: batch.batch_number,
      barcode: batch.barcode,
      expiry_date: batch.expiry_date,
      mrp: batch.mrp,
      tax_rate: batch.tax_rate,
      quantity_in_stock: batch.quantity_in_stock,
      purchase_rate: 0 // Not needed for sales
    }));

    res.json(transformedProducts);
  } catch (error) {
    console.error('Error searching products for sales:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
};

// Create new sale
const createSale = async (req, res) => {
  try {
    const { date, customerName, customerPhone, customerEmail, billNo, items, subtotal, discountPercentage, discountAmount, tax, total, paymentMethod } = req.body;

    // Validate required fields
    if (!date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Date and items are required' });
    }

    // Check stock availability for all items
    for (const item of items) {
      const productBatch = await ProductBatch.findOne({
        batch_number: item.batch,
        barcode: item.barcode || ''
      }).populate('product_id', 'product_name');

      if (!productBatch || productBatch.product_id.product_name !== item.name) {
        return res.status(400).json({ error: `Product batch not found: ${item.name} - ${item.batch}` });
      }

      if (productBatch.quantity_in_stock < item.qty) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.name}. Available: ${productBatch.quantity_in_stock}, Required: ${item.qty}` 
        });
      }
    }

    // Create sale
    const sale = new Sale({
      date: new Date(date),
      customer_name: customerName || 'Cash Customer',
      customer_phone: customerPhone || '',
      customer_email: customerEmail || '',
      bill_no: billNo || Date.now().toString(),
      subtotal: subtotal || 0,
      discount_percentage: discountPercentage || 0,
      discount_amount: discountAmount || 0,
      tax: tax || 0,
      total: total,
      payment_method: paymentMethod || 'CARD',
      created_at: new Date()
    });

    const savedSale = await sale.save();

    // Create sale items and update stock
    for (const item of items) {
      // Create sale item
      const saleItem = new SaleItem({
        sale_id: savedSale._id,
        product_name: item.name,
        batch_number: item.batch,
        barcode: item.barcode || '',
        quantity_sold: item.qty,
        selling_price: item.sellingPrice,
        mrp: item.mrp,
        discount_percentage: item.discount,
        amount: item.amount,
        expiry_date: item.expiryDate ? new Date(item.expiryDate) : undefined
      });

      await saleItem.save();

      // Update stock
      await ProductBatch.findOneAndUpdate(
        {
          batch_number: item.batch,
          barcode: item.barcode || ''
        },
        {
          $inc: { quantity_in_stock: -item.qty }
        }
      );
    }

    res.status(201).json({
      message: 'Sale created successfully',
      sale: savedSale
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
};

// Get all sales
const getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ created_at: -1 });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};

// Get sale by ID with items
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const saleItems = await SaleItem.find({ sale_id: id });
    
    res.json({
      sale,
      items: saleItems
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
};

// Get next auto-incrementing bill number
const getNextBillNumber = async (req, res) => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the latest bill number for today
    const latestSale = await Sale.findOne({
      bill_no: { $regex: `^BILL-${datePrefix}-` }
    }).sort({ bill_no: -1 });

    let nextNumber = 1;
    if (latestSale) {
      // Extract the number from the last bill and increment
      const lastBillParts = latestSale.bill_no.split('-');
      if (lastBillParts.length === 3) {
        const lastNumber = parseInt(lastBillParts[2]);
        nextNumber = lastNumber + 1;
      }
    }

    const billNumber = `BILL-${datePrefix}-${String(nextNumber).padStart(4, '0')}`;
    res.json({ billNumber });
  } catch (error) {
    console.error('Error generating bill number:', error);
    res.status(500).json({ error: 'Failed to generate bill number' });
  }
};

// Debug endpoint to check products in database
const debugProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    const productBatches = await ProductBatch.find({}).populate('product_id', 'product_name');
    
    res.json({
      products: products,
      productBatches: productBatches.map(batch => ({
        _id: batch._id,
        product_name: batch.product_id?.product_name || 'Unknown',
        batch_number: batch.batch_number,
        barcode: batch.barcode,
        quantity_in_stock: batch.quantity_in_stock,
        mrp: batch.mrp,
        tax_rate: batch.tax_rate
      }))
    });
  } catch (error) {
    console.error('Error debugging products:', error);
    res.status(500).json({ error: 'Failed to debug products' });
  }
};

// Get recent sales activity for dashboard
const getRecentSalesActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Get recent sales sorted by creation date (most recent first)
    const recentSales = await Sale.find({})
      .sort({ created_at: -1 })
      .limit(limit);

    // Format the sales activity data
    const activities = recentSales.map(sale => {
      const timeDiff = new Date() - new Date(sale.created_at);
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      
      let timeAgo;
      if (days > 0) {
        timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
      } else if (hours > 0) {
        timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        timeAgo = 'Just now';
      }

      return {
        id: sale._id,
        type: 'completed',
        title: `Sale #${sale.bill_no}`,
        description: `Customer: ${sale.customer_name} • Payment: ${sale.payment_method}`,
        icon: '💰',
        iconColor: 'green',
        timeAgo,
        amount: sale.total,
        customer: sale.customer_name,
        payment_method: sale.payment_method,
        bill_no: sale.bill_no,
        date: sale.date
      };
    });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching recent sales activity:', error);
    res.status(500).json({ message: 'Error fetching recent sales activity', error: error.message });
  }
};

// Get product movement analytics (fast and slow moving goods)
const getProductMovementAnalytics = async (req, res) => {
  try {
    const daysBack = parseInt(req.query.days) || 30; // Default to last 30 days
    const limit = parseInt(req.query.limit) || 5;
    
    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);
    
    // Get all sale items from the specified period with their sales data
    const salesInPeriod = await Sale.find({
      date: { $gte: dateThreshold }
    });
    
    const saleIds = salesInPeriod.map(sale => sale._id);
    
    // Aggregate sales data by product
    const productMovement = await SaleItem.aggregate([
      {
        $match: {
          sale_id: { $in: saleIds }
        }
      },
      {
        $group: {
          _id: '$product_name',
          totalQuantitySold: { $sum: '$quantity_sold' },
          totalRevenue: { $sum: '$amount' },
          salesCount: { $sum: 1 },
          avgSellingPrice: { $avg: '$selling_price' },
          lastSaleDate: { $max: '$sale_id' }
        }
      },
      {
        $sort: { totalQuantitySold: -1 }
      }
    ]);

    // Get last sale dates for each product
    const productSalesWithDates = await Promise.all(
      productMovement.map(async (product) => {
        const lastSale = await Sale.findById(product.lastSaleDate);
        return {
          ...product,
          lastSaleDate: lastSale ? lastSale.date : null
        };
      })
    );

    // Get current stock information for all products
    const allProducts = await Product.find({});
    const productBatches = await ProductBatch.find({}).populate('product_id');
    
    // Create a map of product stock quantities
    const stockMap = {};
    productBatches.forEach(batch => {
      const productName = batch.product_id.product_name;
      if (!stockMap[productName]) {
        stockMap[productName] = 0;
      }
      stockMap[productName] += batch.quantity_in_stock;
    });

    // Enhance product data with stock information and movement rate
    const enhancedProducts = productSalesWithDates.map(product => {
      const currentStock = stockMap[product._id] || 0;
      const movementRate = product.totalQuantitySold / daysBack; // units per day
      const daysToStockOut = currentStock > 0 && movementRate > 0 ? Math.ceil(currentStock / movementRate) : null;
      
      return {
        productName: product._id,
        totalQuantitySold: product.totalQuantitySold,
        totalRevenue: product.totalRevenue,
        salesCount: product.salesCount,
        avgSellingPrice: Math.round(product.avgSellingPrice * 100) / 100,
        currentStock,
        movementRate: Math.round(movementRate * 100) / 100,
        daysToStockOut,
        lastSaleDate: product.lastSaleDate
      };
    });

    // Separate fast and slow moving goods
    const fastMovingGoods = enhancedProducts
      .filter(product => product.movementRate > 0)
      .slice(0, limit);
    
    const slowMovingGoods = enhancedProducts
      .filter(product => product.movementRate >= 0)
      .sort((a, b) => a.movementRate - b.movementRate)
      .slice(0, limit);

    // Get products with no sales in the period (completely stagnant)
    const productsWithNoSales = allProducts
      .filter(product => !enhancedProducts.find(ep => ep.productName === product.product_name))
      .map(product => ({
        productName: product.product_name,
        totalQuantitySold: 0,
        totalRevenue: 0,
        salesCount: 0,
        avgSellingPrice: 0,
        currentStock: stockMap[product.product_name] || 0,
        movementRate: 0,
        daysToStockOut: null,
        lastSaleDate: null
      }))
      .slice(0, Math.max(0, limit - slowMovingGoods.length));

    // Combine slow moving with no-sales products
    const finalSlowMovingGoods = [...slowMovingGoods, ...productsWithNoSales].slice(0, limit);

    res.json({
      success: true,
      data: {
        period: `${daysBack} days`,
        dateRange: {
          from: dateThreshold.toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        fastMovingGoods,
        slowMovingGoods: finalSlowMovingGoods,
        summary: {
          totalProductsAnalyzed: enhancedProducts.length + productsWithNoSales.length,
          totalProductsWithSales: enhancedProducts.length,
          totalProductsWithoutSales: productsWithNoSales.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching product movement analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching product movement analytics', 
      error: error.message 
    });
  }
};

module.exports = {
  searchProductsForSales,
  createSale,
  getAllSales,
  getSaleById,
  getNextBillNumber,
  debugProducts,
  getRecentSalesActivity,
  getProductMovementAnalytics
};