export const revalidate = 60

import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SalaSelector from '@/components/landing/SalaSelector'
import InscripcionForm from '@/components/landing/InscripcionForm'
import FadeInObserver from '@/components/landing/FadeInObserver'
import ClaseCard from '@/components/landing/ClaseCard'
import { filtrarHorariosPorDiasAbiertos, sanitizeDiasAbiertos } from '@/lib/academia'
import { createServerSupabase } from '@/lib/supabase-server'

type AcademiaInfo = {
  nombre: string
  telefono: string
  direccion: string
  instagram: string
  dias_abiertos?: string[] | null
}

type ClaseRecord = Record<string, unknown> & {
  id: string
  nombre: string
}

type GaleriaRecord = Record<string, unknown> & {
  id: string
  url: string
  categoria?: string | null
}

type HorarioRecord = {
  hora: number
  dia: string
  sala: number
  nivel: string | null
  clases?: { nombre: string } | null
}

export default async function HomePage() {
  const supabase = await createServerSupabase()

  let info: Partial<AcademiaInfo> | null = null
  let clases: ClaseRecord[] | null = null
  let horarios: HorarioRecord[] | null = null
  let galeria: GaleriaRecord[] | null = null

  if (supabase) {
    ;[
      { data: info },
      { data: clases },
      { data: horarios },
      { data: galeria },
    ] = await Promise.all([
      supabase.from('academia_info').select('*').single(),
      supabase.from('clases').select('*').or('estado.eq.activa,estado.is.null'),
      supabase.from('horarios').select('*, clases(nombre)'),
      supabase.from('galeria').select('*').order('orden', { ascending: true }),
    ])
  }

  const infoAcademia: AcademiaInfo = {
    nombre: 'R.G Danza',
    telefono: '351 679-3151',
    direccion: 'Rio Negro 4450, Zona Sur - Cordoba, Arg.',
    instagram: '@r.g_danza',
    ...info,
  }

  const clasesDB = clases ?? []
  const galeriaDB = galeria ?? []
  const diasAbiertos = sanitizeDiasAbiertos(infoAcademia.dias_abiertos)
  const horariosDB = filtrarHorariosPorDiasAbiertos(horarios ?? [], diasAbiertos)

  const valores = [
    { code: '01', title: 'Ambiente seguro' },
    { code: '02', title: 'Profesores calificados' },
    { code: '03', title: 'Todas las edades' },
    { code: '04', title: 'Shows anuales' },
  ]

  const contactoItems = [
    { code: 'MAP', title: 'Ubicacion', detail: infoAcademia.direccion },
    { code: 'WA', title: 'WhatsApp', detail: infoAcademia.telefono },
  ]

  return (
    <>
      <Navbar />
      <FadeInObserver />

      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=1400&q=80"
          alt="Bailarina de danza en R.G Danza, academia en Cordoba"
          fill
          className="object-cover object-[center_top]"
          priority
        />
        <div className="absolute inset-0 bg-[#1A1A22]/55" />

        <div className="relative z-10 text-center px-6 max-w-3xl animate-[fadeUp_0.9s_ease_both]">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-5 py-2 rounded-full text-xs font-medium tracking-[2px] uppercase mb-8 border border-white/20">
            Academia de Danza
          </div>
          <h1 className="font-playfair text-[clamp(2.6rem,6vw,4.8rem)] font-bold leading-[1.08] text-white mb-6">
            Donde el cuerpo
            <br />
            encuentra su <em className="italic text-[#F5D0DC]">ritmo</em>
          </h1>
          <p className="text-base md:text-lg text-white/75 leading-relaxed max-w-[540px] mx-auto mb-10 font-light">
            En {infoAcademia.nombre} te acompanamos en cada paso. Clases para todas las
            edades y niveles, en un espacio donde la pasion por el movimiento se
            convierte en arte.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/turnero"
              className="inline-flex items-center gap-2 bg-[#C97A96] text-white px-8 py-3.5 rounded-full no-underline font-medium text-sm shadow-[0_4px_20px_rgba(201,122,150,0.4)] hover:bg-white hover:text-[#1A1A22] transition-colors"
            >
              Reserva tu clase de prueba
            </Link>
            <a
              href="#nosotros"
              className="inline-flex items-center gap-2 border-[1.5px] border-white/30 text-white px-8 py-3.5 rounded-full no-underline font-medium text-sm hover:bg-white/10 transition-colors"
            >
              Conocenos
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-lg px-6 py-3.5 rounded-full border border-[#E8A0B4]/30 shadow-lg z-10">
          <span className="text-xs text-[#8A8A99]">Proximo inicio de ciclo - </span>
          <strong className="text-sm text-[#1A1A22]">Abril 2026 - Inscripciones abiertas</strong>
        </div>
      </section>

      <section
        id="nosotros"
        className="py-16 md:py-24 px-[5%] md:px-[8%] bg-[#F7F7F9] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center relative overflow-hidden"
      >
        <svg
          className="absolute -top-4 -right-8 w-[320px] h-[320px] pointer-events-none hidden md:block"
          style={{ opacity: 0.04 }}
          viewBox="0 0 200 200"
          fill="#C97A96"
        >
          <path d="M100 15c0 5-2 10-2 15 0 4 2 7 2 11-1 5-4 9-4 14 0 4 2 8 3 12 1 5 0 10-2 14-2 4-6 7-8 11-1 4 0 8 1 12 2 5 6 8 8 12 2 5 2 10 1 15-1 4-4 7-6 10-3 4-5 8-6 13-1 4 1 8 3 11 3 4 7 6 10 9 4 3 8 5 12 6 3 0 6-1 9-3 3-3 5-7 7-11 1-3 1-7 3-10 2-4 6-7 8-11 1-3 1-7-1-10-2-4-6-7-9-10-2-2-3-5-3-8-1-5 1-10 3-14 1-3 3-5 4-8 2-5 2-10 0-15-1-4-4-7-6-10-3-4-7-7-10-9-2-2-4-3-6-4-3-1-6-1-8 1" />
        </svg>

        <div className="fade-in relative rounded-3xl overflow-hidden aspect-[4/5] shadow-[0_24px_64px_rgba(201,122,150,0.2)]">
          <Image
            src="https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=700&q=80"
            alt="Profesora de danza en R.G Danza"
            fill
            className="object-cover"
          />
        </div>
        <div className="fade-in">
          <div className="text-xs font-medium tracking-[2px] uppercase text-[#C97A96] mb-3">
            Quienes somos
          </div>
          <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold text-[#1A1A22] leading-tight mb-5">
            Una academia creada
            <br />
            con <em className="italic text-[#C97A96]">amor</em> por la danza
          </h2>
          <p className="text-base text-[#8A8A99] leading-relaxed max-w-[540px] mb-10 font-light">
            {infoAcademia.nombre} nacio del sueno de crear un espacio donde cada alumna
            pueda expresarse, crecer y brillar.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {valores.map((item) => (
              <div key={item.title} className="bg-white border border-[#E8A0B4]/25 rounded-2xl p-5">
                <span className="text-2xl block mb-2 font-playfair text-[#C97A96]">{item.code}</span>
                <h4 className="text-sm font-semibold">{item.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="clases" className="py-16 md:py-24 px-[5%] md:px-[8%] bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
          <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold text-[#1A1A22]">
            Nuestras <em className="italic text-[#C97A96]">clases</em>
          </h2>
          <Link
            href="/clases"
            className="inline-flex items-center gap-2 border-[1.5px] border-[#F5D0DC] text-[#C97A96] px-8 py-3.5 rounded-full no-underline font-medium text-sm hover:bg-[#FDF0F4] transition-colors"
          >
            Ver todas
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clasesDB.slice(0, 3).map((clase) => (
            <ClaseCard key={clase.id} clase={clase} />
          ))}
        </div>
      </section>

      <section id="horarios" className="py-16 md:py-24 px-[5%] md:px-[8%] bg-[#1A1A22] text-white relative">
        <div className="mb-10">
          <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold">
            Horarios de <em className="italic text-[#C97A96]">clases</em>
          </h2>
        </div>
        <SalaSelector horarios={horariosDB} diasAbiertos={diasAbiertos} />
      </section>

      <section
        id="inscripcion"
        className="py-16 md:py-24 px-[5%] md:px-[8%] bg-[#FDF0F4] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center relative overflow-hidden"
      >
        <svg
          className="absolute -bottom-6 -right-6 w-[260px] h-[260px] pointer-events-none hidden md:block"
          style={{ opacity: 0.06 }}
          viewBox="0 0 200 200"
          fill="#C97A96"
        >
          <path d="M90 20c-2 4-5 7-6 12-1 4 1 8 0 12-1 5-5 8-7 12-1 4 0 9 2 13 2 3 5 5 7 8 3 5 4 11 3 17-1 4-4 7-5 11-1 5 0 10 2 14 3 5 7 8 11 11 3 2 7 3 10 5 4 3 6 7 9 10 2 2 5 3 8 3 4 0 8-2 11-5 2-2 3-5 5-8 3-4 7-7 9-12 1-3 0-7-2-10-2-4-6-6-9-8-2-2-3-5-4-8-1-4-1-9 0-13 1-3 3-5 4-8 2-5 2-11 0-16-1-4-4-7-6-10-3-4-5-9-5-14 0-4 2-7 3-10 2-4 1-9-1-13-1-3-3-5-5-7z" />
        </svg>
        <div className="fade-in">
          <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold text-[#1A1A22]">
            Lista para
            <br />
            <em className="italic text-[#C97A96]">empezar</em>?
          </h2>
          <div className="flex flex-col gap-5 mt-8">
            {contactoItems.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold text-[#C97A96]">
                  {item.code}
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="text-[0.82rem]">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="fade-in bg-white rounded-3xl p-8 md:p-10 shadow-[0_16px_48px_rgba(201,122,150,0.12)]">
          <InscripcionForm
            telefonoDinamico={infoAcademia.telefono}
            clases={clasesDB.map((c) => ({ id: c.id, nombre: c.nombre }))}
          />
        </div>
      </section>

      <section id="galeria" className="py-16 md:py-24 px-[5%] md:px-[8%] bg-[#F7F7F9]">
        <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold text-center mb-12">
          Momentos que <em className="italic text-[#C97A96]">brillan</em>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {galeriaDB.map((img) => (
            <div key={img.id} className="galeria-item relative aspect-square rounded-2xl overflow-hidden">
              <Image
                src={img.url}
                alt={img.categoria ? `${img.categoria} - R.G Danza` : 'Galeria R.G Danza'}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  )
}
