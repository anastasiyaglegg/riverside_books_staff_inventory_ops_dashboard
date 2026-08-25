-- Product C: trigram-ranked book search as a Postgres function, callable via
-- supabase-js .rpc() over the REST API — no direct DB connection needed at
-- runtime, and no arbitrary SQL sent from the app. Not specified in the base
-- brief; added because PostgREST's query builder can't express
-- "ORDER BY similarity(title, $1) DESC" on its own, and idx_books_title_trgm
-- (already created in the base schema) is otherwise unused for ranking.
CREATE OR REPLACE FUNCTION search_books_trgm(search_query TEXT, match_limit INT DEFAULT 5)
RETURNS TABLE (
  id INT,
  isbn TEXT,
  title TEXT,
  author TEXT,
  price DECIMAL(10, 2),
  stock_level INT,
  description TEXT,
  score REAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id,
    b.isbn,
    b.title,
    b.author,
    b.price,
    b.stock_level,
    b.description,
    GREATEST(similarity(b.title, search_query), similarity(b.author, search_query)) AS score
  FROM books b
  WHERE
    b.title ILIKE '%' || search_query || '%'
    OR b.author ILIKE '%' || search_query || '%'
    OR similarity(b.title, search_query) > 0.25
    OR similarity(b.author, search_query) > 0.25
  ORDER BY score DESC, b.stock_level DESC
  LIMIT match_limit;
$$;
