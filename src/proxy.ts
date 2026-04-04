import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv } from '@/lib/supabase-env'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'
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

  if (isAdminLogin) return response

  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const role = user.app_metadata?.role || user.user_metadata?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (isPerfilRoute && !pathname.startsWith('/perfil/completar')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=/perfil', request.url))
    }

    const role = user.app_metadata?.role || user.user_metadata?.role
    if (role === 'admin') {
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
