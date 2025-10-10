// supabase/functions/manage-project-members/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // This handles the CORS preflight request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // Initialize Supabase Admin Client for elevated privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get request body and authenticate the user
    const { action, project_id, email, user_id, role } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Create a new client with the user's JWT to respect RLS for permission checks
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Get the calling user's role in the specified project
    const { data: userRole, error: roleError } = await userClient.rpc('get_my_project_role', { p_project_id: project_id });
    if (roleError) {
        console.error('Error getting user role:', roleError);
        throw new Error('Could not verify user permissions for the project.');
    }

    // 2. Security Check: Only Admins or Owners can manage members
    if (userRole !== 'Owner' && userRole !== 'Admin') {
      return new Response(JSON.stringify({ error: 'Permission denied: Only project Owners or Admins can manage members.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    let responseData: any;

    // 3. Perform action based on the 'action' field from the request
    switch (action) {
      case 'invite': {
        if (!email) throw new Error('Email is required for inviting a user.');

        // Check if the user already exists in the system
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        let targetUserId = existingUser?.id;

        // 'PGRST116' means no rows were found, which is expected if the user is new.
        if (userError && userError.code !== 'PGRST116') {
            throw userError;
        }

        // If the user doesn't exist in the system, invite them via email.
        if (!targetUserId) {
            const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
            if (inviteError) throw inviteError;
            targetUserId = inviteData.user.id;
        }

        // Add the user to the project_members table with a default role
        const { data: memberData, error: memberError } = await supabaseAdmin
          .from('project_members')
          .insert({ project_id, user_id: targetUserId, role: 'Member' })
          .select('*, profile:profiles(*)')
          .single();

        if (memberError) {
            // Handle the specific case where the user is already a member
            if (memberError.code === '23505') { // unique_violation
                 throw new Error('User is already a member of this project.');
            }
            throw memberError;
        }
        responseData = memberData;
        break;
      }

      case 'update_role': {
        if (!user_id || !role) throw new Error('User ID and role are required for updating a role.');
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
        if (!user_id) throw new Error('User ID is required for removal.');

        // Security check: Prevent an owner from being removed from their own project.
        if (user_id === user.id && userRole === 'Owner') {
            throw new Error('Project owner cannot be removed from the project.');
        }

        const { error } = await supabaseAdmin
          .from('project_members')
          .delete()
          .eq('project_id', project_id)
          .eq('user_id', user_id);

        if (error) throw error;
        responseData = { message: 'User removed successfully.' };
        break;
      }

      default:
        throw new Error(`Invalid action specified: '${action}'.`);
    }

    // 4. Return a success response
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // 5. Catch-all error handler for any unexpected errors
    console.error('Critical error in manage-project-members:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Use 500 for unexpected server errors
    });
  }
});