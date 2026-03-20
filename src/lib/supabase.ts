import { createClient } from '@supabase/supabase-js';

// Nos aseguramos de que las variables de entorno existan
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan las variables de entorno de Supabase. Verifica tu archivo .env.local");
}

// Creamos y exportamos el cliente para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);