-- Product C: sample previews + chat log tracking additions.
-- Applied on top of riverside_books_schema_no_stripe.sql (10 base tables).

-- Sample previews: stored, licensed content only. Never LLM-generated.
CREATE TABLE book_samples (
  id SERIAL PRIMARY KEY,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  sample_type TEXT NOT NULL CHECK (sample_type IN
    ('licensed_excerpt', 'publisher_preview_url', 'staff_teaser')),
  excerpt_text TEXT,          -- required for 'licensed_excerpt' and 'staff_teaser'
  preview_url TEXT,           -- required for 'publisher_preview_url'
  word_count INT,
  rights_source TEXT NOT NULL,   -- publisher/vendor granting use, or 'staff-written'
  rights_verified_by TEXT,
  rights_verified_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_book_samples_book ON book_samples(book_id) WHERE is_active;

-- Did the preview move anyone toward a purchase? Product B reads this.
CREATE TABLE sample_preview_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  book_id INT REFERENCES books(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN
    ('shown', 'opened', 'completed', 'reserve_clicked', 'dismissed')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sample_events_book ON sample_preview_events(book_id, action);
CREATE INDEX idx_sample_events_session ON sample_preview_events(session_id);

-- Chat log additions: session grouping + unanswered-question triage.
ALTER TABLE chat_logs ADD COLUMN session_id TEXT;
ALTER TABLE chat_logs ADD COLUMN was_answered BOOLEAN DEFAULT TRUE;
ALTER TABLE chat_logs ADD COLUMN handoff_offered BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_logs ADD COLUMN intent TEXT;
CREATE INDEX idx_chat_logs_unanswered ON chat_logs(created_at DESC) WHERE was_answered = FALSE;
