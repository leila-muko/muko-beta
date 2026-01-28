import { createClient } from '@/lib/supabase/client';
import { getBrandProfile, getAnalyses } from '@/lib/db/queries';

export default async function TestPage() {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <div>Not logged in</div>;
  }

  try {
    // Test 1: Try to get brand profile
    const profile = await getBrandProfile(user.id);
    
    // Test 2: Try to get analyses
    const analyses = await getAnalyses(user.id);

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Test</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Brand Profile:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Analyses:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(analyses, null, 2)}
          </pre>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}