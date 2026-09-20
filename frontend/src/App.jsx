import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import RegistroForm from './components/RegistroForm';
import RegistrosTabla from './components/RegistrosTabla';
import Estadisticas from './components/Estadisticas';
import { fetchRecords, createRecord, deleteRecord, updateRecord } from './api';
import { Layers, LogOut, User, PlusCircle, BarChart3 } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('form'); // 'form' para el formulario grande, 'dashboard' para el historial/métricas

  const loadRecords = async () => {
    try {
      const data = await fetchRecords();
      setRecords(data);
    } catch (error) {
      console.error("Error al obtener registros:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadRecords();
    }
  }, [isAuthenticated]);

  const handleDelete = async (id) => {
    try {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Error al eliminar registro:", error);
    }
  };

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (editingRecord) {
        await updateRecord(editingRecord.id, formData);
        setEditingRecord(null);
      } else {
        await createRecord(formData);
      }
      await loadRecords();
      setActiveTab('dashboard'); // Redirige al Dashboard automáticamente para ver el registro guardado
    } catch (error) {
      console.error("Error al guardar registro:", error);
      throw error;
    }
  };

  if (!isAuthenticated) {
    return (
      <Login
        onLoginSuccess={(username) => {
          setCurrentUser(username);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Encabezado */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-none">Sistema de Control de Horas</h1>
              <span className="text-xs text-slate-400">Panel de Administración</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
              <User size={14} className="text-emerald-400" />
              <span>{currentUser || 'Admin'}</span>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-400 transition-colors py-1.5 px-2 rounded-lg"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Pestañas de Navegación Aparte */}
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`py-3.5 px-5 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'form'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle size={18} />
            <span>Nuevo Registro (Formulario)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`py-3.5 px-5 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'dashboard'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={18} />
            <span>Dashboard e Historial</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal Separdos por Vista */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {activeTab === 'form' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-200">
            <RegistroForm
              onSubmit={handleCreateOrUpdate}
              editingRecord={editingRecord}
              onCancelEdit={() => setEditingRecord(null)}
            />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <Estadisticas records={records} />
            <RegistrosTabla
              records={records}
              onDelete={handleDelete}
              onEdit={(record) => {
                setEditingRecord(record);
                setActiveTab('form');
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}