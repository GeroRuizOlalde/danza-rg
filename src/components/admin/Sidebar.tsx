'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type SidebarProps = {
  isOpen?: boolean
  onClose?: () => void
}

type NavGroup = {
  section: string
  links: Array<{
    name: string
    path: string
    icon: string
    badge?: string | null
  }>
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [adminName, setAdminName] = useState('Administrador')
  const [turnosPendientes, setTurnosPendientes] = useState(0)

  useEffect(() => {
    async function fetchSidebarData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        if (user.user_metadata?.display_name) {
          setAdminName(user.user_metadata.display_name)
        } else {
          const nombreEmail = user.email?.split('@')[0] || 'Admin'
          setAdminName(nombreEmail.charAt(0).toUpperCase() + nombreEmail.slice(1))
        }
      }

      const { data } = await supabase.from('reservas').select('id').eq('estado', 'pendiente')
      if (data) setTurnosPendientes(data.length)
    }

    void fetchSidebarData()

    const canal = supabase
      .channel('cambios-reservas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, async () => {
        const { data } = await supabase.from('reservas').select('id').eq('estado', 'pendiente')
        setTurnosPendientes(data?.length || 0)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onClose?.()
    router.push('/admin/login')
  }

  const iniciales = adminName.slice(0, 2).toUpperCase()

  const navItems: NavGroup[] = [
    {
      section: 'Principal',
      links: [{ name: 'Dashboard', path: '/admin/dashboard', icon: 'D' }],
    },
    {
      section: 'Gestion',
      links: [
        {
          name: 'Turnos',
          path: '/admin/turnos',
          icon: 'T',
          badge: turnosPendientes > 0 ? turnosPendientes.toString() : null,
        },
        { name: 'Alumnas', path: '/admin/clientes', icon: 'A' },
        { name: 'Pagos', path: '/admin/pagos', icon: 'P' },
        { name: 'Galeria', path: '/admin/galeria', icon: 'G' },
        { name: 'Profesores', path: '/admin/profesores', icon: 'R' },
      ],
    },
    {
      section: 'Academia',
      links: [
        { name: 'Horarios', path: '/admin/horarios', icon: 'H' },
        { name: 'Clases', path: '/admin/clases', icon: 'C' },
        { name: 'Configuracion', path: '/admin/configuracion', icon: 'S' },
        { name: 'Equipo', path: '/admin/equipo', icon: 'E' },
      ],
    },
  ]

  const baseLinkClass =
    'flex items-center gap-3 rounded-xl px-3 py-2 text-[0.86rem] transition-all'

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar menu lateral"
        className={`fixed inset-0 z-40 bg-[#1A1A22]/55 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[86vw] flex-col overflow-hidden bg-[#1A1A22] shadow-[16px_0_48px_rgba(26,26,34,0.22)] transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-[240px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pointer-events-none absolute -bottom-[100px] -left-[100px] h-[300px] w-[300px] bg-[radial-gradient(circle,rgba(232,160,180,0.07)_0%,transparent_65%)]" />

        <div className="border-b border-white/5 px-6 pb-4 pt-5">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[2px] text-white/30">
              Menu
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sm text-white/60 transition-colors hover:border-[#E8A0B4] hover:text-[#E8A0B4]"
            >
              x
            </button>
          </div>

          <Link
            href="/admin/dashboard"
            className="block font-playfair text-[1.3rem] font-semibold text-white"
            onClick={onClose}
          >
            R.G <span className="text-[#E8A0B4]">Danza</span>
          </Link>
          <p className="mt-1 text-[0.68rem] text-white/25">Panel de administracion</p>
        </div>

        <nav className="z-10 flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((group) => (
            <div key={group.section}>
              <div className="mt-1.5 px-3 pb-1 pt-2.5 text-[0.63rem] font-semibold uppercase tracking-[1.5px] text-white/20">
                {group.section}
              </div>

              {group.links.map((link) => {
                const isActive = pathname === link.path || pathname.startsWith(`${link.path}/`)

                return (
                  <Link
                    key={link.name}
                    href={link.path}
                    onClick={onClose}
                    className={`${baseLinkClass} ${
                      isActive
                        ? 'bg-[#E8A0B4]/10 text-white'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/85'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[0.72rem] font-bold ${
                        isActive
                          ? 'border-[#E8A0B4]/40 bg-[#E8A0B4]/15 text-[#E8A0B4]'
                          : 'border-white/6 bg-white/5 text-white/55'
                      }`}
                    >
                      {link.icon}
                    </span>
                    <span>{link.name}</span>
                    {link.badge && (
                      <span className="ml-auto min-w-[18px] rounded-full bg-[#C97A96] px-2 py-0.5 text-center text-[0.65rem] font-semibold text-white">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="z-10 border-t border-white/5 p-4">
          <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C97A96] to-[#E8A0B4] text-[0.75rem] font-semibold text-white">
                {iniciales}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-[0.8rem] font-medium text-white">
                  {adminName}
                </strong>
                <span className="text-[0.68rem] text-white/30">Administrador</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-left text-[0.78rem] font-semibold text-white/65 transition-colors hover:border-[#E8A0B4]/25 hover:bg-[#E8A0B4]/8 hover:text-[#E8A0B4]"
              title="Cerrar sesion"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
