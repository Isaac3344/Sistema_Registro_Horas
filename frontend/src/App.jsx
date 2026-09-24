import React, { useState, useEffect } from "react";
import XLSX from "xlsx-js-style"; // Librería profesional con soporte de estilos y colores
import { 
  registerUser, 
  loginUser, 
  fetchRecords, 
  createRecord, 
  updateRecord, 
  deleteRecord 
} from "./api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isLoginView, setIsLoginView] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [currentTab, setCurrentTab] = useState("gestion");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [workerName, setWorkerName] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryTime, setEntryTime] = useState("08:00");
  const [exitTime, setExitTime] = useState("17:00");
  const [costCenter, setCostCenter] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (token) {
      loadRecords();
    }
  }, [token]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await fetchRecords();
      setRecords(data);
    } catch (err) {
      if (err.message.includes("expirada") || err.message.includes("401")) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      let data;
      if (isLoginView) {
        data = await loginUser(usernameInput, passwordInput);
      } else {
        data = await registerUser(usernameInput, passwordInput);
      }
      setToken(data.token);
      setUsernameInput("");
      setPasswordInput("");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setRecords([]);
  };

  const calculateHours = (entry, exit) => {
    if (!entry || !exit) return 0;
    const [eHour, eMin] = entry.split(":").map(Number);
    const [xHour, xMin] = exit.split(":").map(Number);
    const totalMinutes = (xHour * 60 + xMin) - (eHour * 60 + eMin);
    const hours = totalMinutes / 60;
    return hours > 0 ? Number(hours.toFixed(2)) : 0;
  };

  const calculatedHours = calculateHours(entryTime, exitTime);

  const handleSubmitRecord = async (e) => {
    e.preventDefault();
    try {
      const recordData = {
        worker_name: workerName,
        work_date: workDate,
        entry_time: entryTime,
        exit_time: exitTime,
        calculated_hours: calculatedHours,
        cost_center: costCenter,
        description: description,
      };

      if (editingId) {
        await updateRecord(editingId, recordData);
        setEditingId(null);
      } else {
        await createRecord(recordData);
      }

      setWorkerName("");
      setCostCenter("");
      setDescription("");
      loadRecords();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setWorkerName(rec.worker_name || rec.trabajador || "");
    setWorkDate(rec.work_date || rec.fecha || "");
    setEntryTime(rec.entry_time || rec.hora_entrada || "08:00");
    setExitTime(rec.exit_time || rec.hora_salida || "17:00");
    setCostCenter(rec.cost_center || rec.centro_costo || "");
    setDescription(rec.description || rec.descripcion || "");
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este registro?")) {
      try {
        await deleteRecord(id);
        loadRecords();
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  const filteredRecords = records.filter((rec) => {
    const name = (rec.worker_name || rec.trabajador || "").toLowerCase();
    const center = (rec.cost_center || rec.centro_costo || "").toLowerCase();
    const date = (rec.work_date || rec.fecha || "").toLowerCase();
    const desc = (rec.description || rec.descripcion || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || center.includes(term) || date.includes(term) || desc.includes(term);
  });

  // Exportar a Excel con diseño profesional, colores corporativos y totales
  const handleExportExcel = () => {
    if (records.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }

    // 1. Construir matriz de datos (Filas y Columnas)
    const aoa = [
      ["REPORTE GENERAL DE JORNADAS Y COSTOS"], // Título superior
      [], // Espacio
      ["N°", "Trabajador", "Fecha", "Entrada", "Salida", "Horas", "Centro de Costo", "Descripción de Tareas"] // Cabeceras
    ];

    let totalHorasSuma = 0;

    records.forEach((r, index) => {
      const h = Number(r.calculated_hours || r.horas || 0);
      totalHorasSuma += h;
      aoa.push([
        index + 1,
        r.worker_name || r.trabajador || "",
        r.work_date || r.fecha || "",
        r.entry_time || r.hora_entrada || "",
        r.exit_time || r.hora_salida || "",
        h,
        r.cost_center || r.centro_costo || "General",
        r.description || r.descripcion || ""
      ]);
    });

    // Fila de Total Final
    aoa.push(["", "", "", "", "TOTAL HORAS:", totalHorasSuma, "", ""]);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // 2. Definir Estilos Profesionales
    const headerStyle = {
      font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } }, // Color Índigo Corporativo
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const titleStyle = {
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "1E293B" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const cellStyle = {
      font: { name: "Arial", sz: 10 },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      },
      alignment: { vertical: "center" }
    };

    const totalStyle = {
      font: { name: "Arial", sz: 11, bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "E2E8F0" } }, // Gris claro corporativo
      border: {
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } }
      },
      alignment: { horizontal: "right", vertical: "center" }
    };

    // Aplicar estilos celda por celda
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;

        if (R === 0) {
          worksheet[cellAddress].s = titleStyle;
        } else if (R === 2) {
          worksheet[cellAddress].s = headerStyle;
        } else if (R === range.e.r) {
          worksheet[cellAddress].s = totalStyle;
        } else {
          worksheet[cellAddress].s = cellStyle;
        }
      }
    }

    // Ancho de columnas adaptativo
    worksheet["!cols"] = [
      { wch: 6 },  // N°
      { wch: 22 }, // Trabajador
      { wch: 14 }, // Fecha
      { wch: 12 }, // Entrada
      { wch: 12 }, // Salida
      { wch: 14 }, // Horas
      { wch: 20 }, // Centro de Costo
      { wch: 40 }, // Descripción
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jornadas Laborales");
    XLSX.writeFile(workbook, "Reporte_Jornadas_Profesional.xlsx");
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleImport = () => {
    alert("Para importar masivamente, puedes utilizar tu plantilla de Excel conectada a la base de datos.");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400 text-2xl mb-3 shadow-inner">
              ⚡
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isLoginView ? "Bienvenido de nuevo" : "Crea tu Cuenta"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Plataforma Profesional de Horas</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Usuario</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition duration-200"
            >
              {isLoginView ? "Entrar al Sistema" : "Registrarse"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLoginView(!isLoginView)}
              className="text-sm text-slate-400 hover:text-indigo-400 transition"
            >
              {isLoginView ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availableMonths = Array.from(new Set(records.map(r => {
    const d = r.work_date || r.fecha;
    return d ? d.substring(0, 7) : "";
  }))).filter(Boolean).sort().reverse();

  const recordsForStats = records.filter(r => {
    if (selectedMonth === "all") return true;
    const d = r.work_date || r.fecha;
    return d && d.startsWith(selectedMonth);
  });

  const totalHoras = recordsForStats.reduce((acc, curr) => acc + (Number(curr.calculated_hours || curr.horas) || 0), 0);
  
  const horasPorTrabajador = recordsForStats.reduce((acc, curr) => {
    const t = curr.worker_name || curr.trabajador || "Sin nombre";
    const h = Number(curr.calculated_hours || curr.horas) || 0;
    acc[t] = (acc[t] || 0) + h;
    return acc;
  }, {});

  const horasPorCentro = recordsForStats.reduce((acc, curr) => {
    const c = curr.cost_center || curr.centro_costo || "General";
    const h = Number(curr.calculated_hours || curr.horas) || 0;
    acc[c] = (acc[c] || 0) + h;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold">
            AR
          </div>
          <div>
            <h1 className="font-bold text-white text-lg">APP REGISTRO</h1>
            <p className="text-xs text-slate-400">Control de Jornadas y Costos</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentTab("gestion")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              currentTab === "gestion" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            📋 Gestión
          </button>
          <button
            onClick={() => setCurrentTab("estadisticas")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              currentTab === "estadisticas" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            📊 Estadísticas
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {currentTab === "gestion" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl h-fit print:hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-white text-base">
                  {editingId ? "✏️ Editar Registro" : "➕ Nuevo Registro"}
                </h2>
                <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg text-xs font-bold">
                  {calculatedHours.toFixed(2)} hrs
                </span>
              </div>

              <form onSubmit={handleSubmitRecord} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Trabajador *</label>
                  <input
                    type="text"
                    required
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Entrada</label>
                    <input
                      type="time"
                      required
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Salida</label>
                    <input
                      type="time"
                      required
                      value={exitTime}
                      onChange={(e) => setExitTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Centro de Costo</label>
                  <input
                    type="text"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. Operaciones"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Descripción</label>
                  <textarea
                    rows="2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Detalle de tareas..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition duration-200"
                >
                  {editingId ? "Actualizar Registro" : "Guardar Registro"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setWorkerName("");
                      setCostCenter("");
                      setDescription("");
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 rounded-xl text-sm transition"
                  >
                    Cancelar Edición
                  </button>
                )}
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 print:hidden">
                <div>
                  <h2 className="font-bold text-white text-lg">Historial de Registros</h2>
                  <p className="text-xs text-slate-400">Consulta, filtra y gestiona tus jornadas laborales</p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={handleImport} className="bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition">
                    📥 Importar
                  </button>
                  <button onClick={handleExportExcel} className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition">
                    📊 Excel
                  </button>
                  <button onClick={handleExportPDF} className="bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition">
                    📄 PDF
                  </button>
                </div>
              </div>

              <div className="mb-4 print:hidden">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Buscar por trabajador, centro de costo, descripción o fecha..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {loading ? (
                <p className="text-center text-slate-500 py-8">Cargando registros...</p>
              ) : filteredRecords.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No se encontraron registros coincidentes.</p>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                        <th className="pb-3 px-3">Trabajador</th>
                        <th className="pb-3 px-3">Fecha</th>
                        <th className="pb-3 px-3">Horario</th>
                        <th className="pb-3 px-3">Horas</th>
                        <th className="pb-3 px-3">Centro Costo</th>
                        <th className="pb-3 px-3">Descripción</th>
                        <th className="pb-3 px-3 text-right print:hidden">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {filteredRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-semibold text-white">
                            {rec.worker_name || rec.trabajador}
                          </td>
                          <td className="py-3 px-3 text-slate-300">{rec.work_date || rec.fecha}</td>
                          <td className="py-3 px-3 text-slate-400 text-xs">
                            {rec.entry_time || rec.hora_entrada} - {rec.exit_time || rec.hora_salida}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-400">
                            {Number(rec.calculated_hours || rec.horas || 0).toFixed(1)} hrs
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-xs">
                            {rec.cost_center || rec.centro_costo || "-"}
                          </td>
                          <td className="py-3 px-3 text-slate-300 text-xs max-w-xs truncate">
                            {rec.description || rec.descripcion || "-"}
                          </td>
                          <td className="py-3 px-3 text-right space-x-2 print:hidden">
                            <button onClick={() => handleEdit(rec)} className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2 py-1 bg-indigo-500/10 rounded-lg">
                              Editar
                            </button>
                            <button onClick={() => handleDelete(rec.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded-lg">
                              Borrar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Filtrar Estadísticas</h3>
                <p className="text-xs text-slate-400">Selecciona un mes específico o visualiza todo el histórico</p>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="all">📅 Todos los meses (Histórico)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>Mes: {m}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Horas del Periodo</p>
                  <h3 className="text-4xl font-extrabold text-emerald-400 mt-1">{totalHoras.toFixed(1)} hrs</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-2xl">
                  ⏱️
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Jornadas en el Periodo</p>
                  <h3 className="text-4xl font-extrabold text-indigo-400 mt-1">{recordsForStats.length}</h3>
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-2xl">
                  📊
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">👤 Distribución de Horas por Trabajador</h3>
              {Object.keys(horasPorTrabajador).length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No hay datos para este mes.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(horasPorTrabajador).map(([nombre, horas]) => {
                    const porcentaje = totalHoras > 0 ? (horas / totalHoras) * 100 : 0;
                    return (
                      <div key={nombre}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-200 font-medium">{nombre}</span>
                          <span className="text-emerald-400 font-bold">{horas.toFixed(1)} hrs ({porcentaje.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                          <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">🏢 Horas por Centro de Costo</h3>
              {Object.keys(horasPorCentro).length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No hay datos para este mes.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(horasPorCentro).map(([centro, horas]) => {
                    const porcentaje = totalHoras > 0 ? (horas / totalHoras) * 100 : 0;
                    return (
                      <div key= {centro}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-200 font-medium">{centro || "Sin especificar"}</span>
                          <span className="text-indigo-400 font-bold">{horas.toFixed(1)} hrs ({porcentaje.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}