'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Footer() {
  // Estado para guardar la información dinámica
  const [info, setInfo] = useState({
    nombre: 'R.G Danza',
    telefono: '351 679-3151',
    direccion: 'Río Negro 4450, Zona Sur · Cba.',
    instagram: '@r.g_danza'
  });

  useEffect(() => {
    async function fetchInfo() {
      const { data } = await supabase.from('academia_info').select('*').single();
      if (data) {
        setInfo(data);
      }
    }
    fetchInfo();
  }, []);

  // Limpiamos el teléfono y el instagram para armar los links reales
  const numeroLimpio = info.telefono.replace(/\D/g, '');
  const linkWhatsApp = `https://wa.me/${numeroLimpio}`;
  const instagramLimpio = info.instagram.replace('@', '');
  const linkInstagram = `https://www.instagram.com/${instagramLimpio}/`;

  // Estructura dinámica de los links
  const footerLinks = {
    Páginas: [
      { href: '/#nosotros', label: 'Quiénes somos' },
      { href: '/clases',    label: 'Clases'         },
      { href: '/#horarios', label: 'Horarios'        },
      { href: '/#galeria',  label: 'Galería'         },
      { href: '/turnero',   label: 'Turnero'         },
    ],
    Disciplinas: [
      { href: '/clases', label: 'Reggaetón'       },
      { href: '/clases', label: 'Jazz'            },
      { href: '/clases', label: 'Acro Tela'       },
      { href: '/clases', label: 'Contemporáneo'   },
      { href: '/clases', label: 'Danzas Clásicas' },
      { href: '/clases', label: 'Ritmos Latinos'  },
    ],
    Contacto: [
      { href: `http://maps.google.com/?q=${encodeURIComponent(info.direccion)}`, label: `📍 ${info.direccion}` },
      { href: `tel:+${numeroLimpio}`,                                            label: `📞 ${info.telefono}`  },
      { href: linkInstagram,                                                     label: `📸 ${info.instagram}` },
      { href: linkWhatsApp,                                                      label: '💬 WhatsApp'          },
    ],
  };

  // Función para renderizar el logo dinámico con colores separados
  const renderLogoDinámico = () => {
    const partes = info.nombre.split(' ');
    if (partes.length === 1) return info.nombre;
    const primeraPalabra = partes[0];
    const restoPalabras = partes.slice(1).join(' ');
    return (
      <>
        {primeraPalabra} <span style={{ color: 'var(--rosa)' }}>{restoPalabras}</span>
      </>
    );
  };

  return (
    <footer style={{ background: 'var(--negro)', color: '#fff', padding: '4rem 8% 2rem' }}>
      
      {/* Top grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: '3rem',
        paddingBottom: '3rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
        className="footer-grid"
      >
        {/* Brand */}
        <div>
          <Link href="/" style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.4rem', fontWeight: 700,
            color: '#fff', textDecoration: 'none',
            display: 'inline-block', marginBottom: '1rem',
          }}>
            {renderLogoDinámico()}
          </Link>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 280 }}>
            Un espacio creado con amor para que cada alumna encuentre su ritmo, su expresión y su lugar en el mundo de la danza.
          </p>
          {/* Socials */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            {[
              { href: linkInstagram, label: '📸', title: 'Instagram' },
              { href: linkWhatsApp,  label: '💬', title: 'WhatsApp'  },
            ].map(({ href, label, title }) => (
              <a key={title} href={href} target="_blank" rel="noreferrer" title={title} style={{
                width: 38, height: 38,
                background: 'rgba(255,255,255,0.07)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none', fontSize: '0.9rem',
                transition: 'background 0.2s',
              }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h5 style={{
              fontSize: '0.75rem', fontWeight: 600,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              color: 'var(--rosa)', marginBottom: '1.25rem',
            }}>
              {title}
            </h5>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: 0, padding: 0 }}>
              {links.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    target={href.startsWith('http') || href.startsWith('tel:') ? '_blank' : undefined}
                    rel={(href.startsWith('http') || href.startsWith('tel:')) ? 'noreferrer' : undefined}
                    style={{ textDecoration: 'none', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', transition: 'color 0.2s' }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} {info.nombre}. Todos los derechos reservados.
        </p>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>
          Diseñado con 💗
        </p>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 540px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  )
}