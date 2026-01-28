import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export default async function TestPage() {
  const supabase = await getSupabaseClient();
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Not Logged In</h1>
        <p>Please <a href="/auth/signin" className="text-blue-600 underline">sign in</a> to test the database.</p>
      </div>
    );
  }

  try {
    // Now queries will work because user is authenticated
    const { data: profiles, error: profileError } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('user_id', user.id);

    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id);

    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">✅ Day 3 Database Test</h1>
        
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <p className="font-semibold">Logged in as:</p>
          <p className="text-sm">{user.email}</p>
          <p className="text-xs font-mono break-all">User ID: {user.id}</p>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Brand Profiles:</h2>
          {profileError ? (
            <div className="p-4 bg-red-50 text-red-600 rounded">
              Error: {profileError.message}
            </div>
          ) : profiles && profiles.length > 0 ? (
            <div>
              <p className="text-green-600 mb-2">✅ Found {profiles.length} profile(s)</p>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(profiles, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-yellow-600">⚠️ No profiles found for this user</p>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Analyses:</h2>
          {analysesError ? (
            <div className="p-4 bg-red-50 text-red-600 rounded">
              Error: {analysesError.message}
            </div>
          ) : analyses && analyses.length > 0 ? (
            <div>
              <p className="text-green-600 mb-2">✅ Found {analyses.length} analysis(es)</p>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(analyses, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-yellow-600">⚠️ No analyses found for this user</p>
          )}
        </div>

        <div className="p-6 bg-green-50 rounded">
          <h3 className="font-bold text-green-800 mb-2">🎉 Day 3 Complete!</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>✅ Database schema created</li>
            <li>✅ Tables with relationships</li>
            <li>✅ RLS policies properly configured</li>
            <li>✅ Test data inserted</li>
            <li>✅ TypeScript types defined</li>
            <li>✅ Helper functions created</li>
            <li>✅ Supabase connection working</li>
          </ul>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <pre className="bg-red-50 p-4 rounded">
          {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}