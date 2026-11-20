import { NextResponse } from 'next/server';
import {
  getCatalog,
  filterCatalog,
  fallbackCatalog,
  createBook,
} from '@/services/bookService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const isbn = searchParams.get('isbn');
  const id = searchParams.get('id');
  const genre = searchParams.get('genre');
  const sort = searchParams.get('sort') || 'none';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Number(searchParams.get('limit'));

  try {
    const catalog = await getCatalog();
    const result = filterCatalog(catalog, { search, isbn, id, genre, sort, page, limit });

    if (isbn || id) {
      if (!result.book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }
      return NextResponse.json(
        { book: result.book },
        { headers: { 'Cache-Control': 'private, max-age=30' } }
      );
    }

    return NextResponse.json(result.list, {
      headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[books GET error]:', err);
    const fallback = fallbackCatalog(search, genre);
    return NextResponse.json({
      count: fallback.length,
      total: fallback.length,
      books: fallback,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createBook(body);
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, book: result.book }, { status: 201 });
  } catch (err) {
    console.error('[books POST error]:', err);
    return NextResponse.json({ error: 'Failed to create book in MongoDB' }, { status: 500 });
  }
}
