import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv, getSupabaseServiceEnv } from './supabase-env'

export async function createServerSupabase() {
  const { url, anonKey, isConfigured } = getSupabasePublicEnv()

  if (!isConfigured) return null

  const cookieStore = await cookies()

  return createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components can read cookies but can't always persist them.
        }
      },
    },
  })
}

export function createAdminSupabase() {
  const { url, serviceRoleKey, isConfigured } = getSupabaseServiceEnv()

  if (!isConfigured) return null

  return createClient(url!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function getServerUserRole() {
  const supabase = await createServerSupabase()

  if (!supabase) {
    return { supabase: null, user: null, role: null }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role || user?.user_metadata?.role || null

  return { supabase, user, role }
}

export async function requireAdminUser() {
  const { supabase, user, role } = await getServerUserRole()

  if (!supabase || !user) {
    throw new Error('Necesitás iniciar sesión para realizar esta acción.')
  }

  if (role !== 'admin') {
    throw new Error('No tenés permisos de administrador para realizar esta acción.')
  }

  return { supabase, user }
}
