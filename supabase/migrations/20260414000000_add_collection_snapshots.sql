CREATE TABLE IF NOT EXISTS collection_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  collection_name TEXT NOT NULL,
  report_snapshot JSONB NOT NULL,
  report_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  piece_count INTEGER,
  UNIQUE(user_id, collection_name)
);

ALTER TABLE collection_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own snapshots"
  ON collection_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
