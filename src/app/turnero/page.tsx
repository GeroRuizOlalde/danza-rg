"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// --- TIPOS ---
type ClaseDB = { id: string; nombre: string; edades: string; estado: string };
type HorarioDB = { id: string; clase_id: string; sala: number; dia: string; hora: number; cupo_maximo: number };

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
const DIAS_SEMANA_CORTOS = ['D','L','M','X','J','V','S'];
const DIAS_SEMANA_LARGOS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const DIA_A_NUMERO: Record<string, number> = {
  'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

const getIconForClase = (nombre: string) => {
  const n = (nombre || "").toLowerCase();
  if (n.includes('reggaet')) return '🎵';
  if (n.includes('jazz')) return '💃';
  if (n.includes('contempo')) return '🌊';
  if (n.includes('tela') || n.includes('aéreo') || n.includes('aereo') || n.includes('dinamico') || n.includes('dinámico')) return '🎪';
  if (n.includes('ritmo') || n.includes('zumba')) return '🥁';
  if (n.includes('street') || n.includes('urban')) return '🕺';
  if (n.includes('clásica') || n.includes('clasica') || n.includes('ballet')) return '🩰';
  if (n.includes('iniciación') || n.includes('iniciacion')) return '⭐';
  if (n.includes('entrenamiento') || n.includes('flexibilidad')) return '💪';
  return '✨';
};

// Rangos de edad reales por disciplina, extraídos de los flyers de R.G Danza
// Grupos: "baby" = 3-6 años | "kids" = 7-12 años | "adult" = 13+ años (juvenil/adultos)
type RangoEdad = 'baby' | 'kids' | 'adult' | 'all';

const RANGOS_DISCIPLINA: Record<string, RangoEdad[]> = {
  // Reggaetón
  'reggaetón baby':            ['baby'],
  'reggaeton baby':            ['baby'],
  'reggaetón kids':            ['kids'],
  'reggaeton kids':            ['kids'],
  'reggaetón femme':           ['adult'],
  'reggaeton femme':           ['adult'],
  // Jazz
  'jazz infantil inicial':     ['baby', 'kids'],
  'jazz infantil avanzado':    ['kids'],
  'jazz infantil':             ['baby', 'kids'],
  // Iniciación
  'iniciación a la danza':     ['baby'],
  'iniciacion a la danza':     ['baby'],
  // Danzas Clásicas
  'danzas clásicas':           ['kids', 'adult'],
  'danzas clasicas':           ['kids', 'adult'],
  // Street / Urbano
  'street dance':              ['kids'],
  'urbano':                    ['adult'],
  // Contemporáneo
  'contemporáneo':             ['adult'],
  'contemporaneo':             ['adult'],
  // Acro Tela
  'acro tela':                 ['kids', 'adult'],
  'acrotela':                  ['kids', 'adult'],
  // Ritmos Latinos
  'ritmos latinos kids':       ['kids'],
  'ritmos latinos':            ['adult'],
  // Zumba
  'zumba':                     ['kids'],
  // Dinámicos Aéreos
  'dinámicos aéreos':          ['kids', 'adult'],
  'dinamicos aereos':          ['kids', 'adult'],
  // Entrenamiento / Flexibilidad
  'entrenamiento para bailarines': ['kids', 'adult'],
  'entrenamiento bailarines':      ['kids', 'adult'],
  'flexibilidad y acrobacias':     ['kids', 'adult'],
};

// Dado un nombre de clase y la edad del usuario, devuelve si aplica
function claseAplicaParaEdad(nombreClase: string, edad: number): boolean {
  const key = nombreClase.toLowerCase().trim();

  // Buscamos la clave más específica que haga match (de más larga a más corta)
  const claveMatch = Object.keys(RANGOS_DISCIPLINA)
    .filter(k => key.includes(k))
    .sort((a, b) => b.length - a.length)[0];

  if (!claveMatch) return true; // Si no está mapeada, la mostramos siempre

  const rangos = RANGOS_DISCIPLINA[claveMatch];

  if (rangos.includes('all')) return true;
  if (edad >= 3  && edad <= 6  && rangos.includes('baby'))  return true;
  if (edad >= 7  && edad <= 12 && rangos.includes('kids'))  return true;
  if (edad >= 13               && rangos.includes('adult')) return true;
  return false;
}

export default function TurneroPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [mesOffset, setMesOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [clasesDB, setClasesDB] = useState<ClaseDB[]>([]);
  const [horariosDB, setHorariosDB] = useState<HorarioDB[]>([]);
  const [telefonoAcademia, setTelefonoAcademia] = useState("");
  const [reservasPorHorario, setReservasPorHorario] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState<FormData>({
    disciplina: "", fecha: null, horario: "", nombre: "", apellido: "",
    telefono: "", email: "", alumnoNombre: "", alumnoEdad: "", experiencia: "",
  });

  const calcularEdad = (fechaNac: string) => {
    const hoy = new Date();
    const cumple = new Date(fechaNac);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) edad--;
    return edad;
  };

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

        const [resClases, resHorarios, resInfo] = await Promise.all([
          supabase.from('clases').select('*'),
          supabase.from('horarios').select('*'),
          supabase.from('academia_info').select('telefono').single()
        ]);

        if (resInfo.data?.telefono) {
          setTelefonoAcademia(resInfo.data.telefono.replace(/\D/g, ''));
        }

        const clasesActivas = resClases.data?.filter((c: ClaseDB) => c.estado === 'activa' || !c.estado) || [];
        setClasesDB(clasesActivas);

        if (resHorarios.data) {
          setHorariosDB(resHorarios.data);
        }

        // Contar reservas activas por disciplina+horario para cupos
        const { data: resReservas } = await supabase
          .from('reservas')
          .select('disciplina, horario')
          .in('estado', ['pendiente', 'confirmado']);

        if (resReservas) {
          const conteo: Record<string, number> = {};
          resReservas.forEach(r => {
            const key = `${r.disciplina}|${r.horario}`;
            conteo[key] = (conteo[key] || 0) + 1;
          });
          setReservasPorHorario(conteo);
        }

        // Preseleccionar clase desde query param
        const claseParam = searchParams.get('clase');
        if (claseParam) {
          const match = clasesActivas.find((c: ClaseDB) =>
            c.nombre.toLowerCase() === claseParam.toLowerCase()
          );
          if (match) {
            setFormData(prev => ({ ...prev, disciplina: match.nombre }));
            setStep(2);
          }
        }

      } catch (error) {
        console.error("Error init turnero:", error);
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

  type SlotHorario = { hora: string; cupo: number; reservados: number; lleno: boolean };

  const horariosDisponibles = useMemo(() => {
    const mapa: Record<number, SlotHorario[]> = {};
    if (!formData.disciplina) return mapa;
    const claseSeleccionada = clasesDB.find(c => c.nombre === formData.disciplina);
    const filtrados = (formData.disciplina === 'No sé cuál elegir')
      ? horariosDB
      : horariosDB.filter(h => h.clase_id === claseSeleccionada?.id);

    filtrados.forEach(h => {
      const numDia = DIA_A_NUMERO[h.dia];
      if (numDia !== undefined) {
        if (!mapa[numDia]) mapa[numDia] = [];
        const horaStr = `${h.hora}:00`;
        if (mapa[numDia].some(s => s.hora === horaStr)) return;
        const key = `${formData.disciplina}|${horaStr}`;
        const reservados = reservasPorHorario[key] || 0;
        const cupo = h.cupo_maximo || 20;
        mapa[numDia].push({ hora: horaStr, cupo, reservados, lleno: reservados >= cupo });
      }
    });
    return mapa;
  }, [formData.disciplina, clasesDB, horariosDB, reservasPorHorario]);

  const disciplinasFiltradas = useMemo(() => {
    const procesadas = clasesDB.map(c => {
      const hs = horariosDB.filter(h => h.clase_id === c.id);
      const salas = Array.from(new Set(hs.map(h => h.sala))).join(' y ');
      const dias = Array.from(new Set(hs.map(h => h.dia.substring(0, 3)))).join(', ');
      return {
        id: c.id,
        nombre: c.nombre || "Clase",
        desc: c.edades || 'Todas las edades',
        detalle: hs.length > 0 ? `Sala ${salas} · ${dias}` : 'Horarios a confirmar',
        icon: getIconForClase(c.nombre)
      };
    });

    // Filtramos por edad real si la tenemos; si no, mostramos todo
    const filtrado = formData.user_age
      ? procesadas.filter(disc => claseAplicaParaEdad(disc.nombre, formData.user_age!))
      : procesadas;

    // Siempre al final: la opción de asesoramiento
    filtrado.push({
      id: 'asesoramiento',
      nombre: 'No sé cuál elegir',
      desc: 'Te orientamos según tu nivel y edad',
      detalle: 'Horarios flexibles',
      icon: '💭'
    });

    return filtrado;
  }, [clasesDB, horariosDB, formData.user_age]);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  const updateForm = (field: keyof FormData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleConfirmar = async () => {
    setIsSubmitting(true);
    try {
      const fechaISO = formData.fecha
        ? new Date(formData.fecha.getTime() - (formData.fecha.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
        : null;

      // Vincular con perfil si está logueado
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('reservas').insert([{
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        email: formData.email,
        disciplina: formData.disciplina,
        fecha: fechaISO,
        horario: formData.horario,
        alumno_nombre: formData.alumnoNombre,
        alumno_edad: formData.alumnoEdad ? parseInt(formData.alumnoEdad) : (formData.user_age || null),
        estado: 'pendiente',
        origen: 'turnero',
        perfil_id: user?.id || null,
      }]);
      if (error) throw error;
      setStep(5);
    } catch (e: any) {
      toast.error("Error al guardar la reserva: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="min-h-screen flex items-center justify-center font-dm-sans text-[#8A8A99]">
        <div className="text-center">
          <div className="text-4xl mb-4">💃</div>
          <p>Cargando el turnero...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-[#F7F7F9] font-dm-sans text-[#1A1A22]">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-[calc(100vh-80px)]">

          {/* SIDEBAR */}
          <div className="bg-[#1A1A22] p-10 lg:p-14 text-white flex flex-col">
            <div className="bg-[#E8A0B4]/20 text-[#E8A0B4] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit mb-6">
              ✦ Turnero Online
            </div>
            <h1 className="font-playfair text-4xl font-bold mb-6 leading-tight text-white">
              Reservá tu clase <em className="text-[#E8A0B4] not-italic">de prueba</em>
            </h1>
            <p className="text-white/40 text-[0.85rem] leading-relaxed mb-12">
              Elegí la disciplina y el horario. La primera clase es gratuita y sin compromiso.
            </p>
            <div className="space-y-8 mb-auto">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl">🎀</div>
                <div>
                  <h4 className="font-bold text-sm text-white">Clase de prueba</h4>
                  <p className="text-white/30 text-xs">Sin costo para alumnas nuevas.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl">📍</div>
                <div>
                  <h4 className="font-bold text-sm text-white">Ubicación</h4>
                  <p className="text-white/30 text-xs">Río Negro 4450, Córdoba.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <div className="p-8 lg:p-16 overflow-y-auto">

            {/* STEPS INDICATOR */}
            {step < 5 && (
              <div className="flex gap-6 mb-12 overflow-x-auto pb-4 border-b border-gray-100">
                {[1, 2, 3, 4].map(n => {
                  const canClick = n < step;
                  return (
                    <button
                      key={`step-${n}`}
                      type="button"
                      disabled={!canClick}
                      onClick={() => canClick && setStep(n)}
                      className={`flex items-center gap-3 shrink-0 bg-transparent border-none p-0 ${canClick ? 'cursor-pointer' : 'cursor-default'} ${step === n ? 'text-[#C97A96]' : canClick ? 'text-[#C97A96]/60 hover:text-[#C97A96]' : 'text-gray-300'} transition-colors`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= n ? 'bg-[#C97A96] text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {step > n ? '✓' : n}
                      </div>
                      <span className="text-[0.7rem] font-black uppercase tracking-widest">
                        {n === 1 ? 'Disciplina' : n === 2 ? 'Horario' : n === 3 ? 'Tus Datos' : 'Confirmar'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="max-w-3xl">

              {/* ── PASO 1: DISCIPLINAS ── */}
              {step === 1 && (
                <div>
                  <h2 className="font-playfair text-3xl font-semibold mb-2">
                    ¿Qué disciplina querés probar?
                  </h2>

                  {/* Banner si hay filtro activo por edad */}
                  {formData.user_age && (
                    <div className="flex items-center justify-between bg-[#FDF0F4] border border-[#E8A0B4]/30 rounded-2xl px-5 py-3 mb-6">
                      <p className="text-[0.8rem] text-[#C97A96] font-medium">
                        🎀 Mostrando clases para <strong>{formData.user_age} años</strong>
                      </p>
                      <button
                        onClick={() => updateForm('user_age', undefined)}
                        className="text-[0.72rem] text-[#8A8A99] underline hover:text-[#C97A96] transition-colors"
                      >
                        Ver todas
                      </button>
                    </div>
                  )}

                  {disciplinasFiltradas.length === 0 ? (
                    <div className="text-center py-20 text-[#8A8A99]">
                      <div className="text-4xl mb-4">💃</div>
                      <p>No hay disciplinas disponibles en este momento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {disciplinasFiltradas.map(d => (
                        <div
                          key={d.id}
                          onClick={() => { updateForm('disciplina', d.nombre); handleNext(); }}
                          className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex gap-5 items-start hover:shadow-md ${
                            formData.disciplina === d.nombre
                              ? 'border-[#C97A96] bg-[#FDF0F4]'
                              : 'border-gray-100 bg-white hover:border-[#F5D0DC]'
                          }`}
                        >
                          <div className="text-4xl">{d.icon}</div>
                          <div>
                            <h4 className="font-bold text-[#1A1A22]">{d.nombre}</h4>
                            <p className="text-[0.75rem] text-[#8A8A99] mt-1">{d.desc}</p>
                            <p className="text-[10px] font-black text-[#C97A96] uppercase mt-4 tracking-widest bg-[#FDF0F4] w-fit px-2 py-0.5 rounded">
                              {d.detalle}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── PASO 2: CALENDARIO ── */}
              {step === 2 && (
                <div>
                  <h2 className="font-playfair text-3xl font-semibold mb-8">Elegí el día y la hora</h2>
                  <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-gray-100 shadow-sm mb-10">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="font-bold capitalize text-xl">
                        {MESES[calendarioInfo.mes]} {calendarioInfo.anio}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMesOffset(p => p - 1)}
                          className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        >‹</button>
                        <button
                          onClick={() => setMesOffset(p => p + 1)}
                          className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        >›</button>
                      </div>
                    </div>

                    {/* Cabecera días */}
                    <div className="grid grid-cols-7 gap-2 text-center mb-6">
                      {DIAS_SEMANA_CORTOS.map((d, i) => (
                        <div key={`day-header-${i}`} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                      ))}
                    </div>

                    {/* Grilla días */}
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: calendarioInfo.primerDia }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: calendarioInfo.diasMes }).map((_, i) => {
                        const d = i + 1;
                        const f = new Date(calendarioInfo.anio, calendarioInfo.mes, d);
                        const esPasado = f < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                        const slotsDelDia = horariosDisponibles[f.getDay()];
                        const slots = slotsDelDia?.some(s => !s.lleno) ? slotsDelDia : undefined;
                        const isSelected = formData.fecha?.toDateString() === f.toDateString();
                        return (
                          <button
                            key={`calendar-day-${d}`}
                            disabled={esPasado || !slots}
                            onClick={() => { updateForm('fecha', f); updateForm('horario', ''); }}
                            className={`py-4 rounded-2xl text-sm font-bold transition-all ${
                              esPasado || !slots
                                ? 'text-gray-200 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-[#C97A96] text-white shadow-xl shadow-[#C97A96]/30'
                                  : 'bg-gray-50 hover:bg-[#FDF0F4] text-[#1A1A22]'
                            }`}
                          >{d}</button>
                        );
                      })}
                    </div>

                    {/* Horarios del día seleccionado */}
                    {formData.fecha && (
                      <div className="mt-10 pt-10 border-t border-gray-50">
                        <p className="text-[0.65rem] font-black text-[#C97A96] uppercase mb-4 tracking-[2px]">
                          Horarios para el {formData.fecha.getDate()} de {MESES[formData.fecha.getMonth()]}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {horariosDisponibles[formData.fecha.getDay()]?.map((slot, idx) => {
                            const lugares = slot.cupo - slot.reservados;
                            return (
                              <button
                                key={`time-${idx}`}
                                onClick={() => !slot.lleno && updateForm('horario', slot.hora)}
                                disabled={slot.lleno}
                                className={`py-3 px-2 rounded-2xl border-2 font-bold text-sm transition-all ${
                                  slot.lleno
                                    ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                    : formData.horario === slot.hora
                                      ? 'border-[#C97A96] bg-[#C97A96] text-white shadow-md'
                                      : 'border-gray-100 hover:border-[#C97A96] text-gray-600'
                                }`}
                              >
                                <span className="block">{slot.hora}</span>
                                <span className={`block text-[0.65rem] font-medium mt-0.5 ${
                                  slot.lleno
                                    ? 'text-red-300'
                                    : formData.horario === slot.hora
                                      ? 'text-white/70'
                                      : lugares <= 3 ? 'text-amber-500' : 'text-[#8A8A99]'
                                }`}>
                                  {slot.lleno ? 'Sin cupo' : `${lugares} ${lugares === 1 ? 'lugar' : 'lugares'}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <button onClick={handleBack} className="text-[#8A8A99] font-bold text-sm hover:text-[#1A1A22] transition-colors">
                      ← Volver
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!formData.horario}
                      className="bg-[#1A1A22] text-white px-12 py-4 rounded-full font-bold shadow-xl disabled:opacity-20 transition-all hover:bg-[#C97A96]"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}

              {/* ── PASO 3: DATOS ── */}
              {step === 3 && (
                <div>
                  <h2 className="font-playfair text-3xl font-semibold mb-2">Datos de la alumna</h2>
                  <p className="text-[#8A8A99] text-sm mb-10 leading-relaxed">
                    Completá los datos de quien va a tomar la clase y un contacto de WhatsApp.
                  </p>

                  {/* Datos de la alumna */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <input
                      value={formData.alumnoNombre}
                      onChange={e => updateForm('alumnoNombre', e.target.value)}
                      placeholder="Nombre de la alumna *"
                      className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all"
                    />
                    <input
                      value={formData.alumnoEdad}
                      onChange={e => updateForm('alumnoEdad', e.target.value)}
                      placeholder="Edad *"
                      type="number"
                      min="2"
                      max="99"
                      className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all"
                    />
                  </div>

                  {/* Datos de contacto (responsable) */}
                  <p className="text-xs font-bold text-[#C97A96] uppercase tracking-widest mb-3">
                    Datos de contacto
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <input
                      value={formData.nombre}
                      onChange={e => updateForm('nombre', e.target.value)}
                      placeholder="Nombre del responsable *"
                      className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all"
                    />
                    <input
                      value={formData.apellido}
                      onChange={e => updateForm('apellido', e.target.value)}
                      placeholder="Apellido"
                      className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all"
                    />
                    <input
                      value={formData.telefono}
                      onChange={e => updateForm('telefono', e.target.value)}
                      placeholder="WhatsApp (Ej: 351...) *"
                      className="p-4 bg-white border border-gray-100 rounded-[1.2rem] outline-none focus:ring-2 focus:ring-[#C97A96]/20 focus:border-[#C97A96] transition-all md:col-span-2"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <button onClick={handleBack} className="text-[#8A8A99] font-bold text-sm hover:text-[#1A1A22] transition-colors">
                      ← Volver
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!formData.nombre || !formData.telefono || !formData.alumnoNombre || !formData.alumnoEdad}
                      className="bg-[#1A1A22] text-white px-12 py-4 rounded-full font-bold shadow-xl disabled:opacity-20 hover:bg-[#C97A96] transition-all"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}

              {/* ── PASO 4: CONFIRMACIÓN ── */}
              {step === 4 && (
                <div>
                  <h2 className="font-playfair text-3xl font-semibold mb-8">Confirmá tu lugar</h2>
                  <div className="bg-white rounded-[2.5rem] p-10 border border-[#E8A0B4]/20 shadow-sm mb-10">
                    <div className="space-y-6">
                      <div className="flex justify-between border-b border-gray-50 pb-5 items-center">
                        <span className="text-[#8A8A99] text-sm">Disciplina</span>
                        <strong className="text-[#C97A96] text-lg font-bold">{formData.disciplina}</strong>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 pb-5 items-center">
                        <span className="text-[#8A8A99] text-sm">Fecha</span>
                        <strong className="capitalize text-[#1A1A22]">
                          {formData.fecha?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </strong>
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
                    <button onClick={handleBack} className="text-[#8A8A99] font-bold text-sm hover:text-[#1A1A22] transition-colors">
                      ← Volver
                    </button>
                    <button
                      onClick={handleConfirmar}
                      disabled={isSubmitting}
                      className="bg-[#C97A96] text-white px-14 py-4 rounded-full font-bold shadow-xl hover:bg-[#1A1A22] transition-all uppercase tracking-widest text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Procesando...' : 'Confirmar Reserva ✦'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PASO 5: ÉXITO ── */}
              {step === 5 && (() => {
                const fechaFormateada = formData.fecha?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) || '';
                const mensajeWA = encodeURIComponent(
                  `¡Hola! 👋 Acabo de reservar una clase de prueba de *${formData.disciplina}* para el *${fechaFormateada}* a las *${formData.horario} hs*.\n\nSoy ${formData.nombre} ${formData.apellido}.${formData.alumnoNombre ? `\nAlumna: ${formData.alumnoNombre}${formData.alumnoEdad ? ` (${formData.alumnoEdad} años)` : ''}` : ''}\n\n¡Gracias! 💗`
                );
                return (
                  <div className="text-center py-20">
                    <div className="w-28 h-28 bg-gradient-to-br from-[#FDF0F4] to-[#E8A0B4] rounded-full flex items-center justify-center text-6xl mx-auto mb-10 shadow-2xl shadow-[#E8A0B4]/40">
                      🎉
                    </div>
                    <h2 className="font-playfair text-5xl font-bold mb-4 text-[#1A1A22]">¡Reserva Exitosa!</h2>
                    <p className="text-[#8A8A99] text-base mb-3 max-w-md mx-auto font-light leading-relaxed">
                      Tu lugar en <strong>R.G Danza</strong> está pre-reservado.
                    </p>
                    <p className="text-[#C97A96] text-sm font-medium mb-10 max-w-md mx-auto">
                      Envianos un mensaje por WhatsApp para confirmar tu reserva y recibir toda la información.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                      {telefonoAcademia && (
                        <a
                          href={`https://wa.me/${telefonoAcademia}?text=${mensajeWA}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-4 rounded-full font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-sm"
                        >
                          💬 Confirmar por WhatsApp
                        </a>
                      )}
                      <Link href="/" className="inline-flex items-center gap-2 bg-[#1A1A22] text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-[#C97A96] transition-all text-sm">
                        Volver al inicio
                      </Link>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#E8A0B4]/20 p-6 max-w-sm mx-auto shadow-sm">
                      <p className="text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-3">Resumen de tu reserva</p>
                      <div className="space-y-2 text-sm text-left">
                        <div className="flex justify-between"><span className="text-[#8A8A99]">Disciplina</span><strong className="text-[#C97A96]">{formData.disciplina}</strong></div>
                        <div className="flex justify-between"><span className="text-[#8A8A99]">Fecha</span><strong className="capitalize">{fechaFormateada}</strong></div>
                        <div className="flex justify-between"><span className="text-[#8A8A99]">Horario</span><strong>{formData.horario} hs</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}