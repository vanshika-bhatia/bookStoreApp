import { NextRequest, NextResponse } from 'next/server';
import { listOrders, createOrder, updateOrderStatus } from '@/services/orderService';
import { Order } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await listOrders());
  } catch (err) {
    console.error('[orders GET error]:', err);
    return NextResponse.json({ totalInQueue: 0, orders: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createOrder(request, body);
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(
      {
        success: true,
        order: result.order,
        stockUpdates: result.stockUpdates,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[orders POST error]:', err);
    return NextResponse.json({ error: 'Failed to process order in MongoDB' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'Order id and status are required.' }, { status: 400 });
    }

    const result = await updateOrderStatus(body.id, body.status as Order['status']);
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, order: result.order });
  } catch (err) {
    console.error('[orders PATCH error]:', err);
    return NextResponse.json({ error: 'Failed to update order in MongoDB' }, { status: 500 });
  }
}
