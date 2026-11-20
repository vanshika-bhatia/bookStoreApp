import { catalogEndpoints } from '@/config/apiEndpoints';
import { apiRequest } from '@/services/http';
import type { ApiResult } from '@/services/http';
import type { CatalogSource } from '@/types';

export const catalogService = {
  fetchPage: <T = unknown>(url: string): Promise<ApiResult<T>> => apiRequest<T>(url),

  firstPage: (src: CatalogSource, query: string, lang: string): string => {
    if (src === 'gutendex') {
      return catalogEndpoints.gutendex({ search: query.trim(), languages: lang });
    }
    if (src === 'openlibrary') {
      return catalogEndpoints.openlibrary({
        q: query.trim() || 'fiction',
        page: 1,
        limit: 20,
      });
    }
    return catalogEndpoints.google({
      q: query.trim() || 'fiction',
      startIndex: 0,
      maxResults: 20,
    });
  },

  nextGutendex: (next: string): string => catalogEndpoints.gutendex({ next }),

  nextOpenLibrary: (query: string, page: number): string =>
    catalogEndpoints.openlibrary({
      q: query.trim() || 'fiction',
      page,
      limit: 20,
    }),

  nextGoogle: (query: string, startIndex: number): string =>
    catalogEndpoints.google({
      q: query.trim() || 'fiction',
      startIndex,
      maxResults: 20,
    }),
};
