import { productRepository } from '../repositories/productRepository.js';
import { ok, notFound } from '../utils/response.js';

export const productController = {
  listCategories(req, res) {
    ok(res, productRepository.listCategories());
  },

  listProducts(req, res) {
    const { q, category, minPrice, maxPrice, featured, sort, page, pageSize } = req.query;
    const result = productRepository.listProducts({
      search: q || undefined,
      categorySlug: category || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      sort: sort || undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 24,
    });
    ok(res, result.items, { total: result.total, page: result.page, pageSize: result.pageSize });
  },

  getProduct(req, res) {
    const product = productRepository.getProductBySlug(req.params.slug);
    if (!product) throw notFound('Producto no encontrado');
    const styles = productRepository.getStylesWithVariants(product.id);
    ok(res, { ...product, styles });
  },
};
