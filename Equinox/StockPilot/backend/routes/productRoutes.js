const express = require('express');
const router = express.Router();
const {
  searchProducts,
  createProduct,
  getProducts,
  getProductBatches,
  getProductsWithPricing,
  getInventoryPaginated,
  getCategories,
  getLowStockProducts,
  getSuggestedQuantity,
  getInventoryStats
} = require('../controllers/productController');

// Routes for products
router.get('/search', searchProducts);           // GET /api/products/search?search=term
router.get('/inventory-stats', getInventoryStats); // GET /api/products/inventory-stats - Get inventory statistics
router.get('/inventory-paginated', getInventoryPaginated); // GET /api/products/inventory-paginated?page=1&limit=12
router.get('/categories', getCategories);        // GET /api/products/categories
router.get('/low-stock', getLowStockProducts);   // GET /api/products/low-stock?limit=10&threshold=10
router.get('/suggested-quantity/:productId', getSuggestedQuantity); // GET /api/products/suggested-quantity/:productId
router.get('/with-pricing', getProductsWithPricing); // GET /api/products/with-pricing - Get products with latest pricing
router.get('/:productId/batches', getProductBatches); // GET /api/products/:productId/batches?search=term
router.get('/', getProducts);                    // GET /api/products
router.post('/', createProduct);                 // POST /api/products

module.exports = router;