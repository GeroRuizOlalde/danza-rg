import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ClasesFiltro from '@/components/landing/ClasesFiltro'
import { createServerSupabase } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Clases — R.G Danza | Todas las disciplinas',
  description: 'Explorá todas las clases de R.G Danza: Ballet, Jazz, Contemporáneo, Acro Tela, Reggaetón, Ritmos Latinos y más. Horarios, edades y niveles disponibles.',
  openGraph: {
    title: 'Clases — R.G Danza',
    description: 'Todas las disciplinas de danza que ofrecemos. Clases para todas las edades y niveles en Córdoba.',
  },
}

export const revalidate = 60

export default async function ClasesPage() {
  const supabase = createServerSupabase()

  const [{ data: clasesData }, { data: horariosData }] = await Promise.all([
    supabase.from('clases').select('*').or('estado.eq.activa,estado.is.null').order('nombre'),
    supabase.from('horarios').select('clase_id, dia, hora'),
  ])

  const clases = (clasesData ?? []).map((clase: any) => {
    const susHorarios = (horariosData ?? [])
      .filter((h: any) => h.clase_id === clase.id)
      .map((h: any) => `${h.dia} ${h.hora}:00`)

    return {
      id: clase.id,
      nombre: clase.nombre,
      etiqueta: clase.etiqueta,
      edades: clase.edades,
      descripcion: clase.descripcion,
      imagen_url: clase.imagen_url,
      horariosFormateados: susHorarios,
    }
  })

  return (
    <div className="min-h-screen bg-white text-[#1A1A22]">
      <Navbar />

      {/* HEADER */}
      <div className="relative pt-[140px] px-[5%] md:px-[8%] pb-20 bg-gradient-to-br from-[#FDF0F4] to-[#F7F7F9] overflow-hidden">
        <div className="absolute -top-[100px] -right-[100px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(232,160,180,0.2)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-xs font-medium tracking-[2px] uppercase text-[#C97A96] mb-3">Disciplinas</div>
          <h1 className="font-playfair text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.1] text-[#1A1A22] mb-4">
            Todas nuestras<br /><em className="italic text-[#C97A96]">clases</em>
          </h1>
          <p className="text-base text-[#8A8A99] max-w-[500px] leading-relaxed font-light">
            Explorá cada disciplina y encontrá la que más se adapta a tu edad, nivel y pasión. Siempre hay un lugar para vos.
          </p>
        </div>
      </div>

      <ClasesFiltro clases={clases} />

      {/* CTA FINAL */}
      <div className="bg-[#1A1A22] py-20 px-[5%] md:px-[8%] text-center">
        <div className="text-[#E8A0B4] text-xs font-medium tracking-[2px] uppercase mb-4">
          ¿No sabés cuál elegir?
        </div>
        <h2 className="font-playfair text-[clamp(2rem,4vw,3rem)] text-white mb-4">
          Te ayudamos a<br />encontrar tu <em className="italic text-[#E8A0B4]">clase ideal</em>
        </h2>
        <p className="text-white/50 text-base font-light mb-10 max-w-[480px] mx-auto">
          Reservá una clase de prueba gratuita y nuestras profesoras te van a orientar según tu edad, nivel y objetivos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/turnero"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#1A1A22] px-8 py-3.5 rounded-full font-medium text-sm transition-all hover:bg-[#F5D0DC] hover:-translate-y-0.5"
          >
            ✦ Reservar clase de prueba
          </Link>
          <Link
            href="https://wa.me/543516793151"
            target="_blank"
            className="inline-flex items-center justify-center gap-2 border-[1.5px] border-white/20 text-white/70 px-8 py-3.5 rounded-full font-medium text-sm transition-all hover:border-[#E8A0B4] hover:text-[#E8A0B4] hover:-translate-y-0.5"
          >
            💬 Consultanos por WhatsApp
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
