import { ImageResponse } from 'next/og'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, rgb(255,248,251) 0%, rgb(253,240,244) 42%, rgb(248,247,249) 100%)',
          color: 'rgb(26,26,34)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 18% 20%, rgba(201,122,150,0.14), transparent 28%), radial-gradient(circle at 82% 82%, rgba(26,26,34,0.1), transparent 24%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '68px 74px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              color: 'rgb(201,122,150)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            Academia de Danza
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 860 }}>
            <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, lineHeight: 1 }}>
              R.G <span style={{ color: 'rgb(201,122,150)', marginLeft: 18 }}>Danza</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 34,
                lineHeight: 1.25,
                color: 'rgba(26,26,34,0.82)',
              }}
            >
              Clases para todas las edades y niveles en Zona Sur, Córdoba.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 26,
              color: 'rgba(26,26,34,0.7)',
            }}
          >
            <div style={{ display: 'flex', gap: 18 }}>
              <span>Ballet</span>
              <span>Jazz</span>
              <span>Contemporáneo</span>
              <span>Acro Tela</span>
            </div>
            <div style={{ display: 'flex', color: 'rgb(201,122,150)', fontWeight: 700 }}>
              rgdanza.com
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
