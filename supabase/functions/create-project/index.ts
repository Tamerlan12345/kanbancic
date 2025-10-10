// supabase/functions/create-project/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { name, description, workspace_id } = await req.json();

    // Auth check: Ensure the user has sent an Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // This is a critical client-side error.
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Create a user-specific Supabase client by forwarding the Authorization header.
    // This allows the RLS policies and database defaults (like `auth.uid()`) to work correctly.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Insert the new project. The `created_by` field is now omitted,
    // as it will be automatically set by the database `DEFAULT auth.uid()`.
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, description, workspace_id }) // `created_by` is removed
      .select()
      .single();

    if (projectError) {
      // If there's an error during insertion (e.g., RLS violation), throw it.
      console.error('Project creation error:', projectError);
      throw projectError;
    }

    // The `on_project_created_assign_owner` trigger will automatically handle
    // adding the user to the `project_members` table.

    return new Response(JSON.stringify(project), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error('Error in create-project:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});