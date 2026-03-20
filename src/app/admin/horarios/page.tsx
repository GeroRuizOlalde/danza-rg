"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// --- Tipos ---
type Clase = { id: string; nombre: string };
type Horario = {
  id: string;
  clase_id: string;
  sala: number;
  dia: string;
  hora: number;
  nivel: string | null;
  clases?: { nombre: string }; // Relación con la tabla clases
};

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const HORAS = [17, 18, 19, 20, 21];

export default function HorariosPage() {
  const [sala, setSala] = useState<1 | 2>(1);
  const [clases, setClases] = useState<Clase[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  // Celda seleccionada para editar
  const [celdaActual, setCeldaActual] = useState<{ dia: string; hora: number; horarioExistente?: Horario } | null>(null);
  
  // Datos del formulario
  const [formData, setFormData] = useState({ clase_id: "", nivel: "" });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setCargando(true);
    try {
      // 1. Traer lista de clases disponibles para el selector
      const { data: dataClases } = await supabase.from("clases").select("id, nombre").order("nombre");
      if (dataClases) setClases(dataClases);

      // 2. Traer todos los horarios cargados, incluyendo el nombre de la clase
      const { data: dataHorarios } = await supabase.from("horarios").select("*, clases(nombre)");
      if (dataHorarios) setHorarios(dataHorarios);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setCargando(false);
    }
  }

  // --- ABRIR EL MODAL AL HACER CLIC EN UNA CELDA ---
  const handleCellClick = (dia: string, hora: number) => {
    // Buscamos si ya hay algo en esta celda
    const horarioExistente = horarios.find((h) => h.dia === dia && h.hora === hora && h.sala === sala);
    
    setCeldaActual({ dia, hora, horarioExistente });
    setFormData({
      clase_id: horarioExistente?.clase_id || "",
      nivel: horarioExistente?.nivel || "",
    });
    setIsModalOpen(true);
  };

  // --- GUARDAR (Crear, Actualizar o Borrar) ---
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!celdaActual) return;
    setGuardando(true);

    try {
      // SI EL USUARIO ELIGE "SIN CLASE (VACÍO)", BORRAMOS EL REGISTRO
      if (formData.clase_id === "") {
        if (celdaActual.horarioExistente) {
          await supabase.from("horarios").delete().eq("id", celdaActual.horarioExistente.id);
        }
      } 
      // SI HAY UNA CLASE SELECCIONADA, ACTUALIZAMOS O CREAMOS
      else {
        const payload = {
          clase_id: formData.clase_id,
          sala: sala,
          dia: celdaActual.dia,
          hora: celdaActual.hora,
          nivel: formData.nivel,
        };

        if (celdaActual.horarioExistente) {
          // Actualizar celda existente
          await supabase.from("horarios").update(payload).eq("id", celdaActual.horarioExistente.id);
        } else {
          // Crear nueva asignación
          await supabase.from("horarios").insert([payload]);
        }
      }

      await fetchData(); // Recargamos para ver los cambios
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando horario:", error);
      alert("Error al guardar el horario.");
    } finally {
      setGuardando(false);
    }
  };

  // Función auxiliar para limpiar la celda rápidamente con un botón
  const handleLimpiarCelda = async () => {
    if (celdaActual?.horarioExistente) {
      setGuardando(true);
      await supabase.from("horarios").delete().eq("id", celdaActual.horarioExistente.id);
      await fetchData();
      setGuardando(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div>
      {/* HEADER */}
      <div className="mb-7">
        <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
          Grilla de <em className="italic text-[#C97A96]">Horarios</em>
        </h1>
        <p className="text-[0.83rem] text-[#8A8A99] mt-1">
          Hacé clic en cualquier espacio de la tabla para asignar una clase.
        </p>
      </div>

      {/* SELECTOR DE SALA */}
      <div className="flex gap-2 mb-6">
        {([1, 2] as const).map((n) => (
          <button
            key={n}
            onClick={() => setSala(n)}
            className={`px-6 py-2 rounded-full text-[0.85rem] font-semibold transition-all ${
              sala === n
                ? "bg-[#C97A96] text-white shadow-md"
                : "bg-white border border-[#E8A0B4]/30 text-[#4A4A55] hover:bg-[#FDF0F4]"
            }`}
          >
            Sala {n}
          </button>
        ))}
      </div>

      {/* GRILLA INTERACTIVA */}
      {cargando ? (
        <div className="flex h-[400px] items-center justify-center text-[#8A8A99]">Cargando grilla...</div>
      ) : (
        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-[#F7F7F9] border-b border-[#E8A0B4]/20">
                <th className="py-4 px-4 font-semibold text-[#1A1A22] text-[0.85rem] w-[80px] text-center">HS</th>
                {DIAS.map((dia) => (
                  <th key={dia} className="py-4 px-3 font-semibold text-[#1A1A22] text-[0.85rem] uppercase tracking-wider text-center w-[18%]">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORAS.map((hora) => (
                <tr key={hora} className="border-b border-[#E8A0B4]/10 last:border-none">
                  <td className="py-3 px-4 font-bold text-[#C97A96] text-[1.1rem] text-center bg-[#FDF0F4]/30 border-r border-[#E8A0B4]/10">
                    {hora}
                  </td>
                  {DIAS.map((dia) => {
                    const celda = horarios.find((h) => h.dia === dia && h.hora === hora && h.sala === sala);
                    
                    return (
                      <td key={`${dia}-${hora}`} className="p-2 border-r border-[#E8A0B4]/10 last:border-none">
                        <div 
                          onClick={() => handleCellClick(dia, hora)}
                          className={`h-full min-h-[85px] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all border-2 ${
                            celda 
                              ? "bg-[#FDF0F4] border-transparent hover:border-[#C97A96]/30" 
                              : "bg-transparent border-dashed border-gray-200 hover:border-[#C97A96]/50 hover:bg-gray-50"
                          }`}
                        >
                          {celda ? (
                            <>
                              <strong className="text-[0.85rem] text-[#1A1A22] font-semibold leading-tight mb-1">
                                {celda.clases?.nombre || "Clase borrada"}
                              </strong>
                              {celda.nivel && (
                                <span className="text-[0.7rem] text-[#C97A96] font-medium leading-tight">
                                  {celda.nivel}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-300 text-[1.2rem] font-light">+</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PARA ASIGNAR CLASE */}
      {isModalOpen && celdaActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <div>
                <h3 className="font-playfair text-xl font-semibold text-[#1A1A22]">
                  Sala {sala}
                </h3>
                <p className="text-[0.8rem] text-[#8A8A99] font-medium uppercase tracking-wide">
                  {celdaActual.dia} a las {celdaActual.hora}:00 hs
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[#C97A96] hover:text-[#EF4444] text-xl">✕</button>
            </div>
            
            <form onSubmit={handleGuardar} className="p-6">
              <div className="mb-4">
                <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Clase a dictar</label>
                <select 
                  value={formData.clase_id} 
                  onChange={(e) => setFormData({ ...formData, clase_id: e.target.value })}
                  className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] bg-white transition-all"
                >
                  <option value="">-- Sin clase (Libre) --</option>
                  {clases.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {formData.clase_id && (
                <div className="mb-6">
                  <label className="block text-[0.8rem] font-medium text-[#4A4A55] mb-1.5">Nivel / Edades (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Baby, Infantil, Adultos..." 
                    value={formData.nivel} 
                    onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                    className="w-full border-[1.5px] border-[#E8A0B4]/30 rounded-xl px-4 py-3 text-[0.9rem] outline-none focus:border-[#C97A96] transition-all" 
                  />
                  <p className="text-[0.65rem] text-[#8A8A99] mt-1">Se mostrará chiquito abajo del nombre de la clase.</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {celdaActual.horarioExistente && (
                  <button 
                    type="button" 
                    onClick={handleLimpiarCelda}
                    className="px-4 py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[0.85rem] font-semibold hover:bg-red-100 transition-colors"
                    title="Vaciar celda"
                  >
                    🗑️
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={guardando}
                  className="flex-1 bg-[#C97A96] text-white py-3 rounded-xl text-[0.9rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}