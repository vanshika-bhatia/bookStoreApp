import connectMongoDB from '@/lib/mongodb';
import BookModel from '@/models/Book';
import { mapBook } from '@/lib/mappers';
import { getCachedCatalog, setCachedCatalog, invalidateCatalogCache } from '@/lib/catalogCache';
import { INITIAL_BOOKS } from '@/data/initialBooks';
import { Book } from '@/types';

const MAX_LIMIT = 200;

let seedChecked = false;

async function ensureBaseSeed() {
  if (seedChecked) return;
  const count = await BookModel.estimatedDocumentCount();
  if (count === 0) {
    await BookModel.insertMany(INITIAL_BOOKS, { ordered: false }).catch(() => {
      // Ignore duplicate-key races; the collection is already usable.
    });
  }
  seedChecked = true;
}

export async function getCatalog(): Promise<Book[]> {
  const cached = getCachedCatalog();
  if (cached) return cached;

  await connectMongoDB();
  await ensureBaseSeed();

  const docs = await BookModel.find().sort({ createdAt: -1 }).lean();
  const books = docs.map(mapBook);
  setCachedCatalog(books);
  return books;
}

export function filterCatalog(
  catalog: Book[],
  params: {
    search?: string;
    isbn?: string | null;
    id?: string | null;
    genre?: string | null;
    sort?: string;
    page?: number;
    limit?: number;
  }
) {
  const search = params.search?.trim() || '';
  const isbn = params.isbn;
  const id = params.id;
  const genre = params.genre;
  const sort = params.sort || 'none';
  const page = Math.max(1, Number(params.page) || 1);
  const requestedLimit = Number(params.limit);
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), MAX_LIMIT)
      : 0;

  if (isbn || id) {
    const book = catalog.find((item) => item.isbn === isbn || item.id === id);
    return { book, list: null as null };
  }

  let result = catalog;
  if (genre && genre !== 'All') {
    result = result.filter((book) => book.genre === genre);
  }
  if (search) {
    const query = search.toLowerCase();
    result = result.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query)
    );
  }

  if (sort === 'price-asc') {
    result = [...result].sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    result = [...result].sort((a, b) => b.price - a.price);
  } else if (sort === 'rating-desc') {
    result = [...result].sort((a, b) => b.rating - a.rating);
  } else if (sort === 'newest') {
    result = [...result].sort((a, b) => b.publishedYear - a.publishedYear);
  }

  const total = result.length;
  const totalPages = limit ? Math.max(1, Math.ceil(total / limit)) : 1;
  const safePage = Math.min(page, totalPages);
  const books = limit ? result.slice((safePage - 1) * limit, safePage * limit) : result;

  return {
    book: null as null,
    list: {
      count: books.length,
      total,
      page: safePage,
      limit: limit || total,
      totalPages,
      books,
    },
  };
}

export function fallbackCatalog(search?: string | null, genre?: string | null): Book[] {
  let fallback = INITIAL_BOOKS;
  if (genre && genre !== 'All') fallback = fallback.filter((b) => b.genre === genre);
  if (search) {
    const q = search.toLowerCase();
    fallback = fallback.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }
  return fallback;
}

export async function createBook(body: Record<string, unknown>) {
  await connectMongoDB();

  if (!body.title || !body.author || !body.isbn || body.price === undefined) {
    return { error: 'Missing required book fields (title, author, isbn, price)', status: 400 as const };
  }

  const existing = await BookModel.findOne({ isbn: body.isbn });
  if (existing) {
    return { error: 'A book with this ISBN already exists.', status: 409 as const };
  }

  const created = await BookModel.create({
    id: `b${Date.now()}`,
    title: body.title as string,
    author: body.author as string,
    isbn: body.isbn as string,
    price: Number(body.price),
    originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
    rating: Number(body.rating) || 4.5,
    reviewCount: Number(body.reviewCount) || 0,
    reviews: (Array.isArray(body.reviews) ? body.reviews : []) as Book['reviews'],
    genre: (body.genre || 'Fiction') as Book['genre'],
    stock: Number(body.stock) || 10,
    description: (body.description || '') as string,
    publishedYear: Number(body.publishedYear) || new Date().getFullYear(),
    language: (body.language || 'English') as string,
    pages: body.pages ? Number(body.pages) : undefined,
    publisher: (body.publisher || undefined) as string | undefined,
    coverImage:
      (body.coverImage as string) ||
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    badge: (body.badge || 'New') as string,
  });

  invalidateCatalogCache();

  return { book: mapBook(created) as Book, status: 201 as const };
}
