// Category defaults and seeding now live in the local storage layer.
// Re-exported here so existing screen imports (`from '@/lib/seed'`) keep working.
export { DEFAULT_CATEGORIES, getCategories, seedDefaultCategories } from '@/storage';
