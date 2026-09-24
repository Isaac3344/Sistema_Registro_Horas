import React, { useState, useEffect } from "react";
import XLSX from "xlsx-js-style";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { 
  fetchRecords, 
  createRecord, 
  updateRecord, 
  deleteRecord 
} from "./api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "admin");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [adminTokenInput, setAdminTokenInput] = useState("");
  const [loginRoleType, setLoginRoleType] = useState("admin");
  const [authError, setAuthError] = useState("");

  const [currentTab, setCurrentTab] = useState("gestion");
  const [records, setRecords] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedFilterValue, setSelectedFilterValue] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

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
    if (isReadOnly) return;
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
      let response;
      if (loginRoleType === "admin") {
        response = await fetch("https://backend-registro-horas.onrender.com/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username: usernameInput, 
            password: passwordInput, 
            admin_token: adminTokenInput 
          })
        });
      } else {
        response = await fetch("https://backend-registro-horas.onrender.com/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username: usernameInput, 
            password: passwordInput 
          })
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Error al iniciar sesión");

      const assignedRole = data.role || "admin";
      setToken(data.token);
      setUserRole(assignedRole);
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", assignedRole);
      setUsernameInput("");
      setPasswordInput("");
      setAdminTokenInput("");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setEmpSuccessMsg("");
    try {
      const response = await fetch("https://backend-registro-horas.onrender.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: empUsername,
          password: empPassword,
          role: "employee",
          cedula: empCedula
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Error al crear empleado");

      setEmpSuccessMsg(`¡Acceso creado para ${empUsername}!`);
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

  const uniqueWorkers = Array.from(new Set(records.map(r => r.worker_name || r.trabajador))).filter(Boolean).sort();

  const filteredRecords = records.filter((rec) => {
    const worker = (rec.worker_name || rec.trabajador || "");
    const date = (rec.work_date || rec.fecha || "");

    if (selectedWorkerFilter !== "all" && worker !== selectedWorkerFilter) {
      return false;
    }

    if (filterType === "month" && selectedFilterValue) {
      return date.startsWith(selectedFilterValue);
    }
    if (filterType === "week" && selectedFilterValue) {
      return getWeekNumber(date) === selectedFilterValue;
    }
    return true;
  });

  const recordsForWorker = selectedWorkerFilter === "all" ? records : records.filter(r => (r.worker_name || r.trabajador) === selectedWorkerFilter);
  const availableMonthsForWorker = Array.from(new Set(recordsForWorker.map(r => (r.work_date || r.fecha || "").substring(0, 7)))).filter(Boolean).sort().reverse();
  const availableWeeksForWorker = Array.from(new Set(recordsForWorker.map(r => getWeekNumber(r.work_date || r.fecha || "")))).filter(Boolean).sort().reverse();

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);

  const availableMonths = Array.from(new Set(records.map(r => (r.work_date || r.fecha || "").substring(0, 7)))).filter(Boolean).sort().reverse();
  const recordsForStats = records.filter(r => {
    if (selectedMonth === "all") return true;
    const d = r.work_date || r.fecha;
    return d && d.startsWith(selectedMonth);
  });

  const totalHorasStats = recordsForStats.reduce((acc, curr) => acc + (Number(curr.calculated_hours || curr.horas) || 0), 0);

  const chartDataMap = {};
  recordsForStats.forEach(r => {
    const name = r.worker_name || r.trabajador || "Desconocido";
    const hrs = Number(r.calculated_hours || r.horas || 0);
    if (!chartDataMap[name]) chartDataMap[name] = 0;
    chartDataMap[name] += hrs;
  });

  const chartData = Object.keys(chartDataMap).map(name => ({
    name,
    horas: Number(chartDataMap[name].toFixed(1))
  }));

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

    const headerStyle = { font: { name: "Inter", sz: 11, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, alignment: { horizontal: "center", vertical: "center" } };
    const titleStyle = { font: { name: "Inter", sz: 14, bold: true, color: { rgb: "0F172A" } }, alignment: { horizontal: "center", vertical: "center" } };
    const cellStyle = { font: { name: "Inter", sz: 10 }, alignment: { vertical: "center" } };
    const totalStyle = { font: { name: "Inter", sz: 11, bold: true }, fill: { fgColor: { rgb: "E2E8F0" } }, alignment: { horizontal: "right", vertical: "center" } };

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Luces decorativas de fondo de alta gama */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }}></div>

        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.6)] w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl text-white text-2xl shadow-lg shadow-indigo-500/30 mb-4 ring-4 ring-indigo-500/10">
              ⚡
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Iniciar Sesión</h1>
            <p className="text-slate-400 text-sm mt-1.5 font-medium">Plataforma Corporativa de Control de Horas</p>
          </div>

          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 mb-6 shadow-inner">
            <button
              type="button"
              onClick={() => setLoginRoleType("admin")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                loginRoleType === "admin" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40" : "text-slate-400 hover:text-white"
              }`}
            >
              👑 Administrador
            </button>
            <button
              type="button"
              onClick={() => setLoginRoleType("employee")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                loginRoleType === "employee" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/40" : "text-slate-400 hover:text-white"
              }`}
            >
              👁️ Empleado
            </button>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-medium text-center shadow-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Usuario</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>

            {loginRoleType === "admin" && (
              <div>
                <label className="block text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">🔑 Token Secreto de Admin</label>
                <input
                  type="password"
                  required
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-indigo-500/40 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 transition-all placeholder:text-slate-600"
                  placeholder="Código token de seguridad"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-300 text-sm active:scale-[0.99]"
            >
              Acceder al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header corporativo refinado */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-xl print:hidden">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/20">
              AR
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-wide">APP REGISTRO</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {isReadOnly ? "Modo Empleado" : "Panel Administrador"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="md:hidden bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            Salir
          </button>
        </div>

        {/* Pestañas de navegación de alta gama */}
        <div className="flex items-center bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 w-full md:w-auto overflow-x-auto justify-center shadow-inner">
          <button
            onClick={() => setCurrentTab("gestion")}
            className={`flex-1 md:flex-none px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              currentTab === "gestion" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            📋 Gestión
          </button>
          <button
            onClick={() => setCurrentTab("estadisticas")}
            className={`flex-1 md:flex-none px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              currentTab === "estadisticas" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            📊 Estadísticas
          </button>
          {!isReadOnly && (
            <button
              onClick={() => setCurrentTab("empleados")}
              className={`flex-1 md:flex-none px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                currentTab === "empleados" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              👤 Accesos
            </button>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="hidden md:block bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-5 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {currentTab === "gestion" ? (
          <div className={`grid grid-cols-1 ${isReadOnly ? "lg:grid-cols-1" : "lg:grid-cols-3"} gap-6`}>
            
            {!isReadOnly && (
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-2xl h-fit print:hidden">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-bold text-white text-sm sm:text-base tracking-tight">
                    {editingId ? "✏️ Editar Registro" : "➕ Nuevo Registro"}
                  </h2>
                  <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-sm">
                    {calculatedHours.toFixed(2)} hrs
                  </span>
                </div>

                <form onSubmit={handleSubmitRecord} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trabajador *</label>
                    <input
                      type="text"
                      required
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fecha</label>
                    <input
                      type="date"
                      required
                      value={workDate}
                      onChange={(e) => setWorkDate(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Entrada</label>
                      <input
                        type="time"
                        required
                        value={entryTime}
                        onChange={(e) => setEntryTime(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Salida</label>
                      <input
                        type="time"
                        required
                        value={exitTime}
                        onChange={(e) => setExitTime(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Centro de Costo / Cédula *</label>
                    <input
                      type="text"
                      required
                      value={costCenter}
                      onChange={(e) => setCostCenter(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                      placeholder="Cédula del empleado"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción</label>
                    <textarea
                      rows="2"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                      placeholder="Detalle de tareas..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all duration-300 text-sm active:scale-[0.99]"
                  >
                    {editingId ? "Actualizar Registro" : "Guardar Registro"}
                  </button>
                </form>
              </div>
            )}

            <div className={`${isReadOnly ? "lg:col-span-1" : "lg:col-span-2"} bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col justify-between`}>
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
                  <div>
                    <h2 className="font-bold text-white text-lg tracking-tight">Historial de Registros</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Consulta y exporta tus jornadas detalladas</p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button onClick={handleExportExcel} className="flex-1 sm:flex-none bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm">
                      📊 Excel ({filteredRecords.length})
                    </button>
                    <button onClick={handleExportPDF} className="flex-1 sm:flex-none bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm">
                      📄 PDF
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 print:hidden">
                  <select
                    value={selectedWorkerFilter}
                    onChange={(e) => {
                      setSelectedWorkerFilter(e.target.value);
                      setSelectedFilterValue("");
                      setCurrentPage(1);
                    }}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="all">👤 Todos los trabajadores</option>
                    {uniqueWorkers.map(w => (
                      <option key={w} value={w}>Trabajador: {w}</option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setSelectedFilterValue("");
                      setCurrentPage(1);
                    }}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="all">⚡ Todos los periodos</option>
                    <option value="month">📅 Filtrar por Mes</option>
                    <option value="week">📆 Filtrar por Semana</option>
                  </select>

                  {filterType === "month" && (
                    <select
                      value={selectedFilterValue}
                      onChange={(e) => {
                        setSelectedFilterValue(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    >
                      <option value="">Selecciona el mes...</option>
                      {availableMonthsForWorker.map(m => (
                        <option key={m} value={m}>Mes: {m}</option>
                      ))}
                    </select>
                  )}

                  {filterType === "week" && (
                    <select
                      value={selectedFilterValue}
                      onChange={(e) => {
                        setSelectedFilterValue(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    >
                      <option value="">Selecciona la semana...</option>
                      {availableWeeksForWorker.map(w => (
                        <option key={w} value={w}>Semana: {w}</option>
                      ))}
                    </select>
                  )}
                </div>

                {loading ? (
                  <p className="text-center text-slate-500 py-12 text-sm font-medium">Cargando registros...</p>
                ) : filteredRecords.length === 0 ? (
                  <p className="text-center text-slate-500 py-12 text-sm font-medium">No se encontraron registros para este filtro.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800/60">
                    <table className="w-full text-left border-collapse min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800/80">
                          <th className="py-3.5 px-4">Trabajador</th>
                          <th className="py-3.5 px-4">Fecha</th>
                          <th className="py-3.5 px-4">Horario</th>
                          <th className="py-3.5 px-4">Horas</th>
                          <th className="py-3.5 px-4">Centro Costo</th>
                          <th className="py-3.5 px-4">Descripción</th>
                          {!isReadOnly && <th className="py-3.5 px-4 text-right print:hidden">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-xs sm:text-sm font-medium">
                        {currentRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-4 px-4 font-bold text-white">{rec.worker_name || rec.trabajador}</td>
                            <td className="py-4 px-4 text-slate-300">{rec.work_date || rec.fecha}</td>
                            <td className="py-4 px-4 text-slate-400 text-xs">{rec.entry_time || rec.hora_entrada} - {rec.exit_time || rec.hora_salida}</td>
                            <td className="py-4 px-4 font-extrabold text-emerald-400">{Number(rec.calculated_hours || rec.horas || 0).toFixed(1)} hrs</td>
                            <td className="py-4 px-4 text-slate-400 text-xs">{rec.cost_center || rec.centro_costo || "-"}</td>
                            <td className="py-4 px-4 text-slate-300 text-xs max-w-xs truncate">{rec.description || rec.descripcion || "-"}</td>
                            {!isReadOnly && (
                              <td className="py-4 px-4 text-right space-x-2 print:hidden whitespace-nowrap">
                                <button onClick={() => handleEdit(rec)} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl transition-all">Editar</button>
                                <button onClick={() => handleDelete(rec.id)} className="text-red-400 hover:text-red-300 text-xs font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all">Borrar</button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-5 mt-6 print:hidden">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs text-slate-400 font-semibold">
                    Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : currentTab === "empleados" && !isReadOnly ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl">
              <h2 className="text-base sm:text-lg font-bold text-white mb-1.5">👤 Crear Acceso para Empleado</h2>
              <p className="text-xs text-slate-400 mb-6 font-medium">Genera un usuario de solo vista vinculado de forma segura a su número de cédula.</p>

              {empSuccessMsg && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs sm:text-sm text-center font-bold shadow-sm">
                  {empSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Usuario</label>
                  <input
                    type="text"
                    required
                    value={empUsername}
                    onChange={(e) => setEmpUsername(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                    placeholder="Ej. juan_emp"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cédula del Empleado *</label>
                  <input
                    type="text"
                    required
                    value={empCedula}
                    onChange={(e) => setEmpCedula(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                    placeholder="Ej. 1728394850"
                  />
                </div>

                <div className="md:col-span-3 pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all duration-300 text-sm active:scale-[0.99]"
                  >
                    Crear Cuenta de Empleado
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl">
              <h2 className="text-base sm:text-lg font-bold text-white mb-6">📋 Lista de Usuarios Registrados</h2>
              {usersList.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8 font-medium">No hay usuarios cargados.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800/60">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800/80">
                        <th className="py-3.5 px-4">ID</th>
                        <th className="py-3.5 px-4">Usuario</th>
                        <th className="py-3.5 px-4">Rol</th>
                        <th className="py-3.5 px-4">Cédula Vinculada</th>
                        <th className="py-3.5 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs sm:text-sm font-medium">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-4 text-slate-400">#{u.id}</td>
                          <td className="py-4 px-4 font-bold text-white">{u.username}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                              {u.role === 'admin' ? '👑 Admin' : '👁️ Empleado'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-300 font-mono text-xs">{u.cedula || "-"}</td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="text-red-400 hover:text-red-300 text-xs font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"
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
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-bold text-base">Filtrar Estadísticas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Selecciona un mes específico para analizar rendimiento</p>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all w-full sm:w-auto"
              >
                <option value="all">📅 Todos los meses (Histórico)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>Mes: {m}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Horas del Periodo</p>
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-2">{totalHorasStats.toFixed(1)} hrs</h3>
                </div>
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl shadow-inner">⏱️</div>
              </div>

              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Jornadas en el Periodo</p>
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-indigo-400 mt-2">{recordsForStats.length}</h3>
                </div>
                <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 text-2xl shadow-inner">📊</div>
              </div>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl">
              <h3 className="text-white font-bold text-base mb-6">📈 Horas Totales por Trabajador</h3>
              {chartData.length === 0 ? (
                <p className="text-center text-slate-500 py-12 text-sm font-medium">No hay datos suficientes para mostrar el gráfico.</p>
              ) : (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "16px", color: "#fff", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }} 
                      />
                      <Bar dataKey="horas" fill="#6366f1" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}