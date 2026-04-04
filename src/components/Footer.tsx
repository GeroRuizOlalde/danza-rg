'use client'

import Link from 'next/link'
import { useAcademiaInfo } from './AcademiaInfoProvider'

export default function Footer() {
  const info = useAcademiaInfo()

  const numeroLimpio = info.telefono.replace(/\D/g, '')
  const linkWhatsApp = `https://wa.me/${numeroLimpio}`
  const instagramLimpio = info.instagram.replace('@', '')
  const linkInstagram = `https://www.instagram.com/${instagramLimpio}/`

  const footerLinks = {
    Paginas: [
      { href: '/#nosotros', label: 'Quiénes somos' },
      { href: '/clases', label: 'Clases' },
      { href: '/#horarios', label: 'Horarios' },
      { href: '/#galeria', label: 'Galería' },
      { href: '/turnero', label: 'Turnero' },
    ],
    Disciplinas: [
      { href: '/clases', label: 'Reggaetón' },
      { href: '/clases', label: 'Jazz' },
      { href: '/clases', label: 'Acro Tela' },
      { href: '/clases', label: 'Contemporáneo' },
      { href: '/clases', label: 'Danzas Clásicas' },
      { href: '/clases', label: 'Ritmos Latinos' },
    ],
    Contacto: [
      {
        href: `http://maps.google.com/?q=${encodeURIComponent(info.direccion)}`,
        label: `Mapa: ${info.direccion}`,
      },
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
    <footer className="bg-[#1A1A22] px-[5%] pb-8 pt-16 text-white md:px-[8%]">
      <div className="grid grid-cols-1 gap-10 border-b border-white/[0.08] pb-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-12">
        <div>
          <Link
            href="/"
            className="mb-4 inline-block font-playfair text-xl font-bold text-white no-underline"
          >
            {renderLogo()}
          </Link>
          <p className="max-w-[280px] text-sm leading-relaxed text-white/45">
            Un espacio creado con amor para que cada alumna encuentre su ritmo, su
            expresión y su lugar en el mundo de la danza.
          </p>
          <div className="mt-6 flex gap-3">
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
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/[0.07] text-sm no-underline transition-colors hover:bg-white/15"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h5 className="mb-5 text-xs font-semibold uppercase tracking-[1.5px] text-[#E8A0B4]">
              {title}
            </h5>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
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
                    className="text-sm text-white/45 no-underline transition-colors hover:text-white/80"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-2 pt-8 sm:flex-row">
        <p className="text-xs text-white/30">
          Copyright {new Date().getFullYear()} {info.nombre}. Todos los derechos reservados.
        </p>
        <p className="text-xs text-white/20">Diseñado con criterio</p>
      </div>
    </footer>
  )
}
