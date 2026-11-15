-- Super-fast cosine similarity index on face embeddings
CREATE INDEX IF NOT EXISTS face_embeddings_event_id_idx ON face_embeddings(event_id);
CREATE INDEX IF NOT EXISTS face_embeddings_cosine_hnsw_idx ON face_embeddings USING hnsw (embedding vector_cosine_ops);
