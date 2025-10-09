import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Обработка preflight-запроса ДО любой другой логики
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // Инициализация Supabase-клиента внутри try-блока
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Получение JWT токена пользователя из заголовков
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, description, workspace_id } = await req.json();

    // Вставка проекта в базу
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, description, workspace_id, created_by: user.id })
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      throw projectError;
    }

    return new Response(JSON.stringify(project), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    // В случае ЛЮБОЙ ошибки, возвращаем ответ с CORS-заголовками
    console.error('Catastrophic error in create-project function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // или 500 в зависимости от типа ошибки
    });
  }
});