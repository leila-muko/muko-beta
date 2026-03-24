// Requires .env.test with SUPABASE_URL, SUPABASE_ANON_KEY, TEST_USER_ID
// TEST_USER_ID is a fake UUID that will never collide with real auth.users

import { createClient } from '@supabase/supabase-js';

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function teardown(): Promise<void> {
  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('user_id', TEST_USER_ID);

  if (error) {
    throw error;
  }
}
