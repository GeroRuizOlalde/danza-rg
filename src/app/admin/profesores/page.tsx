"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Profesor = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  disciplina: string;
  activo: boolean;
};

type Asistencia = {
  id: string;
  profesor_id: string;
  fecha: string;
  presente: boolean;
  nota: string | null;
};

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [fechaHoy] = useState(() => new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState<Profesor | null>(null);
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '', disciplina: '', activo: true });
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState<'lista' | 'asistencia'>('asistencia');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [{ data: profs }, { data: asist }] = await Promise.all([
      supabase.from('profesores').select('*').order('nombre'),
      supabase.from('asistencia_profesores').select('*').eq('fecha', fechaHoy)
    ]);
    if (profs) setProfesores(profs);
    if (asist) setAsistencias(asist);
  }

  const toggleAsistencia = async (profesorId: string) => {
    const existente = asistencias.find(a => a.profesor_id === profesorId);
    if (existente) {
      const nuevoValor = !existente.presente;
      await supabase.from('asistencia_profesores')
        .update({ presente: nuevoValor }).eq('id', existente.id);
      setAsistencias(prev => prev.map(a => a.id === existente.id ? { ...a, presente: nuevoValor } : a));
    } else {
      const { data } = await supabase.from('asistencia_profesores')
        .insert([{ profesor_id: profesorId, fecha: fechaHoy, presente: true }]).select().single();
      if (data) setAsistencias(prev => [...prev, data]);
    }
  };

  const presente = (profesorId: string) => {
    const a = asistencias.find(a => a.profesor_id === profesorId);
    return a?.presente ?? null;
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    if (editando) {
      await supabase.from('profesores').update(form).eq('id', editando.id);
    } else {
      await supabase.from('profesores').insert([form]);
    }
    await fetchData();
    setIsModalOpen(false);
    setEditando(null);
    setForm({ nombre: '', apellido: '', telefono: '', disciplina: '', activo: true });
    setGuardando(false);
  };

  const abrirEditar = (p: Profesor) => {
    setEditando(p);
    setForm({ nombre: p.nombre, apellido: p.apellido, telefono: p.telefono, disciplina: p.disciplina, activo: p.activo });
    setIsModalOpen(true);
  };

  const presentes = asistencias.filter(a => a.presente).length;

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestión de <em className="italic text-[#C97A96]">Profesores</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">
            Hoy: {presentes} de {profesores.filter(p => p.activo).length} presentes
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setForm({ nombre: '', apellido: '', telefono: '', disciplina: '', activo: true }); setIsModalOpen(true); }}
          className="bg-[#C97A96] text-white rounded-full px-5 py-2.5 text-[0.82rem] font-semibold hover:bg-[#1A1A22] transition-all shadow-md"
        >
          + Agregar profesor
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6 border-b border-[#E8A0B4]/20 pb-px">
        {(['asistencia', 'lista'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 px-2 text-[0.85rem] font-semibold transition-all border-b-2 capitalize ${tab === t ? 'border-[#C97A96] text-[#C97A96]' : 'border-transparent text-[#8A8A99]'}`}>
            {t === 'asistencia' ? '📋 Asistencia de hoy' : '👤 Lista de profesores'}
          </button>
        ))}
      </div>

      {/* TAB: ASISTENCIA */}
      {tab === 'asistencia' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profesores.filter(p => p.activo).map(p => {
            const estado = presente(p.id);
            return (
              <div key={p.id} className={`bg-white border-2 rounded-2xl p-5 transition-all ${estado === true ? 'border-[#2DB87A] bg-[#2DB87A]/5' : estado === false ? 'border-red-200 bg-red-50/30' : 'border-[#E8A0B4]/20'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#FDF0F4] text-[#C97A96] flex items-center justify-center font-bold">
                    {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                  </div>
                  <div>
                    <strong className="block text-sm text-[#1A1A22]">{p.nombre} {p.apellido}</strong>
                    <span className="text-xs text-[#8A8A99]">{p.disciplina}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleAsistencia(p.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${estado === true ? 'bg-[#2DB87A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-[#2DB87A]/10'}`}>
                    ✓ Presente
                  </button>
                  <button onClick={async () => {
                    const existente = asistencias.find(a => a.profesor_id === p.id);
                    if (existente) {
                      await supabase.from('asistencia_profesores').update({ presente: false }).eq('id', existente.id);
                      setAsistencias(prev => prev.map(a => a.id === existente.id ? { ...a, presente: false } : a));
                    } else {
                      const { data } = await supabase.from('asistencia_profesores')
                        .insert([{ profesor_id: p.id, fecha: fechaHoy, presente: false }]).select().single();
                      if (data) setAsistencias(prev => [...prev, data]);
                    }
                  }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${estado === false ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-50'}`}>
                    ✕ Ausente
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: LISTA */}
      {tab === 'lista' && (
        <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-[#F7F7F9]">
              <tr>
                {['Profesor', 'Disciplina', 'Teléfono', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left text-[0.7rem] font-semibold tracking-[1px] uppercase text-[#8A8A99] px-4 py-3 border-b border-[#E8A0B4]/20">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profesores.map(p => (
                <tr key={p.id} className="border-b border-[#E8A0B4]/10 last:border-0 hover:bg-[#FDF0F4]/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FDF0F4] text-[#C97A96] flex items-center justify-center text-xs font-bold">
                        {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                      </div>
                      <span className="font-medium text-sm">{p.nombre} {p.apellido}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#4A4A55]">{p.disciplina}</td>
                  <td className="px-4 py-3 text-sm text-[#4A4A55]">{p.telefono}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${p.activo ? 'bg-[#2DB87A]/10 text-[#17a363]' : 'bg-gray-100 text-gray-400'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => abrirEditar(p)} className="text-xs text-[#C97A96] hover:underline font-medium">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A22]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="bg-[#FDF0F4] px-6 py-5 border-b border-[#E8A0B4]/20 flex justify-between items-center">
              <h3 className="font-playfair text-xl font-semibold">{editando ? 'Editar' : 'Nuevo'} Profesor</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#C97A96]">✕</button>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[0.7rem] font-bold text-[#8A8A99] uppercase">Nombre</label>
                  <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="w-full border border-[#E8A0B4]/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C97A96] mt-1" />
                </div>
                <div>
                  <label className="text-[0.7rem] font-bold text-[#8A8A99] uppercase">Apellido</label>
                  <input required value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})}
                    className="w-full border border-[#E8A0B4]/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C97A96] mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[0.7rem] font-bold text-[#8A8A99] uppercase">Disciplina</label>
                <input required value={form.disciplina} onChange={e => setForm({...form, disciplina: e.target.value})}
                  placeholder="Ej: Jazz, Contemporáneo..." className="w-full border border-[#E8A0B4]/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C97A96] mt-1" />
              </div>
              <div>
                <label className="text-[0.7rem] font-bold text-[#8A8A99] uppercase">Teléfono</label>
                <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                  className="w-full border border-[#E8A0B4]/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C97A96] mt-1" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} className="accent-[#C97A96]" />
                <span className="text-sm text-[#4A4A55]">Profesor activo</span>
              </label>
              <button type="submit" disabled={guardando} className="w-full bg-[#C97A96] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1A1A22] transition-all disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}