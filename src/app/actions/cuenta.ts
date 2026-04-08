'use server'

import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server'
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

type PerfilClienteInput = {
  nombre: string
  apellido: string
  telefono: string
  fechaNacimiento?: string
  autorizaImagen?: boolean
}

type CompletarPerfilInvitadoInput = PerfilClienteInput & {
  password: string
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
  fecha_nacimiento: string | null
  autoriza_imagen: boolean | null
}

function normalizarEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

async function getAuthenticatedContext() {
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

  const supabaseAdmin = createAdminSupabase()

  if (!supabaseAdmin) {
    throw new Error(missingSupabaseServiceEnvMessage)
  }

  return { supabase, supabaseAdmin, user }
}

async function vincularReservasPendientes({
  supabaseAdmin,
  userId,
  email,
}: {
  supabaseAdmin: NonNullable<ReturnType<typeof createAdminSupabase>>
  userId: string
  email: string
}) {
  if (!email) {
    return 0
  }

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('id, telefono, email')
    .is('perfil_id', null)
    .eq('email', email)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const ids = ((data as ReservaPendiente[] | null) ?? [])
    .filter((reserva) => normalizarEmail(reserva.email) === email)
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

async function persistirPerfilCliente({
  input,
  requireBasicData,
}: {
  input:
    | Partial<PerfilClienteInput>
    | FinalizarCuentaInput
  requireBasicData: boolean
}) {
  const { supabaseAdmin, user } = await getAuthenticatedContext()
  const metadata = user.user_metadata || {}
  const { data: perfilActual, error: perfilError } = await supabaseAdmin
    .from('perfiles')
    .select('nombre, apellido, telefono, fecha_nacimiento, autoriza_imagen')
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
  const fechaNacimiento =
    'fechaNacimiento' in input
      ? normalizarTexto(input.fechaNacimiento ?? '') || null
      : perfilActual?.fecha_nacimiento ?? null
  const autorizaImagen =
    'autorizaImagen' in input && typeof input.autorizaImagen === 'boolean'
      ? input.autorizaImagen
      : Boolean(perfilActual?.autoriza_imagen)

  if (requireBasicData && (!nombre || !telefono)) {
    throw new Error(
      'Necesitamos tu nombre y WhatsApp para crear la cuenta y vincular el turno.'
    )
  }

  const { error: upsertError } = await supabaseAdmin.from('perfiles').upsert({
    id: user.id,
    nombre: nombre || null,
    apellido: apellido || null,
    telefono: telefono || null,
    fecha_nacimiento: fechaNacimiento,
    autoriza_imagen: autorizaImagen,
    updated_at: new Date().toISOString(),
  })

  if (upsertError) {
    throw upsertError
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...metadata,
      display_name: nombre,
      last_name: apellido,
      telefono,
      registro_origen: metadata.registro_origen || 'turnero',
    },
  })

  if (authError) {
    throw authError
  }

  const linkedCount = await vincularReservasPendientes({
    supabaseAdmin,
    userId: user.id,
    email: normalizarEmail(user.email),
  })

  return { linkedCount }
}

export async function finalizarCuentaClienteAction(
  input: FinalizarCuentaInput = {}
): Promise<FinalizarCuentaResult> {
  try {
    const result = await persistirPerfilCliente({
      input,
      requireBasicData: true,
    })

    return { success: true, linkedCount: result.linkedCount }
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

export async function actualizarPerfilClienteAction(
  input: PerfilClienteInput
): Promise<FinalizarCuentaResult> {
  try {
    const result = await persistirPerfilCliente({
      input,
      requireBasicData: true,
    })

    return { success: true, linkedCount: result.linkedCount }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'No pudimos actualizar tu perfil.',
    }
  }
}

export async function completarPerfilInvitadoAction(
  input: CompletarPerfilInvitadoInput
): Promise<FinalizarCuentaResult> {
  try {
    const { supabase } = await getAuthenticatedContext()

    const { error: authError } = await supabase.auth.updateUser({
      password: input.password,
    })

    if (authError) {
      throw authError
    }

    const result = await persistirPerfilCliente({
      input,
      requireBasicData: true,
    })

    return { success: true, linkedCount: result.linkedCount }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'No pudimos completar tu perfil.',
    }
  }
}
