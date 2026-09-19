import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Clock, 
  Utensils, 
  Building2, 
  FileText, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

export default function RegistroForm({ onSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    worker_name: '',
    work_date: new Date().toISOString().split('T')[0],
    entry_time: '08:00',
    exit_time: '17:00',
    lunch_break: '1',
    cost_center: '',
    description: ''
  });

  const [calculatedHours, setCalculatedHours] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Cargar datos si se pasa un registro para editar
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Cálculo automático de horas trabajadas
  useEffect(() => {
    if (formData.entry_time && formData.exit_time) {
      const [entryH, entryM] = formData.entry_time.split(':').map(Number);
      const [exitH, exitM] = formData.exit_time.split(':').map(Number);

      const entryMinutes = entryH * 60 + entryM;
      const exitMinutes = exitH * 60 + exitM;

      let diffMinutes = exitMinutes - entryMinutes;
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Para turnos nocturnos
      }

      const lunchMinutes = parseFloat(formData.lunch_break || 0) * 60;
      const netMinutes = Math.max(0, diffMinutes - lunchMinutes);
      const hours = (netMinutes / 60).toFixed(2);

      setCalculatedHours(hours);
    } else {
      setCalculatedHours(0);
    }
  }, [formData.entry_time, formData.exit_time, formData.lunch_break]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      worker_name: '',
      work_date: new Date().toISOString().split('T')[0],
      entry_time: '08:00',
      exit_time: '17:00',
      lunch_break: '1',
      cost_center: '',
      description: ''
    });
    setStatusMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.worker_name.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor, ingrese el nombre del trabajador.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const payload = {
        ...formData,
        calculated_hours: parseFloat(calculatedHours)
      };

      if (onSubmit) {
        await onSubmit(payload);
      }

      setStatusMessage({ type: 'success', text: 'Registro guardado exitosamente.' });
      handleReset();
    } catch (error) {
      console.error(error);
      setStatusMessage({ 
        type: 'error', 
        text: error.message || 'Error al conectar con el servidor.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-200">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block"></span>
          Nuevo Registro de Jornada
        </h2>
        
        <div className="bg-slate-800/80 border border-emerald-500/30 px-4 py-1.5 rounded-lg flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Horas Calculadas:</span>
          <span className="text-lg font-bold text-emerald-400">{calculatedHours} hrs</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Columna 1 */}
          <div className="space-y-4 bg-slate-950/50 p-4 rounded-lg border border-slate-800/60">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-3">
              1. Trabajador y Jornada
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <User size={14} className="text-slate-400" /> Nombre del Trabajador *
              </label>
              <input
                type="text"
                name="worker_name"
                value={formData.worker_name}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" /> Fecha de Trabajo
              </label>
              <input
                type="date"
                name="work_date"
                value={formData.work_date}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" /> Hora Entrada
                </label>
                <input
                  type="time"
                  name="entry_time"
                  value={formData.entry_time}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" /> Hora Salida
                </label>
                <input
                  type="time"
                  name="exit_time"
                  value={formData.exit_time}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Utensils size={14} className="text-slate-400" /> Tiempo de Almuerzo
              </label>
              <select
                name="lunch_break"
                value={formData.lunch_break}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              >
                <option value="0">Sin descanso (0 min)</option>
                <option value="0.5">30 minutos (0.5 hrs)</option>
                <option value="1">1 hora</option>
                <option value="1.5">1 hora y media (1.5 hrs)</option>
                <option value="2">2 horas</option>
              </select>
            </div>
          </div>

          {/* Columna 2 */}
          <div className="space-y-4 bg-slate-950/50 p-4 rounded-lg border border-slate-800/60 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                2. Centro de Costo y Detalles
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-400" /> Centro de Costo
                </label>
                <input
                  type="text"
                  name="cost_center"
                  value={formData.cost_center}
                  onChange={handleChange}
                  placeholder="Ej: Operaciones, Red, Soporte"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-400" /> Descripción de Tareas
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {formData.description.length} caracteres
                  </span>
                </div>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Detalle del trabajo realizado, novedades..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                ></textarea>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-xs border ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950/60 text-rose-300 border-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Guardar Registro</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Limpiar</span>
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}