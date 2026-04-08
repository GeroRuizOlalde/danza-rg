import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getUserRole } from '@/lib/auth-role'
import { PERMISOS_DEFAULT_SECRETARIA, seccionDesdePath, tieneAcceso } from '@/lib/permisos'
import { getSupabasePublicEnv } from '@/lib/supabase-env'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminAuthRoute = pathname === '/admin/login' || pathname === '/admin/activar'
  const isPerfilRoute = pathname.startsWith('/perfil')

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { url, anonKey, isConfigured } = getSupabasePublicEnv()

  if (!isConfigured) {
    if (isAdminRoute || isPerfilRoute) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  }

  const supabase = createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isAdminAuthRoute) return response

  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const role = getUserRole(user)

    if (!role) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (role === 'secretaria') {
      const seccion = seccionDesdePath(pathname)

      if (seccion) {
        const { data: info } = await supabase
          .from('academia_info')
          .select('permisos_secretaria')
          .limit(1)
          .maybeSingle<{ permisos_secretaria?: string[] | null }>()

        const permisos = info?.permisos_secretaria ?? PERMISOS_DEFAULT_SECRETARIA

        if (!tieneAcceso(role, seccion, permisos)) {
          const primerAccesible = permisos[0] ?? 'dashboard'
          return NextResponse.redirect(new URL(`/admin/${primerAccesible}`, request.url))
        }
      }
    }
  }

  if (isPerfilRoute && !pathname.startsWith('/perfil/completar')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=/perfil', request.url))
    }

    const role = getUserRole(user)
    if (role === 'admin' || role === 'secretaria') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
