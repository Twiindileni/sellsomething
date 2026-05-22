export const MAX_PRODUCT_IMAGES = 4;

/** All image URLs for a listing (supports legacy single `image` field). */
export function getProductImages(product) {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.filter(Boolean).slice(0, MAX_PRODUCT_IMAGES);
  }
  if (product.image) return [product.image];
  return [];
}
