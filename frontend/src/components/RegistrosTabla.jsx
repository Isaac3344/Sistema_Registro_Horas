import React, { useState, useRef } from 'react';
import { 
  Trash2, Edit2, Search, Calendar, User, Clock, Building2, 
  Download, Upload, FileSpreadsheet, FileText 
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { createRecord } from '../api';

export default function RegistrosTabla({ records = [], onDelete, onEdit, onRefresh }) {
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Filtrar registros por trabajador o centro de costo
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

  // 1. EXPORTAR A EXCEL (.CSV compatible)
  const handleExportExcel = () => {
    if (records.length === 0) {
      alert("No hay registros disponibles para exportar.");
      return;
    }

    const headers = ["ID", "Trabajador", "Fecha", "Hora Entrada", "Hora Salida", "Horas", "Centro Costo", "Descripcion"];
    const rows = records.map(r => [
      r.id || '',
      `"${r.worker_name || r.trabajador || ''}"`,
      r.work_date || r.fecha || '',
      r.entry_time || r.hora_entrada || '',
      r.exit_time || r.hora_salida || '',
      r.calculated_hours || r.horas || 0,
      `"${r.cost_center || r.centro_costo || ''}"`,
      `"${(r.description || r.descripcion || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Registros_Horas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. EXPORTAR A PDF (Vista e Impresión Limpia)
  const handleExportPDF = () => {
    if (records.length === 0) {
      alert("No hay registros disponibles para generar el PDF.");
      return;
    }

    const printWindow = window.open('', '_blank');
    const tableRows = records.map(r => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.worker_name || r.trabajador || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.work_date || r.fecha || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.entry_time || ''} - ${r.exit_time || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;"><strong>${r.calculated_hours || 0} hrs</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.cost_center || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Registros de Jornadas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; color: #0d9488; margin-bottom: 5px; }
            p { font-size: 12px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background-color: #0f172a; color: white; padding: 10px; border: 1px solid #0f172a; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Reporte General de Control de Horas</h1>
          <p>Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Horas</th>
                <th>Centro de Costo</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // 3. IMPORTAR DESDE ARCHIVO EXCEL/CSV
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          alert("El archivo no contiene registros válidos.");
          setImporting(false);
          return;
        }

        let importedCount = 0;
        // Omitir cabecera (índice 0)
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 3) {
            const newRecord = {
              worker_name: cols[0] || cols[1] || 'Importado',
              work_date: cols[1] && cols[1].includes('-') ? cols[1] : new Date().toISOString().split('T')[0],
              entry_time: cols[2] || '08:00',
              exit_time: cols[3] || '17:00',
              calculated_hours: parseFloat(cols[4]) || 8.0,
              cost_center: cols[5] || '',
              description: cols[6] || 'Importado masivamente'
            };
            await createRecord(newRecord);
            importedCount++;
          }
        }

        alert(`¡Éxito! Se importaron ${importedCount} registros a PostgreSQL.`);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error(err);
        alert("Error al procesar el archivo. Asegúrate de que sea un formato CSV o Excel válido.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl text-slate-100">
      {/* Cabecera, Buscador y Botonera Importar/Exportar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            Historial de Registros
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Consulta, filtra, gestiona e importa/exporta tus jornadas laborales.
          </p>
        </div>

        {/* Acciones de Importación y Exportación */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Input oculto para la subida de archivos */}
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Importar registros desde Excel/CSV"
          >
            <Upload size={14} />
            <span>{importing ? 'Cargando...' : 'Importar'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors flex items-center gap-1.5"
            title="Exportar a archivo Excel / CSV"
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 transition-colors flex items-center gap-1.5"
            title="Generar y descargar documento PDF"
          >
            <FileText size={14} />
            <span>PDF</span>
          </button>

          {/* Buscador */}
          <div className="relative flex-1 sm:w-48 lg:w-56 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
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

      {/* Modal flotante de Confirmación */}
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