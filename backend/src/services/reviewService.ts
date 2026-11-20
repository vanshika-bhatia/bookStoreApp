import connectMongoDB from '@/lib/mongodb';
import BookModel from '@/models/Book';
import UserModel from '@/models/User';
import { mapBook } from '@/lib/mappers';
import { verifyToken } from '@/lib/jwt';

export async function addReview(
  bookId: string,
  token: string | null,
  body: { rating?: unknown; comment?: unknown }
) {
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return { error: 'Please sign in to write a review.', status: 401 as const };
  }

  const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
  const comment = String(body.comment || '').trim();

  if (!comment) {
    return { error: 'Please write your review.', status: 400 as const };
  }

  await connectMongoDB();
  const [book, user] = await Promise.all([
    BookModel.findOne({ id: bookId }),
    UserModel.findById(payload.userId),
  ]);

  if (!book) return { error: 'Book not found.', status: 404 as const };

  const name = user?.name || 'Reader';
  const review = {
    id: `rev-${Date.now()}`,
    user: name,
    initials: name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    rating,
    comment,
    date: new Date().toISOString().split('T')[0],
  };

  const reviews = [...(book.reviews || []), review];
  const average = reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;

  book.reviews = reviews;
  book.reviewCount = reviews.length;
  book.rating = Math.round(average * 10) / 10;
  await book.save();

  return { success: true, book: mapBook(book), status: 201 as const };
}
