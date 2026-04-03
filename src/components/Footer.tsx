'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Footer() {
  const [info, setInfo] = useState({
    nombre: 'R.G Danza',
    telefono: '351 679-3151',
    direccion: 'Rio Negro 4450, Zona Sur - Cba.',
    instagram: '@r.g_danza',
  })

  useEffect(() => {
    async function fetchInfo() {
      const { data } = await supabase.from('academia_info').select('*').single()
      if (data) setInfo(data)
    }

    void fetchInfo()
  }, [])

  const numeroLimpio = info.telefono.replace(/\D/g, '')
  const linkWhatsApp = `https://wa.me/${numeroLimpio}`
  const instagramLimpio = info.instagram.replace('@', '')
  const linkInstagram = `https://www.instagram.com/${instagramLimpio}/`

  const footerLinks = {
    Paginas: [
      { href: '/#nosotros', label: 'Quienes somos' },
      { href: '/clases', label: 'Clases' },
      { href: '/#horarios', label: 'Horarios' },
      { href: '/#galeria', label: 'Galeria' },
      { href: '/turnero', label: 'Turnero' },
    ],
    Disciplinas: [
      { href: '/clases', label: 'Reggaeton' },
      { href: '/clases', label: 'Jazz' },
      { href: '/clases', label: 'Acro Tela' },
      { href: '/clases', label: 'Contemporaneo' },
      { href: '/clases', label: 'Danzas Clasicas' },
      { href: '/clases', label: 'Ritmos Latinos' },
    ],
    Contacto: [
      { href: `http://maps.google.com/?q=${encodeURIComponent(info.direccion)}`, label: `Mapa: ${info.direccion}` },
      { href: `tel:+${numeroLimpio}`, label: `Tel: ${info.telefono}` },
      { href: linkInstagram, label: `IG: ${info.instagram}` },
      { href: linkWhatsApp, label: 'WhatsApp' },
    ],
  }

  const renderLogo = () => {
    const partes = info.nombre.split(' ')
    if (partes.length === 1) return info.nombre
    return (
      <>
        {partes[0]} <span className="text-[#E8A0B4]">{partes.slice(1).join(' ')}</span>
      </>
    )
  }

  return (
    <footer className="bg-[#1A1A22] text-white pt-16 pb-8 px-[5%] md:px-[8%]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-12 pb-12 border-b border-white/[0.08]">
        <div>
          <Link
            href="/"
            className="font-playfair text-xl font-bold text-white no-underline inline-block mb-4"
          >
            {renderLogo()}
          </Link>
          <p className="text-sm text-white/45 leading-relaxed max-w-[280px]">
            Un espacio creado con amor para que cada alumna encuentre su ritmo, su
            expresion y su lugar en el mundo de la danza.
          </p>
          <div className="flex gap-3 mt-6">
            {[
              { href: linkInstagram, label: 'IG', title: 'Instagram' },
              { href: linkWhatsApp, label: 'WA', title: 'WhatsApp' },
            ].map(({ href, label, title }) => (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noreferrer"
                title={title}
                className="w-[38px] h-[38px] bg-white/[0.07] rounded-full flex items-center justify-center no-underline text-sm hover:bg-white/15 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h5 className="text-xs font-semibold tracking-[1.5px] uppercase text-[#E8A0B4] mb-5">
              {title}
            </h5>
            <ul className="list-none flex flex-col gap-2.5 m-0 p-0">
              {links.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    target={
                      href.startsWith('http') || href.startsWith('tel:') ? '_blank' : undefined
                    }
                    rel={
                      href.startsWith('http') || href.startsWith('tel:') ? 'noreferrer' : undefined
                    }
                    className="no-underline text-sm text-white/45 hover:text-white/80 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center pt-8 gap-2">
        <p className="text-xs text-white/30">
          Copyright {new Date().getFullYear()} {info.nombre}. Todos los derechos reservados.
        </p>
        <p className="text-xs text-white/20">Disenado con amor</p>
      </div>
    </footer>
  )
}
