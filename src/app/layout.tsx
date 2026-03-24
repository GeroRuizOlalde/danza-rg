import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import ToasterProvider from '@/components/ToasterProvider'
import WhatsAppButton from '@/components/WhatsAppButton'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rgdanza.com'

export const metadata: Metadata = {
  title: 'R.G Danza — Academia de Danza en Córdoba',
  description: 'Academia de danza en Córdoba. Ballet, Jazz, Contemporáneo, Acro Tela, Reggaetón y más. Clases para todas las edades y niveles. Río Negro 4450, Zona Sur.',
  keywords: ['academia de danza', 'danza córdoba', 'ballet córdoba', 'jazz dance', 'contemporáneo', 'reggaetón', 'acro tela', 'clases de danza', 'danza zona sur córdoba'],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'R.G Danza — Academia de Danza en Córdoba',
    description: 'Academia de danza en Córdoba. Clases para todas las edades y niveles. Ballet, Jazz, Contemporáneo, Acro Tela, Reggaetón y más.',
    siteName: 'R.G Danza',
    locale: 'es_AR',
    type: 'website',
    url: SITE_URL,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'R.G Danza — Academia de Danza en Córdoba',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'R.G Danza — Academia de Danza en Córdoba',
    description: 'Academia de danza en Córdoba. Clases para todas las edades y niveles.',
    images: ['/og-image.jpg'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'DanceSchool',
  name: 'R.G Danza',
  description: 'Academia de danza en Córdoba. Clases de Ballet, Jazz, Contemporáneo, Acro Tela, Reggaetón y más para todas las edades.',
  url: SITE_URL,
  telephone: '+5493516793151',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Río Negro 4450',
    addressLocality: 'Córdoba',
    addressRegion: 'Córdoba',
    addressCountry: 'AR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -31.45,
    longitude: -64.18,
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '17:00',
    closes: '21:00',
  },
  sameAs: ['https://www.instagram.com/r.g_danza/'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <ToasterProvider />
        <WhatsAppButton />
      </body>
    </html>
  )
}
