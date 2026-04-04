'use server'

import { randomUUID } from 'node:crypto'
import { DIAS_SEMANA_ORDENADOS, isDiaAbierto, sanitizeDiasAbiertos } from '@/lib/academia'
import { missingSupabaseServiceEnvMessage } from '@/lib/supabase-env'
import { HORARIO_A_COORDINAR, getDiaSemana } from '@/lib/reservas'
import { createAdminSupabase, requireAdminUser } from '@/lib/supabase-server'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

type PaymentActionResult =
  | { success: true }
  | { success: false; error: string; requiresConfirmation?: boolean }

type AcademiaInput = {
  id: string
  nombre: string
  telefono: string
  email: string
  direccion: string
  instagram: string
  dias_abiertos: string[]
}

type ClaseInput = {
  id?: string
  nombre: string
  etiqueta: string
  edades: string
  descripcion: string
  imagen_url: string
  estado: string
}

type HorarioInput = {
  id?: string
  clase_id: string
  sala: number
  dia: string
  hora: number
  nivel: string
  cupo_maximo: number
}

type ReservaInput = {
  nombre: string
  apellido: string
  telefono: string
  disciplina: string
  fecha: string
  horario: string
  estado: string
  perfilId?: string
}

type PagoInput = {
  alumnaId: string
  monto: number
  fechaPago: string
  mesCorrespondiente: string
  metodoPago: string
  nota?: string
  permitirDuplicado?: boolean
}

type ProfesorInput = {
  id?: string
  nombre: string
  apellido: string
  telefono: string
  disciplina: string
  activo: boolean
}

type AsistenciaInput = {
  profesorId: string
  fecha: string
  presente: boolean
}

type AsistenciaRecord = {
  id: string
  profesor_id: string
  fecha: string
  presente: boolean
  nota?: string | null
}

const ESTADOS_RESERVA_VALIDOS = new Set(['pendiente', 'confirmado', 'cancelado'])
const ESTADOS_CLASE_VALIDOS = new Set(['activa', 'inactiva'])
const DIAS_VALIDOS: ReadonlySet<string> = new Set(DIAS_SEMANA_ORDENADOS)

const CLASES_STORAGE_PREFIX = 'clases/'

function parseError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

async function getAdminContext() {
  const supabaseAdmin = createAdminSupabase()

  if (!supabaseAdmin) {
    throw new Error(missingSupabaseServiceEnvMessage)
  }

  const { user } = await requireAdminUser()

  return { supabaseAdmin, user }
}

async function obtenerDiasAbiertosAcademia(
  supabaseAdmin: Awaited<ReturnType<typeof getAdminContext>>['supabaseAdmin']
) {
  const { data, error } = await supabaseAdmin
    .from('academia_info')
    .select('*')
    .limit(1)
    .maybeSingle<{ dias_abiertos?: string[] | null }>()

  if (error) {
    throw error
  }

  return sanitizeDiasAbiertos(data?.dias_abiertos)
}

function normalizarString(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function getSafeStoragePath(url: string) {
  try {
    const pathname = new URL(url).pathname
    const storagePath = pathname.split('/galeria/')[1]

    if (storagePath) {
      return storagePath
    }
  } catch {
    // Ignore malformed URLs and fall back to simple parsing.
  }

  return url.split('?')[0]?.split('/').pop() ?? null
}

function getManagedClassImagePath(url: string | null | undefined) {
  const normalizedUrl = normalizarString(url)

  if (!normalizedUrl) {
    return null
  }

  const storagePath = getSafeStoragePath(normalizedUrl)

  if (!storagePath || !storagePath.startsWith(CLASES_STORAGE_PREFIX)) {
    return null
  }

  return storagePath
}

async function removeManagedClassImage(
  supabaseAdmin: Awaited<ReturnType<typeof getAdminContext>>['supabaseAdmin'],
  imageUrl: string | null | undefined
) {
  const storagePath = getManagedClassImagePath(imageUrl)

  if (!storagePath) {
    return
  }

  await supabaseAdmin.storage.from('galeria').remove([storagePath]).catch(() => undefined)
}

async function crearReservaMedianteRpc(
  supabaseAdmin: Awaited<ReturnType<typeof getAdminContext>>['supabaseAdmin'],
  input: {
    nombre: string
    apellido?: string
    telefono?: string
    email?: string
    disciplina: string
    fecha: string | null
    horario: string
    origen: 'admin' | 'landing' | 'turnero'
    perfilId?: string | null
    estado: string
    validarHorario: boolean
  }
) {
  const dia = input.validarHorario && input.fecha ? getDiaSemana(input.fecha) : null

  const { error } = await supabaseAdmin.rpc('crear_reserva_segura', {
    p_nombre: input.nombre,
    p_apellido: input.apellido || null,
    p_telefono: input.telefono || null,
    p_email: input.email || null,
    p_disciplina: input.disciplina,
    p_fecha: input.fecha,
    p_horario: input.horario,
    p_alumno_nombre: null,
    p_alumno_edad: null,
    p_origen: input.origen,
    p_perfil_id: input.perfilId || null,
    p_dia: dia,
    p_validar_horario: input.validarHorario,
    p_estado: input.estado,
  })

  if (error) {
    throw error
  }
}

export async function actualizarAdminDisplayNameAction(
  displayName: string
): Promise<ActionResult<{ displayName: string }>> {
  try {
    const nombre = normalizarString(displayName)

    if (!nombre) {
      return { success: false, error: 'Ingresá un nombre válido.' }
    }

    const { supabaseAdmin, user } = await getAdminContext()
    const metadata =
      user.user_metadata && typeof user.user_metadata === 'object'
        ? { ...(user.user_metadata as Record<string, unknown>) }
        : {}

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...metadata,
        display_name: nombre,
      },
    })

    if (error) {
      throw error
    }

    return { success: true, data: { displayName: nombre } }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos actualizar tu nombre.'),
    }
  }
}

export async function actualizarAcademiaAdminAction(
  input: AcademiaInput
): Promise<ActionResult> {
  try {
    if (!input.id) {
      return { success: false, error: 'No encontramos la configuración de la academia.' }
    }

    if (!Array.isArray(input.dias_abiertos) || input.dias_abiertos.length === 0) {
      return { success: false, error: 'Selecciona al menos un dia de apertura.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const diasAbiertos = sanitizeDiasAbiertos(input.dias_abiertos)

    const { error } = await supabaseAdmin
      .from('academia_info')
      .update({
        nombre: normalizarString(input.nombre) || null,
        telefono: normalizarString(input.telefono) || null,
        email: normalizarString(input.email) || null,
        direccion: normalizarString(input.direccion) || null,
        instagram: normalizarString(input.instagram) || null,
        dias_abiertos: diasAbiertos,
      })
      .eq('id', input.id)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    const message = parseError(error, 'No pudimos actualizar los datos de la academia.')

    return {
      success: false,
      error: message.includes('dias_abiertos')
        ? `${message}. Falta ejecutar la migracion de configuracion en Supabase.`
        : message,
    }
  }
}

export async function guardarClaseAdminAction(input: ClaseInput): Promise<ActionResult> {
  try {
    const nombre = normalizarString(input.nombre)
    const etiqueta = normalizarString(input.etiqueta)
    const edades = normalizarString(input.edades)
    const estado = ESTADOS_CLASE_VALIDOS.has(input.estado) ? input.estado : 'activa'

    if (!nombre || !etiqueta || !edades) {
      return { success: false, error: 'Completá nombre, etiqueta y edades.' }
    }

    const payload = {
      nombre,
      etiqueta,
      edades,
      descripcion: normalizarString(input.descripcion) || null,
      imagen_url: normalizarString(input.imagen_url) || null,
      estado,
    }

    const { supabaseAdmin } = await getAdminContext()

    if (input.id) {
      const { error } = await supabaseAdmin.from('clases').update(payload).eq('id', input.id)

      if (error) {
        throw error
      }
    } else {
      const { error } = await supabaseAdmin.from('clases').insert([payload])

      if (error) {
        throw error
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos guardar la clase.'),
    }
  }
}

export async function guardarClaseConImagenAdminAction(
  formData: FormData
): Promise<ActionResult> {
  let uploadedImagePath: string | null = null

  try {
    const id = normalizarString(formData.get('id')?.toString())
    const nombre = normalizarString(formData.get('nombre')?.toString())
    const etiqueta = normalizarString(formData.get('etiqueta')?.toString())
    const edades = normalizarString(formData.get('edades')?.toString())
    const descripcion = normalizarString(formData.get('descripcion')?.toString())
    const estadoInput = normalizarString(formData.get('estado')?.toString())
    const imagenUrlActual = normalizarString(formData.get('imagen_url_actual')?.toString())
    const removeCurrentImage =
      normalizarString(formData.get('removeCurrentImage')?.toString()) === 'true'
    const file = formData.get('imagen')
    const estado = ESTADOS_CLASE_VALIDOS.has(estadoInput) ? estadoInput : 'activa'

    if (!nombre || !etiqueta || !edades) {
      return { success: false, error: 'Completa nombre, etiqueta y edades.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    let imagenUrl = removeCurrentImage ? '' : imagenUrlActual

    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Solo podes subir archivos de imagen.' }
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      uploadedImagePath = `${CLASES_STORAGE_PREFIX}${randomUUID()}.${extension}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('galeria')
        .upload(uploadedImagePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('galeria')
        .getPublicUrl(uploadedImagePath)

      imagenUrl = publicUrlData.publicUrl
    }

    const payload = {
      nombre,
      etiqueta,
      edades,
      descripcion: descripcion || null,
      imagen_url: normalizarString(imagenUrl) || null,
      estado,
    }

    if (id) {
      const { error } = await supabaseAdmin.from('clases').update(payload).eq('id', id)

      if (error) {
        throw error
      }
    } else {
      const { error } = await supabaseAdmin.from('clases').insert([payload])

      if (error) {
        throw error
      }
    }

    if ((uploadedImagePath || removeCurrentImage) && imagenUrlActual) {
      await removeManagedClassImage(supabaseAdmin, imagenUrlActual)
    }

    return { success: true }
  } catch (error) {
    try {
      if (uploadedImagePath) {
        const { supabaseAdmin } = await getAdminContext()
        await supabaseAdmin.storage.from('galeria').remove([uploadedImagePath]).catch(() => undefined)
      }
    } catch {
      // Ignore cleanup errors so the original failure reaches the UI.
    }

    return {
      success: false,
      error: parseError(error, 'No pudimos guardar la clase.'),
    }
  }
}

export async function eliminarClaseAdminAction(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: 'Clase inválida.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const { data: claseExistente, error: fetchError } = await supabaseAdmin
      .from('clases')
      .select('imagen_url')
      .eq('id', id)
      .limit(1)
      .maybeSingle<{ imagen_url: string | null }>()

    if (fetchError) {
      throw fetchError
    }

    const { error } = await supabaseAdmin.from('clases').delete().eq('id', id)

    if (error) {
      throw error
    }

    await removeManagedClassImage(supabaseAdmin, claseExistente?.imagen_url)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos eliminar la clase.'),
    }
  }
}

export async function guardarHorarioAdminAction(
  input: HorarioInput
): Promise<ActionResult> {
  try {
    const claseId = normalizarString(input.clase_id)
    const dia = normalizarString(input.dia)
    const cupo = Number.isFinite(input.cupo_maximo) ? Math.max(1, Math.trunc(input.cupo_maximo)) : 20
    const hora = Number.isFinite(input.hora) ? Math.trunc(input.hora) : Number.NaN

    if (!claseId || !DIAS_VALIDOS.has(dia) || Number.isNaN(hora)) {
      return { success: false, error: 'Revisá la clase, el día y la hora antes de guardar.' }
    }

    if (input.sala !== 1 && input.sala !== 2) {
      return { success: false, error: 'La sala seleccionada no es válida.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const diasAbiertos = await obtenerDiasAbiertosAcademia(supabaseAdmin)

    if (!isDiaAbierto(dia, diasAbiertos)) {
      return {
        success: false,
        error: 'Ese dia no esta habilitado en la configuracion de la academia.',
      }
    }

    let duplicateQuery = supabaseAdmin
      .from('horarios')
      .select('id')
      .eq('sala', input.sala)
      .eq('dia', dia)
      .eq('hora', hora)
      .limit(1)

    if (input.id) {
      duplicateQuery = duplicateQuery.neq('id', input.id)
    }

    const { data: horarioExistente, error: duplicateError } = await duplicateQuery.maybeSingle()

    if (duplicateError) {
      throw duplicateError
    }

    if (horarioExistente) {
      return {
        success: false,
        error: 'Ya existe una clase cargada para esa sala, día y horario.',
      }
    }

    const payload = {
      clase_id: claseId,
      sala: input.sala,
      dia,
      hora,
      nivel: normalizarString(input.nivel) || null,
      cupo_maximo: cupo,
    }

    if (input.id) {
      const { error } = await supabaseAdmin.from('horarios').update(payload).eq('id', input.id)

      if (error) {
        throw error
      }
    } else {
      const { error } = await supabaseAdmin.from('horarios').insert([payload])

      if (error) {
        throw error
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos guardar el horario.'),
    }
  }
}

export async function eliminarHorarioAdminAction(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: 'Horario inválido.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const { error } = await supabaseAdmin.from('horarios').delete().eq('id', id)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos eliminar el horario.'),
    }
  }
}

export async function actualizarReservaEstadoAdminAction(
  reservaId: string,
  nuevoEstado: string
): Promise<ActionResult<{ estado: string }>> {
  try {
    if (!reservaId || !ESTADOS_RESERVA_VALIDOS.has(nuevoEstado)) {
      return { success: false, error: 'El estado de la reserva no es válido.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const { error } = await supabaseAdmin
      .from('reservas')
      .update({ estado: nuevoEstado })
      .eq('id', reservaId)

    if (error) {
      throw error
    }

    return { success: true, data: { estado: nuevoEstado } }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos actualizar el estado del turno.'),
    }
  }
}

export async function crearReservaAdminAction(
  input: ReservaInput
): Promise<ActionResult> {
  try {
    let nombre = normalizarString(input.nombre)
    let apellido = normalizarString(input.apellido)
    let telefono = normalizarString(input.telefono)
    const disciplina = normalizarString(input.disciplina)
    const fecha = normalizarString(input.fecha)
    const horario = normalizarString(input.horario)
    const perfilId = normalizarString(input.perfilId)
    const estado = ESTADOS_RESERVA_VALIDOS.has(input.estado) ? input.estado : 'pendiente'

    if (!nombre || !disciplina || !fecha || !horario) {
      return { success: false, error: 'Completá los campos obligatorios del turno.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const validarHorario = horario !== HORARIO_A_COORDINAR

    if (perfilId) {
      const { data: perfil, error: perfilError } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre, apellido, telefono')
        .eq('id', perfilId)
        .limit(1)
        .maybeSingle<{
          id: string
          nombre: string | null
          apellido: string | null
          telefono: string | null
        }>()

      if (perfilError) {
        throw perfilError
      }

      if (!perfil) {
        return { success: false, error: 'No encontramos el cliente seleccionado.' }
      }

      nombre = normalizarString(perfil.nombre) || nombre
      apellido = normalizarString(perfil.apellido) || apellido
      telefono = normalizarString(perfil.telefono) || telefono
    }

    if (validarHorario) {
      const diaReserva = getDiaSemana(fecha)
      const diasAbiertos = await obtenerDiasAbiertosAcademia(supabaseAdmin)

      if (!isDiaAbierto(diaReserva, diasAbiertos)) {
        return {
          success: false,
          error: 'Ese día no está habilitado en la configuración de la academia.',
        }
      }
    }

    await crearReservaMedianteRpc(supabaseAdmin, {
      nombre,
      apellido,
      telefono,
      disciplina,
      fecha,
      horario,
      origen: 'admin',
      perfilId: perfilId || null,
      estado,
      validarHorario,
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos crear el turno.'),
    }
  }
}

export async function eliminarReservaAdminAction(reservaId: string): Promise<ActionResult> {
  try {
    if (!reservaId) {
      return { success: false, error: 'Turno inválido.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const { error } = await supabaseAdmin.from('reservas').delete().eq('id', reservaId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos eliminar el turno.'),
    }
  }
}

export async function crearPagoAdminAction(
  input: PagoInput
): Promise<PaymentActionResult> {
  try {
    const alumnaId = normalizarString(input.alumnaId)
    const fechaPago = normalizarString(input.fechaPago)
    const mesCorrespondiente = normalizarString(input.mesCorrespondiente)
    const metodoPago = normalizarString(input.metodoPago)
    const monto = Number.isFinite(input.monto) ? input.monto : Number.NaN
    const fechaPagoDate = new Date(`${fechaPago}T12:00:00`)
    const mesPeriodo = Number.isNaN(fechaPagoDate.getTime())
      ? null
      : `${fechaPagoDate.getFullYear()}-${String(fechaPagoDate.getMonth() + 1).padStart(2, '0')}`
    const mesLegacy = Number.isNaN(fechaPagoDate.getTime())
      ? null
      : fechaPagoDate.getMonth() + 1
    const anioLegacy = Number.isNaN(fechaPagoDate.getTime())
      ? null
      : fechaPagoDate.getFullYear()

    if (!alumnaId || !fechaPago || !mesCorrespondiente || !metodoPago || Number.isNaN(monto) || monto <= 0) {
      return { success: false, error: 'Revisá los datos del pago antes de guardar.' }
    }

    const { supabaseAdmin } = await getAdminContext()

    const { data: pagoExistente, error: duplicateError } = await supabaseAdmin
      .from('pagos')
      .select('id')
      .eq('alumna_id', alumnaId)
      .eq('mes_correspondiente', mesCorrespondiente)
      .limit(1)
      .maybeSingle()

    if (duplicateError) {
      throw duplicateError
    }

    if (pagoExistente && !input.permitirDuplicado) {
      return {
        success: false,
        error: `Ya existe un pago registrado para "${mesCorrespondiente}".`,
        requiresConfirmation: true,
      }
    }

    const { error } = await supabaseAdmin.from('pagos').insert([
      {
        alumna_id: alumnaId,
        monto,
        mes: mesLegacy,
        anio: anioLegacy,
        fecha_pago: fechaPago,
        mes_correspondiente: mesCorrespondiente,
        mes_periodo: mesPeriodo,
        metodo_pago: metodoPago,
        nota: normalizarString(input.nota) || null,
        estado: 'pagado',
      },
    ])

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    const message = parseError(error, 'No pudimos registrar el pago.')

    return {
      success: false,
      error: message.includes('schema cache')
        ? `${message}. Te falta ejecutar la migración de pagos en Supabase.`
        : message,
    }
  }
}

export async function guardarProfesorAdminAction(
  input: ProfesorInput
): Promise<ActionResult> {
  try {
    const nombre = normalizarString(input.nombre)
    const apellido = normalizarString(input.apellido)
    const disciplina = normalizarString(input.disciplina)

    if (!nombre || !apellido || !disciplina) {
      return { success: false, error: 'Completá nombre, apellido y disciplina.' }
    }

    const payload = {
      nombre,
      apellido,
      telefono: normalizarString(input.telefono) || null,
      disciplina,
      activo: Boolean(input.activo),
    }

    const { supabaseAdmin } = await getAdminContext()

    if (input.id) {
      const { error } = await supabaseAdmin.from('profesores').update(payload).eq('id', input.id)

      if (error) {
        throw error
      }
    } else {
      const { error } = await supabaseAdmin.from('profesores').insert([payload])

      if (error) {
        throw error
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos guardar el profesor.'),
    }
  }
}

export async function toggleProfesorActivoAdminAction(
  profesorId: string,
  activo: boolean
): Promise<ActionResult<{ activo: boolean }>> {
  try {
    if (!profesorId) {
      return { success: false, error: 'Profesor inválido.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const { error } = await supabaseAdmin
      .from('profesores')
      .update({ activo })
      .eq('id', profesorId)

    if (error) {
      throw error
    }

    return { success: true, data: { activo } }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos actualizar el estado del profesor.'),
    }
  }
}

export async function eliminarProfesorAdminAction(
  profesorId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!profesorId) {
      return { success: false, error: 'Profesor invalido.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const { error } = await supabaseAdmin.from('profesores').delete().eq('id', profesorId)

    if (error) {
      throw error
    }

    return { success: true, data: { id: profesorId } }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos eliminar el profesor.'),
    }
  }
}

export async function marcarAsistenciaProfesorAdminAction(
  input: AsistenciaInput
): Promise<ActionResult<AsistenciaRecord>> {
  try {
    const profesorId = normalizarString(input.profesorId)
    const fecha = normalizarString(input.fecha)

    if (!profesorId || !fecha) {
      return { success: false, error: 'La asistencia que querés guardar es inválida.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const { data: existente, error: existingError } = await supabaseAdmin
      .from('asistencia_profesores')
      .select('id')
      .eq('profesor_id', profesorId)
      .eq('fecha', fecha)
      .limit(1)
      .maybeSingle<{ id: string }>()

    if (existingError) {
      throw existingError
    }

    let data: AsistenciaRecord | null = null
    let error: unknown = null

    if (existente?.id) {
      const result = await supabaseAdmin
        .from('asistencia_profesores')
        .update({
          presente: input.presente,
        })
        .eq('id', existente.id)
        .select('id, profesor_id, fecha, presente')
        .single<AsistenciaRecord>()

      data = result.data
      error = result.error
    } else {
      const result = await supabaseAdmin
        .from('asistencia_profesores')
        .insert([
          {
            profesor_id: profesorId,
            fecha,
            presente: input.presente,
          },
        ])
        .select('id, profesor_id, fecha, presente')
        .single<AsistenciaRecord>()

      data = result.data
      error = result.error
    }

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('No recibimos el registro de asistencia actualizado.')
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos guardar la asistencia.'),
    }
  }
}

export async function subirFotoGaleriaAdminAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const file = formData.get('file')
    const categoria = normalizarString(formData.get('categoria')?.toString()) || 'Academia'

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Seleccioná una imagen antes de subirla.' }
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Solo podés subir archivos de imagen.' }
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${randomUUID()}.${extension}`
    const { supabaseAdmin } = await getAdminContext()

    const { data: ultimaFoto, error: orderError } = await supabaseAdmin
      .from('galeria')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle<{ orden: number | null }>()

    if (orderError) {
      throw orderError
    }

    const { error: uploadError } = await supabaseAdmin.storage.from('galeria').upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      throw uploadError
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('galeria').getPublicUrl(fileName)
    const nuevoOrden = typeof ultimaFoto?.orden === 'number' ? ultimaFoto.orden + 1 : 1

    const { error: dbError } = await supabaseAdmin.from('galeria').insert([
      {
        url: publicUrlData.publicUrl,
        orden: nuevoOrden,
        categoria,
      },
    ])

    if (dbError) {
      await supabaseAdmin.storage.from('galeria').remove([fileName]).catch(() => undefined)
      throw dbError
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos subir la imagen.'),
    }
  }
}

export async function eliminarFotoGaleriaAdminAction(
  fotoId: string,
  fotoUrl: string
): Promise<ActionResult> {
  try {
    if (!fotoId) {
      return { success: false, error: 'La foto seleccionada no es válida.' }
    }

    const { supabaseAdmin } = await getAdminContext()
    const storagePath = getSafeStoragePath(fotoUrl)

    if (storagePath) {
      await supabaseAdmin.storage.from('galeria').remove([storagePath]).catch(() => undefined)
    }

    const { error } = await supabaseAdmin.from('galeria').delete().eq('id', fotoId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: parseError(error, 'No pudimos eliminar la imagen.'),
    }
  }
}
