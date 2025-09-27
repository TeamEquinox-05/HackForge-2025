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

// Products that were added by the seeding script
const seededProductNames = [
  'Paracetamol 500mg Tablet',
  'Dettol Hand Sanitizer 500ml',
  'Vitamin C 1000mg Tablets',
  'Digital Thermometer',
  'Face Masks N95 (Pack of 10)'
];

const seededVendorEmail = 'sales@medicorp.com';

const cleanupData = async () => {
  try {
    console.log('Starting data cleanup...');

    // Find the seeded vendor
    const vendor = await Vendor.findOne({ email: seededVendorEmail });
    let deletedCounts = {
      products: 0,
      productBatches: 0,
      vendors: 0,
      purchases: 0,
      purchaseItems: 0,
      sales: 0,
      saleItems: 0
    };

    if (vendor) {
      console.log('Found seeded vendor:', vendor.vendor_name);

      // Delete all purchases from this vendor
      const purchases = await Purchase.find({ vendor_id: vendor._id });
      console.log(`Found ${purchases.length} purchases from seeded vendor`);

      for (const purchase of purchases) {
        // Delete purchase items
        const deletedPurchaseItems = await PurchaseItem.deleteMany({ purchase_id: purchase._id });
        deletedCounts.purchaseItems += deletedPurchaseItems.deletedCount;
      }

      // Delete purchases
      const deletedPurchases = await Purchase.deleteMany({ vendor_id: vendor._id });
      deletedCounts.purchases = deletedPurchases.deletedCount;

      // Delete the vendor
      await Vendor.deleteOne({ _id: vendor._id });
      deletedCounts.vendors = 1;
      console.log('Deleted seeded vendor');
    }

    // Find seeded products
    const seededProducts = await Product.find({ 
      product_name: { $in: seededProductNames } 
    });
    
    console.log(`Found ${seededProducts.length} seeded products`);

    for (const product of seededProducts) {
      console.log(`Processing product: ${product.product_name}`);

      // Delete sales items with this product name
      const deletedSaleItems = await SaleItem.deleteMany({ product_name: product.product_name });
      deletedCounts.saleItems += deletedSaleItems.deletedCount;
      console.log(`  Deleted ${deletedSaleItems.deletedCount} sale items`);

      // Find and delete sales that no longer have any items
      const salesWithItems = await SaleItem.distinct('sale_id');
      const allSales = await Sale.find({});
      const salesWithoutItems = allSales.filter(sale => 
        !salesWithItems.some(saleId => saleId.toString() === sale._id.toString())
      );

      for (const sale of salesWithoutItems) {
        await Sale.deleteOne({ _id: sale._id });
        deletedCounts.sales++;
      }

      // Find product batches for this product
      const productBatches = await ProductBatch.find({ product_id: product._id });
      console.log(`  Found ${productBatches.length} product batches`);

      // Delete purchase items that reference these batches
      for (const batch of productBatches) {
        const deletedPurchaseItems = await PurchaseItem.deleteMany({ batch_id: batch._id });
        deletedCounts.purchaseItems += deletedPurchaseItems.deletedCount;
      }

      // Delete product batches
      const deletedBatches = await ProductBatch.deleteMany({ product_id: product._id });
      deletedCounts.productBatches += deletedBatches.deletedCount;
      console.log(`  Deleted ${deletedBatches.deletedCount} product batches`);

      // Delete the product
      await Product.deleteOne({ _id: product._id });
      deletedCounts.products++;
      console.log(`  Deleted product: ${product.product_name}`);
    }

    console.log('\n=== CLEANUP SUMMARY ===');
    console.log(`Products deleted: ${deletedCounts.products}`);
    console.log(`Product batches deleted: ${deletedCounts.productBatches}`);
    console.log(`Vendors deleted: ${deletedCounts.vendors}`);
    console.log(`Purchases deleted: ${deletedCounts.purchases}`);
    console.log(`Purchase items deleted: ${deletedCounts.purchaseItems}`);
    console.log(`Sales deleted: ${deletedCounts.sales}`);
    console.log(`Sale items deleted: ${deletedCounts.saleItems}`);
    
    console.log('\nData cleanup completed successfully!');
    
    // Verify cleanup
    const remainingProducts = await Product.find({ product_name: { $in: seededProductNames } });
    const remainingVendor = await Vendor.findOne({ email: seededVendorEmail });
    
    console.log('\n=== VERIFICATION ===');
    console.log(`Remaining seeded products: ${remainingProducts.length}`);
    console.log(`Remaining seeded vendor: ${remainingVendor ? 'Yes' : 'No'}`);
    
    if (remainingProducts.length === 0 && !remainingVendor) {
      console.log('✅ All seeded data has been successfully removed!');
    } else {
      console.log('⚠️  Some seeded data might still remain');
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the cleanup script
connectDB().then(() => {
  cleanupData();
});