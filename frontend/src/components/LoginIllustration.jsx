import React from "react";

export default function LoginIllustration({ slideIndex }) {
  return (
    <div className="relative w-full h-56 flex items-center justify-center my-auto">
      {/* Fondo decorativo difuminado */}
      <div className="absolute w-40 h-40 bg-blue-500/40 rounded-full blur-xl animate-pulse"></div>

      {slideIndex === 0 && (
        /* Ilustración 1: Control de Jornadas / Reportes (Portapapeles con checklist y pluma) */
        <div className="relative z-10 animate-bounce duration-1000 transform -rotate-3">
          <div className="w-36 h-48 bg-white rounded-3xl shadow-2xl p-4 border-4 border-blue-100 flex flex-col justify-between">
            <div className="w-12 h-4 bg-blue-200 rounded-full mx-auto -mt-6"></div>
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>
                <div className="w-16 h-2 bg-slate-200 rounded-full"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>
                <div className="w-20 h-2 bg-slate-200 rounded-full"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">⏱</div>
                <div className="w-12 h-2 bg-blue-200 rounded-full"></div>
              </div>
            </div>
            <div className="bg-blue-600 h-8 rounded-2xl flex items-center justify-center text-white font-black text-[10px]">
              JornadaPro
            </div>
          </div>
        </div>
      )}

      {slideIndex === 1 && (
        /* Ilustración 2: Gestión Multi-Usuario (Avatares conectados en red) */
        <div className="relative z-10 flex flex-col items-center gap-3 animate-fadeIn">
          <div className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded-full flex items-center justify-center text-white text-2xl shadow-xl backdrop-blur-md">
            👥
          </div>
          <div className="flex gap-2">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-blue-600 font-black text-xs">Admin</div>
            <div className="w-12 h-12 bg-blue-500 rounded-2xl shadow-lg flex items-center justify-center text-white font-black text-xs border border-white/20">User</div>
          </div>
        </div>
      )}

      {slideIndex === 2 && (
        /* Ilustración 3: Analíticas y Reportes (Gráfica de barras moderna) */
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-2xl flex items-end gap-3 h-40 w-48 justify-center animate-fadeIn">
          <div className="w-8 bg-blue-400 rounded-t-xl h-20 shadow-md"></div>
          <div className="w-8 bg-white rounded-t-xl h-32 shadow-md"></div>
          <div className="w-8 bg-indigo-400 rounded-t-xl h-24 shadow-md"></div>
        </div>
      )}
    </div>
  );
}