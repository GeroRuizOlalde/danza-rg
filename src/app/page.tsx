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
  });

  // Carga de datos desde Supabase
  useEffect(() => {
    async function fetchData() {
      // 1. Info Academia
      const { data: info } = await supabase.from('academia_info').select('*').single();
      if (info) setInfoAcademia(info);

      // 2. Clases (solo activas)
      const { data: clases } = await supabase.from('clases').select('*').eq('estado', 'activa');
      if (clases) setClasesDB(clases);

      // 3. Horarios
      const { data: hor } = await supabase.from('horarios').select('*, clases(nombre)');
      if (hor) setHorariosDB(hor);

      // 4. Galería
      const { data: gal } = await supabase.from('galeria').select('*').order('orden', { ascending: true });
      if (gal) setGaleriaDB(gal);
    }
    fetchData();

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.fade-in').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // PROCESAMIENTO DINÁMICO DE LA GRILLA DE HORARIOS
  const grillaHoraria = useMemo(() => {
    const horas = [17, 18, 19, 20, 21];
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    
    return horas.map(h => {
      const fila: any = { hs: h };
      dias.forEach(d => {
        const coincidencia = horariosDB.find(item => item.hora === h && item.dia === d && item.sala === sala);
        const claveDia = d.toLowerCase().slice(0, 3).replace('mié', 'mie');
        fila[claveDia] = coincidencia ? { clase: coincidencia.clases.nombre, nivel: coincidencia.nivel } : null;
      });
      return fila;
    });
  }, [horariosDB, sala]);

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', paddingTop: 72, overflow: 'hidden', position: 'relative' }}>
        {/* Ilustración de fondo (Dibujo de Danza) */}
        <div className="dance-drawing-bg" style={{ position: 'absolute', left: '5%', bottom: '10%', width: '300px', height: '300px', opacity: 0.05, pointerEvents: 'none' }}>
            <svg viewBox="0 0 100 100" fill="currentColor"><path d="M50 10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm-5 10c-5.5 0-10 4.5-10 10v15h5v25h10V45h5V30c0-5.5-4.5-10-10-10z"/></svg>
        </div>

        <div style={{ position: 'absolute', top: -200, right: -200, width: 700, height: 700, background: 'radial-gradient(circle, rgba(232,160,180,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ padding: '5% 5% 5% 8%', animation: 'fadeUp 0.9s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--rosa-light)', color: 'var(--rosa-d)', padding: '0.35rem 1rem', borderRadius: 100, fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            ✦ Academia de Danza
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.8rem, 5vw, 4.2rem)', fontWeight: 700, lineHeight: 1.1, color: 'var(--negro)', marginBottom: '1.25rem' }}>
            Donde el cuerpo<br />encuentra su <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>ritmo</em>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--gris-l)', lineHeight: 1.7, maxWidth: 460, marginBottom: '2.5rem', fontWeight: 300 }}>
            En {infoAcademia.nombre} te acompañamos en cada paso. Clases para todas las edades y niveles, en un espacio donde la pasión por el movimiento se convierte en arte.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/turnero" style={s.btnPrimary}>✦ Reservá tu clase de prueba</Link>
            <a href="#nosotros" style={s.btnSecondary}>Conocenos →</a>
          </div>
        </div>

        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
          <Image src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=900&q=80" alt="Danza" fill style={{ objectFit: 'cover', objectPosition: 'center top' }} priority unoptimized />
          <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', padding: '1rem 1.5rem', borderRadius: 12, border: '1px solid rgba(232,160,180,0.3)' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--gris-l)' }}>Próximo inicio de ciclo</p>
            <strong style={{ fontSize: '0.9rem', color: 'var(--negro)', display: 'block' }}>Abril 2026 — Inscripciones abiertas</strong>
          </div>
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section id="nosotros" style={{ padding: '6rem 8%', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center', position: 'relative' }}>
        <div className="fade-in" style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '4/5', boxShadow: '0 24px 64px rgba(201,122,150,0.2)' }}>
          <Image src="https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=700&q=80" alt="Profesora" fill style={{ objectFit: 'cover' }} unoptimized />
        </div>
        <div className="fade-in">
          <div style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--rosa-d)', marginBottom: '0.75rem' }}>Quiénes somos</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, color: 'var(--negro)', lineHeight: 1.2, marginBottom: '1.25rem' }}>
            Una academia creada<br />con <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>amor</em> por la danza
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--gris-l)', lineHeight: 1.7, maxWidth: 540, marginBottom: '2.5rem', fontWeight: 300 }}>
            {infoAcademia.nombre} nació del sueño de crear un espacio donde cada alumna pueda expresarse, crecer y brillar.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[{ i: '💗', t: 'Ambiente seguro' }, { i: '🎓', t: 'Profesores calificados' }, { i: '👯', t: 'Todas las edades' }, { i: '🎭', t: 'Shows anuales' }].map(item => (
              <div key={item.t} style={{ background: '#fff', border: '1px solid rgba(232,160,180,0.25)', borderRadius: 16, padding: '1.25rem' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>{item.i}</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.t}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLASES DINÁMICAS ── */}
      <section id="clases" style={{ padding: '6rem 8%', background: '#fff' }}>
        <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, color: 'var(--negro)' }}>
            Nuestras <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>clases</em>
          </h2>
          <Link href="/clases" style={s.btnSecondary}>Ver todas →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {clasesDB.slice(0, 3).map((clase) => (
            <div key={clase.id} className="fade-in" style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', aspectRatio: '3/4' }}>
              <img src={clase.imagen_url} alt={clase.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,26,34,0.85) 0%, transparent 50%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem', zIndex: 2 }}>
                <span style={{ display: 'inline-block', background: 'var(--rosa-d)', color: '#fff', fontSize: '0.68rem', padding: '0.25rem 0.75rem', borderRadius: 100, marginBottom: '0.5rem' }}>{clase.etiqueta}</span>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 600, color: '#fff' }}>{clase.nombre}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HORARIOS DINÁMICOS ── */}
      <section id="horarios" style={{ padding: '6rem 8%', background: 'var(--negro)', color: '#fff', position: 'relative' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700 }}>
            Horarios de <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>clases</em>
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          {[1, 2].map((n) => (
            <button key={n} onClick={() => setSala(n as 1|2)} style={{ padding: '0.5rem 1.5rem', borderRadius: 100, border: sala === n ? 'none' : '1.5px solid rgba(232,160,180,0.3)', background: sala === n ? 'var(--rosa-d)' : 'transparent', color: '#fff', cursor: 'pointer' }}>
              Sala {n}
            </button>
          ))}
        </div>

        <div className="fade-in" style={{ overflowX: 'auto' }}>
          <table className="horarios-table">
            <thead>
              <tr><th>Hs.</th><th>Lunes</th><th>Martes</th><th>Miércoles</th><th>Jueves</th><th>Viernes</th></tr>
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
      <section id="inscripcion" style={{ padding: '6rem 8%', background: 'var(--rosa-pale)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
        <div className="fade-in">
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, color: 'var(--negro)' }}>
            ¿Lista para<br /><em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>empezar</em>?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2rem' }}>
            {[ { i: '📍', t: 'Ubicación', d: infoAcademia.direccion }, { i: '📱', t: 'WhatsApp', d: infoAcademia.telefono } ].map(item => (
              <div key={item.t} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: 44, height: 44, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.i}</div>
                <div><h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.t}</h4><p style={{ fontSize: '0.82rem' }}>{item.d}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="fade-in" style={{ background: '#fff', borderRadius: 24, padding: '2.5rem', boxShadow: '0 16px 48px rgba(201,122,150,0.12)' }}>
          <InscripcionForm telefonoDinamico={infoAcademia.telefono} clases={clasesDB} />
        </div>
      </section>

      {/* ── GALERÍA DINÁMICA ── */}
      <section id="galeria" style={{ padding: '6rem 8%', background: 'var(--bg)' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, textAlign: 'center', marginBottom: '3rem' }}>
          Momentos que <em style={{ fontStyle: 'italic', color: 'var(--rosa-d)' }}>brillan</em>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {galeriaDB.map((img, i) => (
            <div key={img.id} className="galeria-item" style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden' }}>
              <img src={img.url} alt="Galería" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  )
}

function InscripcionForm({ telefonoDinamico, clases }: { telefonoDinamico: string, clases: any[] }) {
  const inp: React.CSSProperties = { width: '100%', border: '1.5px solid rgba(232,160,180,0.3)', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.9rem', outline: 'none' }
  const numeroLimpio = telefonoDinamico.replace(/\D/g, '');

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <input style={inp} type="text" placeholder="Nombre" />
        <input style={inp} type="text" placeholder="Apellido" />
      </div>
      <input style={{ ...inp, marginBottom: '1.25rem' }} type="tel" placeholder="Teléfono" />
      <select style={{ ...inp, marginBottom: '1.25rem' }}>
        <option value="">Seleccioná una clase</option>
        {clases.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
        <option value="asesoramiento">Quiero asesoramiento</option>
      </select>
      <button type="submit" style={{ width: '100%', background: 'var(--rosa-d)', color: '#fff', border: 'none', borderRadius: 100, padding: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
        Enviar inscripción →
      </button>
      <a href={`https://wa.me/${numeroLimpio}`} target="_blank" style={{ display: 'block', textAlign: 'center', color: 'var(--rosa-d)', textDecoration: 'none', fontSize: '0.85rem', marginTop: '1rem' }}>
        💬 Escribinos por WhatsApp
      </a>
    </form>
  )
}