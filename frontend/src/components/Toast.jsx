import React from "react";

export default function Toast({ message, type = "success", onClose }) {
  if (!message) return null;

  return (
    <div className="fixed top-6 right-6 z-50 animate-bounce flex items-center gap-3 bg-slate-900/90 text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md">
      <span className={`w-3 h-3 rounded-full ${type === "success" ? "bg-emerald-400" : "bg-red-400"}`}></span>
      <p className="text-xs font-black tracking-tight">{message}</p>
      <button onClick={onClose} className="ml-3 text-slate-400 hover:text-white font-bold text-sm">×</button>
    </div>
  );
}