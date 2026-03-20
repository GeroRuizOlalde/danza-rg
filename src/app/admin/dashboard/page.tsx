"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function DashboardPage() {
  const [metricas, setMetricas] = useState({ activas: 0, nuevas: 0, turnosPendientes: 0, turnosTotal: 0, clasesHoy: 0 });
  const [proximosTurnos, setProximosTurnos] = useState<any[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [cumpleHoy, setCumpleHoy] = useState<any[]>([]);
  const [proximosCumples, setProximosCumples] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [adminName, setAdminName] = useState("Administrador");
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const fechaHoy = new Date();
  const fechaHoyStr = new Intl.DateTimeFormat('es-AR', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }).format(fechaHoy);

  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const nombreDiaHoy = diasSemana[fechaHoy.getDay()];

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 1. Usuario
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.user_metadata?.display_name) {
            setAdminName(user.user_metadata.display_name);
          } else {
            const nombreEmail = user.email?.split('@')[0] || "Administrador";
            setTempName(nombreEmail.charAt(0).toUpperCase() + nombreEmail.slice(1));
            setShowNameModal(true);
          }
        }

        // 2. Alumnas y Reservas
        const [resAlumnos, resReservas, resHorarios, resPerfiles] = await Promise.all([
          supabase.from('alumnos').select('*'),
          supabase.from('reservas').select('*'),
          supabase.from('horarios').select('id').eq('dia', nombreDiaHoy),
          supabase.from('perfiles').select('nombre, apellido, fecha_nacimiento, telefono').not('fecha_nacimiento', 'is', null)
        ]);

        const alumnos = resAlumnos.data || [];
        const reservas = resReservas.data || [];
        const perfiles = resPerfiles.data || [];

        // 3. Lógica de Cumpleaños
        const hoy = new Date();
        const dHoy = hoy.getDate();
        const mHoy = hoy.getMonth();

        const hoyList: any[] = [];
        const semanaList: any[] = [];

        perfiles.forEach(p => {
          const f = new Date(p.fecha_nacimiento);
          // Ajuste de zona horaria para evitar desfases de un día
          const cumpleDate = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
          const dC = cumpleDate.getDate();
          const mC = cumpleDate.getMonth();

          if (dC === dHoy && mC === mHoy) {
            hoyList.push(p);
          } else if (mC === mHoy && dC > dHoy && dC <= dHoy + 7) {
            semanaList.push(p);
          }
        });

        setCumpleHoy(hoyList);
        setProximosCumples(semanaList.sort((a,b) => new Date(a.fecha_nacimiento).getDate() - new Date(b.fecha_nacimiento).getDate()));

        // 4. Métricas
        setMetricas({
          activas: alumnos.filter(a => a.estado === 'activa').length,
          nuevas: alumnos.filter(a => a.estado === 'nueva').length,
          turnosPendientes: reservas.filter(r => r.estado === 'pendiente').length,
          turnosTotal: reservas.length,
          clasesHoy: resHorarios.data?.length || 0
        });

        // 5. Próximos turnos
        setProximosTurnos(reservas
          .filter(r => r.estado !== 'cancelado')
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
          .slice(0, 3)
        );

        // 6. Actividad reciente
        const mixActividad = [
          ...alumnos.map(a => ({
            id: `al-${a.id}`,
            fecha: new Date(a.created_at),
            texto: (<span>Nueva inscripción de <strong>{a.nombre} {a.apellido}</strong> ({a.disciplina})</span>),
            dot: "bg-[#C97A96]"
          })),
          ...reservas.map(r => ({
            id: `res-${r.id}`,
            fecha: new Date(r.created_at),
            texto: (<span><strong>{r.nombre} {r.apellido}</strong> reservó un turno para {r.disciplina}</span>),
            dot: "bg-[#2DB87A]"
          }))
        ];
        setActividad(mixActividad.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 4));

      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setCargando(false);
      }
    }
    fetchDashboardData();
  }, [nombreDiaHoy]);

  const handleGuardarNombre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    setGuardandoNombre(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: tempName.trim() } });
    if (!error) {
      setAdminName(tempName.trim());
      setShowNameModal(false);
    }
    setGuardandoNombre(false);
  };

  const getIniciales = (n: string, a: string) => `${n?.charAt(0) || ''}${a?.charAt(0) || ''}`.toUpperCase();
  const getAvatarColor = (id: string) => {
    const colors = ["bg-[#E8A0B4]/20 text-[#C97A96]", "bg-[#2DB87A]/15 text-[#2DB87A]", "bg-[#4A4A55]/10 text-[#4A4A55]"];
    let suma = 0;
    for (let i = 0; i < id.length; i++) suma += id.charCodeAt(i);
    return colors[suma % colors.length];
  };

  if (cargando) return <div className="flex h-[50vh] items-center justify-center text-[#8A8A99] font-dm-sans">Cargando tu panel...</div>;

  return (
    <div className="font-dm-sans">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Buen día, <em className="italic text-[#C97A96]">{adminName}</em> 👋
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1 capitalize">
            {fechaHoyStr} · Resumen de la academia
          </p>
        </div>
        <Link href="/admin/turnos" className="inline-flex items-center gap-2 bg-[#C97A96] text-white rounded-full px-5 py-2.5 text-[0.82rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md shadow-[#C97A96]/20">
          + Nuevo turno
        </Link>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-5 shadow-sm">
          <div className="text-[1.3rem] mb-2">👩‍🎓</div>
          <div className="text-[0.72rem] font-medium text-[#8A8A99] tracking-wide uppercase mb-2">Alumnas activas</div>
          <div className="text-[1.8rem] font-semibold text-[#1A1A22] leading-none mb-1.5">{metricas.activas}</div>
          <div className="text-[0.75rem] text-[#8A8A99]">Total activas</div>
        </div>

        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-5 shadow-sm">
          <div className="text-[1.3rem] mb-2">📅</div>
          <div className="text-[0.72rem] font-medium text-[#8A8A99] tracking-wide uppercase mb-2">Total de turnos</div>
          <div className="text-[1.8rem] font-semibold text-[#1A1A22] leading-none mb-1.5">{metricas.turnosTotal}</div>
          <div className={`text-[0.75rem] font-medium ${metricas.turnosPendientes > 0 ? 'text-[#F59E0B]' : 'text-[#8A8A99]'}`}>
            {metricas.turnosPendientes} pendientes
          </div>
        </div>

        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-5 shadow-sm">
          <div className="text-[1.3rem] mb-2">💃</div>
          <div className="text-[0.72rem] font-medium text-[#8A8A99] tracking-wide uppercase mb-2">Clases hoy</div>
          <div className="text-[1.8rem] font-semibold text-[#C97A96] leading-none mb-1.5">{metricas.clasesHoy}</div>
          <div className="text-[0.75rem] text-[#8A8A99]">Para este {nombreDiaHoy}</div>
        </div>

        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-5 shadow-sm">
          <div className="text-[1.3rem] mb-2">✅</div>
          <div className="text-[0.72rem] font-medium text-[#8A8A99] tracking-wide uppercase mb-2">Inscripciones nuevas</div>
          <div className="text-[1.8rem] font-semibold text-[#1A1A22] leading-none mb-1.5">{metricas.nuevas}</div>
          <div className="text-[0.75rem] text-[#2DB87A] font-medium">Por contactar</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* SECCIÓN IZQUIERDA: Turnos y Actividad */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#E8A0B4]/20 bg-[#F7F7F9]/30">
              <h3 className="text-[0.9rem] font-semibold">Próximos turnos de prueba</h3>
            </div>
            <div className="p-2">
              {proximosTurnos.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-[#8A8A99] text-sm">No hay turnos programados.</div>
              ) : (
                proximosTurnos.map((t) => (
                  <div key={t.id} className="flex items-center gap-3.5 p-3 border-b border-[#E8A0B4]/10 last:border-0 hover:bg-[#FDF0F4]/50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[0.75rem] font-semibold shrink-0 ${getAvatarColor(t.id)}`}>{getIniciales(t.nombre, t.apellido)}</div>
                    <div className="flex-1">
                      <strong className="block text-[0.85rem] font-semibold">{t.nombre} {t.apellido}</strong>
                      <span className="text-[0.75rem] text-[#8A8A99]">{t.fecha.split('-').reverse().slice(0,2).join('/')} · {t.horario} hs · {t.disciplina}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#E8A0B4]/20 bg-[#F7F7F9]/30">
              <h3 className="text-[0.9rem] font-semibold">Actividad reciente</h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {actividad.map((a) => (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-[#E8A0B4]/10 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${a.dot}`}></div>
                  <div className="text-[0.8rem] text-[#4A4A55] leading-relaxed flex-1">{a.texto}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECCIÓN DERECHA: CUMPLEAÑOS */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#E8A0B4]/20 bg-[#FDF0F4]/50 flex items-center justify-between">
              <h3 className="text-[0.9rem] font-bold text-[#C97A96]">🎂 Cumpleaños</h3>
            </div>
            <div className="p-5">
              {/* CUMPLES DE HOY */}
              {cumpleHoy.length > 0 && (
                <div className="mb-6">
                  <p className="text-[0.65rem] font-black text-[#C97A96] uppercase tracking-widest mb-3">Hoy celebran:</p>
                  <div className="space-y-3">
                    {cumpleHoy.map((p, i) => (
                      <div key={i} className="bg-[#FDF0F4] p-3 rounded-xl flex items-center justify-between border border-[#E8A0B4]/30">
                        <span className="text-[0.8rem] font-bold text-[#1A1A22]">{p.nombre} {p.apellido}</span>
                        <button 
                          onClick={() => window.open(`https://wa.me/${p.telefono?.replace(/\D/g,'')}?text=¡Feliz cumple ${p.nombre}! 🎂🕺 Te deseamos lo mejor desde R.G Danza.`)}
                          className="bg-[#C97A96] text-white p-1.5 rounded-lg text-lg hover:bg-[#1A1A22] transition-colors"
                        >
                          💬
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRÓXIMOS CUMPLES */}
              <div>
                <p className="text-[0.65rem] font-black text-[#8A8A99] uppercase tracking-widest mb-3">Próximos 7 días:</p>
                {proximosCumples.length > 0 ? (
                  <div className="space-y-3">
                    {proximosCumples.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-[0.8rem] py-2 border-b border-gray-50 last:border-0">
                        <span className="text-[#4A4A55]">{p.nombre} {p.apellido}</span>
                        <span className="font-bold text-[#C97A96]">
                          {new Date(p.fecha_nacimiento).getDate() + 1} {MESES[new Date(p.fecha_nacimiento).getMonth()].slice(0,3)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No hay más cumples esta semana.</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL NOMBRE */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-8 text-center border-b border-[#E8A0B4]/20">
              <h2 className="font-playfair text-2xl font-semibold text-[#1A1A22] mb-2">¡Hola!</h2>
              <p className="text-[#8A8A99] text-[0.85rem]">¿Cómo te gustaría que te llamemos?</p>
            </div>
            <form onSubmit={handleGuardarNombre} className="p-6">
              <input type="text" autoFocus required value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none mb-6 text-center font-medium" />
              <button type="submit" className="w-full bg-[#C97A96] text-white py-3.5 rounded-full text-[0.85rem] font-semibold">Guardar y comenzar →</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}