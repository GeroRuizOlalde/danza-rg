'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type ClaseProcesada = {
  id: string
  nombre: string
  etiqueta: string
  edades: string
  descripcion: string
  imagen_url: string
  horariosFormateados: string[]
}

const FILTROS = [
  { id: 'all', label: 'Todas' },
  { id: 'Clásico', label: 'Clásico' },
  { id: 'Jazz', label: 'Jazz' },
  { id: 'Urbano', label: 'Urbano' },
  { id: 'Acrobacia', label: 'Acrobacia' },
]

export default function ClasesFiltro({ clases }: { clases: ClaseProcesada[] }) {
  const [filtroActivo, setFiltroActivo] = useState('all')

  const clasesFiltradas = useMemo(() => {
    return clases.filter(
      (clase) => filtroActivo === 'all' || clase.etiqueta === filtroActivo
    )
  }, [clases, filtroActivo])

  return (
    <>
      {/* FILTROS */}
      <div className="py-10 px-[5%] md:px-[8%] bg-white border-b border-[#E8A0B4]/15">
        <div className="max-w-7xl mx-auto flex gap-3 flex-wrap">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.id}
              onClick={() => setFiltroActivo(filtro.id)}
              className={`px-5 py-2 rounded-full border-[1.5px] text-sm font-medium transition-all duration-200 ${
                filtroActivo === filtro.id
                  ? 'bg-[#C97A96] text-white border-[#C97A96]'
                  : 'bg-transparent border-[#E8A0B4]/30 text-[#4A4A55] hover:border-[#C97A96] hover:text-[#C97A96]'
              }`}
            >
              {filtro.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE CLASES */}
      <section className="py-16 px-[5%] md:px-[8%] max-w-7xl mx-auto min-h-[50vh]">
        <div className="flex flex-col gap-10">
          {clasesFiltradas.length > 0 ? (
            clasesFiltradas.map((clase, index) => {
              const isReverse = index % 2 !== 0
              return (
                <div
                  key={clase.id}
                  className={`grid grid-cols-1 md:grid-cols-[380px_1fr] bg-white rounded-3xl overflow-hidden border border-[#E8A0B4]/20 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(201,122,150,0.15)] transition-all duration-300 ${
                    isReverse ? 'md:grid-cols-[1fr_380px]' : ''
                  }`}
                >
                  <div className={`relative min-h-[240px] md:min-h-[320px] overflow-hidden group ${isReverse ? 'md:order-2' : ''}`}>
                    <img
                      src={clase.imagen_url || 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80'}
                      alt={clase.nombre}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className={`p-8 md:p-10 flex flex-col justify-center ${isReverse ? 'md:order-1' : ''}`}>
                    <span className="inline-block bg-[#F5D0DC] text-[#C97A96] text-xs font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 rounded-full mb-4 w-fit">
                      {clase.etiqueta}
                    </span>
                    <h2 className="font-playfair text-3xl font-bold text-[#1A1A22] mb-3 leading-tight">
                      {clase.nombre}
                    </h2>
                    <p className="text-sm text-[#8A8A99] leading-relaxed mb-6 font-light">
                      {clase.descripcion}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
                      <div className="flex items-center gap-2 text-sm text-[#4A4A55]">
                        🎀 Edad/Nivel: <strong className="text-[#1A1A22]">{clase.edades}</strong>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#4A4A55]">
                        ⏱️ Duración: <strong className="text-[#1A1A22]">60 — 90 min</strong>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-xs font-semibold tracking-[1px] uppercase text-[#C97A96] mb-2.5">
                        Horarios disponibles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {clase.horariosFormateados.length > 0 ? (
                          clase.horariosFormateados.map(horario => (
                            <span key={horario} className="inline-block bg-[#F7F7F9] text-[#4A4A55] text-xs px-3 py-1.5 rounded-lg font-medium">
                              {horario}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#8A8A99]">Próximamente...</span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/turnero?clase=${encodeURIComponent(clase.nombre)}`}
                      className="inline-flex items-center gap-2 bg-[#C97A96] text-white px-6 py-3 rounded-full text-sm font-medium w-fit transition-all shadow-[0_4px_16px_rgba(201,122,150,0.3)] hover:bg-[#1A1A22] hover:-translate-y-px"
                    >
                      Reservar clase de prueba →
                    </Link>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-20 text-[#8A8A99]">
              No hay clases disponibles para esta categoría actualmente.
            </div>
          )}
        </div>
      </section>
    </>
  )
}
