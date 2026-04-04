"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { crearReservaTurneroAction } from "@/app/actions/reservas";
import Navbar from "@/components/Navbar";
import {
  buildReservationKey,
  DISCIPLINA_ASESORAMIENTO,
  ESTADOS_RESERVA_ACTIVA,
  formatDateForDb,
  formatHoraReserva,
  HORARIO_A_COORDINAR,
} from "@/lib/reservas";
import { filtrarHorariosPorDiasAbiertos, sanitizeDiasAbiertos } from "@/lib/academia";
import { supabase } from "@/lib/supabase";

type ClaseDB = { id: string; nombre: string; edades: string | null; estado: string | null };
type HorarioDB = { id: string; clase_id: string; sala: number; dia: string; hora: number; cupo_maximo: number | null };
type ReservaActiva = { disciplina: string; horario: string; fecha: string | null };
type SlotHorario = { hora: string; cupo: number; reservados: number; lleno: boolean };
type FormState = {
  disciplina: string;
  fecha: Date | null;
  horario: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  alumnoNombre: string;
  alumnoEdad: string;
  userAge?: number;
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["D","L","M","X","J","V","S"];
const REGISTRO_PREFILL_KEY = "turnero-registro-prefill";
const DIA_A_NUMERO: Record<string, number> = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
};

const RANGOS: Record<string, ("baby" | "kids" | "adult" | "all")[]> = {
  "reggaetón baby": ["baby"],
  "reggaeton baby": ["baby"],
  "reggaetón kids": ["kids"],
  "reggaeton kids": ["kids"],
  "reggaetón femme": ["adult"],
  "reggaeton femme": ["adult"],
  "jazz infantil inicial": ["baby", "kids"],
  "jazz infantil avanzado": ["kids"],
  "jazz infantil": ["baby", "kids"],
  "iniciación a la danza": ["baby"],
  "iniciacion a la danza": ["baby"],
  "danzas clásicas": ["kids", "adult"],
  "danzas clasicas": ["kids", "adult"],
  "street dance": ["kids"],
  urbano: ["adult"],
  contemporáneo: ["adult"],
  contemporaneo: ["adult"],
  "acro tela": ["kids", "adult"],
  acrotela: ["kids", "adult"],
  "ritmos latinos kids": ["kids"],
  "ritmos latinos": ["adult"],
  zumba: ["kids"],
  "dinámicos aéreos": ["kids", "adult"],
  "dinamicos aereos": ["kids", "adult"],
  "entrenamiento para bailarines": ["kids", "adult"],
  "entrenamiento bailarines": ["kids", "adult"],
  "flexibilidad y acrobacias": ["kids", "adult"],
};

function calcularEdad(fechaNac: string) {
  const hoy = new Date();
  const cumple = new Date(fechaNac);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) edad--;
  return edad;
}

function claseAplicaParaEdad(nombreClase: string, edad: number) {
  const key = nombreClase.toLowerCase().trim();
  const match = Object.keys(RANGOS).filter((value) => key.includes(value)).sort((a, b) => b.length - a.length)[0];
  if (!match) return true;
  const rangos = RANGOS[match];
  if (rangos.includes("all")) return true;
  if (edad >= 3 && edad <= 6 && rangos.includes("baby")) return true;
  if (edad >= 7 && edad <= 12 && rangos.includes("kids")) return true;
  if (edad >= 13 && rangos.includes("adult")) return true;
  return false;
}

function iconoClase(nombre: string) {
  const normalizado = nombre.toLowerCase();
  if (normalizado.includes("reggaet")) return "🎵";
  if (normalizado.includes("jazz")) return "💃";
  if (normalizado.includes("contempo")) return "🌊";
  if (normalizado.includes("tela") || normalizado.includes("aéreo") || normalizado.includes("aereo")) return "🎪";
  if (normalizado.includes("ritmo") || normalizado.includes("zumba")) return "🥁";
  if (normalizado.includes("street") || normalizado.includes("urban")) return "🕺";
  if (normalizado.includes("clásica") || normalizado.includes("clasica") || normalizado.includes("ballet")) return "🩰";
  if (normalizado.includes("iniciación") || normalizado.includes("iniciacion")) return "⭐";
  if (normalizado.includes("entrenamiento") || normalizado.includes("flexibilidad")) return "💪";
  return "✨";
}

export default function TurneroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [mesOffset, setMesOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clases, setClases] = useState<ClaseDB[]>([]);
  const [horarios, setHorarios] = useState<HorarioDB[]>([]);
  const [telefonoAcademia, setTelefonoAcademia] = useState("");
  const [reservasPorHorario, setReservasPorHorario] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<FormState>({
    disciplina: "",
    fecha: null,
    horario: "",
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    alumnoNombre: "",
    alumnoEdad: "",
  });

  const updateForm = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    async function init() {
      try {
        const [{ data: auth }, resClases, resHorarios, resInfo, resReservas] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("clases").select("*"),
          supabase.from("horarios").select("*"),
          supabase.from("academia_info").select("*").single(),
          supabase.from("reservas").select("disciplina, horario, fecha").in("estado", [...ESTADOS_RESERVA_ACTIVA]),
        ]);

        if (auth.user) {
          setIsAuthenticated(true);
          const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", auth.user.id).maybeSingle();
          if (perfil) {
            setFormData((prev) => ({
              ...prev,
              nombre: perfil.nombre || "",
              apellido: perfil.apellido || "",
              telefono: perfil.telefono || "",
              email: auth.user.email || "",
              userAge: perfil.fecha_nacimiento ? calcularEdad(perfil.fecha_nacimiento) : undefined,
            }));
          }
        }

        const clasesActivas = resClases.data?.filter((clase: ClaseDB) => clase.estado === "activa" || !clase.estado) || [];
        const diasAbiertos = sanitizeDiasAbiertos(resInfo.data?.dias_abiertos);
        setClases(clasesActivas);
        setHorarios(filtrarHorariosPorDiasAbiertos(resHorarios.data || [], diasAbiertos));
        if (resInfo.data?.telefono) setTelefonoAcademia(resInfo.data.telefono.replace(/\D/g, ""));

        if (resReservas.data) {
          const conteo: Record<string, number> = {};
          resReservas.data.forEach((reserva: ReservaActiva) => {
            if (!reserva.fecha) return;
            const key = buildReservationKey({ disciplina: reserva.disciplina, fecha: reserva.fecha, horario: reserva.horario });
            conteo[key] = (conteo[key] || 0) + 1;
          });
          setReservasPorHorario(conteo);
        }

        const claseParam = searchParams.get("clase");
        if (claseParam) {
          const match = clasesActivas.find((clase: ClaseDB) => clase.nombre.toLowerCase() === claseParam.toLowerCase());
          if (match) {
            setFormData((prev) => ({ ...prev, disciplina: match.nombre }));
            setStep(2);
          }
        }
      } catch (error) {
        console.error("Error init turnero:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [searchParams]);

  const esAsesoramiento = formData.disciplina === DISCIPLINA_ASESORAMIENTO;
  const hoy = new Date();
  const fechaBase = useMemo(() => {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth() + mesOffset, 1);
  }, [mesOffset]);
  const calendarioInfo = useMemo(() => ({
    mes: fechaBase.getMonth(),
    anio: fechaBase.getFullYear(),
    primerDia: new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1).getDay(),
    diasMes: new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0).getDate(),
  }), [fechaBase]);

  const horariosBasePorDia = useMemo(() => {
    const mapa: Record<number, { hora: string; cupo: number }[]> = {};
    if (!formData.disciplina || esAsesoramiento) return mapa;
    const clase = clases.find((item) => item.nombre === formData.disciplina);
    horarios.filter((horario) => horario.clase_id === clase?.id).forEach((horario) => {
      const dia = DIA_A_NUMERO[horario.dia];
      if (dia === undefined) return;
      if (!mapa[dia]) mapa[dia] = [];
      const hora = formatHoraReserva(horario.hora);
      if (mapa[dia].some((slot) => slot.hora === hora)) return;
      mapa[dia].push({ hora, cupo: horario.cupo_maximo || 20 });
    });
    return mapa;
  }, [clases, esAsesoramiento, formData.disciplina, horarios]);

  const disciplinas = useMemo(() => {
    const base = clases.map((clase) => {
      const horariosClase = horarios.filter((horario) => horario.clase_id === clase.id);
      const salas = Array.from(new Set(horariosClase.map((horario) => horario.sala))).join(" y ");
      const diasClase = Array.from(new Set(horariosClase.map((horario) => horario.dia.substring(0, 3)))).join(", ");
      return {
        id: clase.id,
        nombre: clase.nombre,
        desc: clase.edades || "Todas las edades",
        detalle: horariosClase.length ? `Sala ${salas} · ${diasClase}` : "Horarios a confirmar",
        icon: iconoClase(clase.nombre),
      };
    });
    const filtradas = formData.userAge ? base.filter((disciplina) => claseAplicaParaEdad(disciplina.nombre, formData.userAge!)) : base;
    return [...filtradas, { id: "asesoramiento", nombre: DISCIPLINA_ASESORAMIENTO, desc: "Te orientamos según tu nivel y edad", detalle: "Coordinación personalizada", icon: "💬" }];
  }, [clases, formData.userAge, horarios]);

  const getSlotsForDate = (fecha: Date): SlotHorario[] => {
    if (esAsesoramiento) return [];
    const fechaISO = formatDateForDb(fecha);
    return (horariosBasePorDia[fecha.getDay()] || []).map((slot) => {
      const key = buildReservationKey({ disciplina: formData.disciplina, fecha: fechaISO, horario: slot.hora });
      const reservados = reservasPorHorario[key] || 0;
      return { ...slot, reservados, lleno: reservados >= slot.cupo };
    });
  };

  const seleccionarDisciplina = (disciplina: string) => {
    setFormData((prev) => ({
      ...prev,
      disciplina,
      fecha: null,
      horario: disciplina === DISCIPLINA_ASESORAMIENTO ? HORARIO_A_COORDINAR : "",
    }));
    setStep(disciplina === DISCIPLINA_ASESORAMIENTO ? 3 : 2);
  };

  const confirmarReserva = async () => {
    setIsSubmitting(true);
    try {
      const result = await crearReservaTurneroAction({
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        email: formData.email,
        disciplina: formData.disciplina,
        fecha: formData.fecha ? formatDateForDb(formData.fecha) : null,
        horario: esAsesoramiento ? HORARIO_A_COORDINAR : formData.horario,
        alumnoNombre: formData.alumnoNombre,
        alumnoEdad: formData.alumnoEdad ? Number.parseInt(formData.alumnoEdad, 10) : formData.userAge || null,
      });
      if (!result.success) throw new Error(result.error || "No pudimos guardar la reserva.");
      setStep(5);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar la reserva.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fechaFormateada = formData.fecha?.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }) || "";

  const mensajeWA = encodeURIComponent(
    esAsesoramiento
      ? `¡Hola! 👋 Quiero coordinar una clase de prueba y necesito orientación.\n\nSoy ${formData.nombre} ${formData.apellido}.${formData.alumnoNombre ? `\nAlumna: ${formData.alumnoNombre}${formData.alumnoEdad ? ` (${formData.alumnoEdad} años)` : ""}` : ""}\n\n¡Gracias!`
      : `¡Hola! 👋 Acabo de reservar una clase de prueba de ${formData.disciplina} para el ${fechaFormateada} a las ${formData.horario} hs.\n\nSoy ${formData.nombre} ${formData.apellido}.${formData.alumnoNombre ? `\nAlumna: ${formData.alumnoNombre}${formData.alumnoEdad ? ` (${formData.alumnoEdad} años)` : ""}` : ""}\n\n¡Gracias!`
  );

  const handleCrearCuenta = () => {
    window.sessionStorage.setItem(
      REGISTRO_PREFILL_KEY,
      JSON.stringify({
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        email: formData.email,
      })
    );
    router.push("/registro");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#8A8A99]">Cargando el turnero...</div>;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-[#F7F7F9] font-dm-sans text-[#1A1A22]">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] min-h-[calc(100vh-80px)]">
          <aside className="bg-[#1A1A22] p-10 text-white flex flex-col">
            <div className="bg-[#E8A0B4]/20 text-[#E8A0B4] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit mb-6">Turnero online</div>
            <h1 className="font-playfair text-4xl font-bold mb-6 leading-tight">Reservá tu clase <em className="text-[#E8A0B4] not-italic">de prueba</em></h1>
            <p className="text-white/45 text-sm leading-relaxed mb-10">Elegí disciplina, horario y dejá tus datos. Si no sabés qué opción te conviene, te orientamos.</p>
            <div className="space-y-6 mt-auto text-sm text-white/70">
              <div className="flex gap-3"><span>🎀</span><span>Primera clase sin costo para alumnas nuevas.</span></div>
              <div className="flex gap-3"><span>📍</span><span>Río Negro 4450, Córdoba.</span></div>
            </div>
          </aside>

          <main className="p-8 lg:p-14 overflow-y-auto">
            {step < 5 && (
              <div className="flex gap-5 mb-10 overflow-x-auto pb-4 border-b border-gray-100">
                {[1, 2, 3, 4].map((currentStep) => {
                  const canClick = currentStep < step;
                  return (
                    <button
                      key={currentStep}
                      type="button"
                      disabled={!canClick}
                      onClick={() => canClick && setStep(currentStep)}
                      className={`flex items-center gap-3 shrink-0 ${canClick ? "cursor-pointer" : "cursor-default"} ${step === currentStep ? "text-[#C97A96]" : canClick ? "text-[#C97A96]/70" : "text-gray-300"}`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= currentStep ? "bg-[#C97A96] text-white" : "bg-gray-100 text-gray-400"}`}>{step > currentStep ? "✓" : currentStep}</span>
                      <span className="text-[0.7rem] font-black uppercase tracking-widest">{currentStep === 1 ? "Disciplina" : currentStep === 2 ? "Horario" : currentStep === 3 ? "Tus datos" : "Confirmar"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 1 && (
              <section>
                <h2 className="font-playfair text-3xl font-semibold mb-2">¿Qué disciplina querés probar?</h2>
                {formData.userAge && (
                  <div className="flex items-center justify-between bg-[#FDF0F4] border border-[#E8A0B4]/30 rounded-2xl px-5 py-3 mb-6">
                    <p className="text-sm text-[#C97A96]">Mostrando clases para <strong>{formData.userAge} años</strong></p>
                    <button type="button" onClick={() => updateForm("userAge", undefined)} className="text-xs text-[#8A8A99] underline">Ver todas</button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {disciplinas.map((disciplina) => (
                    <button
                      key={disciplina.id}
                      type="button"
                      onClick={() => seleccionarDisciplina(disciplina.nombre)}
                      className={`p-6 rounded-[2rem] border-2 transition-all text-left flex gap-4 items-start ${formData.disciplina === disciplina.nombre ? "border-[#C97A96] bg-[#FDF0F4]" : "border-gray-100 bg-white hover:border-[#F5D0DC]"}`}
                    >
                      <span className="text-4xl">{disciplina.icon}</span>
                      <span>
                        <strong className="block">{disciplina.nombre}</strong>
                        <span className="block text-xs text-[#8A8A99] mt-1">{disciplina.desc}</span>
                        <span className="inline-block text-[10px] font-black text-[#C97A96] uppercase mt-4 tracking-widest bg-[#FDF0F4] px-2 py-0.5 rounded">{disciplina.detalle}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <h2 className="font-playfair text-3xl font-semibold mb-8">Elegí el día y la hora</h2>
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mb-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-bold text-xl">{MESES[calendarioInfo.mes]} {calendarioInfo.anio}</h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setMesOffset((prev) => prev - 1)} className="w-10 h-10 rounded-full border border-gray-200">‹</button>
                      <button type="button" onClick={() => setMesOffset((prev) => prev + 1)} className="w-10 h-10 rounded-full border border-gray-200">›</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center mb-4">
                    {DIAS.map((dia) => <div key={dia} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{dia}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: calendarioInfo.primerDia }).map((_, index) => <div key={`empty-${index}`} />)}
                    {Array.from({ length: calendarioInfo.diasMes }).map((_, index) => {
                      const dia = index + 1;
                      const fecha = new Date(calendarioInfo.anio, calendarioInfo.mes, dia);
                      const esPasado = fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                      const slots = getSlotsForDate(fecha);
                      const habilitado = slots.some((slot) => !slot.lleno);
                      const selected = formData.fecha?.toDateString() === fecha.toDateString();
                      return (
                        <button
                          key={dia}
                          type="button"
                          disabled={esPasado || !habilitado}
                          onClick={() => { updateForm("fecha", fecha); updateForm("horario", ""); }}
                          className={`py-4 rounded-2xl text-sm font-bold ${esPasado || !habilitado ? "text-gray-200 cursor-not-allowed" : selected ? "bg-[#C97A96] text-white" : "bg-gray-50 hover:bg-[#FDF0F4]"}`}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                  {formData.fecha && (
                    <div className="mt-10 pt-8 border-t border-gray-50">
                      <p className="text-[0.65rem] font-black text-[#C97A96] uppercase mb-4 tracking-[2px]">Horarios para el {formData.fecha.getDate()} de {MESES[formData.fecha.getMonth()]}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {getSlotsForDate(formData.fecha).map((slot) => {
                          const lugares = slot.cupo - slot.reservados;
                          return (
                            <button
                              key={slot.hora}
                              type="button"
                              disabled={slot.lleno}
                              onClick={() => !slot.lleno && updateForm("horario", slot.hora)}
                              className={`py-3 px-2 rounded-2xl border-2 font-bold text-sm ${slot.lleno ? "border-gray-100 bg-gray-50 text-gray-300" : formData.horario === slot.hora ? "border-[#C97A96] bg-[#C97A96] text-white" : "border-gray-100 hover:border-[#C97A96] text-gray-600"}`}
                            >
                              <span className="block">{slot.hora}</span>
                              <span className="block text-[0.65rem] mt-1">{slot.lleno ? "Sin cupo" : `${lugares} ${lugares === 1 ? "lugar" : "lugares"}`}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setStep(1)} className="text-[#8A8A99] font-bold text-sm">← Volver</button>
                  <button type="button" onClick={() => setStep(3)} disabled={!formData.horario} className="bg-[#1A1A22] text-white px-12 py-4 rounded-full font-bold disabled:opacity-20">Siguiente →</button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section>
                <h2 className="font-playfair text-3xl font-semibold mb-2">Datos de la alumna</h2>
                <p className="text-[#8A8A99] text-sm mb-8">Completá los datos de quien va a tomar la clase y un contacto de WhatsApp.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <input value={formData.alumnoNombre} onChange={(e) => updateForm("alumnoNombre", e.target.value)} placeholder="Nombre de la alumna *" className="p-4 bg-white border border-gray-100 rounded-[1.2rem]" />
                  <input value={formData.alumnoEdad} onChange={(e) => updateForm("alumnoEdad", e.target.value)} placeholder="Edad *" type="number" min="2" max="99" className="p-4 bg-white border border-gray-100 rounded-[1.2rem]" />
                  <input value={formData.nombre} onChange={(e) => updateForm("nombre", e.target.value)} placeholder="Nombre del responsable *" className="p-4 bg-white border border-gray-100 rounded-[1.2rem]" />
                  <input value={formData.apellido} onChange={(e) => updateForm("apellido", e.target.value)} placeholder="Apellido" className="p-4 bg-white border border-gray-100 rounded-[1.2rem]" />
                  <input value={formData.telefono} onChange={(e) => updateForm("telefono", e.target.value)} placeholder="WhatsApp (Ej: 351...) *" className="p-4 bg-white border border-gray-100 rounded-[1.2rem] md:col-span-2" />
                </div>
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setStep(esAsesoramiento ? 1 : 2)} className="text-[#8A8A99] font-bold text-sm">← Volver</button>
                  <button type="button" onClick={() => setStep(4)} disabled={!formData.nombre || !formData.telefono || !formData.alumnoNombre || !formData.alumnoEdad} className="bg-[#1A1A22] text-white px-12 py-4 rounded-full font-bold disabled:opacity-20">Siguiente →</button>
                </div>
              </section>
            )}

            {step === 4 && (
              <section>
                <h2 className="font-playfair text-3xl font-semibold mb-8">Confirmá tu lugar</h2>
                <div className="bg-white rounded-[2.5rem] p-10 border border-[#E8A0B4]/20 shadow-sm mb-8 space-y-5">
                  <div className="flex justify-between border-b border-gray-50 pb-4"><span className="text-[#8A8A99]">Disciplina</span><strong className="text-[#C97A96]">{formData.disciplina}</strong></div>
                  {!esAsesoramiento && <div className="flex justify-between border-b border-gray-50 pb-4"><span className="text-[#8A8A99]">Fecha</span><strong className="capitalize">{fechaFormateada}</strong></div>}
                  {!esAsesoramiento && <div className="flex justify-between border-b border-gray-50 pb-4"><span className="text-[#8A8A99]">Horario</span><strong>{formData.horario} hs</strong></div>}
                  {esAsesoramiento && <div className="flex justify-between border-b border-gray-50 pb-4"><span className="text-[#8A8A99]">Coordinación</span><strong>Te orientamos por WhatsApp</strong></div>}
                  <div className="flex justify-between border-b border-gray-50 pb-4"><span className="text-[#8A8A99]">Alumna</span><strong>{formData.alumnoNombre}{formData.alumnoEdad ? ` (${formData.alumnoEdad} años)` : ""}</strong></div>
                  <div className="flex justify-between"><span className="text-[#8A8A99]">Contacto</span><strong>{formData.nombre} {formData.apellido}</strong></div>
                </div>
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setStep(3)} className="text-[#8A8A99] font-bold text-sm">← Volver</button>
                  <button type="button" onClick={confirmarReserva} disabled={isSubmitting} className="bg-[#C97A96] text-white px-14 py-4 rounded-full font-bold disabled:opacity-50">{isSubmitting ? "Procesando..." : "Confirmar reserva"}</button>
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-[#FDF0F4] to-[#E8A0B4] rounded-full flex items-center justify-center text-5xl mx-auto mb-8">🎉</div>
                <h2 className="font-playfair text-5xl font-bold mb-4">¡Reserva exitosa!</h2>
                <p className="text-[#8A8A99] max-w-md mx-auto mb-8">Tu solicitud ya quedó registrada. Escribinos por WhatsApp para confirmar y recibir toda la información.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                  {telefonoAcademia && <a href={`https://wa.me/${telefonoAcademia}?text=${mensajeWA}`} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white px-8 py-4 rounded-full font-bold">Confirmar por WhatsApp</a>}
                  <Link href="/" className="bg-[#1A1A22] text-white px-8 py-4 rounded-full font-bold">Volver al inicio</Link>
                  {isAuthenticated && <Link href="/perfil" className="bg-white text-[#1A1A22] px-8 py-4 rounded-full font-bold border border-gray-200">Ir a mi perfil</Link>}
                </div>
                <div className="bg-white rounded-2xl border border-[#E8A0B4]/20 p-6 max-w-sm mx-auto shadow-sm text-left">
                  <p className="text-[0.7rem] font-bold uppercase tracking-widest text-[#8A8A99] mb-3">Resumen</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#8A8A99]">Disciplina</span><strong className="text-[#C97A96]">{formData.disciplina}</strong></div>
                    {!esAsesoramiento && <div className="flex justify-between"><span className="text-[#8A8A99]">Fecha</span><strong className="capitalize">{fechaFormateada}</strong></div>}
                    {!esAsesoramiento && <div className="flex justify-between"><span className="text-[#8A8A99]">Horario</span><strong>{formData.horario} hs</strong></div>}
                    {esAsesoramiento && <div className="flex justify-between"><span className="text-[#8A8A99]">Seguimiento</span><strong>Coordinación por WhatsApp</strong></div>}
                  </div>
                </div>
                {!isAuthenticated && (
                  <div className="max-w-xl mx-auto mt-8 bg-white rounded-[2rem] border border-[#E8A0B4]/20 p-6 md:p-8 shadow-sm text-left">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[2px] text-[#C97A96] mb-3">
                      Optimizá tu próxima reserva
                    </p>
                    <h3 className="font-playfair text-2xl font-semibold text-[#1A1A22] mb-3">
                      Creá tu cuenta y vinculá este turno
                    </h3>
                    <p className="text-sm text-[#8A8A99] leading-relaxed mb-5">
                      Así la próxima vez completás tus datos más rápido y este turno queda guardado en tu perfil para seguir todo desde un solo lugar.
                    </p>
                    <button
                      type="button"
                      onClick={handleCrearCuenta}
                      className="bg-[#C97A96] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#1A1A22] transition-colors"
                    >
                      Crear cuenta y vincular mi turno
                    </button>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
