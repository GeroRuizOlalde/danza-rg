export const DIAS_SEMANA_ORDENADOS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const

export const DIAS_ABIERTOS_DEFAULT = DIAS_SEMANA_ORDENADOS.slice(0, 5)

const DIA_POR_CLAVE = new Map(
  DIAS_SEMANA_ORDENADOS.map((dia) => [normalizarDia(dia), dia])
)

export function normalizarDia(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function sanitizeDiasAbiertos(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  const dias = source
    .map((item) => (typeof item === 'string' ? DIA_POR_CLAVE.get(normalizarDia(item)) : null))
    .filter((item): item is (typeof DIAS_SEMANA_ORDENADOS)[number] => Boolean(item))

  return dias.length > 0 ? Array.from(new Set(dias)) : [...DIAS_ABIERTOS_DEFAULT]
}

export function isDiaAbierto(dia: string, diasAbiertos: readonly string[]) {
  const diaNormalizado = normalizarDia(dia)
  return diasAbiertos.some((item) => normalizarDia(item) === diaNormalizado)
}

export function filtrarHorariosPorDiasAbiertos<T extends { dia: string | null | undefined }>(
  horarios: T[],
  diasAbiertos: readonly string[]
) {
  return horarios.filter((horario) => horario.dia && isDiaAbierto(horario.dia, diasAbiertos))
}
