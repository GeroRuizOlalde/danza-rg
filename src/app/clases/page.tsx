"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

// --- TIPOS ---
type ClaseDB = {
  id: string;
  nombre: string;
  etiqueta: string;
  edades: string;
  descripcion: string;
  imagen_url: string;
  estado: string;
};

type HorarioDB = {
  clase_id: string;
  dia: string;
  hora: number;
};

type ClaseProcesada = ClaseDB & {
  horariosFormateados: string[];
};

const FILTROS = [
  { id: "all", label: "Todas" },
  { id: "Clásico", label: "Clásico" },
  { id: "Jazz", label: "Jazz" },
  { id: "Urbano", label: "Urbano" },
  { id: "Acrobacia", label: "Acrobacia" },
];

export default function ClasesPage() {
  const [clases, setClases] = useState<ClaseProcesada[]>([]);
  const [filtroActivo, setFiltroActivo] = useState("all");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function fetchClasesYHorarios() {
      try {
        // 1. Traemos las clases activas
        const { data: clasesData } = await supabase
          .from("clases")
          .select("*")
          .eq("estado", "activa")
          .order("nombre");

        // 2. Traemos todos los horarios
        const { data: horariosData } = await supabase
          .from("horarios")
          .select("clase_id, dia, hora");

        if (clasesData) {
          // 3. Cruzamos los datos: a cada clase le pegamos sus horarios formateados
          const procesadas = clasesData.map((clase) => {
            const susHorarios = (horariosData || [])
              .filter((h) => h.clase_id === clase.id)
              .map((h) => `${h.dia} ${h.hora}:00`);

            return {
              ...clase,
              horariosFormateados: susHorarios,
            };
          });
          setClases(procesadas);
        }
      } catch (error) {
        console.error("Error cargando clases:", error);
      } finally {
        setCargando(false);
      }
    }

    fetchClasesYHorarios();
  }, []);

  // Lógica de filtrado por "etiqueta"
  const clasesFiltradas = useMemo(() => {
    return clases.filter(
      (clase) => filtroActivo === "all" || clase.etiqueta === filtroActivo
    );
  }, [clases, filtroActivo]);

  return (
    <div className="min-h-screen bg-white font-dm-sans text-[#1A1A22]">
      <Navbar />

      {/* HEADER PAGE */}
      <div className="relative pt-[140px] px-[8%] pb-[80px] bg-gradient-to-br from-[#FDF0F4] to-[#F7F7F9] overflow-hidden">
        <div className="absolute -top-[100px] -right-[100px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(232,160,180,0.2)_0%,transparent_70%)] pointer-events-none"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-[0.75rem] font-medium tracking-[2px] uppercase text-[#C97A96] mb-3">Disciplinas</div>
          <h1 className="font-playfair text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.1] text-[#1A1A22] mb-4">
            Todas nuestras<br/><em className="italic text-[#C97A96]">clases</em>
          </h1>
          <p className="text-[1.05rem] text-[#8A8A99] max-w-[500px] leading-[1.7] font-light">
            Explorá cada disciplina y encontrá la que más se adapta a tu edad, nivel y pasión. Siempre hay un lugar para vos.
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="py-10 px-[8%] bg-white border-b border-[#E8A0B4]/15">
        <div className="max-w-7xl mx-auto flex gap-3 flex-wrap">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.id}
              onClick={() => setFiltroActivo(filtro.id)}
              className={`px-5 py-2 rounded-full border-[1.5px] text-[0.85rem] font-medium font-dm-sans transition-all duration-200 ${
                filtroActivo === filtro.id
                  ? "bg-[#C97A96] text-white border-[#C97A96]"
                  : "bg-transparent border-[#E8A0B4]/30 text-[#4A4A55] hover:border-[#C97A96] hover:text-[#C97A96]"
              }`}
            >
              {filtro.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE CLASES DINÁMICA */}
      <section className="py-16 px-[8%] max-w-7xl mx-auto min-h-[50vh]">
        <div className="flex flex-col gap-10">
          {cargando ? (
            <div className="text-center py-20 text-[#8A8A99]">Cargando disciplinas...</div>
          ) : clasesFiltradas.length > 0 ? (
            clasesFiltradas.map((clase, index) => {
              const isReverse = index % 2 !== 0;

              return (
                <div 
                  key={clase.id} 
                  className={`grid grid-cols-1 md:grid-cols-[380px_1fr] bg-white rounded-3xl overflow-hidden border border-[#E8A0B4]/20 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(201,122,150,0.15)] transition-all duration-300 ${
                    isReverse ? 'md:grid-cols-[1fr_380px]' : ''
                  }`}
                >
                  {/* Imagen */}
                  <div className={`relative min-h-[240px] md:min-h-[320px] overflow-hidden group ${isReverse ? 'md:order-2' : ''}`}>
                    <img 
                      src={clase.imagen_url || "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80"} 
                      alt={clase.nombre} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Contenido */}
                  <div className={`p-8 md:p-10 flex flex-col justify-center ${isReverse ? 'md:order-1' : ''}`}>
                    <span className="inline-block bg-[#F5D0DC] text-[#C97A96] text-[0.72rem] font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 rounded-full mb-4 w-fit">
                      {clase.etiqueta}
                    </span>
                    
                    <h2 className="font-playfair text-[1.9rem] font-bold text-[#1A1A22] mb-3 leading-tight">
                      {clase.nombre}
                    </h2>
                    
                    <p className="text-[0.92rem] text-[#8A8A99] leading-[1.7] mb-6 font-light">
                      {clase.descripcion}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
                      <div className="flex items-center gap-2 text-[0.82rem] text-[#4A4A55]">
                        <span className="text-base">🎀</span> Edad/Nivel: <strong className="text-[#1A1A22]">{clase.edades}</strong>
                      </div>
                      <div className="flex items-center gap-2 text-[0.82rem] text-[#4A4A55]">
                        <span className="text-base">⏱️</span> Duración: <strong className="text-[#1A1A22]">60 — 90 min</strong>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-[0.75rem] font-semibold tracking-[1px] uppercase text-[#C97A96] mb-2.5">
                        Horarios disponibles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {clase.horariosFormateados.length > 0 ? (
                          clase.horariosFormateados.map(horario => (
                            <span key={horario} className="inline-block bg-[#F7F7F9] text-[#4A4A55] text-[0.78rem] px-3 py-1.5 rounded-lg font-medium">
                              {horario}
                            </span>
                          ))
                        ) : (
                          <span className="text-[0.75rem] text-[#8A8A99]">Próximamente...</span>
                        )}
                      </div>
                    </div>

                    <Link 
                      href="/turnero" 
                      className="inline-flex items-center gap-2 bg-[#C97A96] text-white px-6 py-3 rounded-full text-[0.88rem] font-medium w-fit transition-all duration-250 shadow-[0_4px_16px_rgba(201,122,150,0.3)] hover:bg-[#1A1A22] hover:-translate-y-[1px]"
                    >
                      Reservar clase de prueba <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 text-[#8A8A99]">
              No hay clases disponibles para esta categoría actualmente.
            </div>
          )}
        </div>
      </section>

      {/* CTA FINAL */}
      <div className="bg-[#1A1A22] py-20 px-[8%] text-center">
        <div className="text-[#E8A0B4] text-[0.75rem] font-medium tracking-[2px] uppercase mb-4">
          ¿No sabés cuál elegir?
        </div>
        <h2 className="font-playfair text-[clamp(2rem,4vw,3rem)] text-white mb-4">
          Te ayudamos a<br/>encontrar tu <em className="italic text-[#E8A0B4]">clase ideal</em>
        </h2>
        <p className="text-white/50 text-base font-light mb-10 max-w-[480px] mx-auto">
          Reservá una clase de prueba gratuita y nuestras profesoras te van a orientar según tu edad, nivel y objetivos.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/turnero" 
            className="inline-flex items-center justify-center gap-2 bg-white text-[#1A1A22] px-8 py-3.5 rounded-full font-medium text-[0.9rem] transition-all hover:bg-[#F5D0DC] hover:-translate-y-0.5"
          >
            ✦ Reservar clase de prueba
          </Link>
          <Link 
            href="https://wa.me/543516793151" 
            target="_blank"
            className="inline-flex items-center justify-center gap-2 border-[1.5px] border-white/20 text-white/70 px-8 py-3.5 rounded-full font-medium text-[0.9rem] transition-all hover:border-[#E8A0B4] hover:text-[#E8A0B4] hover:-translate-y-0.5"
          >
            💬 Consultanos por WhatsApp
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}