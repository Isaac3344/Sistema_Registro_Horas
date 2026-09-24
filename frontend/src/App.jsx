import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import RegistroForm from './components/RegistroForm';
import RegistrosTabla from './components/RegistrosTabla';
import Estadisticas from './components/Estadisticas';
import { fetchRecords, createRecord, deleteRecord, updateRecord } from './api';
import { LayoutGrid, BarChart3, LogOut, User } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('admin');
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('estadisticas'); // 'gestion' | 'estadisticas'

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
    } catch (error) {
      console.error("Error al guardar registro:", error);
      throw error;
    }
  };

  if (!isAuthenticated) {
    return (
      <Login
        onLoginSuccess={(username) => {
          setCurrentUser(username || 'admin');
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Cabecera idéntica a la imagen */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">

          {/* Logo + Pestañas de Navegación */}
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 font-extrabold flex items-center justify-center border border-teal-500/30 text-sm tracking-wider">
                AR
              </div>
              <div>
                <h1 className="font-extrabold text-base text-white leading-tight tracking-wide">APP REGISTRO</h1>
                <p className="text-[11px] text-slate-400 font-medium">Control de jornadas y costeo</p>
              </div>
            </div>

            {/* Pestañas: Gestión y Estadísticas */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('gestion')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'gestion'
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <LayoutGrid size={15} />
                <span>Gestión</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('estadisticas')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'estadisticas'
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <BarChart3 size={15} />
                <span>Estadísticas</span>
              </button>
            </div>
          </div>

          {/* Usuario y Salir */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-2 text-xs bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60 text-slate-300">
              <User size={14} className="text-teal-400" />
              <span>Hola, <strong className="text-white">{currentUser}</strong></span>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-400 transition-colors py-1.5 px-3 rounded-xl border border-slate-800 hover:border-red-500/30 bg-slate-900/50"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          </div>

        </div>
      </header>

      {/* Contenido Principal según la pestaña seleccionada */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex-1 w-full">
        {activeTab === 'gestion' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            <div className="lg:col-span-5">
              <RegistroForm
                onSubmit={handleCreateOrUpdate}
                editingRecord={editingRecord}
                onCancelEdit={() => setEditingRecord(null)}
              />
            </div>
            <div className="lg:col-span-7">
              <RegistrosTabla
                records={records}
                onDelete={handleDelete}
                onEdit={(record) => setEditingRecord(record)}
                onRefresh={loadRecords}
              />
            </div>
          </div>
        )}

        {activeTab === 'estadisticas' && (
          <div className="animate-in fade-in duration-200">
            <Estadisticas records={records} />
          </div>
        )}
      </main>
    </div>
  );
}