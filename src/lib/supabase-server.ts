import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from './supabase-env'

export function createServerSupabase() {
  const { url, anonKey, isConfigured } = getSupabasePublicEnv()

  if (!isConfigured) return null

  return createClient(url!, anonKey!)
}
