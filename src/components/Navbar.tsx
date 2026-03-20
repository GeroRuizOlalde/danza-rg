'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const navLinks = [
  { href: '/#nosotros', label: 'Quiénes somos', onlyHome: true },
  { href: '/clases',    label: 'Clases'          },
  { href: '/#horarios', label: 'Horarios',      onlyHome: true },
  { href: '/#galeria',  label: 'Galería',       onlyHome: true },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [nombreAcademia, setNombreAcademia] = useState("R.G Danza")
  
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // 1. Efecto del scroll
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    
    // 2. Buscar el nombre de la academia en Supabase
    async function fetchNombre() {
      const { data } = await supabase.from('academia_info').select('nombre').single()
      if (data?.nombre) setNombreAcademia(data.nombre)
    }
    fetchNombre()

    // 3. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      subscription.unsubscribe()
    }
  }, [])

  // Bloqueo de scroll en mobile
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.replace('/#', '/'))

  const renderLogoDinámico = () => {
    const partes = nombreAcademia.split(' ')
    if (partes.length === 1) return nombreAcademia
    const primeraPalabra = partes[0]
    const restoPalabras = partes.slice(1).join(' ')
    return (
      <>
        {primeraPalabra} <span style={{ color: 'var(--rosa-d)' }}>{restoPalabras}</span>
      </>
    )
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 5%', height: 72,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(232,160,180,0.2)',
      boxShadow: scrolled ? '0 4px 24px rgba(201,122,150,0.12)' : 'none',
      transition: 'box-shadow 0.3s',
    }}>

      {/* Logo */}
      <Link href="/" style={{
        fontFamily: "'Playfair Display', serif", fontSize: '1.5rem',
        fontWeight: 700, color: 'var(--negro)', textDecoration: 'none',
        letterSpacing: '-0.5px',
      }}>
        {renderLogoDinámico()}
      </Link>

      {/* Desktop Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="nav-desktop">
        <ul style={{ display: 'flex', gap: '1.5rem', listStyle: 'none', alignItems: 'center', margin: 0, padding: 0 }}>
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} style={{
                textDecoration: 'none',
                color: isActive(href) ? 'var(--rosa-d)' : 'var(--gris)',
                fontSize: '0.875rem', fontWeight: 500,
                transition: 'color 0.2s',
              }}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* BOTÓN RESERVAR TURNO (Vuelve a casa) */}
        <Link href="/turnero" style={{
          background: 'var(--rosa-d)', color: '#fff',
          padding: '0.55rem 1.25rem', borderRadius: 100,
          textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
          transition: 'all 0.3s',
          boxShadow: '0 4px 12px rgba(201,122,150,0.15)'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Reservar turno
        </Link>

        <div style={{ height: 24, width: 1, background: 'rgba(232,160,180,0.3)' }} />

        {/* AUTH SECTION */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              <Link href="/perfil" style={{
                textDecoration: 'none', color: 'var(--negro)', fontSize: '0.85rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}>
                👤 Mi Perfil
              </Link>
              <button onClick={handleLogout} style={{
                background: 'none', border: 'none', color: 'var(--gris)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500
              }}>
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" style={{
              textDecoration: 'none', color: 'var(--gris)', fontSize: '0.85rem', fontWeight: 600,
              padding: '0.5rem 0'
            }}>
              Entrar
            </Link>
          )}
        </div>
      </div>

      {/* Hamburger (Mobile) */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menú"
        style={{
          display: 'none', flexDirection: 'column', gap: 5,
          cursor: 'pointer', background: 'none', border: 'none', padding: 4,
        }}
        className="nav-hamburger"
      >
        <span style={{ display: 'block', width: 24, height: 2, background: 'var(--negro)', transition: '0.3s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
        <span style={{ display: 'block', width: 24, height: 2, background: 'var(--negro)', transition: '0.3s', opacity: menuOpen ? 0 : 1 }} />
        <span style={{ display: 'block', width: 24, height: 2, background: 'var(--negro)', transition: '0.3s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 72, left: 0, right: 0, bottom: 0,
          background: '#fff', padding: '2rem',
          display: 'flex', flexDirection: 'column', gap: '1.2rem',
          zIndex: 99,
        }}>
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
              color: isActive(href) ? 'var(--rosa-d)' : 'var(--negro)',
              textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem',
              padding: '0.5rem 0', borderBottom: '1px solid #f5f5f5'
            }}>
              {label}
            </Link>
          ))}
          
          <Link href="/turnero" onClick={() => setMenuOpen(false)} style={{
            background: 'var(--rosa-d)', color: '#fff',
            padding: '1rem', borderRadius: 100,
            textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
            textAlign: 'center', marginTop: '1rem'
          }}>
            Reservar turno
          </Link>

          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <Link href="/perfil" onClick={() => setMenuOpen(false)} style={{
                textDecoration: 'none', color: 'var(--negro)', fontWeight: 600, fontSize: '1rem', textAlign: 'center'
              }}>
                👤 Mi Perfil
              </Link>
              <button onClick={handleLogout} style={{
                background: '#f9f9f9', border: 'none', padding: '0.8rem', borderRadius: 12,
                color: '#ff4d4d', fontWeight: 600, cursor: 'pointer'
              }}>
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} style={{
              textDecoration: 'none', color: 'var(--gris)', fontWeight: 600, fontSize: '1rem',
              textAlign: 'center', marginTop: '0.5rem'
            }}>
              Iniciar Sesión
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}