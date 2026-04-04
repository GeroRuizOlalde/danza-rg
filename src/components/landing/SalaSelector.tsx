'use client'

import { useMemo, useState } from 'react'
import { isDiaAbierto, normalizarDia, sanitizeDiasAbiertos } from '@/lib/academia'

type Celda = { clase: string; nivel: string | null } | null

type Horario = {
  hora: number
  dia: string
  sala: number
  nivel: string | null
  clases?: { nombre: string } | null
}

type FilaHorario = {
  hs: number
  celdas: Celda[]
}

function CeldaHorario({ celda }: { celda: Celda }) {
  if (!celda) return <td className="text-white/15">-</td>

  return (
    <td>
      {celda.clase}
      {celda.nivel && (
        <span className="nivel-badge nivel-inicio mt-1 block">
          {celda.nivel}
        </span>
      )}
    </td>
  )
}

export default function SalaSelector({
  horarios,
  diasAbiertos,
}: {
  horarios: Horario[]
  diasAbiertos?: string[] | null
}) {
  const [sala, setSala] = useState<1 | 2>(1)

  const diasVisibles = useMemo(
    () => sanitizeDiasAbiertos(diasAbiertos),
    [diasAbiertos]
  )

  const grillaHoraria = useMemo(() => {
    const horas = [17, 18, 19, 20, 21]
    const horariosSala = horarios.filter(
      (item) => item.sala === sala && isDiaAbierto(item.dia ?? '', diasVisibles)
    )

    return horas.map((hora): FilaHorario => ({
      hs: hora,
      celdas: diasVisibles.map((dia) => {
        const coincidencia = horariosSala.find(
          (item) => item.hora === hora && normalizarDia(item.dia ?? '') === normalizarDia(dia)
        )

        return coincidencia
          ? { clase: coincidencia.clases?.nombre ?? 'Clase', nivel: coincidencia.nivel ?? null }
          : null
      }),
    }))
  }, [diasVisibles, horarios, sala])

  return (
    <>
      <div className="mb-8 flex gap-3">
        {([1, 2] as const).map((numero) => (
          <button
            key={numero}
            onClick={() => setSala(numero)}
            className={`cursor-pointer rounded-full px-6 py-2 transition-all ${
              sala === numero
                ? 'border-none bg-[#C97A96] text-white'
                : 'border-[1.5px] border-[#E8A0B4]/30 bg-transparent text-white'
            }`}
          >
            Sala {numero}
          </button>
        ))}
      </div>

      <div className="fade-in overflow-x-auto">
        <table className="horarios-table">
          <thead>
            <tr>
              <th>Hs.</th>
              {diasVisibles.map((dia) => (
                <th key={dia}>{dia}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grillaHoraria.map((row) => (
              <tr key={row.hs}>
                <td>
                  <strong className="text-[#E8A0B4]">{row.hs}</strong>
                </td>
                {row.celdas.map((celda, index) => (
                  <CeldaHorario key={`${row.hs}-${diasVisibles[index]}`} celda={celda} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
