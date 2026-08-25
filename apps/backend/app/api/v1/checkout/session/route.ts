import { ok, fail, failValidation } from "@/lib/api-response";
import { getStripe, checkoutReturnUrl } from "@/lib/stripe";
import { resolveCart } from "@/lib/checkout";
import { createCheckoutSessionSchema } from "@/lib/validation/checkout";
import { prisma } from "@/lib/prisma";

// Public (Product A cart checkout). Creates an embedded Stripe Checkout Session for the
// cart and returns its client_secret so the frontend can mount <EmbeddedCheckout> in-page
// (no redirect). Amounts are computed server-side; the order itself is created later by
// the webhook on payment success -- never here.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createCheckoutSessionSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }
  const { items, customerId } = parsed.data;

  const resolved = await resolveCart(items);
  if (!resolved) {
    return fail("One or more items in your cart were not found", 400, "INVALID_ITEMS");
  }

  // A signed-in customer checks out "as themselves": prefill Stripe's email field from
  // their record so they don't retype it (guests just enter it in the form).
  let customerEmail: string | undefined;
  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    customerEmail = customer?.email ?? undefined;
  }

  const session = await getStripe().checkout.sessions.create({
    // "embedded_page" is the current name for the full embedded Checkout form (the API
    // renamed it from "embedded"); it's what @stripe/react-stripe-js EmbeddedCheckout
    // mounts, still returning a client_secret.
    ui_mode: "embedded_page",
    mode: "payment",
    line_items: resolved.lineItems,
    return_url: checkoutReturnUrl(),
    ...(customerEmail && { customer_email: customerEmail }),
    // Carry the cart + customer through to the webhook, which is what actually writes the
    // order. payment_method_types is intentionally omitted (dynamic payment methods).
    metadata: { items: JSON.stringify(items), customerId: customerId ?? "" },
  });

  return ok({ clientSecret: session.client_secret });
}

// Public. The /checkout/return page polls this with ?session_id= to show the outcome and
// link to the created order (written by the webhook, so orderId may briefly be null).
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return fail("session_id is required", 400, "VALIDATION_ERROR");
  }

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const order = await prisma.order.findUnique({ where: { stripeSessionId: sessionId } });

  return ok({
    status: session.status,
    paymentStatus: session.payment_status,
    customerEmail: session.customer_details?.email ?? null,
    orderId: order?.id ?? null,
  });
}
