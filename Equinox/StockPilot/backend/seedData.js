const mongoose = require('mongoose');
const Product = require('./models/Products');
const ProductBatch = require('./models/Product_batches');
const Vendor = require('./models/Vendors');
const Purchase = require('./models/Purchases');
const PurchaseItem = require('./models/Purchase_items');
const Sale = require('./models/Sales');
const SaleItem = require('./models/Sale_items');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/stockpilot', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample data
const sampleProducts = [
  {
    product_name: 'Paracetamol 500mg Tablet',
    category: 'Medicine',
    hsn_code: '30049099',
    description: 'Pain relief and fever reducer tablets'
  },
  {
    product_name: 'Dettol Hand Sanitizer 500ml',
    category: 'Personal Care',
    hsn_code: '33061000',
    description: 'Antibacterial hand sanitizer with 70% alcohol'
  },
  {
    product_name: 'Vitamin C 1000mg Tablets',
    category: 'Supplements',
    hsn_code: '29362700',
    description: 'Immune system support vitamin tablets'
  },
  {
    product_name: 'Digital Thermometer',
    category: 'Medical Equipment',
    hsn_code: '90251100',
    description: 'Digital fever thermometer with LCD display'
  },
  {
    product_name: 'Face Masks N95 (Pack of 10)',
    category: 'Safety Equipment',
    hsn_code: '63079000',
    description: 'N95 respiratory protection face masks'
  }
];

const sampleVendor = {
  vendor_name: 'MediCorp Supplies Pvt Ltd',
  phone: '+91-9876543210',
  email: 'sales@medicorp.com',
  address: '123 Medical Plaza, Delhi - 110001',
  gst_number: '07AABCU9603R1ZM',
  payment_terms: 'Net 30'
};

// Generate random dates within the last 30 days
const getRandomDate = (daysBack) => {
  const today = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const date = new Date(today);
  date.setDate(date.getDate() - randomDays);
  return date;
};

// Generate random number within range
const getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const seedData = async () => {
  try {
    console.log('Starting data seeding...');

    // Clear existing data (optional - remove if you want to keep existing data)
    // await Product.deleteMany({});
    // await ProductBatch.deleteMany({});
    // await Vendor.deleteMany({});
    // await Purchase.deleteMany({});
    // await PurchaseItem.deleteMany({});
    // await Sale.deleteMany({});
    // await SaleItem.deleteMany({});

    // Create vendor
    let vendor = await Vendor.findOne({ email: sampleVendor.email });
    if (!vendor) {
      vendor = new Vendor(sampleVendor);
      await vendor.save();
      console.log('Vendor created:', vendor.vendor_name);
    }

    // Create products and their batches
    const createdProducts = [];
    for (const productData of sampleProducts) {
      let product = await Product.findOne({ product_name: productData.product_name });
      if (!product) {
        product = new Product(productData);
        await product.save();
        console.log('Product created:', product.product_name);
      }

      // Create 2-3 batches per product
      const batchCount = getRandomNumber(2, 3);
      for (let i = 0; i < batchCount; i++) {
        const batchNumber = `BATCH-${product.product_name.substring(0, 3).toUpperCase()}-${Date.now()}-${i}`;
        
        let batch = await ProductBatch.findOne({ 
          product_id: product._id, 
          batch_number: batchNumber 
        });
        
        if (!batch) {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + getRandomNumber(1, 3));
          
          batch = new ProductBatch({
            product_id: product._id,
            batch_number: batchNumber,
            barcode: `BAR${Date.now()}${i}`,
            expiry_date: expiryDate,
            mrp: getRandomNumber(50, 500),
            tax_rate: getRandomNumber(5, 18),
            quantity_in_stock: getRandomNumber(50, 200)
          });
          await batch.save();
        }
      }

      createdProducts.push(product);
    }

    // Get all product batches
    const allBatches = await ProductBatch.find({}).populate('product_id');

    // Create purchases (last 30 days)
    const purchaseCount = getRandomNumber(8, 12);
    const createdPurchases = [];
    
    for (let i = 0; i < purchaseCount; i++) {
      const purchaseDate = getRandomDate(30);
      const billNo = `PUR-${Date.now()}-${i}`;
      
      const purchase = new Purchase({
        vendor_id: vendor._id,
        bill_no: billNo,
        purchase_date: purchaseDate,
        total_amount: 0, // Will be calculated
        payment_status: ['Paid', 'Pending', 'Partial'][getRandomNumber(0, 2)]
      });

      const savedPurchase = await purchase.save();
      
      // Add 1-3 items per purchase
      const itemCount = getRandomNumber(1, 3);
      let totalAmount = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const randomBatch = allBatches[getRandomNumber(0, allBatches.length - 1)];
        const quantity = getRandomNumber(10, 50);
        const purchaseRate = getRandomNumber(30, 200);
        const taxPercent = getRandomNumber(5, 18);
        const discountPercent = getRandomNumber(0, 10);
        
        const baseAmount = quantity * purchaseRate;
        const discountAmount = baseAmount * (discountPercent / 100);
        const taxAmount = (baseAmount - discountAmount) * (taxPercent / 100);
        const itemAmount = baseAmount - discountAmount + taxAmount;
        
        totalAmount += itemAmount;

        const purchaseItem = new PurchaseItem({
          purchase_id: savedPurchase._id,
          batch_id: randomBatch._id,
          quantity: quantity,
          purchase_rate: purchaseRate,
          tax_percent: taxPercent,
          discount_percent: discountPercent
        });
        
        await purchaseItem.save();
        
        // Update batch stock
        randomBatch.quantity_in_stock += quantity;
        await randomBatch.save();
      }
      
      // Update purchase total
      savedPurchase.total_amount = totalAmount;
      await savedPurchase.save();
      
      createdPurchases.push(savedPurchase);
    }

    console.log(`Created ${createdPurchases.length} purchases`);

    // Create sales (last 30 days) - Different frequencies for different products
    const productSalesFrequency = {
      'Paracetamol 500mg Tablet': { min: 15, max: 25 }, // Fast moving
      'Dettol Hand Sanitizer 500ml': { min: 10, max: 20 }, // Fast moving
      'Vitamin C 1000mg Tablets': { min: 5, max: 12 }, // Medium moving
      'Digital Thermometer': { min: 2, max: 6 }, // Slow moving
      'Face Masks N95 (Pack of 10)': { min: 0, max: 3 } // Very slow/no sales
    };

    const createdSales = [];
    
    for (const product of createdProducts) {
      const frequency = productSalesFrequency[product.product_name];
      const salesCount = getRandomNumber(frequency.min, frequency.max);
      
      const productBatches = allBatches.filter(batch => 
        batch.product_id._id.toString() === product._id.toString()
      );
      
      for (let i = 0; i < salesCount; i++) {
        const saleDate = getRandomDate(30);
        const billNo = `BILL-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}${String(saleDate.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
        
        const customers = [
          { name: 'Rajesh Kumar', phone: '+91-9876543210' },
          { name: 'Priya Sharma', phone: '+91-9876543211' },
          { name: 'Amit Singh', phone: '+91-9876543212' },
          { name: 'Sunita Patel', phone: '+91-9876543213' },
          { name: 'Cash Customer', phone: '' }
        ];
        
        const customer = customers[getRandomNumber(0, customers.length - 1)];
        const quantity = getRandomNumber(1, 8);
        const randomBatch = productBatches[getRandomNumber(0, productBatches.length - 1)];
        
        if (randomBatch.quantity_in_stock >= quantity) {
          const sellingPrice = randomBatch.mrp * (1 - getRandomNumber(5, 20) / 100); // 5-20% discount from MRP
          const discountPercentage = getRandomNumber(0, 10);
          const subtotal = quantity * sellingPrice;
          const discountAmount = subtotal * (discountPercentage / 100);
          const tax = (subtotal - discountAmount) * (randomBatch.tax_rate / 100);
          const total = subtotal - discountAmount + tax;
          
          const sale = new Sale({
            date: saleDate,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_email: '',
            bill_no: billNo,
            subtotal: subtotal,
            discount_percentage: discountPercentage,
            discount_amount: discountAmount,
            tax: tax,
            total: total,
            payment_method: ['CASH', 'CARD', 'UPI'][getRandomNumber(0, 2)],
            created_at: saleDate
          });
          
          const savedSale = await sale.save();
          
          // Create sale item
          const saleItem = new SaleItem({
            sale_id: savedSale._id,
            product_name: product.product_name,
            batch_number: randomBatch.batch_number,
            barcode: randomBatch.barcode,
            quantity_sold: quantity,
            selling_price: sellingPrice,
            mrp: randomBatch.mrp,
            discount_percentage: discountPercentage,
            amount: quantity * sellingPrice * (1 - discountPercentage / 100),
            expiry_date: randomBatch.expiry_date
          });
          
          await saleItem.save();
          
          // Update batch stock
          randomBatch.quantity_in_stock -= quantity;
          await randomBatch.save();
          
          createdSales.push(savedSale);
        }
      }
    }

    console.log(`Created ${createdSales.length} sales`);
    console.log('Data seeding completed successfully!');
    
    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log(`Products: ${createdProducts.length}`);
    console.log(`Vendor: 1`);
    console.log(`Purchases: ${createdPurchases.length}`);
    console.log(`Sales: ${createdSales.length}`);
    console.log(`Product Batches: ${allBatches.length}`);
    
    console.log('\n=== PRODUCT SALES SUMMARY ===');
    for (const product of createdProducts) {
      const productSales = createdSales.filter(sale => 
        sale.bill_no && createdSales.some(s => s._id.toString() === sale._id.toString())
      );
      
      // Get actual sales count from SaleItems
      const saleItems = await SaleItem.find({ product_name: product.product_name });
      const totalQuantitySold = saleItems.reduce((sum, item) => sum + item.quantity_sold, 0);
      const totalRevenue = saleItems.reduce((sum, item) => sum + item.amount, 0);
      
      console.log(`${product.product_name}: ${saleItems.length} transactions, ${totalQuantitySold} units, ₹${totalRevenue.toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeding script
connectDB().then(() => {
  seedData();
});