import { prisma } from "@/lib/prisma";

// Deletes in FK-safe order. Integration tests call this in beforeEach so the
// suite stays repeatable and order-independent (testing doc §5).
export async function resetDb() {
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.eventTicket.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.book.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.storePolicy.deleteMany();
  await prisma.staffUser.deleteMany();
}
