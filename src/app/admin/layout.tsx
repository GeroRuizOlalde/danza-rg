'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/admin/Sidebar'
import TopBar from '@/components/admin/Topbar'
import { supabase } from '@/lib/supabase'
import { PERMISOS_DEFAULT_SECRETARIA, seccionDesdePath, tieneAcceso } from '@/lib/permisos'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [permisosSecretaria, setPermisosSecretaria] = useState<string[]>(PERMISOS_DEFAULT_SECRETARIA)
  const isLogin = pathname === '/admin/login'

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  useEffect(() => {
    if (isLogin) return

    async function verificarAcceso() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/admin/login')
        return
      }

      const role = user.app_metadata?.role || user.user_metadata?.role

      if (role !== 'admin' && role !== 'secretaria') {
        router.replace('/admin/login')
        return
      }

      // Cargar permisos desde academia_info
      const { data: info } = await supabase
        .from('academia_info')
        .select('permisos_secretaria')
        .limit(1)
        .maybeSingle()

      const permisos: string[] = info?.permisos_secretaria ?? PERMISOS_DEFAULT_SECRETARIA
      setPermisosSecretaria(permisos)

      // Verificar acceso a la sección actual
      const seccion = seccionDesdePath(pathname)
      if (seccion && !tieneAcceso(role, seccion, permisos)) {
        // Redirigir al primer lugar accesible
        const primerAccesible = permisos[0] ?? 'dashboard'
        router.replace(`/admin/${primerAccesible}`)
      }
    }

    void verificarAcceso()
  }, [pathname, isLogin, router])

  if (isLogin) {
    return <main className="min-h-screen bg-[#F7F7F9] font-dm-sans">{children}</main>
  }

  return (
    <div className="min-h-screen bg-[#F7F7F9] font-dm-sans">
      <div className="flex min-h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          permisosSecretaria={permisosSecretaria}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
