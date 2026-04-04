'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const navLinks = [
  { href: '/#nosotros', label: 'Quienes somos' },
  { href: '/clases', label: 'Clases' },
  { href: '/#horarios', label: 'Horarios' },
  { href: '/#galeria', label: 'Galeria' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [nombreAcademia, setNombreAcademia] = useState('R.G Danza')

  const pathname = usePathname()
  const router = useRouter()
  const userRole = user?.app_metadata?.role || user?.user_metadata?.role
  const isAdminUser = userRole === 'admin'
  const profileHref = isAdminUser ? '/admin/dashboard' : '/perfil'
  const profileLabel = isAdminUser ? 'Dashboard' : 'Mi perfil'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)

    async function fetchNombre() {
      const { data } = await supabase.from('academia_info').select('nombre').single()
      if (data?.nombre) setNombreAcademia(data.nombre)
    }

    async function fetchUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
    }

    void fetchNombre()
    void fetchUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      window.removeEventListener('scroll', handleScroll)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
  }

  const closeMenu = () => setMenuOpen(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.replace('/#', '/'))

  const renderLogo = () => {
    const partes = nombreAcademia.split(' ')
    if (partes.length === 1) return nombreAcademia

    return (
      <>
        {partes[0]} <span className="text-[#C97A96]">{partes.slice(1).join(' ')}</span>
      </>
    )
  }

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-[100] flex h-[72px] items-center justify-between border-b border-[#E8A0B4]/20 bg-white/92 px-[5%] backdrop-blur-xl transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_4px_24px_rgba(201,122,150,0.12)]' : ''
      }`}
    >
      <Link
        href="/"
        className="max-w-[calc(100vw-5rem)] truncate font-playfair text-[1.65rem] font-bold tracking-tight text-[#1A1A22] no-underline sm:text-2xl"
      >
        {renderLogo()}
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        <ul className="m-0 flex list-none items-center gap-6 p-0">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`text-sm font-medium no-underline transition-colors duration-200 ${
                  isActive(href) ? 'text-[#C97A96]' : 'text-[#4A4A55] hover:text-[#C97A96]'
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/turnero"
          className="rounded-full bg-[#C97A96] px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_4px_12px_rgba(201,122,150,0.15)] transition-all hover:scale-105"
        >
          Reservar turno
        </Link>

        <div className="h-6 w-px bg-[#E8A0B4]/30" />

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href={profileHref}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#1A1A22] no-underline transition-colors hover:text-[#C97A96]"
              >
                {profileLabel}
              </Link>
              <button
                onClick={handleLogout}
                className="border-none bg-transparent text-xs font-medium text-[#4A4A55] transition-colors hover:text-red-400"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="py-2 text-sm font-semibold text-[#4A4A55] no-underline transition-colors hover:text-[#C97A96]"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>

      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
        aria-expanded={menuOpen}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E8A0B4]/25 bg-white/80 p-0 text-[#1A1A22] shadow-sm transition-colors hover:border-[#C97A96] hover:text-[#C97A96] md:hidden"
      >
        <span className="sr-only">{menuOpen ? 'Cerrar menu' : 'Abrir menu'}</span>
        <span className="relative h-4 w-5">
          <span
            className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${
              menuOpen ? 'translate-y-[7px] rotate-45' : ''
            }`}
          />
          <span
            className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-opacity duration-300 ${
              menuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${
              menuOpen ? 'translate-y-[-7px] -rotate-45' : ''
            }`}
          />
        </span>
      </button>

      <div
        className={`fixed inset-0 z-[99] bg-[#1A1A22]/40 transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeMenu}
      >
        <div
          className={`absolute right-0 top-0 flex h-full w-[min(88vw,360px)] flex-col border-l border-[#E8A0B4]/20 bg-[#FFF9FB] px-6 py-6 shadow-[-18px_0_48px_rgba(26,26,34,0.18)] transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[2px] text-[#C97A96]">
                Navegacion
              </p>
              <div className="mt-2 truncate font-playfair text-2xl font-bold text-[#1A1A22]">
                {renderLogo()}
              </div>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8A0B4]/20 bg-white text-lg text-[#4A4A55] transition-colors hover:border-[#C97A96] hover:text-[#C97A96]"
              aria-label="Cerrar menu"
            >
              x
            </button>
          </div>

          <div className="mb-6 rounded-[28px] bg-[#1A1A22] px-5 py-4 text-white">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#E8A0B4]">
              Clase de prueba
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/72">
              Reserva desde el celular y deja tus datos listos para agilizar el ingreso.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={`rounded-2xl border px-4 py-3 text-base font-semibold no-underline transition-all ${
                  isActive(href)
                    ? 'border-[#E8A0B4] bg-[#FDF0F4] text-[#C97A96]'
                    : 'border-[#E8A0B4]/18 bg-white text-[#1A1A22] hover:border-[#C97A96] hover:text-[#C97A96]'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="mt-6 space-y-3 border-t border-[#E8A0B4]/20 pt-5">
            <Link
              href="/turnero"
              onClick={closeMenu}
              className="block rounded-full bg-[#C97A96] px-5 py-3.5 text-center text-sm font-bold text-white no-underline shadow-[0_8px_24px_rgba(201,122,150,0.22)] transition-colors hover:bg-[#1A1A22]"
            >
              Reservar turno
            </Link>

            {user ? (
              <div className="space-y-2">
                <Link
                  href={profileHref}
                  onClick={closeMenu}
                  className="block rounded-2xl border border-[#E8A0B4]/20 bg-white px-4 py-3 text-center text-sm font-semibold text-[#1A1A22] no-underline transition-colors hover:border-[#C97A96] hover:text-[#C97A96]"
                >
                  {profileLabel}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
                >
                  Cerrar sesion
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={closeMenu}
                className="block rounded-2xl border border-[#E8A0B4]/20 bg-white px-4 py-3 text-center text-sm font-semibold text-[#4A4A55] no-underline transition-colors hover:border-[#C97A96] hover:text-[#C97A96]"
              >
                Iniciar sesion
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
