import React, { useState, useEffect } from "react";
import XLSX from "xlsx-js-style";
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
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "admin");
  const [isLoginView, setIsLoginView] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [currentTab, setCurrentTab] = useState("gestion");
  const [records, setRecords] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedFilterValue, setSelectedFilterValue] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [workerName, setWorkerName] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryTime, setEntryTime] = useState("08:00");
  const [exitTime, setExitTime] = useState("17:00");
  const [costCenter, setCostCenter] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [empUsername, setEmpUsername] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empCedula, setEmpCedula] = useState("");
  const [empSuccessMsg, setEmpSuccessMsg] = useState("");

  const isReadOnly = userRole === "employee";

  useEffect(() => {
    if (token) {
      loadRecords();
      if (!isReadOnly) {
        loadUsers();
      }
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

  const loadUsers = async () => {
    try {
      const response = await fetch("https://backend-registro-horas.onrender.com/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`¿Estás seguro de eliminar al usuario "${username}"?`)) {
      try {
        const response = await fetch(`https://backend-registro-horas.onrender.com/users/${userId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          loadUsers();
        } else {
          const errData = await response.json();
          alert("Error al eliminar usuario: " + (errData.detail || "Error desconocido"));
        }
      } catch (err) {
        alert("Error de conexión: " + err.message);
      }
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      let data = await loginUser(usernameInput, passwordInput);
      setToken(data.token);
      setUserRole(data.role || "admin");
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.role || "admin");
      setUsernameInput("");
      setPasswordInput("");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setEmpSuccessMsg("");
    try {
      await registerUser({
        username: empUsername,
        password: empPassword,
        role: "employee",
        cedula: empCedula
      });
      setEmpSuccessMsg(`¡Acceso creado para ${empUsername} (Cédula: ${empCedula})!`);
      setEmpUsername("");
      setEmpPassword("");
      setEmpCedula("");
      loadUsers();
    } catch (err) {
      alert("Error al crear empleado: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    setToken("");
    setUserRole("admin");
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
    if (isReadOnly) return;
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
    if (isReadOnly) return;
    setEditingId(rec.id);
    setWorkerName(rec.worker_name || rec.trabajador || "");
    setWorkDate(rec.work_date || rec.fecha || "");
    setEntryTime(rec.entry_time || rec.hora_entrada || "08:00");
    setExitTime(rec.exit_time || rec.hora_salida || "17:00");
    setCostCenter(rec.cost_center || rec.centro_costo || "");
    setDescription(rec.description || rec.descripcion || "");
  };

  const handleDelete = async (id) => {
    if (isReadOnly) return;
    if (window.confirm("¿Estás seguro de eliminar este registro?")) {
      try {
        await deleteRecord(id);
        loadRecords();
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  const getWeekNumber = (dateString) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(year, month - 1, diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (dateObj) => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };
    return `${formatDate(monday)} al ${formatDate(sunday)}`;
  };

  const filteredRecords = records.filter((rec) => {
    const name = (rec.worker_name || rec.trabajador || "").toLowerCase();
    const center = (rec.cost_center || rec.centro_costo || "").toLowerCase();
    const date = (rec.work_date || rec.fecha || "");
    const desc = (rec.description || rec.descripcion || "").toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = name.includes(term) || center.includes(term) || date.includes(term) || desc.includes(term);
    if (!matchesSearch) return false;

    if (filterType === "month" && selectedFilterValue) {
      return date.startsWith(selectedFilterValue);
    }
    if (filterType === "week" && selectedFilterValue) {
      return getWeekNumber(date) === selectedFilterValue;
    }
    return true;
  });

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }

    const aoa = [
      ["REPORTE DE JORNADAS Y COSTOS"],
      [],
      ["N°", "Trabajador", "Fecha", "Entrada", "Salida", "Horas", "Centro de Costo", "Descripción de Tareas"]
    ];

    let totalHorasSuma = 0;
    filteredRecords.forEach((r, index) => {
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

    aoa.push(["", "", "", "", "TOTAL HORAS:", totalHorasSuma, "", ""]);
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    const headerStyle = { font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, alignment: { horizontal: "center", vertical: "center" } };
    const titleStyle = { font: { name: "Arial", sz: 14, bold: true, color: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } };
    const cellStyle = { font: { name: "Arial", sz: 10 }, alignment: { vertical: "center" } };
    const totalStyle = { font: { name: "Arial", sz: 11, bold: true }, fill: { fgColor: { rgb: "E2E8F0" } }, alignment: { horizontal: "right", vertical: "center" } };

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        if (R === 0) worksheet[cellAddress].s = titleStyle;
        else if (R === 2) worksheet[cellAddress].s = headerStyle;
        else if (R === range.e.r) worksheet[cellAddress].s = totalStyle;
        else worksheet[cellAddress].s = cellStyle;
      }
    }

    worksheet["!cols"] = [{ wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, "Reporte_Jornadas.xlsx");
  };

  const handleExportPDF = () => window.print();

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400 text-2xl mb-2 shadow-inner">
              ⚡
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Iniciar Sesión</h1>
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
              Entrar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  const availableMonths = Array.from(new Set(records.map(r => (r.work_date || r.fecha || "").substring(0, 7)))).filter(Boolean).sort().reverse();
  const availableWeeks = Array.from(new Set(records.map(r => getWeekNumber(r.work_date || r.fecha || "")))).filter(Boolean).sort().reverse();

  const recordsForStats = records.filter(r => {
    if (selectedMonth === "all") return true;
    const d = r.work_date || r.fecha;
    return d && d.startsWith(selectedMonth);
  });

  const totalHorasStats = recordsForStats.reduce((acc, curr) => acc + (Number(curr.calculated_hours || curr.horas) || 0), 0);
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
            <p className="text-xs text-slate-400">
              {isReadOnly ? "👁️ Modo Empleado (Solo Vista)" : "Panel de Administrador"}
            </p>
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
          {!isReadOnly && (
            <button
              onClick={() => setCurrentTab("empleados")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                currentTab === "empleados" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              👤 Gestión de Accesos
            </button>
          )}
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
          <div className={`grid grid-cols-1 ${isReadOnly ? "lg:grid-cols-1" : "lg:grid-cols-3"} gap-6`}>
            
            {!isReadOnly && (
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
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Centro de Costo / Cédula *</label>
                    <input
                      type="text"
                      required
                      value={costCenter}
                      onChange={(e) => setCostCenter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="Cédula del empleado"
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
                </form>
              </div>
            )}

            <div className={`${isReadOnly ? "lg:col-span-1" : "lg:col-span-2"} bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 print:hidden">
                <div>
                  <h2 className="font-bold text-white text-lg">Historial de Registros</h2>
                  <p className="text-xs text-slate-400">Consulta y exporta tus jornadas</p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={handleExportExcel} className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition">
                    📊 Excel ({filteredRecords.length})
                  </button>
                  <button onClick={handleExportPDF} className="bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition">
                    📄 PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 print:hidden">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Buscar trabajador o centro..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                />

                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setSelectedFilterValue("");
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="all">⚡ Todos los registros</option>
                  <option value="month">📅 Filtrar por Mes</option>
                  <option value="week">📆 Filtrar por Semana</option>
                </select>

                {filterType === "month" && (
                  <select
                    value={selectedFilterValue}
                    onChange={(e) => setSelectedFilterValue(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="">Selecciona el mes...</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>Mes: {m}</option>
                    ))}
                  </select>
                )}

                {filterType === "week" && (
                  <select
                    value={selectedFilterValue}
                    onChange={(e) => setSelectedFilterValue(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="">Selecciona la semana...</option>
                    {availableWeeks.map(w => (
                      <option key={w} value={w}>Semana: {w}</option>
                    ))}
                  </select>
                )}
              </div>

              {loading ? (
                <p className="text-center text-slate-500 py-8">Cargando registros...</p>
              ) : filteredRecords.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No se encontraron registros.</p>
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
                        {!isReadOnly && <th className="pb-3 px-3 text-right print:hidden">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {filteredRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-semibold text-white">{rec.worker_name || rec.trabajador}</td>
                          <td className="py-3 px-3 text-slate-300">{rec.work_date || rec.fecha}</td>
                          <td className="py-3 px-3 text-slate-400 text-xs">{rec.entry_time || rec.hora_entrada} - {rec.exit_time || rec.hora_salida}</td>
                          <td className="py-3 px-3 font-bold text-emerald-400">{Number(rec.calculated_hours || rec.horas || 0).toFixed(1)} hrs</td>
                          <td className="py-3 px-3 text-slate-400 text-xs">{rec.cost_center || rec.centro_costo || "-"}</td>
                          <td className="py-3 px-3 text-slate-300 text-xs max-w-xs truncate">{rec.description || rec.descripcion || "-"}</td>
                          {!isReadOnly && (
                            <td className="py-3 px-3 text-right space-x-2 print:hidden">
                              <button onClick={() => handleEdit(rec)} className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2 py-1 bg-indigo-500/10 rounded-lg">Editar</button>
                              <button onClick={() => handleDelete(rec.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded-lg">Borrar</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : currentTab === "empleados" ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2">👤 Crear Acceso para Empleado</h2>
              <p className="text-xs text-slate-400 mb-6">Genera un usuario de solo vista vinculado a su número de cédula.</p>

              {empSuccessMsg && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center">
                  {empSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Usuario</label>
                  <input
                    type="text"
                    required
                    value={empUsername}
                    onChange={(e) => setEmpUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. juan_emp"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Cédula del Empleado *</label>
                  <input
                    type="text"
                    required
                    value={empCedula}
                    onChange={(e) => setEmpCedula(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. 1728394850"
                  />
                </div>

                <div className="md:col-span-3">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition duration-200"
                  >
                    Crear Cuenta de Empleado
                  </button>
                </div>
              </form>
            </div>

            {/* Listado de Usuarios con Botón de Eliminar */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">📋 Lista de Usuarios Registrados</h2>
              {usersList.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No hay usuarios cargados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                        <th className="pb-3 px-3">ID</th>
                        <th className="pb-3 px-3">Usuario</th>
                        <th className="pb-3 px-3">Rol</th>
                        <th className="pb-3 px-3">Cédula Vinculada</th>
                        <th className="pb-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 text-slate-400">#{u.id}</td>
                          <td className="py-3 px-3 font-semibold text-white">{u.username}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                              {u.role === 'admin' ? '👑 Administrador' : '👁️ Empleado (Solo Vista)'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-mono text-xs">{u.cedula || "-"}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1 bg-red-500/10 rounded-lg transition"
                            >
                              Eliminar
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
                <p className="text-xs text-slate-400">Selecciona un mes específico</p>
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
                  <h3 className="text-4xl font-extrabold text-emerald-400 mt-1">{totalHorasStats.toFixed(1)} hrs</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-2xl">⏱️</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Jornadas en el Periodo</p>
                  <h3 className="text-4xl font-extrabold text-indigo-400 mt-1">{recordsForStats.length}</h3>
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-2xl">📊</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}