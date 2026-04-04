'use client'

import { useState, useEffect } from 'react'
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
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-[5%] h-[72px] bg-white/92 backdrop-blur-xl border-b border-[#E8A0B4]/20 transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_4px_24px_rgba(201,122,150,0.12)]' : ''
      }`}
    >
      <Link
        href="/"
        className="font-playfair text-2xl font-bold text-[#1A1A22] no-underline tracking-tight"
      >
        {renderLogo()}
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <ul className="flex gap-6 list-none items-center m-0 p-0">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`no-underline text-sm font-medium transition-colors duration-200 ${
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
          className="bg-[#C97A96] text-white px-5 py-2.5 rounded-full no-underline text-sm font-semibold transition-all shadow-[0_4px_12px_rgba(201,122,150,0.15)] hover:scale-105"
        >
          Reservar turno
        </Link>

        <div className="h-6 w-px bg-[#E8A0B4]/30" />

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href={profileHref}
                className="no-underline text-[#1A1A22] text-sm font-semibold flex items-center gap-1.5 hover:text-[#C97A96] transition-colors"
              >
                {profileLabel}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-transparent border-none text-[#4A4A55] text-xs cursor-pointer font-medium hover:text-red-400 transition-colors"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="no-underline text-[#4A4A55] text-sm font-semibold py-2 hover:text-[#C97A96] transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
        className="flex md:hidden flex-col gap-[5px] cursor-pointer bg-transparent border-none p-1"
      >
        <span
          className={`block w-6 h-0.5 bg-[#1A1A22] transition-transform duration-300 ${
            menuOpen ? 'rotate-45 translate-x-[5px] translate-y-[5px]' : ''
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-[#1A1A22] transition-opacity duration-300 ${
            menuOpen ? 'opacity-0' : ''
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-[#1A1A22] transition-transform duration-300 ${
            menuOpen ? '-rotate-45 translate-x-[5px] -translate-y-[5px]' : ''
          }`}
        />
      </button>

      {menuOpen && (
        <div className="fixed top-[72px] left-0 right-0 bottom-0 bg-white p-8 flex flex-col gap-5 z-[99] md:hidden">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`no-underline font-semibold text-lg py-2 border-b border-gray-100 ${
                isActive(href) ? 'text-[#C97A96]' : 'text-[#1A1A22]'
              }`}
            >
              {label}
            </Link>
          ))}

          <Link
            href="/turnero"
            onClick={() => setMenuOpen(false)}
            className="bg-[#C97A96] text-white p-4 rounded-full no-underline font-bold text-center mt-4"
          >
            Reservar turno
          </Link>

          {user ? (
            <div className="flex flex-col gap-4 mt-4">
              <Link
                href={profileHref}
                onClick={() => setMenuOpen(false)}
                className="no-underline text-[#1A1A22] font-semibold text-center"
              >
                {profileLabel}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gray-100 border-none p-3 rounded-xl text-red-500 font-semibold cursor-pointer"
              >
                Cerrar sesion
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="no-underline text-[#4A4A55] font-semibold text-center mt-2"
            >
              Iniciar sesion
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
