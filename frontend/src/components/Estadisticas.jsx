import React, { useState } from 'react';
import { BarChart3, Clock, Building2, Users, TrendingUp, PieChart, Calendar, XCircle } from 'lucide-react';

export default function Estadisticas({ records = [] }) {
  // Estados para modo de filtro de período
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'month' | 'range'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Cálculo de horas netas trabajadas
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

  // Filtrar registros según el modo seleccionado
  const filteredRecords = records.filter(item => {
    const itemDate = item.work_date || item.fecha || '';
    if (!itemDate) return false;

    if (filterMode === 'month') {
      if (!selectedMonth) return true;
      return itemDate.startsWith(selectedMonth); // Compara formato YYYY-MM
    }

    if (filterMode === 'range') {
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    }

    return true; // 'all'
  });

  // 1. Métricas dinámicas
  const totalHoras = filteredRecords.reduce((acc, curr) => acc + computeHours(curr), 0);
  const totalRegistros = filteredRecords.length;
  const promedioHoras = totalRegistros > 0 ? (totalHoras / totalRegistros).toFixed(2) : '0.00';

  // 2. Agrupación por Centro de Costo
  const costCenterMap = {};
  filteredRecords.forEach(item => {
    const center = (item.cost_center || item.centro_costo || 'Sin Asignar').trim() || 'Sin Asignar';
    const hrs = computeHours(item);
    if (!costCenterMap[center]) {
      costCenterMap[center] = { horas: 0, registros: 0 };
    }
    costCenterMap[center].horas += hrs;
    costCenterMap[center].registros += 1;
  });

  const costCenterList = Object.keys(costCenterMap)
    .map(key => ({
      nombre: key,
      horas: costCenterMap[key].horas,
      registros: costCenterMap[key].registros,
      porcentaje: totalHoras > 0 ? ((costCenterMap[key].horas / totalHoras) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.horas - a.horas);

  const topCenter = costCenterList.length > 0 ? costCenterList[0].nombre : 'N/A';
  const maxHorasGroup = costCenterList.length > 0 ? Math.max(...costCenterList.map(c => c.horas)) : 1;

  return (
    <div className="space-y-6">
      
      {/* BARRA SUPERIOR CON FILTROS DE PERÍODO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">Filtro de Período Estadístico</h2>
          </div>

          {/* Botones para seleccionar el tipo de filtro */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                filterMode === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Histórico Completo
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                filterMode === 'month' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Mes
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                filterMode === 'range' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rango de Fechas
            </button>
          </div>
        </div>

        {/* Selector de Mes */}
        {filterMode === 'month' && (
          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-medium text-slate-300">Seleccionar Mes:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
            />
          </div>
        )}

        {/* Inputs de Rango de Fechas */}
        {filterMode === 'range' && (
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-300">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-300">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <XCircle size={14} />
                <span>Limpiar rango</span>
              </button>
            )}
          </div>
        )}

        {filterMode !== 'all' && (
          <p className="text-[11px] text-slate-400">
            Mostrando estadísticas de <strong className="text-emerald-400">{filteredRecords.length}</strong> {filteredRecords.length === 1 ? 'registro' : 'registros'} encontrados.
          </p>
        )}
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Horas</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{totalHoras.toFixed(2)} <span className="text-xs text-slate-400 font-normal">hrs</span></h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Jornadas</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{totalRegistros} <span className="text-xs text-slate-400 font-normal">registros</span></h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 rounded-xl">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Mayor Centro</p>
            <h3 className="text-lg font-bold text-white mt-0.5 truncate max-w-[150px]" title={topCenter}>{topCenter}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-amber-950/80 border border-amber-800/60 text-amber-400 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Promedio / Día</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{promedioHoras} <span className="text-xs text-slate-400 font-normal">hrs</span></h3>
          </div>
        </div>
      </div>

      {/* Gráficos de Distribución por Centro de Costo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Barras Visual */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-cyan-400" />
                Horas Acumuladas por Centro de Costo
              </h3>
              <p className="text-xs text-slate-400">Comparativa visual del total de horas imputadas en el período seleccionado</p>
            </div>
            <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300">
              {costCenterList.length} Centros
            </span>
          </div>

          {costCenterList.length === 0 ? (
            <p className="text-center text-slate-500 py-10 text-xs">No hay registros guardados para el período seleccionado.</p>
          ) : (
            <div className="space-y-4">
              {costCenterList.map((item, idx) => {
                const barWidth = maxHorasGroup > 0 ? (item.horas / maxHorasGroup) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block"></span>
                        {item.nombre}
                      </span>
                      <span className="text-slate-400">
                        <strong className="text-emerald-400 font-bold">{item.horas.toFixed(2)} hrs</strong> ({item.porcentaje}%)
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desglose Porcentual / Tabla de Resumen */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PieChart size={18} className="text-emerald-400" />
                Resumen de Costeo
              </h3>
            </div>

            {costCenterList.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-xs">Sin datos en el período seleccionado.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {costCenterList.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{item.nombre}</p>
                      <p className="text-[11px] text-slate-400">{item.registros} {item.registros === 1 ? 'jornada' : 'jornadas'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">{item.horas.toFixed(2)} hrs</p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.porcentaje}% del total</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-3 text-center">
            Métricas calculadas dinámicamente según el filtro seleccionado.
          </p>
        </div>

      </div>

    </div>
  );
}