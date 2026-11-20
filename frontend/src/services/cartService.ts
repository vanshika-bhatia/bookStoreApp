import type { CartItem } from '@/types';

const CART_STORAGE_KEY = 'bookhaven_cart';

export const cartStorageKey = (userId: string) => `${CART_STORAGE_KEY}:${userId}`;

export const cartService = {
  load(userId: string): CartItem[] {
    if (typeof window === 'undefined') return [];
    const scopedKey = cartStorageKey(userId);
    const legacy = localStorage.getItem(CART_STORAGE_KEY);
    if (legacy !== null && localStorage.getItem(scopedKey) === null) {
      localStorage.setItem(scopedKey, legacy);
    }
    localStorage.removeItem(CART_STORAGE_KEY);
    const stored = localStorage.getItem(scopedKey);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  },

  save(userId: string, cart: CartItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(cartStorageKey(userId), JSON.stringify(cart));
  },
};
