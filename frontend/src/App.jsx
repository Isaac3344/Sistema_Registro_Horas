import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import RegistroForm from './components/RegistroForm';
import RegistrosTabla from './components/RegistrosTabla';
import Estadisticas from './components/Estadisticas';
import { fetchRecords, createRecord, deleteRecord, updateRecord } from './api';
import { Layers, LogOut, User } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);

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
          setCurrentUser(username);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Encabezado Principal */}
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

      {/* Todo en la misma página */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* 1. Métricas e Histogramas */}
        <Estadisticas records={records} />

        {/* 2. Formulario Grande a Ancho Completo */}
        <RegistroForm
          onSubmit={handleCreateOrUpdate}
          editingRecord={editingRecord}
          onCancelEdit={() => setEditingRecord(null)}
        />

        {/* 3. Tabla con el Historial de Registros Agregados */}
        <RegistrosTabla
          records={records}
          onDelete={handleDelete}
          onEdit={(record) => setEditingRecord(record)}
        />
      </main>
    </div>
  );
}