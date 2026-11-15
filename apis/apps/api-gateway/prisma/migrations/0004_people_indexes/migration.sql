CREATE INDEX IF NOT EXISTS faces_person_photo_idx ON faces(person_id, photo_id);
CREATE INDEX IF NOT EXISTS faces_photo_idx ON faces(photo_id);
CREATE INDEX IF NOT EXISTS people_event_created_idx ON people(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS photos_event_uploaded_status_idx ON photos(event_id, uploaded_at DESC, index_status);
