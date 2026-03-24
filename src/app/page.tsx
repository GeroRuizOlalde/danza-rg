export const revalidate = 60

import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SalaSelector from '@/components/landing/SalaSelector'
import InscripcionForm from '@/components/landing/InscripcionForm'
import FadeInObserver from '@/components/landing/FadeInObserver'
import ClaseCard from '@/components/landing/ClaseCard'
import { createServerSupabase } from '@/lib/supabase-server'

export default async function HomePage() {
  const supabase = createServerSupabase()

  const [
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

  const infoAcademia = info ?? {
    nombre: 'R.G Danza',
    telefono: '351 679-3151',
    direccion: 'Río Negro 4450, Zona Sur · Córdoba, Arg.',
    instagram: '@r.g_danza',
  }

  const clasesDB = clases ?? []
  const galeriaDB = galeria ?? []
  const horariosDB = horarios ?? []

  return (
    <>
      <Navbar />
      <FadeInObserver />

      {/* ── HERO ── */}
      <section className="min-h-screen grid grid-cols-1 md:grid-cols-2 items-center pt-[72px] overflow-hidden relative">
        {/* Glow decorativo */}
        <div className="absolute -top-[200px] -right-[200px] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(232,160,180,0.18)_0%,transparent_70%)] pointer-events-none" />

        <div className="p-8 md:p-[5%_5%_5%_8%] animate-[fadeUp_0.9s_ease_both]">
          <div className="inline-flex items-center gap-2 bg-[#F5D0DC] text-[#C97A96] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase mb-6">
            ✦ Academia de Danza
          </div>
          <h1 className="font-playfair text-[clamp(2.4rem,5vw,4.2rem)] font-bold leading-[1.1] text-[#1A1A22] mb-5">
            Donde el cuerpo<br />encuentra su{' '}
            <em className="italic text-[#C97A96]">ritmo</em>
          </h1>
          <p className="text-base text-[#8A8A99] leading-relaxed max-w-[460px] mb-10 font-light">
            En {infoAcademia.nombre} te acompañamos en cada paso. Clases para todas las
            edades y niveles, en un espacio donde la pasión por el movimiento se convierte en arte.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/turnero" className="inline-flex items-center gap-2 bg-[#C97A96] text-white px-8 py-3.5 rounded-full no-underline font-medium text-sm shadow-[0_4px_20px_rgba(201,122,150,0.35)] hover:bg-[#1A1A22] transition-colors">
              ✦ Reservá tu clase de prueba
            </Link>
            <a href="#nosotros" className="inline-flex items-center gap-2 border-[1.5px] border-[#F5D0DC] text-[#C97A96] px-8 py-3.5 rounded-full no-underline font-medium text-sm hover:bg-[#FDF0F4] transition-colors">
              Conocenos →
            </a>
          </div>
        </div>

        <div className="relative h-[60vh] md:h-screen overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=900&q=80"
            alt="Bailarina de danza en R.G Danza, academia en Córdoba"
            fill
            className="object-cover object-[center_top]"
            priority
          />
          <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-lg p-4 px-6 rounded-xl border border-[#E8A0B4]/30">
            <p className="text-xs text-[#8A8A99]">Próximo inicio de ciclo</p>
            <strong className="text-sm text-[#1A1A22] block">
              Abril 2026 — Inscripciones abiertas
            </strong>
          </div>
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section id="nosotros" className="py-16 md:py-24 px-[5%] md:px-[8%] bg-[#F7F7F9] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center relative">
        <div className="fade-in relative rounded-3xl overflow-hidden aspect-[4/5] shadow-[0_24px_64px_rgba(201,122,150,0.2)]">
          <Image
            src="https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=700&q=80"
            alt="Profesora de danza en R.G Danza"
            fill className="object-cover"
          />
        </div>
        <div className="fade-in">
          <div className="text-xs font-medium tracking-[2px] uppercase text-[#C97A96] mb-3">
            Quiénes somos
          </div>
          <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold text-[#1A1A22] leading-tight mb-5">
            Una academia creada<br />con{' '}
            <em className="italic text-[#C97A96]">amor</em> por la danza
          </h2>
          <p className="text-base text-[#8A8A99] leading-relaxed max-w-[540px] mb-10 font-light">
            {infoAcademia.nombre} nació del sueño de crear un espacio donde cada alumna
            pueda expresarse, crecer y brillar.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { i: '💗', t: 'Ambiente seguro' },
              { i: '🎓', t: 'Profesores calificados' },
              { i: '👯', t: 'Todas las edades' },
              { i: '🎭', t: 'Shows anuales' },
            ].map(item => (
              <div key={item.t} className="bg-white border border-[#E8A0B4]/25 rounded-2xl p-5">
                <span className="text-2xl block mb-2">{item.i}</span>
                <h4 className="text-sm font-semibold">{item.t}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLASES DINÁMICAS ── */}
      <section id="clases" className="py-16 md:py-24 px-[5%] md:px-[8%] bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
          <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold text-[#1A1A22]">
            Nuestras <em className="italic text-[#C97A96]">clases</em>
          </h2>
          <Link href="/clases" className="inline-flex items-center gap-2 border-[1.5px] border-[#F5D0DC] text-[#C97A96] px-8 py-3.5 rounded-full no-underline font-medium text-sm hover:bg-[#FDF0F4] transition-colors">
            Ver todas →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clasesDB.slice(0, 3).map((clase: any) => (
            <ClaseCard key={clase.id} clase={clase} />
          ))}
        </div>
      </section>

      {/* ── HORARIOS DINÁMICOS ── */}
      <section id="horarios" className="py-16 md:py-24 px-[5%] md:px-[8%] bg-[#1A1A22] text-white relative">
        <div className="mb-10">
          <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold">
            Horarios de <em className="italic text-[#C97A96]">clases</em>
          </h2>
        </div>
        <SalaSelector horarios={horariosDB} />
      </section>

      {/* ── INSCRIPCIÓN ── */}
      <section id="inscripcion" className="py-16 md:py-24 px-[5%] md:px-[8%] bg-[#FDF0F4] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">
        <div className="fade-in">
          <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold text-[#1A1A22]">
            ¿Lista para<br />
            <em className="italic text-[#C97A96]">empezar</em>?
          </h2>
          <div className="flex flex-col gap-5 mt-8">
            {[
              { i: '📍', t: 'Ubicación', d: infoAcademia.direccion },
              { i: '📱', t: 'WhatsApp', d: infoAcademia.telefono },
            ].map(item => (
              <div key={item.t} className="flex gap-4">
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0">
                  {item.i}
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{item.t}</h4>
                  <p className="text-[0.82rem]">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="fade-in bg-white rounded-3xl p-8 md:p-10 shadow-[0_16px_48px_rgba(201,122,150,0.12)]">
          <InscripcionForm telefonoDinamico={infoAcademia.telefono} clases={clasesDB.map((c: any) => ({ id: c.id, nombre: c.nombre }))} />
        </div>
      </section>

      {/* ── GALERÍA DINÁMICA ── */}
      <section id="galeria" className="py-16 md:py-24 px-[5%] md:px-[8%] bg-[#F7F7F9]">
        <h2 className="font-playfair text-[clamp(2rem,3.5vw,2.8rem)] font-bold text-center mb-12">
          Momentos que <em className="italic text-[#C97A96]">brillan</em>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {galeriaDB.map((img: any) => (
            <div
              key={img.id}
              className="galeria-item relative aspect-square rounded-2xl overflow-hidden"
            >
              <img
                src={img.url}
                alt="Galería R.G Danza"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  )
}
