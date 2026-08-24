import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { findOrCreateCustomer } from "@/lib/customers";
import { resolveCart } from "@/lib/checkout";
import { listOrdersQuerySchema, createOrderSchema } from "@/lib/validation/orders";

// Every order line points at one of three product catalogs -- pull all three so the
// caller always sees the referenced product regardless of type.
const ORDER_ITEM_INCLUDE = { book: true, gift: true, card: true } as const;

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
    include: { customer: true, items: { include: ORDER_ITEM_INCLUDE } },
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

  // Prices everything server-side across books/gifts/cards; null means an item was
  // malformed or referenced a product that doesn't exist.
  const resolved = await resolveCart(items);
  if (!resolved) {
    return fail("One or more items do not exist", 400, "INVALID_ITEMS");
  }

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
      totalCents: resolved.totalCents,
      items: { create: resolved.orderItems },
    },
    include: { customer: true, items: { include: ORDER_ITEM_INCLUDE } },
  });

  return ok(order, 201);
}
