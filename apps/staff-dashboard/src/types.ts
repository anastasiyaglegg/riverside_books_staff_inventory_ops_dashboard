export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type OrderStatus =
  | "placed"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export type Inventory = {
  id: string;
  bookId: string;
  quantityOnHand: number;
  reorderThreshold: number;
  status: StockStatus;
  lastAdjustedById: string | null;
  lastAdjustedBy?: { id: string; name: string } | null;
  updatedAt: string;
  book?: Book;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  priceCents: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  inventory?: Inventory | null;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyStampCount: number;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  bookId: string;
  quantity: number;
  unitPriceCents: number;
  book?: Book;
};

export type Order = {
  id: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid_online" | "pay_in_store";
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: OrderItem[];
};

export type Event = {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  capacity: number | null;
  createdAt: string;
};

export type StorePolicy = {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
};
