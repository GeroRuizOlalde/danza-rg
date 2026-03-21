"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [adminName, setAdminName] = useState("Administrador");
  const [turnosPendientes, setTurnosPendientes] = useState(0);

  useEffect(() => {
    async function fetchSidebarData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.user_metadata?.display_name) {
          setAdminName(user.user_metadata.display_name);
        } else {
          const nombreEmail = user.email?.split('@')[0] || "Admin";
          setAdminName(nombreEmail.charAt(0).toUpperCase() + nombreEmail.slice(1));
        }
      }

      const { data } = await supabase
        .from('reservas')
        .select('id')
        .eq('estado', 'pendiente');

      if (data) setTurnosPendientes(data.length);
    }

    fetchSidebarData();

    const canal = supabase.channel('cambios-reservas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => {
        supabase.from('reservas').select('id').eq('estado', 'pendiente')
          .then(({ data }) => setTurnosPendientes(data?.length || 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); }
  }, []);

  // Cookie manual eliminada — el middleware usa Supabase Auth directamente
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const iniciales = adminName.slice(0, 2).toUpperCase();

  const navItems = [
    { section: "Principal", links: [
      { name: "Dashboard", path: "/admin/dashboard", icon: "🏠" }
    ]},
    { section: "Gestión", links: [
      { name: "Turnos",   path: "/admin/turnos",   icon: "📅", badge: turnosPendientes > 0 ? turnosPendientes.toString() : null },
      { name: "Clientes", path: "/admin/clientes", icon: "👥" },
      { name: "Galería",  path: "/admin/galeria",  icon: "📸" },
      { name: "Profesores", path: "/admin/profesores", icon: "🧑‍🏫" },
    ]},
    { section: "Academia", links: [
      { name: "Horarios", path: "/admin/horarios", icon: "🕐" },
      { name: "Clases",   path: "/admin/clases",   icon: "💃" },
    ]},
  ];

  return (
    <aside className="w-[240px] h-screen bg-[#1A1A22] flex-shrink-0 flex flex-col relative overflow-hidden">
      <div className="absolute -bottom-[100px] -left-[100px] w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(232,160,180,0.07)_0%,transparent_65%)] pointer-events-none" />

      <div className="p-7 pb-5 border-b border-white/5">
        <Link href="/admin/dashboard" className="font-playfair text-[1.3rem] font-semibold text-white block">
          R.G <span className="text-[#E8A0B4]">Danza</span>
        </Link>
        <p className="text-[0.7rem] text-white/25 mt-1">Panel de administración</p>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto z-10">
        {navItems.map((group, idx) => (
          <div key={idx}>
            <div className="text-[0.65rem] font-semibold tracking-[1.5px] uppercase text-white/20 px-3 pt-3 pb-1.5 mt-2">
              {group.section}
            </div>
            {group.links.map((link) => {
              const isActive = pathname.startsWith(link.path);
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[0.875rem] ${
                    isActive
                      ? "bg-[#E8A0B4]/10 text-white"
                      : "text-white/45 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <span className={`w-[18px] flex items-center justify-center text-[15px] ${isActive ? "text-[#E8A0B4]" : ""}`}>
                    {link.icon}
                  </span>
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="ml-auto bg-[#C97A96] text-white text-[0.65rem] font-semibold px-2 py-0.5 rounded-full min-w-[18px] text-center">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-5 border-t border-white/5 z-10">
        <div className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C97A96] to-[#E8A0B4] flex items-center justify-center text-[0.75rem] font-semibold text-white shrink-0">
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <strong className="block text-[0.8rem] font-medium text-white truncate">{adminName}</strong>
            <span className="text-[0.68rem] text-white/30">Administrador</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/25 hover:text-[#E8A0B4] text-[13px] transition-colors"
            title="Cerrar sesión"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}