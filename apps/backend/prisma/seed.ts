import { PrismaClient, type Book, type Customer } from "@prisma/client";
import { deriveStockStatus } from "../lib/inventory";

const prisma = new PrismaClient();

const BOOKS = [
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    isbn: "9780743273565",
    priceCents: 1299,
    category: "fiction",
    quantityOnHand: 15,
    reorderThreshold: 3,
  },
  {
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    isbn: "9780735219090",
    priceCents: 1699,
    category: "fiction",
    quantityOnHand: 2,
    reorderThreshold: 3,
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    isbn: "9780735211292",
    priceCents: 1800,
    category: "nonfiction",
    quantityOnHand: 0,
    reorderThreshold: 2,
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    isbn: "9780441013593",
    priceCents: 1999,
    category: "sci-fi",
    quantityOnHand: 8,
    reorderThreshold: 2,
  },
  {
    title: "The Very Hungry Caterpillar",
    author: "Eric Carle",
    isbn: "9780399226908",
    priceCents: 899,
    category: "childrens",
    quantityOnHand: 20,
    reorderThreshold: 5,
  },
  {
    title: "Educated",
    author: "Tara Westover",
    isbn: "9780399590504",
    priceCents: 1700,
    category: "memoir",
    quantityOnHand: 1,
    reorderThreshold: 2,
  },
  {
    title: "Mystery at Riverside",
    author: "J. Alden Cole",
    isbn: "9780000000017",
    priceCents: 1499,
    category: "mystery",
    quantityOnHand: 5,
    reorderThreshold: 2,
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    isbn: "9781250301697",
    priceCents: 1599,
    category: "mystery",
    quantityOnHand: 0,
    reorderThreshold: 3,
  },
] as const;

const CUSTOMERS = [
  { name: "Jane Doe", email: "jane.doe@example.com", phone: null, loyaltyStampCount: 4 },
  { name: "Marcus Lee", email: "marcus.lee@example.com", phone: null, loyaltyStampCount: 10 },
  { name: "Priya Patel", email: "priya.patel@example.com", phone: null, loyaltyStampCount: 0 },
  { name: "Sam Rivera", email: null, phone: "555-0142", loyaltyStampCount: 7 },
] as const;

const EVENTS = [
  {
    title: "Author Talk: Local Mystery Writers Night",
    description: "Meet three local mystery authors for a reading and Q&A.",
    eventDate: new Date("2026-09-12T18:30:00.000Z"),
    capacity: 40,
  },
  {
    title: "Kids' Storytime Saturday",
    description: "Weekly storytime for ages 3-7, hosted by our booksellers.",
    eventDate: new Date("2026-09-06T15:00:00.000Z"),
    capacity: null,
  },
  {
    title: "Book Club: Discussing 'Educated'",
    description: "Monthly book club meeting -- new members welcome.",
    eventDate: new Date("2026-09-20T18:00:00.000Z"),
    capacity: 20,
  },
] as const;

const POLICIES = [
  { key: "hours", value: "Mon-Sat 9am-7pm, Sun 10am-5pm" },
  {
    key: "return_policy",
    value: "Returns accepted within 30 days with receipt, unless marked final sale.",
  },
  { key: "contact", value: "info@riversidebooks.example - (555) 123-4567" },
  {
    key: "loyalty_program",
    value: "Earn a stamp for every purchase; 10 stamps = $10 off your next order.",
  },
] as const;

async function main() {
  const existingBooks = await prisma.book.count();
  if (existingBooks > 0) {
    console.log(
      `Skipping seed: ${existingBooks} book(s) already exist. Truncate the tables first if you want to reseed.`,
    );
    return;
  }

  const books: Book[] = [];
  for (const b of BOOKS) {
    const { quantityOnHand, reorderThreshold, ...bookFields } = b;
    const book = await prisma.book.create({
      data: {
        ...bookFields,
        inventory: {
          create: {
            quantityOnHand,
            reorderThreshold,
            status: deriveStockStatus(quantityOnHand, reorderThreshold),
          },
        },
      },
    });
    books.push(book);
  }
  console.log(`Seeded ${books.length} books with inventory.`);

  const customers: Customer[] = [];
  for (const c of CUSTOMERS) {
    const customer = await prisma.customer.create({ data: c });
    customers.push(customer);
    if (c.loyaltyStampCount > 0) {
      await prisma.loyaltyTransaction.createMany({
        data: Array.from({ length: c.loyaltyStampCount }, () => ({
          customerId: customer.id,
          type: "earn",
        })),
      });
    }
  }
  console.log(`Seeded ${customers.length} customers with loyalty history.`);

  function findBook(title: string) {
    const book = books.find((b) => b.title === title);
    if (!book) throw new Error(`Seed error: expected book "${title}" to exist`);
    return book;
  }
  function findCustomer(name: string) {
    const customer = customers.find((c) => c.name === name);
    if (!customer) throw new Error(`Seed error: expected customer "${name}" to exist`);
    return customer;
  }

  const gatsby = findBook("The Great Gatsby");
  const dune = findBook("Dune");
  const atomicHabits = findBook("Atomic Habits");
  const jane = findCustomer("Jane Doe");
  const marcus = findCustomer("Marcus Lee");
  const priya = findCustomer("Priya Patel");

  await prisma.order.create({
    data: {
      customerId: jane.id,
      status: "placed",
      paymentStatus: "pay_in_store",
      totalCents: dune.priceCents,
      items: { create: [{ bookId: dune.id, quantity: 1, unitPriceCents: dune.priceCents }] },
    },
  });

  await prisma.order.create({
    data: {
      customerId: marcus.id,
      status: "ready_for_pickup",
      paymentStatus: "paid_online",
      totalCents: gatsby.priceCents * 2,
      items: { create: [{ bookId: gatsby.id, quantity: 2, unitPriceCents: gatsby.priceCents }] },
    },
  });

  await prisma.order.create({
    data: {
      customerId: priya.id,
      status: "completed",
      paymentStatus: "paid_online",
      totalCents: atomicHabits.priceCents,
      items: {
        create: [{ bookId: atomicHabits.id, quantity: 1, unitPriceCents: atomicHabits.priceCents }],
      },
    },
  });
  console.log("Seeded 3 orders (placed, ready_for_pickup, completed).");

  await prisma.event.createMany({ data: EVENTS.map((e) => ({ ...e })) });
  console.log(`Seeded ${EVENTS.length} events.`);

  await prisma.storePolicy.createMany({ data: POLICIES.map((p) => ({ ...p })) });
  console.log(`Seeded ${POLICIES.length} store policies.`);

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
