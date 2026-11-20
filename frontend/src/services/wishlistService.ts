import { userService } from '@/services/userService';
import type { ApiResult } from '@/services/http';
import type { ProfileResponse } from '@/services/userService';

const WISHLIST_STORAGE_KEY = 'bookhaven_wishlist';

export const wishlistStorageKey = (userId: string) => `${WISHLIST_STORAGE_KEY}:${userId}`;

export const wishlistService = {
  loadLocal(userId: string): string[] {
    if (typeof window === 'undefined') return [];
    const scopedKey = wishlistStorageKey(userId);
    const legacy = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (legacy !== null && localStorage.getItem(scopedKey) === null) {
      localStorage.setItem(scopedKey, legacy);
    }
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
    const stored = localStorage.getItem(scopedKey);
    return stored ? (JSON.parse(stored) as string[]) : [];
  },

  saveLocal(userId: string, ids: string[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(wishlistStorageKey(userId), JSON.stringify(ids));
  },

  persist(ids: string[]): Promise<ApiResult<ProfileResponse>> {
    return userService.updateProfile({ wishlist: ids });
  },
};
