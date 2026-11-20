import { NextRequest } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import OrderModel from '@/models/Order';
import BookModel from '@/models/Book';
import { mapOrder } from '@/lib/mappers';
import { invalidateCatalogCache } from '@/lib/catalogCache';
import { addPurchaseToUser } from '@/lib/authStore';
import { verifyToken } from '@/lib/jwt';
import { Order } from '@/types';
import { getAuthToken } from '@/lib/authCookie';

export async function listOrders() {
  await connectMongoDB();
  const orderQueue = await OrderModel.find().sort({ queuePosition: 1 });
  return { totalInQueue: orderQueue.length, orders: orderQueue.map(mapOrder) };
}

export async function createOrder(request: NextRequest, body: Record<string, unknown>) {
  await connectMongoDB();
  const token = getAuthToken(request);
  const payload = token ? verifyToken(token) : null;

  if (!body.customerName || !Array.isArray(body.items) || body.items.length === 0) {
    return {
      error: 'Customer name and at least one cart item are required.',
      status: 400 as const,
    };
  }

  const items = body.items as { book?: { id?: string }; quantity?: number }[];

  const requested = new Map<string, number>();
  for (const item of items) {
    const bookId = item?.book?.id;
    const quantity = Math.floor(Number(item?.quantity));
    if (!bookId || !Number.isFinite(quantity) || quantity <= 0) {
      return {
        error: 'Every cart item needs a valid book and quantity.',
        status: 400 as const,
      };
    }
    requested.set(bookId, (requested.get(bookId) || 0) + quantity);
  }

  const reserved: { id: string; quantity: number; stock: number }[] = [];
  for (const [bookId, quantity] of Array.from(requested.entries())) {
    const updated = await BookModel.findOneAndUpdate(
      { id: bookId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );

    if (!updated) {
      await Promise.all(
        reserved.map((line) => BookModel.updateOne({ id: line.id }, { $inc: { stock: line.quantity } }))
      );
      const existing = await BookModel.findOne({ id: bookId }).lean();
      const message = existing
        ? `Only ${existing.stock} ${existing.stock === 1 ? 'copy' : 'copies'} of "${existing.title}" left in stock.`
        : 'One of the books in your cart is no longer available.';
      return { error: message, status: 409 as const };
    }

    reserved.push({ id: bookId, quantity, stock: updated.stock });
  }

  invalidateCatalogCache();

  const count = await OrderModel.countDocuments();
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  let created;
  try {
    created = await OrderModel.create({
      id: orderId,
      customerName: body.customerName as string,
      customerEmail: (body.customerEmail || 'customer@example.com') as string,
      shippingAddress: (body.shippingAddress || 'Standard Delivery') as string,
      items: body.items as Order['items'],
      totalAmount: Number(body.totalAmount) || 0,
      status: 'Pending',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      orderDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      queuePosition: count + 1,
      ...(payload?.userId ? { userId: payload.userId } : {}),
    });
  } catch (error) {
    await Promise.all(
      reserved.map((line) => BookModel.updateOne({ id: line.id }, { $inc: { stock: line.quantity } }))
    );
    invalidateCatalogCache();
    throw error;
  }

  if (payload?.userId) {
    const purchaseItems = (
      body.items as {
        book: { id: string; title: string; author: string; price: number; coverImage?: string };
        quantity: number;
      }[]
    ).map((i) => ({
      bookId: i.book.id,
      title: i.book.title,
      author: i.book.author,
      price: i.book.price,
      quantity: i.quantity,
      coverImage: i.book.coverImage,
    }));
    await addPurchaseToUser(payload.userId, {
      orderId,
      items: purchaseItems,
      totalAmount: Number(body.totalAmount) || 0,
      shippingAddress: String(body.shippingAddress || 'Standard Delivery'),
    }).catch(() => {});
  }

  const newOrder: Order = mapOrder(created);
  return {
    status: 201 as const,
    success: true,
    order: newOrder,
    stockUpdates: reserved.map((line) => ({ id: line.id, stock: line.stock })),
  };
}

export async function updateOrderStatus(id: string, status: Order['status']) {
  await connectMongoDB();
  const updated = await OrderModel.findOneAndUpdate({ id }, { status }, { new: true });
  if (!updated) {
    return { error: 'Order not found', status: 404 as const };
  }
  return { success: true, order: mapOrder(updated), status: 200 as const };
}
