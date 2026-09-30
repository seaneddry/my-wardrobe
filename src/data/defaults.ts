import type { LookupList } from './types';

/**
 * Starter lists, added automatically the first time you sign in.
 * After that, edit them in the Supabase dashboard (table "lookups"),
 * or in the web CMS once it ships in v1.1.
 */
export const DEFAULT_LOOKUPS: Record<LookupList, Array<string | { value: string; hex: string }>> = {
  category: ['Tops', 'Shirts', 'Knitwear', 'Bottoms', 'Dresses', 'Outerwear', 'Suits', 'Shoes', 'Hats', 'Bags', 'Accessories', 'Activewear', 'Loungewear'],
  colour: [
    { value: 'Black', hex: '#1B1B1B' },
    { value: 'White', hex: '#FAFAF7' },
    { value: 'Grey', hex: '#8A8F98' },
    { value: 'Navy', hex: '#1F2F56' },
    { value: 'Blue', hex: '#3C6EB4' },
    { value: 'Light blue', hex: '#A9C8E8' },
    { value: 'Green', hex: '#3F7A4E' },
    { value: 'Olive', hex: '#6B6B3A' },
    { value: 'Brown', hex: '#6E4B32' },
    { value: 'Beige', hex: '#D8C7A6' },
    { value: 'Cream', hex: '#F1EAD8' },
    { value: 'Red', hex: '#B8312F' },
    { value: 'Burgundy', hex: '#6D1F2C' },
    { value: 'Pink', hex: '#E7A3B5' },
    { value: 'Orange', hex: '#DD7A2E' },
    { value: 'Yellow', hex: '#E6C44A' },
    { value: 'Purple', hex: '#6A4C93' },
    { value: 'Multi', hex: 'multi' },
  ],
  size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free size'],
  occasion: ['Casual', 'Work', 'Smart casual', 'Formal', 'Sport', 'Travel', 'Home'],
  condition: ['New', 'Excellent', 'Good', 'Fair', 'Worn out'],
  mood: ['Relaxed', 'Confident', 'Polished', 'Cozy', 'Bold', 'Minimal', 'Playful', 'Low-key'],
};
