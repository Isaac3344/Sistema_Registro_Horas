import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, Building2, FileText, PlusCircle, CheckCircle } from 'lucide-react';

export default function RegistroForm({ onSubmit, editingRecord, onCancelEdit }) {
  const [formData, setFormData] = useState({
    worker_name: '',
    work_date: new Date().toISOString().split('T')[0],
    entry_time: '08:00',
    exit_time: '17:00',
    cost_center: '',
    description: ''
  });

  const [calculatedHours, setCalculatedHours] = useState(8.0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        worker_name: editingRecord.worker_name || editingRecord.trabajador || '',
        work_date: editingRecord.work_date || editingRecord.fecha || new Date().toISOString().split('T')[0],
        entry_time: editingRecord.entry_time || editingRecord.hora_entrada || '08:00',
        exit_time: editingRecord.exit_time || editingRecord.hora_salida || '17:00',
        cost_center: editingRecord.cost_center || editingRecord.centro_costo || '',
        description: editingRecord.description || editingRecord.descripcion || ''
      });
    }
  }, [editingRecord]);

  useEffect(() => {
    if (formData.entry_time && formData.exit_time) {
      const [entryH, entryM] = formData.entry_time.split(':').map(Number);
      const [exitH, exitM] = formData.exit_time.split(':').map(Number);

      let entryMinutes = entryH * 60 + entryM;
      let exitMinutes = exitH * 60 + exitM;

      if (exitMinutes < entryMinutes) {
        exitMinutes += 24 * 60;
      }

      const diffHours = (exitMinutes - entryMinutes) / 60;
      setCalculatedHours(diffHours > 0 ? diffHours : 0);
    }
  }, [formData.entry_time, formData.exit_time]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        calculated_hours: calculatedHours
      });
      if (!editingRecord) {
        setFormData({
          worker_name: '',
          work_date: new Date().toISOString().split('T')[0],
          entry_time: '08:00',
          exit_time: '17:00',
          cost_center: '',
          description: ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          {editingRecord ? 'Editar Registro' : 'Nuevo Registro'}
        </h2>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl whitespace-nowrap">
          {calculatedHours.toFixed(2)} hrs
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre del trabajador */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Nombre del Trabajador *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              name="worker_name"
              required
              value={formData.worker_name}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Fecha de trabajo */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Fecha de Trabajo</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="date"
              name="work_date"
              required
              value={formData.work_date}
              onChange={handleChange}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Horarios Entrada / Salida */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Hora Entrada</label>
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="time"
                name="entry_time"
                required
                value={formData.entry_time}
                onChange={handleChange}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Hora Salida</label>
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="time"
                name="exit_time"
                required
                value={formData.exit_time}
                onChange={handleChange}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Centro de costo */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Centro de Costo</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              name="cost_center"
              value={formData.cost_center}
              onChange={handleChange}
              placeholder="Ej. Operaciones"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Descripción de Tareas</label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-slate-500" size={16} />
            <textarea
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detalle de las actividades realizadas..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            ></textarea>
          </div>
        </div>

        {/* Botón de envío */}
        <div className="pt-2 flex gap-2">
          {editingRecord && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-1/3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {editingRecord ? <CheckCircle size={16} /> : <PlusCircle size={16} />}
            <span>{loading ? 'Guardando...' : editingRecord ? 'Actualizar' : 'Guardar Registro'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}