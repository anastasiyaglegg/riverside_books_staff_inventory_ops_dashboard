import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { deriveStockStatus } from "@/lib/inventory";
import { isValidOrderStatusTransition } from "@/lib/orders";
import { STAMPS_PER_REWARD, applyEarn, applyRedeem, canRedeem } from "@/lib/loyalty";

/**
 * Manual, opt-in check against whatever DATABASE_URL currently points at --
 * for us that's the real deployed Supabase project, not an isolated test DB.
 * Run explicitly: `npm run verify:supabase`. Never wired into unit/integration/
 * CI/git hooks, since it writes real rows (and cleans them up itself after).
 *
 * Exercises every table's full CRUD lifecycle plus the shared business logic
 * (stock status, order transitions, loyalty math) against the live schema, then
 * deletes exactly what it created -- never a blanket deleteMany() like the local
 * test-DB helper, since this database may hold real data.
 */

beforeAll(() => {
  if (process.env.SUPABASE_LIFECYCLE_CONFIRM !== "1") {
    throw new Error(
      "Refusing to run: this test writes to whatever DATABASE_URL points at. " +
        "Run it via `npm run verify:supabase` only.",
    );
  }
});

const runId = crypto.randomUUID().slice(0, 8);

const createdIds: {
  bookId: string | null;
  customerId: string | null;
  orderId: string | null;
  staffUserId: string | null;
  eventId: string | null;
  policyKey: string | null;
} = {
  bookId: null,
  customerId: null,
  orderId: null,
  staffUserId: null,
  eventId: null,
  policyKey: null,
};

afterAll(async () => {
  if (createdIds.orderId) {
    await prisma.orderItem.deleteMany({ where: { orderId: createdIds.orderId } });
    await prisma.order.delete({ where: { id: createdIds.orderId } }).catch(() => {});
  }
  if (createdIds.customerId) {
    await prisma.loyaltyTransaction.deleteMany({ where: { customerId: createdIds.customerId } });
    await prisma.customer.delete({ where: { id: createdIds.customerId } }).catch(() => {});
  }
  if (createdIds.bookId) {
    await prisma.inventory.deleteMany({ where: { bookId: createdIds.bookId } });
    await prisma.book.delete({ where: { id: createdIds.bookId } }).catch(() => {});
  }
  if (createdIds.staffUserId) {
    await prisma.staffUser.delete({ where: { id: createdIds.staffUserId } }).catch(() => {});
  }
  if (createdIds.eventId) {
    await prisma.event.delete({ where: { id: createdIds.eventId } }).catch(() => {});
  }
  if (createdIds.policyKey) {
    await prisma.storePolicy.delete({ where: { key: createdIds.policyKey } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe("Supabase deployed schema -- full table lifecycle", () => {
  it("creates a staff user", async () => {
    const staff = await prisma.staffUser.create({
      data: { name: `Lifecycle Test Staff ${runId}`, role: "owner" },
    });
    createdIds.staffUserId = staff.id;
    expect(staff.role).toBe("owner");
  });

  it("creates a book with its inventory row", async () => {
    const book = await prisma.book.create({
      data: {
        title: `Lifecycle Test Book ${runId}`,
        author: "Test Author",
        isbn: `TEST-${runId}`,
        priceCents: 1999,
        inventory: {
          create: { quantityOnHand: 5, reorderThreshold: 2, status: deriveStockStatus(5, 2) },
        },
      },
      include: { inventory: true },
    });
    createdIds.bookId = book.id;
    expect(book.inventory?.status).toBe("in_stock");
  });

  it("adjusts inventory and attributes the change to the staff user", async () => {
    const updated = await prisma.inventory.update({
      where: { bookId: createdIds.bookId! },
      data: {
        quantityOnHand: 1,
        status: deriveStockStatus(1, 2),
        lastAdjustedById: createdIds.staffUserId!,
      },
      include: { lastAdjustedBy: true },
    });
    expect(updated.status).toBe("low_stock");
    expect(updated.lastAdjustedBy?.id).toBe(createdIds.staffUserId);
  });

  it("creates a customer", async () => {
    const customer = await prisma.customer.create({
      data: {
        firstName: "Lifecycle",
        lastName: `Test Customer ${runId}`,
        email: `lifecycle-${runId}@example.com`,
      },
    });
    createdIds.customerId = customer.id;
    expect(customer.loyaltyStampCount).toBe(0);
  });

  it("creates an order with an order item referencing the book and customer", async () => {
    const order = await prisma.order.create({
      data: {
        customerId: createdIds.customerId!,
        status: "placed",
        paymentStatus: "unpaid",
        totalCents: 1999,
        items: { create: [{ bookId: createdIds.bookId!, quantity: 1, unitPriceCents: 1999 }] },
      },
      include: { items: true },
    });
    createdIds.orderId = order.id;
    expect(order.items).toHaveLength(1);
  });

  it("walks the order through its valid status transitions", async () => {
    expect(isValidOrderStatusTransition("placed", "ready_for_pickup")).toBe(true);
    let order = await prisma.order.update({
      where: { id: createdIds.orderId! },
      data: { status: "ready_for_pickup" },
    });
    expect(order.status).toBe("ready_for_pickup");

    expect(isValidOrderStatusTransition("ready_for_pickup", "completed")).toBe(true);
    order = await prisma.order.update({
      where: { id: createdIds.orderId! },
      data: { status: "completed" },
    });
    expect(order.status).toBe("completed");
  });

  it("earns loyalty stamps up to the reward threshold", async () => {
    let stamps = 0;
    for (let i = 0; i < STAMPS_PER_REWARD; i++) {
      stamps = applyEarn(stamps);
      await prisma.$transaction([
        prisma.customer.update({
          where: { id: createdIds.customerId! },
          data: { loyaltyStampCount: stamps },
        }),
        prisma.loyaltyTransaction.create({
          data: { customerId: createdIds.customerId!, type: "earn" },
        }),
      ]);
    }
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: createdIds.customerId! },
    });
    expect(customer.loyaltyStampCount).toBe(STAMPS_PER_REWARD);
    expect(canRedeem(customer.loyaltyStampCount)).toBe(true);
  });

  it("redeems a loyalty reward", async () => {
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: createdIds.customerId! },
    });
    const newCount = applyRedeem(customer.loyaltyStampCount);
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: createdIds.customerId! },
        data: { loyaltyStampCount: newCount },
      }),
      prisma.loyaltyTransaction.create({
        data: { customerId: createdIds.customerId!, type: "redeem" },
      }),
    ]);
    const updated = await prisma.customer.findUniqueOrThrow({
      where: { id: createdIds.customerId! },
    });
    expect(updated.loyaltyStampCount).toBe(0);

    const txCount = await prisma.loyaltyTransaction.count({
      where: { customerId: createdIds.customerId! },
    });
    expect(txCount).toBe(STAMPS_PER_REWARD + 1);
  });

  it("creates and lists an event", async () => {
    const event = await prisma.event.create({
      data: {
        title: `Lifecycle Test Event ${runId}`,
        eventDate: new Date("2026-12-01T18:00:00.000Z"),
      },
    });
    createdIds.eventId = event.id;
    const upcoming = await prisma.event.findMany({ orderBy: { eventDate: "asc" } });
    expect(upcoming.some((e) => e.id === event.id)).toBe(true);
  });

  it("creates and edits a store policy", async () => {
    const key = `lifecycle-test-${runId}`;
    createdIds.policyKey = key;
    await prisma.storePolicy.create({ data: { key, value: "initial value" } });
    const updated = await prisma.storePolicy.update({
      where: { key },
      data: { value: "updated value" },
    });
    expect(updated.value).toBe("updated value");
  });

  it("enforces the unique ISBN constraint on books", async () => {
    await expect(
      prisma.book.create({
        data: { title: "Duplicate ISBN", author: "X", isbn: `TEST-${runId}`, priceCents: 100 },
      }),
    ).rejects.toThrow();
  });

  it("enforces the order_items -> books foreign key", async () => {
    await expect(
      prisma.orderItem.create({
        data: {
          orderId: createdIds.orderId!,
          bookId: "00000000-0000-0000-0000-000000000000",
          quantity: 1,
          unitPriceCents: 100,
        },
      }),
    ).rejects.toThrow();
  });
});
