import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { resolveCart, type CartItem } from "@/lib/checkout";
import { findOrCreateCustomer, splitName } from "@/lib/customers";
import { decrementStockForOrderItems } from "@/lib/fulfillment";
import { prisma } from "@/lib/prisma";

// Stripe payment webhook. Fulfillment (writing the paid order) happens HERE, not on the
// return page -- a customer can pay and then never load the return page. Always verifies
// the event signature before trusting it.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature") ?? "";
  const rawBody = await request.text(); // raw body is required for signature verification

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await fulfillCheckout(event.data.object);
  }

  return new Response("ok", { status: 200 });
}

async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<void> {
  // Delayed-notification methods fire completed while still unpaid -- don't fulfill yet.
  if (session.payment_status === "unpaid") {
    return;
  }

  // Idempotent: Stripe may retry this event, and stripeSessionId is unique.
  const existing = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existing) {
    return;
  }

  let items: CartItem[];
  try {
    items = JSON.parse(session.metadata?.items ?? "[]") as CartItem[];
  } catch {
    return;
  }
  const resolved = await resolveCart(items);
  if (!resolved || resolved.orderItems.length === 0) {
    return;
  }

  // Prefer the signed-in customer id carried in metadata; otherwise fall back to the
  // email/name Stripe collected during checkout (guest), find-or-creating by email.
  let customerId = session.metadata?.customerId || null;
  if (!customerId) {
    const email = session.customer_details?.email ?? undefined;
    const { firstName, lastName } = splitName(session.customer_details?.name ?? "Customer");
    const customer = await findOrCreateCustomer({
      firstName,
      lastName: lastName ?? undefined,
      email,
    });
    customerId = customer.id;
  }

  // Persist the paid order and reserve its stock atomically -- same rule as POST /orders.
  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        customerId,
        status: "placed",
        paymentStatus: "paid_online",
        totalCents: resolved.totalCents,
        stripeSessionId: session.id,
        items: { create: resolved.orderItems },
      },
    });
    await decrementStockForOrderItems(tx, resolved.orderItems);
  });
}
