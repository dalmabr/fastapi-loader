import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verificar se o chamador é admin via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ detail: 'Não autenticado' }, 401)
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) {
      return json({ detail: 'Token inválido' }, 401)
    }

    if (user.app_metadata?.role !== 'admin') {
      return json({ detail: 'Acesso restrito a administradores' }, 403)
    }

    // Criar usuário
    const { email, password, role = 'operator' } = await req.json()
    if (!email || !password) {
      return json({ detail: 'E-mail e senha são obrigatórios' }, 400)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
    })

    if (error) {
      return json({ detail: error.message }, 400)
    }

    return json({ id: data.user.id, email, role }, 201)
  } catch {
    return json({ detail: 'Erro interno' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
