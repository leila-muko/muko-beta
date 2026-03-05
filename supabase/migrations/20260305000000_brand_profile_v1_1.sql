ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS brand_description TEXT,
  ADD COLUMN IF NOT EXISTS reference_brands TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_brands TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_aesthetics TEXT[] DEFAULT '{}';
