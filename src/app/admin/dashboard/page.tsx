"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type ActividadItem = {
  id: string;
  fecha: Date;
  tipo: 'alumno' | 'reserva';
  nombre: string;
  apellido: string;
  disciplina: string;
  dot: string;
};

type CumpleItem = {
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_nacimiento: string;
};

export default function DashboardPage() {
  const [metricas, setMetricas] = useState({ activas: 0, nuevas: 0, turnosPendientes: 0, turnosTotal: 0, clasesHoy: 0 });
  const [proximosTurnos, setProximosTurnos] = useState<any[]>([]);
  const [actividad, setActividad] = useState<ActividadItem[]>([]);
  const [cumpleHoy, setCumpleHoy] = useState<CumpleItem[]>([]);
  const [proximosCumples, setProximosCumples] = useState<CumpleItem[]>([]);
  const [cargando, setCargando] = useState(true);

  const [adminName, setAdminName] = useState("Administrador");
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const fechaHoy = new Date();
  const fechaHoyStr = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(fechaHoy);

  const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const nombreDiaHoy = diasSemana[fechaHoy.getDay()];

  useEffect(() => {
    async function fetchDashboardData() {
      try {
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

        const [resPerfiles, resReservas, resHorarios] = await Promise.all([
          supabase.from('perfiles').select('*'),
          supabase.from('reservas').select('*'),
          supabase.from('horarios').select('id').eq('dia', nombreDiaHoy),
        ]);

        const perfiles = resPerfiles.data || [];
        const reservas = resReservas.data || [];

        // Cumpleaños
        const hoy = new Date();
        const dHoy = hoy.getDate();
        const mHoy = hoy.getMonth();
        const hoyList: CumpleItem[] = [];
        const semanaList: CumpleItem[] = [];

        perfiles.forEach((p: any) => {
          if (!p.fecha_nacimiento) return;
          const f = new Date(p.fecha_nacimiento);
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
        setProximosCumples(semanaList.sort((a, b) =>
          new Date(a.fecha_nacimiento).getDate() - new Date(b.fecha_nacimiento).getDate()
        ));

        // Métricas
        setMetricas({
          activas: perfiles.filter((p: any) => p.estado === 'activa').length,
          nuevas: perfiles.filter((p: any) => p.estado === 'nueva' || !p.estado).length,
          turnosPendientes: reservas.filter((r: any) => r.estado === 'pendiente').length,
          turnosTotal: reservas.length,
          clasesHoy: resHorarios.data?.length || 0,
        });

        // Próximos turnos
        setProximosTurnos(
          reservas
            .filter((r: any) => r.estado !== 'cancelado')
            .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
            .slice(0, 3)
        );

        // Actividad reciente — ya sin JSX en el estado
        const mixActividad: ActividadItem[] = [
          ...perfiles.slice(0, 5).map((a: any) => ({
            id: `al-${a.id}`,
            fecha: new Date(a.created_at || Date.now()),
            tipo: 'alumno' as const,
            nombre: a.nombre || '',
            apellido: a.apellido || '',
            disciplina: '',
            dot: "bg-[#C97A96]",
          })),
          ...reservas.slice(0, 5).map((r: any) => ({
            id: `res-${r.id}`,
            fecha: new Date(r.created_at || Date.now()),
            tipo: 'reserva' as const,
            nombre: r.nombre || '',
            apellido: r.apellido || '',
            disciplina: r.disciplina || '',
            dot: "bg-[#2DB87A]",
          })),
        ];
        setActividad(
          mixActividad.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 4)
        );

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

  if (cargando) return (
    <div className="flex h-[50vh] items-center justify-center text-[#8A8A99] font-dm-sans">
      Cargando tu panel...
    </div>
  );

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
        <Link
          href="/admin/turnos"
          className="inline-flex items-center gap-2 bg-[#C97A96] text-white rounded-full px-5 py-2.5 text-[0.82rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md shadow-[#C97A96]/20"
        >
          + Nuevo turno
        </Link>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { icon: "👩‍🎓", label: "Alumnas activas", value: metricas.activas, sub: "Total activas", subColor: "text-[#8A8A99]" },
          { icon: "📅", label: "Total de turnos", value: metricas.turnosTotal, sub: `${metricas.turnosPendientes} pendientes`, subColor: metricas.turnosPendientes > 0 ? "text-[#F59E0B]" : "text-[#8A8A99]" },
          { icon: "💃", label: "Clases hoy", value: metricas.clasesHoy, sub: `Para este ${nombreDiaHoy}`, subColor: "text-[#C97A96]", valueColor: "text-[#C97A96]" },
          { icon: "✅", label: "Inscripciones nuevas", value: metricas.nuevas, sub: "Por contactar", subColor: "text-[#2DB87A]" },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-5 shadow-sm">
            <div className="text-[1.3rem] mb-2">{m.icon}</div>
            <div className="text-[0.72rem] font-medium text-[#8A8A99] tracking-wide uppercase mb-2">{m.label}</div>
            <div className={`text-[1.8rem] font-semibold leading-none mb-1.5 ${m.valueColor || 'text-[#1A1A22]'}`}>{m.value}</div>
            <div className={`text-[0.75rem] font-medium ${m.subColor}`}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Izquierda */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Próximos turnos */}
          <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#E8A0B4]/20 bg-[#F7F7F9]/30 flex justify-between items-center">
              <h3 className="text-[0.9rem] font-semibold">Próximos turnos de prueba</h3>
              <Link href="/admin/turnos" className="text-[0.75rem] text-[#C97A96] hover:underline font-medium">Ver todos →</Link>
            </div>
            <div className="p-2">
              {proximosTurnos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-[#8A8A99] text-sm gap-2">
                  <span>No hay turnos programados.</span>
                  <Link href="/admin/turnos" className="text-[#C97A96] font-medium text-xs hover:underline">+ Crear turno</Link>
                </div>
              ) : (
                proximosTurnos.map((t) => (
                  <div key={t.id} className="flex items-center gap-3.5 p-3 border-b border-[#E8A0B4]/10 last:border-0 hover:bg-[#FDF0F4]/50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[0.75rem] font-semibold shrink-0 ${getAvatarColor(t.id)}`}>
                      {getIniciales(t.nombre, t.apellido)}
                    </div>
                    <div className="flex-1">
                      <strong className="block text-[0.85rem] font-semibold">{t.nombre} {t.apellido}</strong>
                      <span className="text-[0.75rem] text-[#8A8A99]">
                        {t.fecha?.split('-').reverse().slice(0, 2).join('/')} · {t.horario} hs · {t.disciplina}
                      </span>
                    </div>
                    <span className={`text-[0.7rem] font-semibold px-2 py-0.5 rounded-full ${t.estado === 'confirmado' ? 'bg-green-100 text-green-600' : 'bg-[#F59E0B]/10 text-[#b07800]'}`}>
                      {t.estado}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#E8A0B4]/20 bg-[#F7F7F9]/30">
              <h3 className="text-[0.9rem] font-semibold">Actividad reciente</h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {actividad.length === 0 ? (
                <div className="text-center text-[#8A8A99] text-sm py-4">Sin actividad reciente.</div>
              ) : actividad.map((a) => (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-[#E8A0B4]/10 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${a.dot}`}></div>
                  <div className="text-[0.8rem] text-[#4A4A55] leading-relaxed flex-1">
                    {a.tipo === 'alumno' ? (
                      <span>Nueva inscripción de <strong>{a.nombre} {a.apellido}</strong></span>
                    ) : (
                      <span><strong>{a.nombre} {a.apellido}</strong> reservó un turno para {a.disciplina}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Derecha: Cumpleaños */}
        <div>
          <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#E8A0B4]/20 bg-[#FDF0F4]/50 flex items-center justify-between">
              <h3 className="text-[0.9rem] font-bold text-[#C97A96]">🎂 Cumpleaños</h3>
            </div>
            <div className="p-5">
              {/* Hoy */}
              {cumpleHoy.length > 0 && (
                <div className="mb-6">
                  <p className="text-[0.65rem] font-black text-[#C97A96] uppercase tracking-widest mb-3">Hoy celebran:</p>
                  <div className="space-y-3">
                    {cumpleHoy.map((p, i) => (
                      <div key={i} className="bg-[#FDF0F4] p-3 rounded-xl flex items-center justify-between border border-[#E8A0B4]/30">
                        <span className="text-[0.8rem] font-bold text-[#1A1A22]">{p.nombre} {p.apellido}</span>
                        <button
                          onClick={() => {
                            const tel = p.telefono?.replace(/\D/g, '');
                            if (tel) window.open(`https://wa.me/${tel}?text=¡Feliz cumple ${p.nombre}! 🎂🕺`);
                          }}
                          className="bg-[#C97A96] text-white p-1.5 rounded-lg text-lg hover:bg-[#1A1A22] transition-colors"
                        >💬</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximos */}
              <div>
                <p className="text-[0.65rem] font-black text-[#8A8A99] uppercase tracking-widest mb-3">Próximos 7 días:</p>
                {proximosCumples.length > 0 ? (
                  <div className="space-y-3">
                    {proximosCumples.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-[0.8rem] py-2 border-b border-gray-50 last:border-0">
                        <span className="text-[#4A4A55]">{p.nombre} {p.apellido}</span>
                        <span className="font-bold text-[#C97A96]">
                          {new Date(p.fecha_nacimiento + 'T12:00:00').getDate()} {MESES[new Date(p.fecha_nacimiento + 'T12:00:00').getMonth()].slice(0, 3)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No hay cumples esta semana.</p>
                )}
              </div>

              {cumpleHoy.length === 0 && proximosCumples.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">Sin cumpleaños próximos 🎉</p>
              )}
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
            <div className="p-6">
              <input
                type="text" autoFocus required
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGuardarNombre(e as any)}
                className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none mb-6 text-center font-medium focus:border-[#C97A96] transition-all"
              />
              <button
                onClick={handleGuardarNombre}
                disabled={guardandoNombre || !tempName.trim()}
                className="w-full bg-[#C97A96] text-white py-3.5 rounded-full text-[0.85rem] font-semibold hover:bg-[#1A1A22] transition-all disabled:opacity-50"
              >
                {guardandoNombre ? "Guardando..." : "Guardar y comenzar →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}