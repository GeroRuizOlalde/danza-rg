'use server'

import {
  createAdminSupabase,
  createServerSupabase,
} from '@/lib/supabase-server'
import {
  missingSupabaseEnvMessage,
  missingSupabaseServiceEnvMessage,
} from '@/lib/supabase-env'
import { normalizarTelefono, normalizarTexto } from '@/lib/reservas'

type FinalizarCuentaInput = {
  nombre?: string
  apellido?: string
  telefono?: string
}

type FinalizarCuentaResult = {
  success: boolean
  error?: string
  linkedCount?: number
}

type ReservaPendiente = {
  id: string
  telefono: string | null
  email: string | null
}

type PerfilActual = {
  nombre: string | null
  apellido: string | null
  telefono: string | null
}

function normalizarEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

async function getAuthenticatedUser() {
  const supabase = await createServerSupabase()

  if (!supabase) {
    throw new Error(missingSupabaseEnvMessage)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Necesitás iniciar sesión para continuar.')
  }

  return { supabase, user }
}

async function vincularReservasPendientes({
  userId,
  telefono,
  email,
}: {
  userId: string
  telefono: string
  email: string
}) {
  const supabaseAdmin = createAdminSupabase()

  if (!supabaseAdmin) {
    throw new Error(missingSupabaseServiceEnvMessage)
  }

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('id, telefono, email')
    .is('perfil_id', null)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    throw error
  }

  const ids = (data as ReservaPendiente[] | null ?? [])
    .filter((reserva) => {
      const mismoTelefono =
        Boolean(telefono) &&
        normalizarTelefono(reserva.telefono ?? '') === telefono
      const mismoEmail =
        Boolean(email) &&
        normalizarEmail(reserva.email) === email

      return mismoTelefono || mismoEmail
    })
    .map((reserva) => reserva.id)

  if (ids.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('reservas')
      .update({ perfil_id: userId })
      .in('id', ids)

    if (updateError) {
      throw updateError
    }
  }

  return ids.length
}

export async function finalizarCuentaClienteAction(
  input: FinalizarCuentaInput = {}
): Promise<FinalizarCuentaResult> {
  try {
    const { user } = await getAuthenticatedUser()
    const supabaseAdmin = createAdminSupabase()

    if (!supabaseAdmin) {
      return { success: false, error: missingSupabaseServiceEnvMessage }
    }

    const metadata = user.user_metadata || {}
    const { data: perfilActual, error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .select('nombre, apellido, telefono')
      .eq('id', user.id)
      .maybeSingle<PerfilActual>()

    if (perfilError) {
      throw perfilError
    }

    const nombre = normalizarTexto(
      input.nombre ??
        perfilActual?.nombre ??
        metadata.display_name ??
        metadata.nombre ??
        ''
    )
    const apellido = normalizarTexto(
      input.apellido ??
        perfilActual?.apellido ??
        metadata.last_name ??
        metadata.apellido ??
        ''
    )
    const telefono = normalizarTelefono(
      input.telefono ??
        perfilActual?.telefono ??
        metadata.telefono ??
        ''
    )
    const email = normalizarEmail(user.email)

    if (!nombre || !telefono) {
      return {
        success: false,
        error:
          'Necesitamos tu nombre y WhatsApp para crear la cuenta y vincular el turno.',
      }
    }

    const { error: upsertError } = await supabaseAdmin.from('perfiles').upsert({
      id: user.id,
      nombre,
      apellido: apellido || null,
      telefono,
      updated_at: new Date().toISOString(),
    })

    if (upsertError) {
      throw upsertError
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...metadata,
          display_name: nombre,
          last_name: apellido,
          telefono,
          registro_origen: metadata.registro_origen || 'turnero',
        },
      }
    )

    if (authError) {
      throw authError
    }

    const linkedCount = await vincularReservasPendientes({
      userId: user.id,
      telefono,
      email,
    })

    return { success: true, linkedCount }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'No pudimos terminar de preparar tu cuenta.',
    }
  }
}
