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
    await mongoose.connect('mongodb://localhost:27017/stockpilot');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fast moving products (high demand, frequent sales)
const fastMovingProducts = [
  {
    product_name: 'Paracetamol 500mg Tablets',
    category: 'Medicine',
    hsn_code: '30049099',
    description: 'Pain relief and fever reducer tablets - Box of 10',
    salesFrequency: { min: 20, max: 30 }, // High sales volume
    mrpRange: { min: 45, max: 65 }
  },
  {
    product_name: 'Hand Sanitizer 250ml',
    category: 'Personal Care',
    hsn_code: '33061000',
    description: 'Antibacterial hand sanitizer with 70% alcohol',
    salesFrequency: { min: 18, max: 25 },
    mrpRange: { min: 85, max: 120 }
  },
  {
    product_name: 'Vitamin D3 1000 IU Tablets',
    category: 'Supplements',
    hsn_code: '29362700',
    description: 'Bone health and immunity support - Strip of 10',
    salesFrequency: { min: 15, max: 22 },
    mrpRange: { min: 180, max: 250 }
  },
  {
    product_name: 'Crocin Advance Tablets',
    category: 'Medicine',
    hsn_code: '30049099',
    description: 'Fast relief from headache and fever - Strip of 15',
    salesFrequency: { min: 16, max: 24 },
    mrpRange: { min: 35, max: 55 }
  },
  {
    product_name: 'Amoxicillin 500mg Capsules',
    category: 'Medicine',
    hsn_code: '30041000',
    description: 'Antibiotic capsules - Strip of 10',
    salesFrequency: { min: 12, max: 20 },
    mrpRange: { min: 125, max: 180 }
  }
];

// Slow moving products (low demand, infrequent sales)
const slowMovingProducts = [
  {
    product_name: 'Digital Blood Pressure Monitor',
    category: 'Medical Equipment',
    hsn_code: '90181900',
    description: 'Automatic upper arm blood pressure monitor',
    salesFrequency: { min: 1, max: 4 }, // Very low sales
    mrpRange: { min: 2500, max: 4500 }
  },
  {
    product_name: 'Nebulizer Machine',
    category: 'Medical Equipment',
    hsn_code: '84194000',
    description: 'Compressor nebulizer for respiratory treatment',
    salesFrequency: { min: 0, max: 3 },
    mrpRange: { min: 3500, max: 6500 }
  },
  {
    product_name: 'Wheelchair Standard',
    category: 'Medical Equipment',
    hsn_code: '87130000',
    description: 'Standard manual wheelchair with fixed armrest',
    salesFrequency: { min: 0, max: 2 },
    mrpRange: { min: 8500, max: 12000 }
  },
  {
    product_name: 'Calcium + Magnesium Tablets',
    category: 'Supplements',
    hsn_code: '29362700',
    description: 'Bone health supplement - Bottle of 60 tablets',
    salesFrequency: { min: 2, max: 6 },
    mrpRange: { min: 450, max: 750 }
  },
  {
    product_name: 'ECG Machine Portable',
    category: 'Medical Equipment',
    hsn_code: '90181200',
    description: '3-channel portable ECG machine',
    salesFrequency: { min: 0, max: 1 },
    mrpRange: { min: 25000, max: 45000 }
  }
];

// Vendor data
const vendors = [
  {
    vendor_name: 'PharmaCorp India Ltd',
    phone: '+91-9876543210',
    email: 'orders@pharmacorp.in',
    address: '234 Medical Complex, Mumbai - 400001',
    gst_number: '27AABCU9603R1ZM',
    payment_terms: 'Net 30'
  },
  {
    vendor_name: 'MedEquip Solutions',
    phone: '+91-9876543211',
    email: 'sales@medequip.com',
    address: '567 Industrial Area, Delhi - 110020',
    gst_number: '07AABCU9603R1ZN',
    payment_terms: 'Net 45'
  }
];

// Customer data for realistic sales
const customers = [
  { name: 'Rajesh Kumar', phone: '+91-9876543001', email: 'rajesh.k@email.com' },
  { name: 'Priya Sharma', phone: '+91-9876543002', email: 'priya.s@email.com' },
  { name: 'Amit Singh', phone: '+91-9876543003', email: 'amit.singh@email.com' },
  { name: 'Sunita Patel', phone: '+91-9876543004', email: 'sunita.p@email.com' },
  { name: 'Ravi Gupta', phone: '+91-9876543005', email: 'ravi.g@email.com' },
  { name: 'Kavya Reddy', phone: '+91-9876543006', email: 'kavya.r@email.com' },
  { name: 'Deepak Jain', phone: '+91-9876543007', email: 'deepak.j@email.com' },
  { name: 'Meera Shah', phone: '+91-9876543008', email: 'meera.shah@email.com' },
  { name: 'Cash Customer', phone: '', email: '' }
];

// Utility functions
const getRandomDate = (daysBack) => {
  const today = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const date = new Date(today);
  date.setDate(date.getDate() - randomDays);
  return date;
};

const getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomFloat = (min, max, decimals = 2) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
};

const seedRealisticData = async () => {
  try {
    console.log('🚀 Starting realistic data seeding...');

    // Create vendors
    const createdVendors = [];
    for (const vendorData of vendors) {
      let vendor = await Vendor.findOne({ email: vendorData.email });
      if (!vendor) {
        vendor = new Vendor(vendorData);
        await vendor.save();
        console.log(`✅ Vendor created: ${vendor.vendor_name}`);
      }
      createdVendors.push(vendor);
    }

    // Combine all products
    const allProducts = [...fastMovingProducts, ...slowMovingProducts];
    const createdProducts = [];

    // Create products and batches
    for (const productData of allProducts) {
      let product = await Product.findOne({ product_name: productData.product_name });
      if (!product) {
        product = new Product({
          product_name: productData.product_name,
          category: productData.category,
          hsn_code: productData.hsn_code,
          description: productData.description
        });
        await product.save();
        console.log(`📦 Product created: ${product.product_name}`);
      }

      // Create 2-4 batches per product with realistic stock
      const batchCount = getRandomNumber(2, 4);
      for (let i = 0; i < batchCount; i++) {
        const batchNumber = `${productData.category.substring(0, 3).toUpperCase()}${Date.now()}${i}`;
        
        let batch = await ProductBatch.findOne({ 
          product_id: product._id, 
          batch_number: batchNumber 
        });
        
        if (!batch) {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + getRandomNumber(1, 3));
          
          // Higher stock for fast-moving products
          const isFastMoving = fastMovingProducts.some(fp => fp.product_name === product.product_name);
          const stockRange = isFastMoving ? { min: 100, max: 300 } : { min: 20, max: 80 };
          
          batch = new ProductBatch({
            product_id: product._id,
            batch_number: batchNumber,
            barcode: `BAR${Date.now()}${i}${getRandomNumber(100, 999)}`,
            expiry_date: expiryDate,
            mrp: getRandomNumber(productData.mrpRange.min, productData.mrpRange.max),
            tax_rate: productData.category === 'Medicine' ? 0 : getRandomNumber(12, 18), // Medicines are tax-free
            quantity_in_stock: getRandomNumber(stockRange.min, stockRange.max)
          });
          await batch.save();
        }
      }

      createdProducts.push({ ...product.toObject(), ...productData });
    }

    // Get all batches
    const allBatches = await ProductBatch.find({}).populate('product_id');

    // Create purchases (last 45 days) - More realistic purchase patterns
    const purchaseCount = getRandomNumber(12, 18);
    const createdPurchases = [];
    
    for (let i = 0; i < purchaseCount; i++) {
      const purchaseDate = getRandomDate(45);
      const billNo = `PUR-${purchaseDate.getFullYear()}${String(purchaseDate.getMonth() + 1).padStart(2, '0')}${String(purchaseDate.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
      const vendor = createdVendors[getRandomNumber(0, createdVendors.length - 1)];
      
      const purchase = new Purchase({
        vendor_id: vendor._id,
        bill_no: billNo,
        purchase_date: purchaseDate,
        total_amount: 0,
        payment_status: ['Paid', 'Pending', 'Partial'][getRandomNumber(0, 2)]
      });

      const savedPurchase = await purchase.save();
      
      // Add 2-5 items per purchase
      const itemCount = getRandomNumber(2, 5);
      let totalAmount = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const randomBatch = allBatches[getRandomNumber(0, allBatches.length - 1)];
        const quantity = getRandomNumber(20, 100);
        const purchaseRate = randomBatch.mrp * getRandomFloat(0.6, 0.8); // 60-80% of MRP
        const taxPercent = randomBatch.tax_rate;
        const discountPercent = getRandomNumber(0, 8);
        
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

    console.log(`💰 Created ${createdPurchases.length} purchases`);

    // Create sales with realistic patterns (last 30 days)
    const createdSales = [];
    
    for (const productData of createdProducts) {
      const salesCount = getRandomNumber(productData.salesFrequency.min, productData.salesFrequency.max);
      
      const productBatches = allBatches.filter(batch => 
        batch.product_id.product_name === productData.product_name
      );
      
      if (productBatches.length === 0) continue;
      
      console.log(`📊 Creating ${salesCount} sales for ${productData.product_name}`);
      
      for (let i = 0; i < salesCount; i++) {
        const saleDate = getRandomDate(30);
        const billNo = `BILL-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}${String(saleDate.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}${i}`;
        
        const customer = customers[getRandomNumber(0, customers.length - 1)];
        const randomBatch = productBatches[getRandomNumber(0, productBatches.length - 1)];
        
        // Realistic quantity based on product type
        const isFastMoving = fastMovingProducts.some(fp => fp.product_name === productData.product_name);
        const quantityRange = isFastMoving ? { min: 1, max: 5 } : { min: 1, max: 2 };
        const quantity = getRandomNumber(quantityRange.min, quantityRange.max);
        
        if (randomBatch.quantity_in_stock >= quantity) {
          // Realistic pricing - 10-25% margin over purchase rate, but within MRP
          const sellingPrice = Math.min(
            randomBatch.mrp * getRandomFloat(0.85, 0.95), // 85-95% of MRP
            randomBatch.mrp
          );
          
          const discountPercentage = getRandomNumber(0, 8);
          const subtotal = quantity * sellingPrice;
          const discountAmount = subtotal * (discountPercentage / 100);
          const tax = (subtotal - discountAmount) * (randomBatch.tax_rate / 100);
          const total = subtotal - discountAmount + tax;
          
          const sale = new Sale({
            date: saleDate,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_email: customer.email,
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
            product_name: productData.product_name,
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

    console.log(`🛒 Created ${createdSales.length} sales transactions`);
    
    // Generate final summary
    console.log('\n🎉 Data seeding completed successfully!');
    console.log('\n📊 === FINAL SUMMARY ===');
    console.log(`📦 Products: ${createdProducts.length} (5 fast-moving + 5 slow-moving)`);
    console.log(`🏪 Vendors: ${createdVendors.length}`);
    console.log(`📥 Purchases: ${createdPurchases.length}`);
    console.log(`🛒 Sales: ${createdSales.length}`);
    console.log(`📋 Product Batches: ${allBatches.length}`);
    
    console.log('\n📈 === PRODUCT PERFORMANCE ===');
    
    // Fast moving products summary
    console.log('\n🚀 FAST MOVING PRODUCTS:');
    for (const productData of fastMovingProducts) {
      const saleItems = await SaleItem.find({ product_name: productData.product_name });
      const totalQuantitySold = saleItems.reduce((sum, item) => sum + item.quantity_sold, 0);
      const totalRevenue = saleItems.reduce((sum, item) => sum + item.amount, 0);
      const movementRate = totalQuantitySold / 30; // per day
      
      console.log(`  • ${productData.product_name}: ${saleItems.length} sales, ${totalQuantitySold} units, ₹${totalRevenue.toLocaleString()}, ${movementRate.toFixed(1)} units/day`);
    }
    
    // Slow moving products summary
    console.log('\n🐌 SLOW MOVING PRODUCTS:');
    for (const productData of slowMovingProducts) {
      const saleItems = await SaleItem.find({ product_name: productData.product_name });
      const totalQuantitySold = saleItems.reduce((sum, item) => sum + item.quantity_sold, 0);
      const totalRevenue = saleItems.reduce((sum, item) => sum + item.amount, 0);
      const movementRate = totalQuantitySold / 30; // per day
      
      console.log(`  • ${productData.product_name}: ${saleItems.length} sales, ${totalQuantitySold} units, ₹${totalRevenue.toLocaleString()}, ${movementRate.toFixed(1)} units/day`);
    }

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
};

// Run the seeding script
connectDB().then(() => {
  seedRealisticData();
});