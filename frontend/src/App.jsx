import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import RegistroForm from './components/RegistroForm';
import RegistrosTabla from './components/RegistrosTabla';
import Estadisticas from './components/Estadisticas';
import { fetchRecords, createRecord, deleteRecord, updateRecord } from './api';
import { Layers, LogOut, User, LayoutDashboard, BarChart3 } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [activeTab, setActiveTab] = useState('gestion'); // 'gestion' | 'estadisticas'
  
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      setCurrentUser(savedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = async (credentials) => {
    if (credentials.username.length >= 3 && credentials.password.length >= 3) {
      localStorage.setItem('app_user', credentials.username);
      setCurrentUser(credentials.username);
      setIsAuthenticated(true);
    } else {
      throw new Error('El usuario y contraseña deben tener al menos 3 caracteres.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('app_user');
    setIsAuthenticated(false);
    setCurrentUser('');
  };

  const handleSave = async (formData) => {
    if (editingRecord && editingRecord.id) {
      await updateRecord(editingRecord.id, formData);
      setEditingRecord(null);
    } else {
      await createRecord(formData);
    }
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este registro?")) {
      try {
        await deleteRecord(id);
        await loadData();
      } catch (err) {
        alert("Error al eliminar el registro.");
      }
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setActiveTab('gestion');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportRecords = async (importedItems) => {
    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of importedItems) {
      try {
        await createRecord(item);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    await loadData();

    if (failCount === 0) {
      alert(`¡Éxito! Se importaron ${successCount} registros.`);
    } else {
      alert(`Se importaron ${successCount} registros. (${failCount} omitidos)`);
    }

    setIsLoading(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 pb-12">
      
      {/* Navbar Superior con Pestañas */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-emerald-950/50">
                AR
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-white text-base leading-none">APP REGISTRO</h1>
                <span className="text-[11px] text-slate-400">Control de jornadas y costeo</span>
              </div>
            </div>

            {/* Selector de Pestañas */}
            <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('gestion')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'gestion'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard size={14} />
                <span>Gestión</span>
              </button>

              <button
                onClick={() => setActiveTab('estadisticas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'estadisticas'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 size={14} />
                <span>Estadísticas</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <User size={14} className="text-emerald-400" />
              <span>Hola, <strong className="text-white">{currentUser}</strong></span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-800 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        
        {activeTab === 'gestion' ? (
          <>
            <RegistroForm 
              onSubmit={handleSave} 
              initialData={editingRecord}
            />

            <RegistrosTabla 
              records={records} 
              isLoading={isLoading} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              onImportRecords={handleImportRecords}
            />
          </>
        ) : (
          <Estadisticas records={records} />
        )}

      </main>

      {/* Pie de Página */}
      <footer className="max-w-6xl mx-auto px-6 mt-12 pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-1.5">
          <Layers size={13} />
          <span>Sistema Integrado con Dashboard Estadístico • Base de Datos PostgreSQL / FastAPI</span>
        </p>
      </footer>
    </div>
  );
}