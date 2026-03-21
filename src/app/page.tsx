'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'

// ── Tipos ──────────────────────────────────────────────────────
type Celda = { clase: string; nivel: string | null } | null

// ── Celda horario ──────────────────────────────────────────────
function CeldaHorario({ celda }: { celda: Celda }) {
  if (!celda) return <td style={{ color: 'rgba(255,255,255,0.15)' }}>—</td>
  return (
    <td>
      {celda.clase}
      {celda.nivel && (
        <span className="nivel-badge nivel-inicio" style={{ display: 'block', marginTop: 4 }}>
          {celda.nivel}
        </span>
      )}
    </td>
  )
}

// ── Estilos compartidos ────────────────────────────────────────
const s = {
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    background: 'var(--rosa-d)', color: '#fff',
    padding: '0.85rem 2rem', borderRadius: 100,
    textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem',
    boxShadow: '0 4px 20px rgba(201,122,150,0.35)',
  } as React.CSSProperties,
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    border: '1.5px solid var(--rosa-light)', color: 'var(--rosa-d)',
    padding: '0.85rem 2rem', borderRadius: 100,
    textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem',
  } as React.CSSProperties,
}

// ══════════════════════════════════════════════════════════════
export default function HomePage() {
  const [sala, setSala] = useState<1 | 2>(1)
  const [clasesDB, setClasesDB] = useState<any[]>([])
  const [horariosDB, setHorariosDB] = useState<any[]>([])
  const [galeriaDB, setGaleriaDB] = useState<any[]>([])
  const [infoAcademia, setInfoAcademia] = useState({
    nombre: 'R.G Danza',
    telefono: '351 679-3151',
    direccion: 'Río Negro 4450, Zona Sur · Córdoba, Arg.',
    instagram: '@r.g_danza'
  })

  // ── useEffect 1: solo carga de datos ──────────────────────────
  useEffect(() => {
    async function fetchData() {
      const { data: info } = await supabase.from('academia_info').select('*').single()
      if (info) setInfoAcademia(info)

      const { data: clases } = await supabase
        .from('clases')
        .select('*')
        .or('estado.eq.activa,estado.is.null')
      if (clases) setClasesDB(clases)

      const { data: hor } = await supabase.from('horarios').select('*, clases(nombre)')
      if (hor) setHorariosDB(hor)

      const { data: gal } = await supabase
        .from('galeria')
        .select('*')
        .order('orden', { ascending: true })
      if (gal) setGaleriaDB(gal)
    }
    fetchData()
  }, [])

  // ── useEffect 2: observer de fade-in, espera que los datos estén listos ──
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.fade-in').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [clasesDB, galeriaDB]) // se re-ejecuta cuando llegan los datos dinámicos

  // ── Grilla de horarios ────────────────────────────────────────
  const grillaHoraria = useMemo(() => {
    const horas = [17, 18, 19, 20, 21]
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

    const norm = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

    const claves: Record<string, string> = {
      lunes: 'lun', martes: 'mar', miercoles: 'mie', jueves: 'jue', viernes: 'vie',
    }

    return horas.map(h => {
      const fila: any = { hs: h }
      dias.forEach(d => {
        const coincidencia = horariosDB.find(
          item =>
            item.hora === h &&
            norm(item.dia ?? '') === norm(d) &&
            item.sala === sala
        )
        const clave = claves[norm(d)] ?? norm(d).slice(0, 3)
        fila[clave] = coincidencia
          ? { clase: coincidencia.clases?.nombre ?? 'Clase', nivel: coincidencia.nivel ?? null }
          : null
      })
      return fila
    })
  }, [horariosDB, sala])

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr',
        alignItems: 'center', paddingTop: 72, overflow: 'hidden', position: 'relative'
      }}>
        <div style={{
          position: 'absolute', top: -200, right: -200, width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(232,160,180,0.18) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ padding: '5% 5% 5% 8%', animation: 'fadeUp 0.9s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--rosa-light)', color: 'var(--rosa-d)',
            padding: '0.35rem 1rem', borderRadius: 100, fontSize: '0.78rem',
            fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '1.5rem'
          }}>
            ✦ Academia de Danza
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.8rem, 5vw, 4.2rem)', fontWeight: 700,
            lineHeight: 1.1, color: 'var(--negro)', marginBottom: '1.25rem'
          }}>
            Donde el cuerpo<br />encuentra su{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>ritmo</em>
          </h1>
          <p style={{
            fontSize: '1.05rem', color: 'var(--gris-l)', lineHeight: 1.7,
            maxWidth: 460, marginBottom: '2.5rem', fontWeight: 300
          }}>
            En {infoAcademia.nombre} te acompañamos en cada paso. Clases para todas las
            edades y niveles, en un espacio donde la pasión por el movimiento se convierte en arte.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/turnero" style={s.btnPrimary}>✦ Reservá tu clase de prueba</Link>
            <a href="#nosotros" style={s.btnSecondary}>Conocenos →</a>
          </div>
        </div>

        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
          <Image
            src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=900&q=80"
            alt="Danza" fill
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
            priority unoptimized
          />
          <div style={{
            position: 'absolute', bottom: '2rem', left: '2rem',
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            padding: '1rem 1.5rem', borderRadius: 12,
            border: '1px solid rgba(232,160,180,0.3)'
          }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--gris-l)' }}>Próximo inicio de ciclo</p>
            <strong style={{ fontSize: '0.9rem', color: 'var(--negro)', display: 'block' }}>
              Abril 2026 — Inscripciones abiertas
            </strong>
          </div>
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section id="nosotros" style={{
        padding: '6rem 8%', background: 'var(--bg)',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '5rem', alignItems: 'center', position: 'relative'
      }}>
        <div className="fade-in" style={{
          position: 'relative', borderRadius: 24, overflow: 'hidden',
          aspectRatio: '4/5', boxShadow: '0 24px 64px rgba(201,122,150,0.2)'
        }}>
          <Image
            src="https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=700&q=80"
            alt="Profesora" fill style={{ objectFit: 'cover' }} unoptimized
          />
        </div>
        <div className="fade-in">
          <div style={{
            fontSize: '0.75rem', fontWeight: 500, letterSpacing: '2px',
            textTransform: 'uppercase', color: 'var(--rosa-d)', marginBottom: '0.75rem'
          }}>
            Quiénes somos
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700,
            color: 'var(--negro)', lineHeight: 1.2, marginBottom: '1.25rem'
          }}>
            Una academia creada<br />con{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>amor</em> por la danza
          </h2>
          <p style={{
            fontSize: '1rem', color: 'var(--gris-l)', lineHeight: 1.7,
            maxWidth: 540, marginBottom: '2.5rem', fontWeight: 300
          }}>
            {infoAcademia.nombre} nació del sueño de crear un espacio donde cada alumna
            pueda expresarse, crecer y brillar.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { i: '💗', t: 'Ambiente seguro' },
              { i: '🎓', t: 'Profesores calificados' },
              { i: '👯', t: 'Todas las edades' },
              { i: '🎭', t: 'Shows anuales' }
            ].map(item => (
              <div key={item.t} style={{
                background: '#fff', border: '1px solid rgba(232,160,180,0.25)',
                borderRadius: 16, padding: '1.25rem'
              }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>
                  {item.i}
                </span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.t}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLASES DINÁMICAS ── */}
      <section id="clases" style={{ padding: '6rem 8%', background: '#fff' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', marginBottom: '3rem'
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, color: 'var(--negro)'
          }}>
            Nuestras <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>clases</em>
          </h2>
          <Link href="/clases" style={s.btnSecondary}>Ver todas →</Link>
        </div>

        {clasesDB.length === 0 ? (
          // Skeleton mientras cargan
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{
                borderRadius: 20, aspectRatio: '3/4',
                background: 'linear-gradient(135deg, #f5d0dc 0%, #e8a0b4 100%)',
                opacity: 0.3, animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {clasesDB.slice(0, 3).map((clase) => (
              <div
                key={clase.id}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '3/4',
                  background: '#1A1A22',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 20px 48px rgba(201,122,150,0.25)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                <img
                  src={clase.imagen_url || 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80'}
                  alt={clase.nombre}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80'
                  }}
                />
                {/* Gradiente sobre la imagen */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(26,26,34,0.92) 0%, rgba(26,26,34,0.3) 50%, transparent 100%)'
                }} />
                {/* Texto sobre la imagen */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '1.5rem', zIndex: 2
                }}>
                  <span style={{
                    display: 'inline-block', background: 'var(--rosa-d)', color: '#fff',
                    fontSize: '0.68rem', padding: '0.25rem 0.75rem',
                    borderRadius: 100, marginBottom: '0.5rem', fontWeight: 500
                  }}>
                    {clase.etiqueta || 'Danza'}
                  </span>
                  <h3 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.35rem', fontWeight: 600, color: '#fff', margin: 0
                  }}>
                    {clase.nombre}
                  </h3>
                  {clase.edades && (
                    <p style={{
                      color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem',
                      margin: '0.4rem 0 0', fontWeight: 300
                    }}>
                      {clase.edades}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── HORARIOS DINÁMICOS ── */}
      <section id="horarios" style={{
        padding: '6rem 8%', background: 'var(--negro)', color: '#fff', position: 'relative'
      }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700
          }}>
            Horarios de <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>clases</em>
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          {[1, 2].map((n) => (
            <button
              key={n}
              onClick={() => setSala(n as 1 | 2)}
              style={{
                padding: '0.5rem 1.5rem', borderRadius: 100,
                border: sala === n ? 'none' : '1.5px solid rgba(232,160,180,0.3)',
                background: sala === n ? 'var(--rosa-d)' : 'transparent',
                color: '#fff', cursor: 'pointer'
              }}
            >
              Sala {n}
            </button>
          ))}
        </div>

        <div className="fade-in" style={{ overflowX: 'auto' }}>
          <table className="horarios-table">
            <thead>
              <tr>
                <th>Hs.</th>
                <th>Lunes</th>
                <th>Martes</th>
                <th>Miércoles</th>
                <th>Jueves</th>
                <th>Viernes</th>
              </tr>
            </thead>
            <tbody>
              {grillaHoraria.map((row) => (
                <tr key={row.hs}>
                  <td><strong style={{ color: 'var(--rosa)' }}>{row.hs}</strong></td>
                  <CeldaHorario celda={row.lun} />
                  <CeldaHorario celda={row.mar} />
                  <CeldaHorario celda={row.mie} />
                  <CeldaHorario celda={row.jue} />
                  <CeldaHorario celda={row.vie} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── INSCRIPCIÓN ── */}
      <section id="inscripcion" style={{
        padding: '6rem 8%', background: 'var(--rosa-pale)',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '5rem', alignItems: 'center'
      }}>
        <div className="fade-in">
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, color: 'var(--negro)'
          }}>
            ¿Lista para<br />
            <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>empezar</em>?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2rem' }}>
            {[
              { i: '📍', t: 'Ubicación', d: infoAcademia.direccion },
              { i: '📱', t: 'WhatsApp', d: infoAcademia.telefono }
            ].map(item => (
              <div key={item.t} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: 44, height: 44, background: '#fff', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {item.i}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.t}</h4>
                  <p style={{ fontSize: '0.82rem' }}>{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="fade-in" style={{
          background: '#fff', borderRadius: 24, padding: '2.5rem',
          boxShadow: '0 16px 48px rgba(201,122,150,0.12)'
        }}>
          <InscripcionForm telefonoDinamico={infoAcademia.telefono} clases={clasesDB} />
        </div>
      </section>

      {/* ── GALERÍA DINÁMICA ── */}
      <section id="galeria" style={{ padding: '6rem 8%', background: 'var(--bg)' }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700,
          textAlign: 'center', marginBottom: '3rem'
        }}>
          Momentos que <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>brillan</em>
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {galeriaDB.map((img) => (
            <div
              key={img.id}
              className="galeria-item"
              style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden' }}
            >
              <img
                src={img.url}
                alt="Galería"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  )
}

// ── Formulario de inscripción ──────────────────────────────────
function InscripcionForm({ telefonoDinamico, clases }: { telefonoDinamico: string; clases: any[] }) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
 
  const inp: React.CSSProperties = {
    width: '100%', border: '1.5px solid rgba(232,160,180,0.3)',
    borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.9rem', outline: 'none',
  }
  const numeroLimpio = telefonoDinamico.replace(/\D/g, '')
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !telefono) return
    setEnviando(true)
    setError('')
 
    // Guardamos en la tabla reservas con estado 'pendiente'
    // Usamos la fecha de hoy y horario 'A coordinar'
    const hoy = new Date()
    const fechaISO = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0]
 
    const { error: err } = await supabase.from('reservas').insert([{
      nombre,
      apellido,
      telefono,
      disciplina: disciplina || 'Asesoramiento',
      fecha: fechaISO,
      horario: 'A coordinar',
      estado: 'pendiente',
    }])
 
    setEnviando(false)
 
    if (err) {
      setError('Hubo un error al enviar. Intentá de nuevo.')
      return
    }
 
    setEnviado(true)
    setNombre('')
    setApellido('')
    setTelefono('')
    setDisciplina('')
  }
 
  // Estado de éxito
  if (enviado) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: 'var(--negro)', marginBottom: '0.5rem' }}>
          ¡Recibimos tu consulta!
        </h3>
        <p style={{ color: 'var(--gris-l)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          En breve nos comunicamos con vos por WhatsApp para coordinar tu clase de prueba.
        </p>
        <button
          onClick={() => setEnviado(false)}
          style={{
            background: 'transparent', border: '1.5px solid var(--rosa-light)',
            color: 'var(--rosa-d)', padding: '0.6rem 1.5rem',
            borderRadius: 100, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
          }}
        >
          Enviar otra consulta
        </button>
      </div>
    )
  }
 
  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <input
          style={inp} type="text" placeholder="Nombre" required
          value={nombre} onChange={e => setNombre(e.target.value)}
        />
        <input
          style={inp} type="text" placeholder="Apellido"
          value={apellido} onChange={e => setApellido(e.target.value)}
        />
      </div>
      <input
        style={{ ...inp, marginBottom: '1.25rem' }}
        type="tel" placeholder="Teléfono (WhatsApp)" required
        value={telefono} onChange={e => setTelefono(e.target.value)}
      />
      <select
        style={{ ...inp, marginBottom: '1.25rem' }}
        value={disciplina} onChange={e => setDisciplina(e.target.value)}
      >
        <option value="">Seleccioná una clase</option>
        {clases.map(c => (
          <option key={c.id} value={c.nombre}>{c.nombre}</option>
        ))}
        <option value="Asesoramiento">Quiero asesoramiento</option>
      </select>
 
      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>
      )}
 
      <button
        type="submit"
        disabled={enviando}
        style={{
          width: '100%', background: enviando ? '#ccc' : 'var(--rosa-d)',
          color: '#fff', border: 'none', borderRadius: 100,
          padding: '0.9rem', fontWeight: 600, cursor: enviando ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {enviando ? 'Enviando...' : 'Enviar inscripción →'}
      </button>
      <a
        href={`https://wa.me/${numeroLimpio}`}
        target="_blank"
        style={{
          display: 'block', textAlign: 'center', color: 'var(--rosa-d)',
          textDecoration: 'none', fontSize: '0.85rem', marginTop: '1rem'
        }}
      >
        💬 Escribinos por WhatsApp
      </a>
    </form>
  )
}