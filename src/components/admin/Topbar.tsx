"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Estados para controlar los menús y el buscador
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Estados para los datos del usuario real
  const [adminName, setAdminName] = useState("Administrador");
  const [adminEmail, setAdminEmail] = useState("");

  // Referencias para poder cerrar los menús si haces clic afuera
  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Mapeamos la URL a un título bonito
  const titleMap: Record<string, string> = {
    "/admin/dashboard": "Dashboard",
    "/admin/turnos": "Gestión de Turnos",
    "/admin/clientes": "Alumnas",
    "/admin/horarios": "Horarios",
    "/admin/clases": "Clases",
    "/admin/configuracion": "Configuración" // Agregué el título para esta nueva página
  };

  const title = titleMap[pathname] || "Panel";

  // Efecto para buscar los datos del usuario
  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminEmail(user.email || "");
        if (user.user_metadata?.display_name) {
          setAdminName(user.user_metadata.display_name);
        } else {
          const nombreEmail = user.email?.split('@')[0] || "Admin";
          setAdminName(nombreEmail.charAt(0).toUpperCase() + nombreEmail.slice(1));
        }
      }
    }
    fetchUserData();

    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotif(false);
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setShowSettings(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Función del buscador
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== "") {
      router.push(`/admin/clientes?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery(""); 
    }
  };

  // Función REAL para cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <div className="sticky top-0 z-40 bg-[#F7F7F9]/90 backdrop-blur-md border-b border-[#E8A0B4]/20 px-8 h-[60px] flex items-center gap-4">
      <div className="font-semibold text-[#1A1A22] flex-1">{title}</div>
      
      {/* BUSCADOR */}
      <div className="flex items-center gap-2 bg-white border border-[#E8A0B4]/20 rounded-full px-4 py-2 w-[220px] focus-within:border-[#C97A96] focus-within:shadow-[0_0_0_3px_rgba(201,122,150,0.1)] transition-all">
        <span className="text-[13px] text-[#8A8A99]">🔍</span>
        <input 
          type="text" 
          placeholder="Buscar alumnas..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          className="border-none outline-none bg-transparent font-dm-sans text-[0.82rem] text-[#1A1A22] w-full placeholder-[#8A8A99]"
        />
      </div>

      <div className="flex items-center gap-3 relative">
        
        {/* CAMPANA DE NOTIFICACIONES */}
        <div ref={notifRef} className="relative">
          <button 
            onClick={() => { setShowNotif(!showNotif); setShowSettings(false); }}
            className={`relative w-[34px] h-[34px] rounded-full border flex items-center justify-center text-[14px] transition-colors ${showNotif ? 'bg-[#FDF0F4] border-[#C97A96]' : 'bg-white border-[#E8A0B4]/20 hover:border-[#C97A96]'}`}
          >
            🔔
            <span className="absolute top-[5px] right-[5px] w-[7px] h-[7px] bg-[#C97A96] rounded-full border-[1.5px] border-[#F7F7F9]"></span>
          </button>

          {/* Menú desplegable Notificaciones */}
          {showNotif && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-80 bg-white border border-[#E8A0B4]/20 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E8A0B4]/20 flex justify-between items-center bg-[#F7F7F9]">
                <h3 className="font-semibold text-[#1A1A22] text-[0.85rem]">Notificaciones</h3>
                <span className="text-[0.7rem] text-[#C97A96] bg-[#FDF0F4] px-2 py-0.5 rounded-full font-medium">Nuevas</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <div className="px-4 py-3 border-b border-[#E8A0B4]/10 hover:bg-[#FDF0F4]/50 cursor-pointer transition-colors">
                  <p className="text-[0.8rem] text-[#1A1A22] leading-tight">Revisa el apartado de turnos para ver las nuevas solicitudes.</p>
                  <span className="text-[0.7rem] text-[#8A8A99] mt-1 block">Sistema</span>
                </div>
              </div>
              <Link href="/admin/turnos" onClick={() => setShowNotif(false)} className="block w-full text-center py-2.5 text-[0.75rem] font-medium text-[#C97A96] hover:bg-[#FDF0F4] transition-colors">
                Ir a turnos
              </Link>
            </div>
          )}
        </div>

        {/* RUEDITA DE CONFIGURACIÓN */}
        <div ref={settingsRef} className="relative">
          <button 
            onClick={() => { setShowSettings(!showSettings); setShowNotif(false); }}
            className={`w-[34px] h-[34px] rounded-full border flex items-center justify-center text-[14px] transition-colors ${showSettings ? 'bg-[#FDF0F4] border-[#C97A96]' : 'bg-white border-[#E8A0B4]/20 hover:border-[#C97A96]'}`}
          >
            ⚙️
          </button>

          {/* Menú desplegable Configuración */}
          {showSettings && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-56 bg-white border border-[#E8A0B4]/20 rounded-2xl shadow-xl overflow-hidden py-2">
              <div className="px-4 py-2 mb-1 border-b border-[#E8A0B4]/10">
                {/* AQUI MOSTRAMOS TU NOMBRE Y TU EMAIL REAL */}
                <strong className="block text-[0.85rem] text-[#1A1A22] truncate">{adminName}</strong>
                <span className="text-[0.75rem] text-[#8A8A99] truncate">{adminEmail}</span>
              </div>
              
              {/* BOTONES CONECTADOS A /admin/configuracion */}
              <button 
                onClick={() => { setShowSettings(false); router.push("/admin/configuracion"); }}
                className="w-full text-left px-4 py-2 text-[0.85rem] text-[#4A4A55] hover:bg-[#FDF0F4] hover:text-[#C97A96] transition-colors flex items-center gap-2"
              >
                👤 Mi Perfil
              </button>
              <button 
                onClick={() => { setShowSettings(false); router.push("/admin/configuracion"); }}
                className="w-full text-left px-4 py-2 text-[0.85rem] text-[#4A4A55] hover:bg-[#FDF0F4] hover:text-[#C97A96] transition-colors flex items-center gap-2"
              >
                🏫 Datos de la Academia
              </button>
              
              <div className="border-t border-[#E8A0B4]/10 mt-1 pt-1">
                {/* BOTON DE LOGOUT SEGURO */}
                <button 
                  onClick={handleLogout} 
                  className="w-full text-left px-4 py-2 text-[0.85rem] text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors flex items-center gap-2"
                >
                  ⏻ Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}