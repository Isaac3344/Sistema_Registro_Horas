import React from "react";

export default function CustomModal({ isOpen, title, message, type = "confirm", onConfirm, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 sm:p-8 w-full max-w-md text-center transform transition-all scale-100">
        
        {/* Icono superior */}
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg ${
          type === "danger" ? "bg-red-100 text-red-600 shadow-red-500/20" : "bg-blue-100 text-blue-600 shadow-blue-500/20"
        }`}>
          {type === "danger" ? "⚠️" : "✨"}
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-2">{title || "Confirmación"}</h3>
        <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-8">{message}</p>

        <div className="flex gap-3">
          {type === "confirm" || type === "danger" ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3.5 rounded-2xl transition-all text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 text-white font-black py-3.5 rounded-2xl transition-all text-xs shadow-lg ${
                  type === "danger" 
                    ? "bg-red-600 hover:bg-red-500 shadow-red-600/30" 
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
                }`}
              >
                Aceptar
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl transition-all text-xs shadow-lg shadow-blue-600/30"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}