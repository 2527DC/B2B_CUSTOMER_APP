/**
 * Category Image & Hierarchy Configuration
 *
 * This file allows you to:
 * 1. Define custom images for any category or subcategory
 * 2. Define parent-child relationships (e.g. Dal is a subcategory of Rice)
 *    so they appear in the same row even if the remote DB hasn't linked them yet.
 */

// ─── 1. Category Image Overrides ─────────────────────────────────────────────
// Format: 'id' or 'slug' or 'lowercase name': 'image url'
export const CATEGORY_IMAGE_OVERRIDES: Record<string, string> = {
  // Examples:
  // 'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
  // 'dals': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
  // 'oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
};

// ─── 2. Category Parent-Child Mapping ─────────────────────────────────────────
// Format: 'subcategory' (id/slug/name): 'parent category' (id/slug/name)
export const CATEGORY_PARENT_MAP: Record<string, string> = {
  // Manual overrides if remote DB doesn't have parentId set
};

/**
 * Helper to register a custom image for a category at runtime
 */
export function setCategoryImageOverride(categoryKey: string, imageUrl: string) {
  CATEGORY_IMAGE_OVERRIDES[categoryKey.toLowerCase().trim()] = imageUrl;
}

/**
 * Helper to register a subcategory under a parent category at runtime
 */
export function setCategoryParentRelation(subCategoryKey: string, parentCategoryKey: string) {
  CATEGORY_PARENT_MAP[subCategoryKey.toLowerCase().trim()] = parentCategoryKey.toLowerCase().trim();
}
