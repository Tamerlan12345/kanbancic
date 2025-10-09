import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Initialize Supabase Admin Client for elevated privileges
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper function to get user's role in a project
async function getUserRole(userClient: SupabaseClient, projectId: string): Promise<string | null> {
  const { data, error } = await userClient.rpc('get_my_project_role', { p_project_id: projectId });
  if (error) {
    console.error('Error getting user role:', error);
    return null;
  }
  return data;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // 1. Get request body and user
    const { action, project_id, email, user_id, role } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error('Invalid JWT');

    // Create a new client with the user's JWT to respect RLS
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // 2. Security Check: Only Admins or Owners can manage members
    const userRole = await getUserRole(userClient, project_id);
    if (userRole !== 'Owner' && userRole !== 'Admin') {
      throw new Error('Permission denied: Only project Owners or Admins can manage members.');
    }

    let responseData: any;

    // 3. Perform action
    switch (action) {
      case 'invite': {
        if (!email) throw new Error('Email is required for inviting a user.');

        // Check if user already exists
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        let targetUserId = existingUser?.id;

        if (userError && userError.code !== 'PGRST116') { // 'PGRST116' means no rows found
            throw userError;
        }

        // If user doesn't exist, invite them.
        if (!targetUserId) {
            const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
            if (inviteError) throw inviteError;
            targetUserId = inviteData.user.id;
        }

        // Add user to the project_members table
        const { data: memberData, error: memberError } = await supabaseAdmin
          .from('project_members')
          .insert({ project_id, user_id: targetUserId, role: 'Member' })
          .select('*, profile:profiles(*)')
          .single();

        if (memberError) {
            // Handle case where user is already a member
            if (memberError.code === '23505') { // unique_violation
                 throw new Error('User is already a member of this project.');
            }
            throw memberError;
        }
        responseData = memberData;
        break;
      }

      case 'update_role': {
        if (!user_id || !role) throw new Error('User ID and role are required.');
        const { data, error } = await supabaseAdmin
          .from('project_members')
          .update({ role })
          .eq('project_id', project_id)
          .eq('user_id', user_id)
          .select('*, profile:profiles(*)')
          .single();
        if (error) throw error;
        responseData = data;
        break;
      }

      case 'remove': {
        if (!user_id) throw new Error('User ID is required.');
        // Prevent owner from removing themselves
        if (user_id === user.id) {
            throw new Error('Project owner cannot be removed.');
        }
        const { error } = await supabaseAdmin
          .from('project_members')
          .delete()
          .eq('project_id', project_id)
          .eq('user_id', user_id);
        if (error) throw error;
        responseData = { message: 'User removed successfully' };
        break;
      }

      default:
        throw new Error('Invalid action.');
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});