-- ============================================================================
-- Seed data — runs after migrations on `supabase db reset`.
-- ============================================================================
-- Deterministic inserts using fixed UUIDs where cross-references matter.
-- Source: docs 07 (Seed Data), 13 (Map System — tiers/examples).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Categories (doc 07 seed list)
-- --------------------------------------------------------------------------
insert into public.categories (name, icon, sort_order) values
  ('Love', 'heart', 1),
  ('Family', 'users', 2),
  ('Travel', 'plane', 3),
  ('Food', 'utensils', 4),
  ('History', 'landmark', 5),
  ('Adventure', 'mountain', 6),
  ('Graduation', 'graduation-cap', 7),
  ('Nature', 'trees', 8),
  ('Sports', 'trophy', 9),
  ('Art', 'palette', 10)
on conflict do nothing;

-- --------------------------------------------------------------------------
-- 2. Egyptian governorates (all 27) — stored as locations of place_type
--    'governorate' at tier 2 so they appear on the map as city hubs.
--    Coordinates are approximate centroids (WGS84).
-- --------------------------------------------------------------------------
insert into public.locations (name, slug, governorate, city, place_type, tier, latitude, longitude, description, status) values
  ('Cairo Governorate',   null, 'Cairo',              'Cairo',        'governorate', 2, 30.0444, 31.2357, 'Greater Cairo — Egypt''s capital region.', 'active'),
  ('Giza Governorate',    null, 'Giza',               'Giza',         'governorate', 2, 30.0131, 31.2089, 'Home of the Giza Pyramids.', 'active'),
  ('Alexandria',          null, 'Alexandria',         'Alexandria',   'governorate', 2, 31.2001, 29.9187, 'Mediterranean coastal city.', 'active'),
  ('Luxor Governorate',   null, 'Luxor',              'Luxor',        'governorate', 2, 25.6872, 32.6396, 'Ancient Thebes — open-air museum.', 'active'),
  ('Aswan Governorate',   null, 'Aswan',              'Aswan',        'governorate', 2, 24.0889, 32.8998, 'Southern Nile gateway to Nubia.', 'active'),
  ('Port Said',           null, 'Port Said',          'Port Said',    'governorate', 2, 31.2653, 32.3019, 'Suez Canal Mediterranean port.', 'active'),
  ('Suez',                null, 'Suez',               'Suez',         'governorate', 2, 29.9668, 32.5498, 'Suez Canal Red Sea port.', 'active'),
  ('Dakahlia',            null, 'Dakahlia',           'Mansoura',     'governorate', 2, 31.0409, 31.3785, 'Nile Delta governorate.', 'active'),
  ('Sharqia',             null, 'Sharqia',            'Zagazig',      'governorate', 2, 30.5877, 31.5022, 'Nile Delta governorate.', 'active'),
  ('Qalyubia',            null, 'Qalyubia',           'Banha',        'governorate', 2, 30.4536, 31.1825, 'Lower Egypt governorate.', 'active'),
  ('Kafr El Sheikh',      null, 'Kafr El Sheikh',     'Kafr El Sheikh','governorate', 2, 31.1107, 30.9388, 'Northern Delta governorate.', 'active'),
  ('Gharbia',             null, 'Gharbia',            'Tanta',        'governorate', 2, 30.7865, 31.0004, 'Central Delta governorate.', 'active'),
  ('Monufia',             null, 'Monufia',            'Shibin El Kom','governorate', 2, 30.5972, 30.9876, 'Delta governorate.', 'active'),
  ('Beheira',             null, 'Beheira',            'Damanhour',    'governorate', 2, 31.0335, 30.4682, 'Western Delta governorate.', 'active'),
  ('Ismailia',            null, 'Ismailia',           'Ismailia',     'governorate', 2, 30.5965, 32.2715, 'Suez Canal governorate.', 'active'),
  ('Beni Suef',           null, 'Beni Suef',          'Beni Suef',    'governorate', 2, 29.0744, 31.0978, 'Upper Egypt governorate.', 'active'),
  ('Faiyum',              null, 'Faiyum',             'Faiyum',       'governorate', 2, 29.3084, 30.8428, 'Oasis governorate.', 'active'),
  ('Minya',               null, 'Minya',              'Minya',        'governorate', 2, 28.0871, 30.7618, 'Upper Egypt governorate.', 'active'),
  ('Asyut',               null, 'Asyut',              'Asyut',        'governorate', 2, 27.1809, 31.1837, 'Upper Egypt governorate.', 'active'),
  ('Sohag',               null, 'Sohag',              'Sohag',        'governorate', 2, 26.5569, 31.6948, 'Upper Egypt governorate.', 'active'),
  ('Qena',                null, 'Qena',               'Qena',         'governorate', 2, 26.1551, 32.7160, 'Upper Egypt governorate.', 'active'),
  ('Red Sea',             null, 'Red Sea',            'Hurghada',     'governorate', 2, 27.2579, 33.8116, 'Red Sea coastal governorate.', 'active'),
  ('New Valley',          null, 'New Valley',         'Kharga',       'governorate', 2, 25.4521, 30.5466, 'Western Desert oasis governorate.', 'active'),
  ('Matrouh',             null, 'Matrouh',            'Marsa Matrouh','governorate', 2, 31.3543, 27.2373, 'Northwest coastal governorate.', 'active'),
  ('North Sinai',         null, 'North Sinai',        'Arish',        'governorate', 2, 31.1311, 33.7973, 'Northeastern governorate.', 'active'),
  ('South Sinai',         null, 'South Sinai',        'El Tor',       'governorate', 2, 28.2416, 33.6224, 'Sinai governorate — Mount Sinai, Sharm.', 'active'),
  ('Damietta',            null, 'Damietta',           'Damietta',     'governorate', 2, 31.4165, 31.8133, 'Nile Delta coastal governorate.', 'active')
on conflict do nothing;

-- --------------------------------------------------------------------------
-- 3. Tier 3–4 landmark locations (doc 13 examples)
-- --------------------------------------------------------------------------
insert into public.locations (name, slug, governorate, city, place_type, tier, latitude, longitude, description, status) values
  -- Tier 4 — Iconic
  ('Great Pyramids of Giza',     null, 'Giza',      'Giza',         'historical_site', 4, 29.9792, 31.1342, 'The last surviving Wonder of the Ancient World.', 'active'),
  ('Great Sphinx of Giza',       null, 'Giza',      'Giza',         'monument',         4, 29.9753, 31.1376, 'Limestone colossal statue beside the pyramids.', 'active'),
  ('Luxor Temple',               null, 'Luxor',     'Luxor',        'historical_site', 4, 25.6991, 32.6391, 'Ancient temple complex on the east bank of the Nile.', 'active'),
  ('Karnak Temple',              null, 'Luxor',     'Luxor',        'historical_site', 4, 25.7188, 32.6573, 'Vast temple complex — ancient Thebes.', 'active'),
  ('Abu Simbel Temples',         null, 'Aswan',     'Abu Simbel',   'historical_site', 4, 22.3372, 31.6258, 'Rock temples of Ramesses II on Lake Nasser.', 'active'),
  ('Valley of the Kings',        null, 'Luxor',     'Luxor',        'historical_site', 4, 25.7402, 32.6014, 'Royal burial tombs of the New Kingdom.', 'active'),
  -- Tier 3 — Landmark
  ('Bibliotheca Alexandrina',    null, 'Alexandria','Alexandria',   'museum',           3, 31.2083, 29.9092, 'Modern revival of the ancient Library of Alexandria.', 'active'),
  ('Qaitbay Citadel',            null, 'Alexandria','Alexandria',   'monument',         3, 31.2141, 29.8856, '15th-century defensive fortress on the Mediterranean.', 'active'),
  ('Khan el-Khalili',            null, 'Cairo',     'Cairo',        'historical_site', 3, 30.0477, 31.2628, 'Historic bazaar in Islamic Cairo.', 'active'),
  ('Montaza Palace',             null, 'Alexandria','Alexandria',   'monument',         3, 31.2890, 30.0153, 'Royal palace and gardens on the coast.', 'active'),
  ('Egyptian Museum',            null, 'Cairo',     'Cairo',        'museum',           3, 30.0478, 31.2336, 'Home of the largest collection of Pharaonic antiquities.', 'active'),
  ('Philae Temple',              null, 'Aswan',     'Aswan',        'historical_site', 3, 24.0250, 32.8847, 'Island temple complex near Aswan.', 'active'),
  ('Saint Catherine''s Monastery',null,'South Sinai','Saint Catherine','monument',       3, 28.5560, 33.9760, 'One of the oldest working Christian monasteries.', 'active'),
  ('Pompey''s Pillar',           null, 'Alexandria','Alexandria',   'monument',         3, 31.1935, 29.9036, 'Roman triumphal column in Alexandria.', 'active')
on conflict do nothing;
