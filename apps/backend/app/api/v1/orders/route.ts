import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { findOrCreateCustomer } from "@/lib/customers";
import { listOrdersQuerySchema, createOrderSchema } from "@/lib/validation/orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listOrdersQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return failValidation(parsed.error);
  }
  const { status, customerId } = parsed.data;

  // Public self-service scope: a customerId query means "this customer's own order
  // history" (Product A), not a staff listing -- no staff session required. Without
  // customerId this is the full staff listing and does require one.
  if (!customerId) {
    const auth = await requireStaffSession(request);
    if (!auth.authorized) {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
  }

  const orders = await prisma.order.findMany({
    where: { ...(status && { status }), ...(customerId && { customerId }) },
    include: { customer: true, items: { include: { book: true } } },
    orderBy: { createdAt: "asc" },
  });

  return ok(orders);
}

// Public (Product A): creates a pre-order. Finds-or-creates the customer by
// email/phone rather than requiring a prior POST /customers call, so guest
// checkout works in one request.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }
  const { customerName, customerEmail, customerPhone, items } = parsed.data;

  const books = await prisma.book.findMany({
    where: { id: { in: items.map((i) => i.bookId) } },
  });
  if (books.length !== new Set(items.map((i) => i.bookId)).size) {
    return fail("One or more books do not exist", 400, "INVALID_BOOK");
  }
  const bookById = new Map(books.map((b) => [b.id, b]));

  const orderItems = items.map((item) => {
    const book = bookById.get(item.bookId)!;
    return { bookId: item.bookId, quantity: item.quantity, unitPriceCents: book.priceCents };
  });
  const totalCents = orderItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  const customer = await findOrCreateCustomer({
    firstName: customerName,
    email: customerEmail,
    phone: customerPhone,
  });

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      status: "placed",
      paymentStatus: "unpaid",
      totalCents,
      items: { create: orderItems },
    },
    include: { customer: true, items: { include: { book: true } } },
  });

  return ok(order, 201);
}
