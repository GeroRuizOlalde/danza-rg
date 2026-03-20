"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Foto = {
  id: string;
  url: string;
  orden: number;
};

export default function GestionGaleriaPage() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchFotos();
  }, []);

  async function fetchFotos() {
    setCargando(true);
    const { data } = await supabase
      .from("galeria")
      .select("*")
      .order("orden", { ascending: true });
    if (data) setFotos(data);
    setCargando(false);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubirFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setSubiendo(true);

    try {
      // 1. Crear un nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 2. Subir el archivo al Storage de Supabase (Bucket 'galeria')
      const { error: uploadError } = await supabase.storage
        .from('galeria')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Obtener la URL pública del archivo subido
      const { data: { publicUrl } } = supabase.storage
        .from('galeria')
        .getPublicUrl(filePath);

      // 4. Guardar la URL en la tabla 'galeria' de la base de datos
      const nuevoOrden = fotos.length > 0 ? Math.max(...fotos.map(f => f.orden)) + 1 : 1;
      const { error: dbError } = await supabase
        .from("galeria")
        .insert([{ url: publicUrl, orden: nuevoOrden }]);

      if (dbError) throw dbError;

      // 5. Limpiar y refrescar
      setFile(null);
      // Limpiar el input file manualmente
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      fetchFotos();
    } catch (error: any) {
      console.error("Error subiendo foto:", error.message);
      alert("Hubo un error al subir la foto.");
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = async (id: string, url: string) => {
    if (!confirm("¿Seguro que querés eliminar esta imagen?")) return;

    try {
      // 1. Extraer el nombre del archivo de la URL
      const fileName = url.split('/').pop();
      
      // 2. Borrar del Storage
      if (fileName) {
        await supabase.storage.from('galeria').remove([fileName]);
      }

      // 3. Borrar de la base de datos
      const { error } = await supabase.from("galeria").delete().eq("id", id);
      if (!error) {
        setFotos(fotos.filter(f => f.id !== id));
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-playfair text-[1.6rem] font-semibold text-[#1A1A22]">
            Gestión de <em className="italic text-[#C97A96]">Galería</em>
          </h1>
          <p className="text-[0.83rem] text-[#8A8A99] mt-1">
            Subí fotos reales de la academia para que todos las vean
          </p>
        </div>
      </div>

      {/* ÁREA DE CARGA */}
      <div className="bg-white border border-[#E8A0B4]/20 rounded-2xl p-8 mb-10 shadow-sm text-center">
        <form onSubmit={handleSubirFoto} className="max-w-md mx-auto">
          <label 
            htmlFor="file-upload" 
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${file ? 'border-[#C97A96] bg-[#FDF0F4]' : 'border-[#E8A0B4]/30 bg-[#F7F7F9] hover:bg-[#FDF0F4]'}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-3xl mb-2">{file ? '📄' : '📤'}</span>
              <p className="mb-2 text-sm text-[#4A4A55]">
                <span className="font-semibold">{file ? file.name : 'Haz clic para subir'}</span>
              </p>
              <p className="text-xs text-[#8A8A99]">PNG, JPG o JPEG (Máx. 5MB)</p>
            </div>
            <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>

          <button 
            type="submit" 
            disabled={subiendo || !file}
            className="mt-6 w-full bg-[#C97A96] text-white px-8 py-3 rounded-full text-[0.85rem] font-semibold hover:bg-[#1A1A22] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C97A96]/20"
          >
            {subiendo ? "Subiendo archivo..." : "Publicar en la Galería"}
          </button>
        </form>
      </div>

      {/* GRILLA DE IMÁGENES */}
      {cargando ? (
        <div className="text-center py-20 text-[#8A8A99]">Cargando fotos...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {fotos.map((foto) => (
            <div key={foto.id} className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-[#E8A0B4]/10 shadow-sm">
              <img 
                src={foto.url} 
                alt="Galería Admin" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={() => handleEliminar(foto.id, foto.url)}
                  className="bg-white text-red-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {fotos.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-[#E8A0B4]/20 rounded-3xl">
              <p className="text-[#8A8A99] text-sm">No hay fotos. ¡Subí la primera!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}