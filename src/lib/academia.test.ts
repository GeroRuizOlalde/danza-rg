import { describe, expect, it } from 'vitest'
import {
  DIAS_ABIERTOS_DEFAULT,
  filtrarHorariosPorDiasAbiertos,
  isDiaAbierto,
  sanitizeDiasAbiertos,
} from './academia'

describe('academia helpers', () => {
  it('normaliza dias abiertos y preserva el orden conocido', () => {
    expect(
      sanitizeDiasAbiertos(['sábado', 'miercoles', 'Lunes', 'lunes', 'Domingo'])
    ).toEqual(['Sábado', 'Miércoles', 'Lunes', 'Domingo'])
  })

  it('vuelve al default cuando no recibe un valor usable', () => {
    expect(sanitizeDiasAbiertos(null)).toEqual(DIAS_ABIERTOS_DEFAULT)
  })

  it('detecta si un dia esta abierto ignorando acentos y mayusculas', () => {
    expect(isDiaAbierto('miercoles', ['Miércoles'])).toBe(true)
    expect(isDiaAbierto('SÁBADO', ['Sábado'])).toBe(true)
    expect(isDiaAbierto('domingo', ['Lunes', 'Martes'])).toBe(false)
  })

  it('filtra horarios por dias abiertos', () => {
    const horarios = [
      { dia: 'Lunes', hora: 18 },
      { dia: 'Sábado', hora: 10 },
      { dia: null, hora: 20 },
    ]

    expect(filtrarHorariosPorDiasAbiertos(horarios, ['Lunes'])).toEqual([
      { dia: 'Lunes', hora: 18 },
    ])
  })
})
