INSERT INTO toilets (
  id,
  name,
  address,
  toilet_type,
  location,
  opening_hours,
  is_open_now,
  is_accessible,
  is_free,
  source,
  last_verified_at
)
VALUES
  (
    '0f4f983a-6cca-4a42-b10b-2e59d156b201',
    'City Hall Public Restroom',
    '110 Sejong-daero, Jung-gu',
    'public',
    ST_SetSRID(ST_MakePoint(126.9779, 37.5663), 4326)::geography,
    '06:00-23:00',
    TRUE,
    TRUE,
    TRUE,
    'municipal_open_data',
    '2026-03-13T09:00:00Z'
  ),
  (
    '7b864b54-4c3e-4e7e-a8cf-ff4b0afdf361',
    'Seoul Plaza Station Toilet',
    '2 Taepyeong-ro 1-ga, Jung-gu',
    'public',
    ST_SetSRID(ST_MakePoint(126.9784, 37.5658), 4326)::geography,
    '24 hours',
    TRUE,
    TRUE,
    TRUE,
    'municipal_open_data',
    '2026-03-13T11:10:00Z'
  );
