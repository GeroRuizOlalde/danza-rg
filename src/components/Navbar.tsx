'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAcademiaInfo } from './AcademiaInfoProvider'

const navLinks = [
  { href: '/#nosotros', label: 'Quiénes somos' },
  { href: '/clases', label: 'Clases' },
  { href: '/#horarios', label: 'Horarios' },
  { href: '/#galeria', label: 'Galería' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const { nombre: nombreAcademia } = useAcademiaInfo()

  const pathname = usePathname()
  const router = useRouter()
  const userRole = user?.app_metadata?.role || user?.user_metadata?.role
  const isAdminUser = userRole === 'admin' || userRole === 'secretaria'
  const profileHref = isAdminUser ? '/admin/dashboard' : '/perfil'
  const profileLabel = isAdminUser ? 'Panel admin' : 'Mi perfil'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)

    async function fetchUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
    }

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
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E8A0B4]/25 bg-white/80 p-0 text-[#1A1A22] shadow-sm transition-colors hover:border-[#C97A96] hover:text-[#C97A96] md:hidden"
      >
        <span className="sr-only">{menuOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
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
        className={`fixed inset-x-0 bottom-0 top-[72px] z-[99] border-t border-[#E8A0B4]/15 bg-[#FFF9FB]/98 backdrop-blur-xl transition-all duration-300 md:hidden ${
          menuOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <div className="mx-auto flex h-full max-w-[520px] flex-col overflow-y-auto px-5 pb-8 pt-5">
          <div className="mb-5 rounded-[28px] border border-[#E8A0B4]/20 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(26,26,34,0.08)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[2px] text-[#C97A96]">
              Navegación
            </p>
            <div className="mt-2 font-playfair text-[2rem] font-bold leading-none text-[#1A1A22]">
              {renderLogo()}
            </div>
            <p className="mt-4 rounded-[24px] bg-[#1A1A22] px-4 py-4 text-sm leading-relaxed text-white/78">
              Reserva desde el celular y deja tus datos listos para agilizar el ingreso.
            </p>
          </div>

          <div className="flex flex-col gap-2">
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
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={closeMenu}
                className="block rounded-2xl border border-[#E8A0B4]/20 bg-white px-4 py-3 text-center text-sm font-semibold text-[#4A4A55] no-underline transition-colors hover:border-[#C97A96] hover:text-[#C97A96]"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
