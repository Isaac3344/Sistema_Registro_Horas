import React, { useState } from 'react';
import { Trash2, Edit2, Search, Calendar, User, Clock, Building2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function RegistrosTabla({ records = [], onDelete, onEdit }) {
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter((r) => {
    const search = searchTerm.toLowerCase();
    const name = (r.worker_name || r.trabajador || '').toLowerCase();
    const cost = (r.cost_center || r.centro_costo || '').toLowerCase();
    return name.includes(search) || cost.includes(search);
  });

  const handleDeleteClick = (id) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            Historial de Registros
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Consulta, filtra y gestiona las jornadas registradas en la base de datos.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por trabajador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 font-semibold">Trabajador</th>
              <th className="py-3 px-4 font-semibold">Fecha</th>
              <th className="py-3 px-4 font-semibold">Horario</th>
              <th className="py-3 px-4 font-semibold">Horas</th>
              <th className="py-3 px-4 font-semibold">Centro Costo</th>
              <th className="py-3 px-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500">
                  No se encontraron registros guardados.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User size={15} className="text-emerald-400" />
                      {record.worker_name || record.trabajador || 'N/A'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-500" />
                      {record.work_date || record.fecha || 'N/A'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-xs">
                      <Clock size={13} className="text-slate-500" />
                      {record.entry_time || record.hora_entrada} - {record.exit_time || record.hora_salida}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {record.calculated_hours || record.horas || 0} hrs
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {record.cost_center || record.centro_costo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300 border border-slate-700">
                        <Building2 size={12} />
                        {record.cost_center || record.centro_costo}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Editar registro"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(record.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Registro"
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción lo borrará de PostgreSQL inmediatamente."
      />
    </div>
  );
}