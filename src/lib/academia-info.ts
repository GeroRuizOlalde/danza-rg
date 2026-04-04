import { createServerSupabase } from './supabase-server'

export type AcademiaInfoPublic = {
  nombre: string
  telefono: string
  direccion: string
  instagram: string
  email: string
}

export const DEFAULT_ACADEMIA_INFO: AcademiaInfoPublic = {
  nombre: 'R.G Danza',
  telefono: '5493516793151',
  direccion: 'Rio Negro 4450, Zona Sur - Cordoba',
  instagram: '@r.g_danza',
  email: '',
}

export async function getAcademiaInfoPublic() {
  const supabase = await createServerSupabase()

  if (!supabase) {
    return DEFAULT_ACADEMIA_INFO
  }

  const { data, error } = await supabase
    .from('academia_info')
    .select('nombre, telefono, direccion, instagram, email')
    .limit(1)
    .maybeSingle<Partial<AcademiaInfoPublic>>()

  if (error || !data) {
    return DEFAULT_ACADEMIA_INFO
  }

  return {
    nombre: data.nombre || DEFAULT_ACADEMIA_INFO.nombre,
    telefono: data.telefono || DEFAULT_ACADEMIA_INFO.telefono,
    direccion: data.direccion || DEFAULT_ACADEMIA_INFO.direccion,
    instagram: data.instagram || DEFAULT_ACADEMIA_INFO.instagram,
    email: data.email || DEFAULT_ACADEMIA_INFO.email,
  }
}
