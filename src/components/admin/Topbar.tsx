'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TopBarProps = {
  onMenuClick?: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [showNotif, setShowNotif] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [adminName, setAdminName] = useState('Administrador')
  const [adminEmail, setAdminEmail] = useState('')

  const notifRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const titleMap: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/turnos': 'Gestion de Turnos',
    '/admin/clientes': 'Alumnas',
    '/admin/horarios': 'Horarios',
    '/admin/clases': 'Clases',
    '/admin/configuracion': 'Configuracion',
    '/admin/pagos': 'Pagos',
    '/admin/galeria': 'Galeria',
    '/admin/profesores': 'Profesores',
  }

  const title = titleMap[pathname] || 'Panel'

  useEffect(() => {
    async function fetchUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setAdminEmail(user.email || '')
        if (user.user_metadata?.display_name) {
          setAdminName(user.user_metadata.display_name)
        } else {
          const nombreEmail = user.email?.split('@')[0] || 'Admin'
          setAdminName(nombreEmail.charAt(0).toUpperCase() + nombreEmail.slice(1))
        }
      }
    }

    void fetchUserData()

    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotif(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchQuery.trim() !== '') {
      router.push(`/admin/clientes?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="sticky top-0 z-30 border-b border-[#E8A0B4]/20 bg-[#F7F7F9]/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E8A0B4]/25 bg-white text-[#1A1A22] transition-colors hover:border-[#C97A96] hover:text-[#C97A96] lg:hidden"
            aria-label="Abrir menu lateral"
          >
            <span className="relative h-4 w-5">
              <span className="absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current" />
              <span className="absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current" />
              <span className="absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[#1A1A22] sm:text-base">
              {title}
            </div>
            <div className="hidden text-[0.7rem] text-gris-l sm:block sm:text-[0.72rem]">
              Panel de administracion
            </div>
          </div>
        </div>

        <div className="hidden w-65 shrink-0 lg:block">
          <div className="flex items-center gap-2 rounded-full border border-[#E8A0B4]/20 bg-white px-4 py-2 transition-all focus-within:border-[#C97A96] focus-within:shadow-[0_0_0_3px_rgba(201,122,150,0.1)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-[#8A8A99]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="9" cy="9" r="5.25" />
              <path d="m13 13 3.5 3.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Buscar alumnas..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearch}
              className="w-full border-none bg-transparent text-[0.82rem] text-[#1A1A22] outline-none placeholder-[#8A8A99]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setShowNotif((prev) => !prev)
                setShowSettings(false)
              }}
              className={`relative flex h-[36px] w-[36px] items-center justify-center rounded-full border text-[0.78rem] font-semibold transition-colors ${
                showNotif
                  ? 'border-[#C97A96] bg-[#FDF0F4] text-[#C97A96]'
                  : 'border-[#E8A0B4]/20 bg-white text-[#4A4A55] hover:border-[#C97A96]'
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M10 3.5a3.25 3.25 0 0 0-3.25 3.25v1.4c0 .66-.2 1.3-.58 1.84L5 11.75v1h10v-1l-1.17-1.76a3.3 3.3 0 0 1-.58-1.84v-1.4A3.25 3.25 0 0 0 10 3.5Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M8.25 14.5a1.9 1.9 0 0 0 3.5 0" strokeLinecap="round" />
              </svg>
              <span className="absolute right-[6px] top-[6px] h-[7px] w-[7px] rounded-full border-[1.5px] border-[#F7F7F9] bg-[#C97A96]" />
            </button>

            {showNotif && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E8A0B4]/20 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#E8A0B4]/20 bg-[#F7F7F9] px-4 py-3">
                  <h3 className="text-[0.85rem] font-semibold text-[#1A1A22]">Notificaciones</h3>
                  <span className="rounded-full bg-[#FDF0F4] px-2 py-0.5 text-[0.7rem] font-medium text-[#C97A96]">
                    Nuevas
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <div className="cursor-pointer border-b border-[#E8A0B4]/10 px-4 py-3 transition-colors hover:bg-[#FDF0F4]/50">
                    <p className="text-[0.8rem] leading-tight text-[#1A1A22]">
                      Revisa el apartado de turnos para ver las nuevas solicitudes.
                    </p>
                    <span className="mt-1 block text-[0.7rem] text-[#8A8A99]">Sistema</span>
                  </div>
                </div>
                <Link
                  href="/admin/turnos"
                  onClick={() => setShowNotif(false)}
                  className="block w-full py-2.5 text-center text-[0.75rem] font-medium text-[#C97A96] transition-colors hover:bg-[#FDF0F4]"
                >
                  Ir a turnos
                </Link>
              </div>
            )}
          </div>

          <div ref={settingsRef} className="relative">
            <button
              onClick={() => {
                setShowSettings((prev) => !prev)
                setShowNotif(false)
              }}
              className={`flex h-[36px] w-[36px] items-center justify-center rounded-full border text-[0.78rem] font-semibold transition-colors ${
                showSettings
                  ? 'border-[#C97A96] bg-[#FDF0F4] text-[#C97A96]'
                  : 'border-[#E8A0B4]/20 bg-white text-[#4A4A55] hover:border-[#C97A96]'
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M4 5.5h12M6.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 14.5H4M13.5 14.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {showSettings && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-[min(14rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E8A0B4]/20 bg-white py-2 shadow-xl">
                <div className="mb-1 border-b border-[#E8A0B4]/10 px-4 py-2">
                  <strong className="block truncate text-[0.85rem] text-[#1A1A22]">
                    {adminName}
                  </strong>
                  <span className="truncate text-[0.75rem] text-[#8A8A99]">{adminEmail}</span>
                </div>

                <button
                  onClick={() => {
                    setShowSettings(false)
                    router.push('/admin/configuracion')
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-[0.85rem] text-[#4A4A55] transition-colors hover:bg-[#FDF0F4] hover:text-[#C97A96]"
                >
                  Mi cuenta
                </button>

                <button
                  onClick={() => {
                    setShowSettings(false)
                    router.push('/admin/configuracion')
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-[0.85rem] text-[#4A4A55] transition-colors hover:bg-[#FDF0F4] hover:text-[#C97A96]"
                >
                  Datos de la academia
                </button>

                <div className="mt-1 border-t border-[#E8A0B4]/10 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-[0.85rem] text-[#EF4444] transition-colors hover:bg-[#EF4444]/10"
                  >
                    Cerrar sesion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
