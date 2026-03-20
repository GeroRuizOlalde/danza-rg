"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

// --- TIPOS ---
type ClaseDB = { id: string; nombre: string; edades: string; estado: string };
type HorarioDB = { id: string; clase_id: string; sala: number; dia: string; hora: number };

type FormData = {
  disciplina: string;
  fecha: Date | null;
  horario: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  alumnoNombre: string;
  alumnoEdad: string;
  experiencia: string;
  user_age?: number;
};

// --- CONSTANTES ---
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA_CORTOS = ['D','L','M','X','J','V','S']; // 'X' para Miércoles evita el error de keys duplicadas
const DIAS_SEMANA_LARGOS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const DIA_A_NUMERO: Record<string, number> = {
  'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

const getIconForClase = (nombre: string) => {
  const n = (nombre || "").toLowerCase();
  if (n.includes('reggaet')) return '🎵';
  if (n.includes('jazz')) return '💃';
  if (n.includes('contempo')) return '🌊';
  if (n.includes('tela') || n.includes('aéreo')) return '🎪';
  if (n.includes('ritmo') || n.includes('zumba')) return '🥁';
  if (n.includes('street') || n.includes('urban')) return '🕺';
  if (n.includes('clásica') || n.includes('ballet')) return '🩰';
  if (n.includes('iniciación')) return '⭐';
  return '✨';
};

export default function TurneroPage() {
  const [step, setStep] = useState(1);
  const [mesOffset, setMesOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  
  const [clasesDB, setClasesDB] = useState<ClaseDB[]>([]);
  const [horariosDB, setHorariosDB] = useState<HorarioDB[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    disciplina: "", fecha: null, horario: "", nombre: "", apellido: "",
    telefono: "", email: "", alumnoNombre: "", alumnoEdad: "", experiencia: "",
  });

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).maybeSingle();
          if (perfil) {
            setFormData(prev => ({
              ...prev,
              nombre: perfil.nombre || "",
              apellido: perfil.apellido || "",
              telefono: perfil.telefono || "",
              email: user.email || "",
              user_age: perfil.fecha_nacimiento ? calcularEdad(perfil.fecha_nacimiento) : undefined
            }));
          }
        }

        const { data: clases } = await supabase.from('clases').select('*');
        const { data: horarios } = await supabase.from('horarios').select('*');

        if (clases) setClasesDB(clases.filter(c => c.estado === 'activa' || !c.estado));
        if (horarios) setHorariosDB(horarios);

      } catch (error) {
        console.error("Error init:", error);
      } finally {
        setCargandoDatos(false);
      }
    }
    init();
  }, []);

  const hoy = new Date();
  const fechaBase = useMemo(() => new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1), [mesOffset]);
  const calendarioInfo = useMemo(() => {
    const mes = fechaBase.getMonth();
    const anio = fechaBase.getFullYear();
    const primerDia = new Date(anio, mes, 1).getDay();
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    return { mes, anio, primerDia, diasMes };
  }, [fechaBase]);

  const calcularEdad = (fechaNac: string) => {
    const cumple = new Date(fechaNac);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) edad--;
    return edad;
  };

  const horariosDisponibles = useMemo(() => {
    const mapa: Record<number, string[]> = {};
    if (!formData.disciplina) return mapa;
    let filtrados = (formData.disciplina === 'No sé cuál elegir') 
      ? horariosDB 
      : horariosDB.filter(h => h.clase_id === clasesDB.find(c => c.nombre === formData.disciplina)?.id);

    filtrados.forEach(h => {
      const numDia = DIA_A_NUMERO[h.dia];
      if (numDia !== undefined) {
        if (!mapa[numDia]) mapa[numDia] = [];
        const horaStr = `${h.hora}:00`;
        if (!mapa[numDia].includes(horaStr)) mapa[numDia].push(horaStr);
      }
    });
    return mapa;
  }, [formData.disciplina, clasesDB, horariosDB]);

  const disciplinasFiltradas = useMemo(() => {
    const procesadas = clasesDB.map(c => {
      const hs = horariosDB.filter(h => h.clase_id === c.id);
      const salas = Array.from(new Set(hs.map(h => h.sala))).join(' y ');
      const dias = Array.from(new Set(hs.map(h => h.dia.substring(0,3)))).join(', ');
      return {
        id: c.id,
        nombre: c.nombre || "Clase",
        desc: c.edades || 'Todas las edades',
        detalle: hs.length > 0 ? `Sala ${salas} · ${dias}` : 'Horarios a confirmar',
        icon: getIconForClase(c.nombre)
      };
    });

    const filtrado = procesadas.filter(disc => {
      if (!formData.user_age) return true;
      const d = (disc.desc || "").toLowerCase();
      if (formData.user_age >= 15) return !d.includes("baby") && !d.includes("kids");
      if (formData.user_age < 12) return !d.includes("adulto") && !d.includes("femme");
      return true;
    });

    filtrado.push({
      id: 'asesoramiento', nombre: 'No sé cuál elegir', desc: 'Te orientamos según tu nivel', detalle: 'Horarios flexibles', icon: '💭'
    });
    return filtrado;
  }, [clasesDB, horariosDB, formData.user_age]);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  const updateForm = (field: keyof FormData, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleConfirmar = async () => {
    setIsSubmitting(true);
    try {
      const fechaISO = formData.fecha ? new Date(formData.fecha.getTime() - (formData.fecha.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : null;
      const { error } = await supabase.from('reservas').insert([{
        nombre: formData.nombre, apellido: formData.apellido, telefono: formData.telefono,
        email: formData.email, disciplina: formData.disciplina, fecha: fechaISO,
        horario: formData.horario, alumno_nombre: formData.alumnoNombre, 
        alumno_edad: formData.alumnoEdad ? parseInt(formData.alumnoEdad) : (formData.user_age || null),
        estado: 'pendiente'
      }]);
      if (error) throw error;
      setStep(5);
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setIsSubmitting(false); }
  };

  if (cargandoDatos) return <div className="min-h-screen flex items-center justify-center font-dm-sans text-[#8A8A99]">Cargando turnero...</div>;

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-[#F7F7F9] font-dm-sans text-[#1A1A22]">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-[calc(100vh-80px)]">
          
          {/* SIDEBAR (Diseño original) */}
          <div className="bg-[#1A1A22] p-10 lg:p-14 text-white flex flex-col">
            <div className="bg-[#E8A0B4]/20 text-[#E8A0B4] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit mb-6">✦ Turnero Online</div>
            <h1 className="font-playfair text-4xl font-bold mb-6 leading-tight text-white">Reservá tu clase <em className="text-[#E8A0B4] not-italic">de prueba</em></h1>
            <p className="text-white/40 text-[0.85rem] leading-relaxed mb-12">Elegí la disciplina y el horario. La primera clase es gratuita y sin compromiso.</p>
            <div className="space-y-8 mb-auto">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl shadow-inner">🎀</div>
                <div><h4 className="font-bold text-sm text-white">Clase de prueba</h4><p className="text-white/30 text-xs">Sin costo para alumnas nuevas.</p></div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl shadow-inner">📍</div>
                <div><h4 className="font-bold text-sm text-white">Ubicación</h4><p className="text-white/30 text-xs">Río Negro 4450, Córdoba.</p></div>
              </div>
            </div>
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <div className="p-8 lg:p-16 overflow-y-auto">
            {step < 5 && (
              <div className="flex gap-6 mb-12 overflow-x-auto pb-4 scrollbar-hide border-b border-gray-100">
                {[1,2,3,4].map(n => (
                  <div key={`step-${n}`} className={`flex items-center gap-3 shrink-0 ${step === n ? 'text-[#C97A96]' : 'text-gray-300'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= n ? 'bg-[#C97A96] text-white' : 'bg-gray-100 text-gray-400'}`}>{step > n ? '✓' : n}</div>
                    <span className="text-[0.7rem] font-black uppercase tracking-widest">{n===1?'Disciplina':n===2?'Horario':n===3?'Tus Datos':'Confirmar'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="max-w-3xl">
              {/* PASO 1: DISCIPLINAS */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="font-playfair text-3xl font-semibold mb-8">¿Qué disciplina querés probar?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {disciplinasFiltradas.map(d => (
                      <div key={d.id} onClick={() => { updateForm('disciplina', d.nombre); handleNext(); }}
                        className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex gap-5 items-start ${formData.disciplina === d.nombre ? 'border-[#C97A96] bg-[#FDF0F4]' : 'border-gray-100 bg-white hover:border-[#F5D0DC] hover:shadow-md'}`}>
                        <div className="text-4xl">{d.icon}</div>
                        <div>
                          <h4 className="font-bold text-[#1A1A22]">{d.nombre}</h4>
                          <p className="text-[0.75rem] text-[#8A8A99] mt-1">{d.desc}</p>
                          <p className="text-[10px] font-black text-[#C97A96] uppercase mt-4 tracking-widest bg-[#FDF0F4] w-fit px-2 py-0.5 rounded">{d.detalle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PASO 2: CALENDARIO */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="font-playfair text-3xl font-semibold mb-8">Elegí el día y la hora</h2>
                  <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-gray-100 shadow-sm mb-10">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="font-bold capitalize text-xl">{MESES[calendarioInfo.mes]} {calendarioInfo.anio}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => setMesOffset(p => p-1)} className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors">‹</button>
                        <button onClick={() => setMesOffset(p => p+1)} className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors">›</button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 text-center mb-6">
                      {DIAS_SEMANA_CORTOS.map((d, i) => <div key={`day-header-${i}`} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>)}
                      {Array.from({ length: calendarioInfo.primerDia }).map((_, i) => <div key={`empty-${i}`} />)}
                      {Array.from({ length: calendarioInfo.diasMes }).map((_, i) => {
                        const d = i + 1;
                        const f = new Date(calendarioInfo.anio, calendarioInfo.mes, d);
                        const esPasado = f < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                        const slots = horariosDisponibles[f.getDay()];
                        const isSelected = formData.fecha?.toDateString() === f.toDateString();
                        return (
                          <button key={`calendar-day-${d}`} disabled={esPasado || !slots} onClick={() => { updateForm('fecha', f); updateForm('horario', ''); }}
                            className={`py-4 rounded-2xl text-sm font-bold transition-all ${esPasado || !slots ? 'text-gray-200 cursor-not-allowed' : isSelected ? 'bg-[#C97A96] text-white shadow-xl shadow-[#C97A96]/30' : 'bg-gray-50 hover:bg-[#FDF0F4] text-[#1A1A22]'}`}>{d}</button>
                        );
                      })}
                    </div>
                    {formData.fecha && (
                      <div className="mt-10 pt-10 border-t border-gray-50">
                        <p className="text-[0.65rem] font-black text-[#C97A96] uppercase mb-4 tracking-[2px]">Horarios disponibles para el {formData.fecha.getDate()} de {MESES[formData.fecha.getMonth()]}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {horariosDisponibles[formData.fecha.getDay()]?.map((h, idx) => (
                            <button key={`time-${idx}`} onClick={() => updateForm('horario', h)}
                              className={`py-3 rounded-2xl border-2 font-bold text-sm transition-all ${formData.horario === h ? 'border-[#C97A96] bg-[#C97A96] text-white shadow-md' : 'border-gray-100 hover:border-[#C97A96] text-gray-600'}`}>{h}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <button onClick={handleBack} className="text-[#8A8A99] font-bold text-sm hover:text-[#1A1A22] transition-colors">← Volver</button>
                    <button onClick={handleNext} disabled={!formData.horario} className="bg-[#1A1A22] text-white px-12 py-4 rounded-full font-bold shadow-xl disabled:opacity-20 transition-all hover:bg-[#C97A96]">Siguiente →</button>
                  </div>
                </div>
              )}

              {/* PASO 3: DATOS */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="font-playfair text-3xl font-semibold mb-2">Tus datos de contacto</h2>
                  <p className="text-[#8A8A99] text-sm mb-10 leading-relaxed">Necesitamos estos datos para enviarte la confirmación por WhatsApp.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                    <input value={formData.nombre} onChange={e => updateForm('nombre', e.target.value)} placeholder="Nombre" className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all" />
                    <input value={formData.apellido} onChange={e => updateForm('apellido', e.target.value)} placeholder="Apellido" className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all" />
                    <input value={formData.telefono} onChange={e => updateForm('telefono', e.target.value)} placeholder="WhatsApp (Ej: 351...)" className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all md:col-span-2" />
                    <input value={formData.alumnoNombre} onChange={e => updateForm('alumnoNombre', e.target.value)} placeholder="Nombre Alumna (Si no sos vos)" className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all" />
                    <input value={formData.alumnoEdad} onChange={e => updateForm('alumnoEdad', e.target.value)} placeholder="Edad Alumna" className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all" />
                  </div>
                  <div className="flex justify-between items-center">
                    <button onClick={handleBack} className="text-[#8A8A99] font-bold text-sm hover:text-[#1A1A22] transition-colors">← Volver</button>
                    <button onClick={handleNext} disabled={!formData.nombre || !formData.telefono} className="bg-[#1A1A22] text-white px-12 py-4 rounded-full font-bold shadow-xl disabled:opacity-20 hover:bg-[#C97A96] transition-all">Siguiente →</button>
                  </div>
                </div>
              )}

              {/* PASO 4: CONFIRMACIÓN */}
              {step === 4 && (
                <div className="animate-in zoom-in duration-500">
                  <h2 className="font-playfair text-3xl font-semibold mb-8">Confirmá tu lugar</h2>
                  <div className="bg-white rounded-[2.5rem] p-10 border border-[#E8A0B4]/20 shadow-sm mb-10">
                    <div className="space-y-6">
                      <div className="flex justify-between border-b border-gray-50 pb-5 items-center">
                        <span className="text-[#8A8A99] text-sm">Disciplina</span>
                        <strong className="text-[#C97A96] text-lg font-bold">{formData.disciplina}</strong>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 pb-5 items-center">
                        <span className="text-[#8A8A99] text-sm">Fecha</span>
                        <strong className="capitalize text-[#1A1A22]">{formData.fecha?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 pb-5 items-center">
                        <span className="text-[#8A8A99] text-sm">Horario</span>
                        <strong className="text-[#1A1A22]">{formData.horario} hs</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8A8A99] text-sm">Alumno/a</span>
                        <strong className="text-[#1A1A22]">{formData.nombre} {formData.apellido}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <button onClick={handleBack} className="text-[#8A8A99] font-bold text-sm hover:text-[#1A1A22] transition-colors">← Volver</button>
                    <button onClick={handleConfirmar} disabled={isSubmitting} className="bg-[#C97A96] text-white px-14 py-4 rounded-full font-bold shadow-xl hover:bg-[#1A1A22] transition-all uppercase tracking-widest text-sm">
                      {isSubmitting ? 'Procesando...' : 'Confirmar Reserva ✦'}
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 5: ÉXITO */}
              {step === 5 && (
                <div className="text-center py-20 animate-in fade-in zoom-in duration-700">
                  <div className="w-28 h-28 bg-gradient-to-br from-[#FDF0F4] to-[#E8A0B4] rounded-full flex items-center justify-center text-6xl mx-auto mb-10 shadow-2xl shadow-[#E8A0B4]/40 animate-bounce">🎉</div>
                  <h2 className="font-playfair text-5xl font-bold mb-6 text-[#1A1A22]">¡Reserva Exitosa!</h2>
                  <p className="text-[#8A8A99] text-lg mb-12 max-w-md mx-auto font-light leading-relaxed">Tu lugar en <strong>R.G Danza</strong> está pre-reservado. En breve te contactaremos por WhatsApp para darte la bienvenida.</p>
                  <Link href="/" className="bg-[#1A1A22] text-white px-14 py-4 rounded-full font-bold shadow-lg hover:bg-[#C97A96] transition-all uppercase tracking-widest text-sm">Volver al inicio</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}