const GUTENDEX_HOST = 'gutendex.com';

export async function fetchGutendex(searchParams: URLSearchParams) {
  const next = searchParams.get('next');
  const search = searchParams.get('search') || '';
  const languages = searchParams.get('languages') || 'en';
  const page = searchParams.get('page');

  let target = 'https://gutendex.com/books/?languages=en';

  if (next) {
    try {
      const parsed = new URL(next);
      if (parsed.hostname !== GUTENDEX_HOST) {
        return { error: 'Invalid catalog URL.', status: 400 as const };
      }
      target = parsed.toString();
    } catch {
      return { error: 'Invalid next URL.', status: 400 as const };
    }
  } else {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (languages && languages !== 'all') params.set('languages', languages);
    if (page) params.set('page', page);
    const qs = params.toString();
    target = qs ? `https://gutendex.com/books/?${qs}` : 'https://gutendex.com/books/';
  }

  const response = await fetch(target, { cache: 'no-store' });
  if (!response.ok) {
    return {
      error: `Unable to load books from Gutendex (${response.status}).`,
      status: response.status,
    };
  }
  return { data: await response.json(), status: 200 as const };
}

export async function fetchOpenLibrary(searchParams: URLSearchParams) {
  const q = searchParams.get('q') || 'fiction';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`;

  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BookHavenStudentApp/1.0' },
  });
  if (!response.ok) {
    return {
      error: `Unable to load Open Library results (${response.status}).`,
      status: response.status,
    };
  }
  const data = await response.json();
  return {
    status: 200 as const,
    data: {
      count: data.numFound ?? 0,
      page: Number(page),
      limit: Number(limit),
      nextPage: Number(page) + 1,
      hasMore: Number(page) * Number(limit) < (data.numFound ?? 0),
      docs: data.docs ?? [],
    },
  };
}

export async function fetchGoogleBooks(searchParams: URLSearchParams) {
  const q = searchParams.get('q') || 'fiction';
  const startIndex = searchParams.get('startIndex') || '0';
  const maxResults = searchParams.get('maxResults') || '20';
  const key = process.env.GOOGLE_BOOKS_API_KEY;

  const params = new URLSearchParams({ q, startIndex, maxResults });
  if (key) params.set('key', key);

  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    return {
      error: `Unable to load Google Books results (${response.status}).`,
      status: response.status,
    };
  }
  const data = await response.json();
  const items = data.items ?? [];
  const nextIndex = Number(startIndex) + items.length;
  return {
    status: 200 as const,
    data: {
      totalItems: data.totalItems ?? 0,
      startIndex: Number(startIndex),
      nextIndex,
      hasMore: items.length > 0 && nextIndex < (data.totalItems ?? 0),
      items,
    },
  };
}
