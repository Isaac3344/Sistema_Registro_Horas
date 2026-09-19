import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  XCircle, 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  Edit3, 
  Trash2, 
  Building2, 
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function RegistrosTabla({ 
  records = [], 
  onEdit, 
  onDelete, 
  onImportRecords,
  isLoading = false 
}) {
  const [filters, setFilters] = useState({
    nombre: '',
    fecha: '',
    centro_costo: ''
  });

  const [activeFilters, setActiveFilters] = useState({
    nombre: '',
    fecha: '',
    centro_costo: ''
  });

  // --- ESTADOS DE PAGINACIÓN (8 registros por página) ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Reiniciar a la página 1 cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters]);

  // Cálculo dinámico de horas trabajadas
  const computeHours = (item) => {
    const directVal = parseFloat(
      item.calculated_hours || item.horas || item.horas_trabajadas || item.total_horas || 0
    );
    if (directVal > 0) return directVal;

    const entrada = item.entry_time || item.hora_entrada;
    const salida = item.exit_time || item.hora_salida;
    if (!entrada || !salida) return 0;

    const [eH, eM] = String(entrada).split(':').map(Number);
    const [sH, sM] = String(salida).split(':').map(Number);

    let eMin = (eH || 0) * 60 + (eM || 0);
    let sMin = (sH || 0) * 60 + (sM || 0);

    let diff = sMin - eMin;
    if (diff < 0) diff += 24 * 60;

    const lunchRaw = item.lunch_break || item.almuerzo || '0';
    const lunchHrs = parseFloat(String(lunchRaw).replace(/[^0-9.]/g, '')) || 0;
    const netMin = Math.max(0, diff - (lunchHrs * 60));

    return netMin / 60;
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setActiveFilters(filters);
  };

  const clearFilters = () => {
    const empty = { nombre: '', fecha: '', centro_costo: '' };
    setFilters(empty);
    setActiveFilters(empty);
  };

  // Filtrado general de registros
  const filteredRecords = records.filter(item => {
    const workerName = item.worker_name || item.nombre || '';
    const dateVal = item.work_date || item.fecha || '';
    const costCenter = item.cost_center || item.centro_costo || '';

    const matchName = workerName.toLowerCase().includes(activeFilters.nombre.toLowerCase());
    const matchDate = !activeFilters.fecha || dateVal.includes(activeFilters.fecha);
    const matchCost = costCenter.toLowerCase().includes(activeFilters.centro_costo.toLowerCase());

    return matchName && matchDate && matchCost;
  });

  const totalHorasGenerales = filteredRecords.reduce((acc, item) => acc + computeHours(item), 0);

  // --- LÓGICA DE PAGINACIÓN ---
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  // --- 1. EXPORTACIÓN A EXCEL (.XLSX) ---
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      alert("No hay registros disponibles para exportar.");
      return;
    }

    try {
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('No se pudo cargar la librería Excel.'));
          document.head.appendChild(script);
        });
      }

      const excelData = filteredRecords.map(item => ({
        "Nombre del Trabajador": item.worker_name || item.nombre || '',
        "Fecha": item.work_date || item.fecha || '',
        "Hora Entrada": item.entry_time || item.hora_entrada || '',
        "Hora Salida": item.exit_time || item.hora_salida || '',
        "Almuerzo (hrs)": item.lunch_break || item.almuerzo || '0',
        "Centro de Costo": item.cost_center || item.centro_costo || '',
        "Descripción": item.description || item.descripcion || '',
        "Horas Calculadas": parseFloat(computeHours(item).toFixed(2))
      }));

      excelData.push({
        "Nombre del Trabajador": "TOTAL ACUMULADO",
        "Fecha": "",
        "Hora Entrada": "",
        "Hora Salida": "",
        "Almuerzo (hrs)": "",
        "Centro de Costo": "",
        "Descripción": "",
        "Horas Calculadas": parseFloat(totalHorasGenerales.toFixed(2))
      });

      const worksheet = window.XLSX.utils.json_to_sheet(excelData);
      const workbook = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(workbook, worksheet, "Registros");

      worksheet['!cols'] = [
        { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
        { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 16 }
      ];

      window.XLSX.writeFile(workbook, `Reporte_Jornadas_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (err) {
      console.error(err);
      alert("Error al exportar a Excel.");
    }
  };

  // --- 2. EXPORTAR PDF VECTORIAL (JSPDF + AUTOTABLE) ---
  const handleExportPdf = async () => {
    if (filteredRecords.length === 0) {
      alert("No hay registros para exportar a PDF.");
      return;
    }

    setIsExportingPdf(true);

    try {
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const s1 = document.createElement('script');
          s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s1.onload = resolve;
          s1.onerror = () => reject(new Error('Error al cargar jsPDF'));
          document.head.appendChild(s1);
        });
      }

      if (!window.jspdf.jsPDF.prototype.autoTable) {
        await new Promise((resolve, reject) => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
          s2.onload = resolve;
          s2.onerror = () => reject(new Error('Error al cargar AutoTable'));
          document.head.appendChild(s2);
        });
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const fechaHoy = new Date().toLocaleDateString('es-ES');

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("REPORTE DE REGISTRO DE JORNADAS Y COSTEO", 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Fecha de generación: ${fechaHoy} | Total registros: ${filteredRecords.length}`, 14, 22);

      const tableHeaders = [["Nombre", "Fecha", "Entrada", "Salida", "Almuerzo", "Centro Costo", "Descripción", "Horas"]];
      const tableRows = filteredRecords.map(item => [
        item.worker_name || item.nombre || '-',
        item.work_date || item.fecha || '-',
        item.entry_time || item.hora_entrada || '-',
        item.exit_time || item.hora_salida || '-',
        `${item.lunch_break || item.almuerzo || '0'} hrs`,
        item.cost_center || item.centro_costo || '-',
        item.description || item.descripcion || '-',
        `${computeHours(item).toFixed(2)} hrs`
      ]);

      doc.autoTable({
        head: tableHeaders,
        body: tableRows,
        startY: 26,
        theme: 'grid',
        headStyles: { 
          fillColor: [2, 132, 199], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 3,
          textColor: [15, 23, 42]
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          7: { halign: 'center', fontStyle: 'bold' }
        },
        foot: [["", "", "", "", "", "", "TOTAL ACUMULADO:", `${totalHorasGenerales.toFixed(2)} hrs`]],
        footStyles: { 
          fillColor: [241, 245, 249], 
          textColor: [21, 128, 61], 
          fontStyle: 'bold',
          halign: 'center'
        }
      });

      doc.save(`Reporte_Jornadas_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Ocurrió un error al generar el archivo PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // --- 3. PARSER ULTRA ROBUSTO DE EXCEL ---
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);

    try {
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('No se pudo cargar la librería Excel.'));
          document.head.appendChild(script);
        });
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const rawRows = window.XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

          if (!rawRows || rawRows.length === 0) {
            alert("El archivo Excel seleccionado no contiene filas de datos.");
            setIsImporting(false);
            return;
          }

          const importedRecords = [];

          for (const row of rawRows) {
            let worker = '', date = '', entry = '', exit = '', lunch = '', cost = '', desc = '';

            Object.keys(row).forEach(key => {
              const lowerKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
              const val = String(row[key]).trim();

              if (lowerKey.includes('nombre') || lowerKey.includes('worker') || lowerKey.includes('trabajador') || lowerKey.includes('empleado') || lowerKey.includes('personal')) {
                worker = val;
              } else if (lowerKey.includes('fecha') || lowerKey.includes('date') || lowerKey.includes('jornada')) {
                date = val;
              } else if (lowerKey.includes('entrada') || lowerKey.includes('entry') || lowerKey.includes('ingreso') || lowerKey.includes('inicio')) {
                entry = val;
              } else if (lowerKey.includes('salida') || lowerKey.includes('exit') || lowerKey.includes('egreso') || lowerKey.includes('fin')) {
                exit = val;
              } else if (lowerKey.includes('almuerzo') || lowerKey.includes('lunch') || lowerKey.includes('descanso') || lowerKey.includes('receso')) {
                lunch = val;
              } else if (lowerKey.includes('centro') || lowerKey.includes('cost') || lowerKey.includes('area') || lowerKey.includes('depa')) {
                cost = val;
              } else if (lowerKey.includes('descrip') || lowerKey.includes('detail') || lowerKey.includes('tarea') || lowerKey.includes('novedad') || lowerKey.includes('nota')) {
                desc = val;
              }
            });

            // Omitir firmas HTML, etiquetas o filas de totales
            if (!worker || 
                worker.startsWith('<') || 
                worker.startsWith('<!--') || 
                worker.toUpperCase().includes('TOTAL') || 
                worker.toLowerCase().includes('xml') || 
                worker.toLowerCase().includes('workbook')) {
              continue;
            }

            // Normalizar hora de entrada
            let cleanEntry = entry.replace(/[^0-9:]/g, '');
            if (!cleanEntry.includes(':')) {
              cleanEntry = cleanEntry.length === 4 ? `${cleanEntry.slice(0,2)}:${cleanEntry.slice(2)}` : '08:00';
            } else if (cleanEntry.length === 4 && cleanEntry.startsWith('8:')) {
              cleanEntry = `0${cleanEntry}`;
            }

            // Normalizar hora de salida
            let cleanExit = exit.replace(/[^0-9:]/g, '');
            if (!cleanExit.includes(':')) {
              cleanExit = cleanExit.length === 4 ? `${cleanExit.slice(0,2)}:${cleanExit.slice(2)}` : '17:00';
            } else if (cleanExit.length === 4 && cleanExit.startsWith('5:')) {
              cleanExit = `17:00`;
            }

            // Normalizar tiempo de almuerzo
            const lunchNum = parseFloat(lunch.replace(/[^0-9.]/g, '')) || 1;
            const cleanLunch = String(lunchNum);

            // Calcular horas trabajadas
            const [eH, eM] = cleanEntry.split(':').map(Number);
            const [sH, sM] = cleanExit.split(':').map(Number);
            let diff = ((sH || 17) * 60 + (sM || 0)) - ((eH || 8) * 60 + (eM || 0));
            if (diff < 0) diff += 24 * 60;
            const hoursCalculated = Math.max(0, (diff - lunchNum * 60) / 60);

            // Normalizar fecha a AAAA-MM-DD
            let cleanDate = date;
            if (!cleanDate || cleanDate.length < 8) {
              cleanDate = new Date().toISOString().split('T')[0];
            } else if (cleanDate.includes('/')) {
              const parts = cleanDate.split('/');
              if (parts.length === 3) {
                if (parts[2].length === 4) {
                  cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }

            importedRecords.push({
              worker_name: worker,
              work_date: cleanDate,
              entry_time: cleanEntry,
              exit_time: cleanExit,
              lunch_break: cleanLunch,
              cost_center: cost || 'General',
              description: desc || 'Importado desde archivo Excel',
              calculated_hours: parseFloat(hoursCalculated.toFixed(2))
            });
          }

          if (importedRecords.length === 0) {
            alert("No se encontraron registros válidos de trabajadores en el archivo.");
            setIsImporting(false);
            return;
          }

          if (onImportRecords) {
            onImportRecords(importedRecords);
          } else {
            alert(`Se procesaron ${importedRecords.length} registros del archivo.`);
          }
        } catch (err) {
          console.error(err);
          alert("Error al analizar las celdas del archivo Excel.");
        } finally {
          setIsImporting(false);
          e.target.value = '';
        }
      };

      reader.readAsArrayBuffer(file);

    } catch (err) {
      console.error(err);
      alert("Error al leer el archivo Excel.");
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-200">
      
      {/* Cabecera y Botones de Exportación/Importación */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-500 inline-block"></span>
            Historial de Registros
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta, filtra y exporta las jornadas registradas.
          </p>
        </div>

        {/* Grupo de Botones */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all">
            {isImporting ? (
              <>
                <Loader2 size={14} className="animate-spin text-cyan-400" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Upload size={14} className="text-cyan-400" />
                <span>Importar Excel</span>
              </>
            )}
            <input 
              type="file" 
              accept=".csv, .xlsx, .xls" 
              onChange={handleFileImport} 
              disabled={isImporting}
              className="hidden" 
            />
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/60 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700/60 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            {isExportingPdf ? (
              <>
                <Loader2 size={14} className="animate-spin text-rose-400" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <FileText size={14} className="text-rose-400" />
                <span>Descargar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
              <User size={12} /> Filtro por nombre
            </label>
            <input
              type="text"
              name="nombre"
              value={filters.nombre}
              onChange={handleFilterChange}
              placeholder="Buscar trabajador..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Calendar size={12} /> Filtro por fecha
            </label>
            <input
              type="date"
              name="fecha"
              value={filters.fecha}
              onChange={handleFilterChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Building2 size={12} /> Filtro por centro de costo
            </label>
            <input
              type="text"
              name="centro_costo"
              value={filters.centro_costo}
              onChange={handleFilterChange}
              placeholder="Ej: Operaciones, Soporte..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={applyFilters}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Filter size={13} />
            <span>Aplicar filtros</span>
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <XCircle size={13} />
            <span>Quitar filtros</span>
          </button>
        </div>
      </div>

      {/* Tabla de Registros Paginada */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Salida</th>
              <th className="px-4 py-3">Almuerzo</th>
              <th className="px-4 py-3">Centro de Costo</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3 text-center">Horas</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
            {isLoading ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-slate-500">
                  Cargando registros...
                </td>
              </tr>
            ) : paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-slate-500">
                  No se encontraron registros de jornadas.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((item, idx) => {
                const nombre = item.worker_name || item.nombre || '-';
                const fecha = item.work_date || item.fecha || '-';
                const entrada = item.entry_time || item.hora_entrada || '-';
                const salida = item.exit_time || item.hora_salida || '-';
                const almuerzo = item.lunch_break || item.almuerzo || '0';
                const centro = item.cost_center || item.centro_costo || '-';
                const descripcion = item.description || item.descripcion || '-';
                const horasCalculadas = computeHours(item);

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{nombre}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fecha}</td>
                    <td className="px-4 py-3">{entrada}</td>
                    <td className="px-4 py-3">{salida}</td>
                    <td className="px-4 py-3">{almuerzo} hrs</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {centro}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" title={descripcion}>
                      {descripcion}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-bold">
                        {horasCalculadas.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit && onEdit(item)}
                          className="bg-slate-800 hover:bg-slate-700 text-cyan-400 p-1.5 rounded transition-all cursor-pointer"
                          title="Editar registro"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete && onDelete(item.id)}
                          className="bg-slate-800 hover:bg-rose-950/80 text-rose-400 p-1.5 rounded transition-all cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BARRA DE PAGINACIÓN Y RESUMEN */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
        <div>
          Mostrando <span className="font-semibold text-slate-200">{filteredRecords.length > 0 ? startIndex + 1 : 0}</span> a <span className="font-semibold text-slate-200">{Math.min(startIndex + itemsPerPage, filteredRecords.length)}</span> de <span className="font-semibold text-slate-200">{filteredRecords.length}</span> registros (Total acumulado: <strong className="text-emerald-400">{totalHorasGenerales.toFixed(2)} hrs</strong>)
        </div>

        {/* Controles de cambio de página */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={validCurrentPage === 1}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
            >
              <ChevronLeft size={14} />
              <span>Anterior</span>
            </button>

            <span className="px-2 font-medium text-slate-300">
              Página {validCurrentPage} de {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={validCurrentPage === totalPages}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>Siguiente</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}