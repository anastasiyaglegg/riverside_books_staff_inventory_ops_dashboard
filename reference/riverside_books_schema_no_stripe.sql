-- ============================================================================
-- RIVERSIDE BOOKS — FINAL SQL SCHEMA (DDL only)
-- Next.js Backend + Supabase (PostgreSQL)
--
-- Run order:
-- 1. This file (schema)
-- 2. riverside_books_seed_data.sql (mock data)
--
-- Products this schema serves:
-- A. Customer Ordering & Loyalty App
-- B. Staff Inventory & Ops Dashboard
-- C. Customer Support Chatbot
-- D. Marketing Content Generator
-- ============================================================================

-- Required extension for trigram full-text search on titles (Product C chatbot).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. CUSTOMERS
-- Links to Firebase Authentication. Firebase owns the credentials
-- (password, tokens); this table stores the Firebase identity reference
-- plus app-specific data (loyalty, role, profile).
--
-- NEVER store passwords, Firebase ID tokens, refresh tokens, or the Firebase
-- private key here. Only firebase_uid (public id) + mirrored profile fields.
-- ============================================================================
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,

  -- Firebase Auth identity
  firebase_uid TEXT UNIQUE NOT NULL, -- from decodedToken.uid
  email TEXT UNIQUE NOT NULL, -- mirrored from Firebase
  email_verified BOOLEAN DEFAULT FALSE, -- mirrored from Firebase
  auth_provider TEXT DEFAULT 'password', -- 'password', 'google.com', etc.
  photo_url TEXT, -- mirrored from Firebase profile
  disabled BOOLEAN DEFAULT FALSE, -- mirror of Firebase disabled state
  last_login_at TIMESTAMP, -- app-tracked on each verified login

  -- Role / authorization
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'owner')),
  is_staff BOOLEAN DEFAULT FALSE, -- convenience flag (true for staff + owner)

  -- App profile + loyalty
  name TEXT NOT NULL,
  phone TEXT,
  loyalty_stamps INT DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. BOOKS
-- ============================================================================
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  isbn TEXT UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT, -- 'Fiction', 'Mystery', etc.
  price DECIMAL(10, 2) NOT NULL,
  stock_level INT DEFAULT 0,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. CARDS
-- ============================================================================
CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  occasion TEXT, -- 'Birthday', 'Wedding', etc.
  category TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock_level INT DEFAULT 0,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. GIFTS
-- ============================================================================
CREATE TABLE gifts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT, -- 'Bookmarks', 'Mugs', etc.
  price DECIMAL(10, 2) NOT NULL,
  stock_level INT DEFAULT 0,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. ORDERS
-- Unified table handling all product types via product_type + product_id.
-- 'event' is included so event tickets can be sold (per the brief).
-- ============================================================================
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL CHECK (product_type IN ('book', 'card', 'gift', 'event')),
  product_id INT NOT NULL, -- references books/cards/gifts/events by id
  order_type TEXT NOT NULL CHECK (order_type IN ('in_store', 'preorder', 'online')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed', 'cancelled')),
  quantity INT DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed')),
  paid_at TIMESTAMP, -- set when payment confirmed via webhook

  notes TEXT, -- staff notes on pre-orders
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. EVENTS
-- Author events / store events. Product D uses these for content generation;
-- Product C surfaces them to customers.
-- ============================================================================
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  description TEXT,
  featured_book_id INT REFERENCES books(id) ON DELETE SET NULL,
  location TEXT, -- 'In-store' or external venue
  capacity INT,
  registration_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. STORE INFO
-- Key-value facts for the chatbot (Product C): hours, policies, contact, FAQ.
-- ============================================================================
CREATE TABLE store_info (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  category TEXT CHECK (category IN ('hours', 'policy', 'contact', 'faq')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. CHAT LOGS
-- Chatbot interaction history (Product C).
-- ============================================================================
CREATE TABLE chat_logs (
  id SERIAL PRIMARY KEY,
  customer_email TEXT, -- null for anonymous chats
  question TEXT NOT NULL,
  answer TEXT,
  products_referenced JSONB, -- {"books":[1,3],"cards":[2],"gifts":[]}
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 9. MARKETING CONTENT
-- Generated social posts (Product D).
-- ============================================================================
CREATE TABLE marketing_content (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('book', 'card', 'gift', 'event')),
  product_id INT NOT NULL, -- references books/cards/gifts/events by id

  -- Generation inputs (chosen by staff before generating)
  promotion_angle TEXT, -- 'new arrival', 'staff pick', 'event tie-in', etc.
  tone TEXT, -- 'playful', 'literary', 'urgent', 'warm', etc.

  -- Generated outputs
  caption TEXT NOT NULL, -- the short social caption
  post_idea TEXT, -- the visual/post concept (distinct from caption)
  full_post TEXT, -- optional longer-form version
  hashtags TEXT,

  -- Review + publishing
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  published_link TEXT, -- URL of the live post once published
  platform TEXT, -- 'instagram', 'twitter', 'facebook', etc.
  created_by_ai BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 10. INVENTORY HISTORY
-- Audit trail of stock changes (Product B).
-- ============================================================================
CREATE TABLE inventory_history (
  id SERIAL PRIMARY KEY,
  product_type TEXT NOT NULL CHECK (product_type IN ('book', 'card', 'gift')),
  product_id INT NOT NULL,
  previous_stock INT,
  new_stock INT,
  change_reason TEXT, -- 'sale', 'restock', 'manual_adjustment', 'damaged'
  changed_by TEXT, -- staff name or 'system'
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_firebase_uid ON customers(firebase_uid); -- every auth'd request looks up by this
CREATE INDEX idx_customers_role ON customers(role);
CREATE INDEX idx_customers_is_staff ON customers(is_staff);
CREATE INDEX idx_customers_created ON customers(created_at);

-- Books
CREATE INDEX idx_books_stock ON books(stock_level);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_title_trgm ON books USING gin(title gin_trgm_ops); -- fuzzy title search

-- Cards
CREATE INDEX idx_cards_stock ON cards(stock_level);
CREATE INDEX idx_cards_occasion ON cards(occasion);
CREATE INDEX idx_cards_category ON cards(category);

-- Gifts
CREATE INDEX idx_gifts_stock ON gifts(stock_level);
CREATE INDEX idx_gifts_category ON gifts(category);

-- Orders
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_product ON orders(product_type, product_id);
CREATE INDEX idx_orders_type ON orders(order_type);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Events
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_featured_book ON events(featured_book_id);

-- Chat logs
CREATE INDEX idx_chat_logs_email ON chat_logs(customer_email);
CREATE INDEX idx_chat_logs_created ON chat_logs(created_at DESC);

-- Marketing content
CREATE INDEX idx_marketing_status ON marketing_content(status);
CREATE INDEX idx_marketing_product ON marketing_content(product_type, product_id);
CREATE INDEX idx_marketing_platform ON marketing_content(platform);

-- Inventory history
CREATE INDEX idx_inventory_product ON inventory_history(product_type, product_id);
CREATE INDEX idx_inventory_created ON inventory_history(created_at DESC);

-- ============================================================================
-- REAL-TIME SUBSCRIPTIONS (Supabase)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE books;
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE gifts;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE marketing_content;

-- ============================================================================
-- VIEWS (convenience queries for the dashboard)
-- ============================================================================

-- Low stock across all product tables (Product B)
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 'book' AS product_type, id, title AS name, stock_level, price FROM books WHERE stock_level < 5
UNION ALL
SELECT 'card', id, name, stock_level, price FROM cards WHERE stock_level < 5
UNION ALL
SELECT 'gift', id, name, stock_level, price FROM gifts WHERE stock_level < 5
ORDER BY stock_level ASC;

-- Pending pre-orders with product names resolved (Product B)
-- NOTE: the source document handed to Product C was truncated mid-statement
-- here (cuts off right after "END AS product_name,"). Reproduced verbatim up
-- to the truncation point rather than guessing the rest — this view is
-- Product B's concern, not Product C's, and retrieval.ts never queries
-- orders/customers, so nothing in this repo depends on it being complete.
-- Restore the full definition from the authoritative schema before relying
-- on this view anywhere.
-- CREATE OR REPLACE VIEW pending_preorders AS
-- SELECT
--   o.id AS order_id,
--   c.name AS customer_name,
--   c.email,
--   c.phone,
--   o.product_type,
--   CASE
--     WHEN o.product_type = 'book' THEN (SELECT title FROM books WHERE id = o.product_id)
--     WHEN o.product_type = 'card' THEN (SELECT name FROM cards WHERE id = o.product_id)
--     WHEN o.product_type = 'gift' THEN (SELECT name FROM gifts WHERE id = o.product_id)
--     WHEN o.product_type = 'event' THEN (SELECT title FROM events WHERE id = o.product_id)
--   END AS product_name,
--   -- ... truncated in source; remainder unknown ...
