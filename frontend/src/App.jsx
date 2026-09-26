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

  // Control de Inactividad (15 min)
  useEffect(() => {
    if (!token) return;
    let inactivityTimer;
    const logoutDueToInactivity = () => {
      alert("⚠️ Tu sesión ha expirado por inactividad.");
      handleLogout();
    };
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(logoutDueToInactivity, 15 * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [token]);

  useEffect(() => {
    if (token) {
      loadRecords();
      if (!isReadOnly) loadUsers();
    }
  }, [token]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await fetchRecords();
      setRecords(data);
    } catch (err) {
      if (err.message.includes("expirada") || err.message.includes("401")) handleLogout();
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
        if (response.ok) loadUsers();
        else {
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
          body: JSON.stringify({ username: usernameInput, password: passwordInput, admin_token: adminTokenInput })
        });
      } else {
        response = await fetch("https://backend-registro-horas.onrender.com/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
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
        body: JSON.stringify({ username: empUsername, password: empPassword, role: "employee", cedula: empCedula })
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
      const recordData = { worker_name: workerName, work_date: workDate, entry_time: entryTime, exit_time: exitTime, calculated_hours: calculatedHours, cost_center: costCenter, description: description };
      if (editingId) {
        await updateRecord(editingId, recordData);
        setEditingId(null);
      } else {
        await createRecord(recordData);
      }
      setWorkerName(""); setCostCenter(""); setDescription("");
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
    if (selectedWorkerFilter !== "all" && worker !== selectedWorkerFilter) return false;
    if (filterType === "month" && selectedFilterValue) return date.startsWith(selectedFilterValue);
    if (filterType === "week" && selectedFilterValue) return getWeekNumber(date) === selectedFilterValue;
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
    const headerStyle = { font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "18181B" } }, alignment: { horizontal: "center", vertical: "center" } };
    const titleStyle = { font: { name: "Arial", sz: 12, bold: true, color: { rgb: "09090B" } }, alignment: { horizontal: "center", vertical: "center" } };
    const cellStyle = { font: { name: "Arial", sz: 9 }, alignment: { vertical: "center" } };
    const totalStyle = { font: { name: "Arial", sz: 10, bold: true }, fill: { fgColor: { rgb: "F4F4F5" } }, alignment: { horizontal: "right", vertical: "center" } };

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

  // ----- PANTALLA DE LOGIN (MODERNA Y MINIMALISTA) -----
  if (!token) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-violet-500/30">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-violet-600/15 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="bg-[#09090b]/80 backdrop-blur-2xl border border-white/5 p-8 sm:p-10 rounded-[24px] shadow-2xl w-full max-w-md relative z-10">
          <div className="mb-8">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#09090b] text-xl mb-4 font-bold">
              AR
            </div>
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Iniciar Sesión</h1>
            <p className="text-zinc-500 text-sm mt-1.5">Plataforma Segura de Horas</p>
          </div>

          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => setLoginRoleType("admin")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                loginRoleType === "admin" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Administrador
            </button>
            <button
              type="button"
              onClick={() => setLoginRoleType("employee")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                loginRoleType === "employee" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Empleado
            </button>
          </div>

          {authError && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Usuario</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-zinc-600"
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-zinc-600"
                placeholder="••••••••"
              />
            </div>

            {loginRoleType === "admin" && (
              <div>
                <label className="block text-xs font-medium text-violet-400 mb-1.5">Token Secreto</label>
                <input
                  type="password"
                  required
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-violet-500/30 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/50 transition-all placeholder:text-zinc-600"
                  placeholder="Código de seguridad"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-3 rounded-xl transition-all duration-200 text-sm active:scale-[0.98]"
            >
              Entrar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----- PLATAFORMA PRINCIPAL (MODERNA Y MINIMALISTA) -----
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 flex flex-col font-sans selection:bg-violet-500/30">
      
      {/* Header Minimalista */}
      <header className="bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 print:hidden">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-[#09090b] font-bold text-xs">
              AR
            </div>
            <div>
              <h1 className="font-semibold text-zinc-100 text-sm tracking-tight">App Registro</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                  {isReadOnly ? "Modo Empleado" : "Administrador"}
                </p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="md:hidden text-zinc-400 hover:text-zinc-200 text-xs font-medium">
            Salir
          </button>
        </div>

        <div className="flex items-center bg-zinc-900/80 p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto">
          <button onClick={() => setCurrentTab("gestion")} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${currentTab === "gestion" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
            Gestión
          </button>
          <button onClick={() => setCurrentTab("estadisticas")} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${currentTab === "estadisticas" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
            Estadísticas
          </button>
          {!isReadOnly && (
            <button onClick={() => setCurrentTab("empleados")} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${currentTab === "empleados" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
              Accesos
            </button>
          )}
        </div>

        <button onClick={handleLogout} className="hidden md:block text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">
          Cerrar Sesión
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {currentTab === "gestion" ? (
          <div className={`grid grid-cols-1 ${isReadOnly ? "lg:grid-cols-1" : "lg:grid-cols-3"} gap-6`}>
            
            {/* Panel Izquierdo: Formulario */}
            {!isReadOnly && (
              <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-[20px] h-fit print:hidden">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-medium text-zinc-100 text-sm">
                    {editingId ? "Editar Registro" : "Nuevo Registro"}
                  </h2>
                  <span className="text-zinc-400 text-xs font-mono bg-zinc-900 px-2 py-1 rounded-md border border-white/5">
                    {calculatedHours.toFixed(2)} hrs
                  </span>
                </div>

                <form onSubmit={handleSubmitRecord} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Trabajador</label>
                    <input type="text" required value={workerName} onChange={(e) => setWorkerName(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-zinc-600" placeholder="Nombre completo" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Fecha</label>
                    <input type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Entrada</label>
                      <input type="time" required value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Salida</label>
                      <input type="time" required value={exitTime} onChange={(e) => setExitTime(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Cédula / CC</label>
                    <input type="text" required value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-zinc-600" placeholder="Ej. 1700000000" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Descripción</label>
                    <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-zinc-600 resize-none" placeholder="Opcional..."></textarea>
                  </div>
                  <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-2.5 rounded-xl transition-all duration-200 text-sm active:scale-[0.98]">
                    {editingId ? "Guardar Cambios" : "Crear Registro"}
                  </button>
                </form>
              </div>
            )}

            {/* Panel Derecho: Historial */}
            <div className={`${isReadOnly ? "lg:col-span-1" : "lg:col-span-2"} bg-[#0c0c0e] border border-white/5 p-6 sm:p-8 rounded-[20px] flex flex-col justify-between`}>
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
                  <h2 className="font-medium text-zinc-100 text-sm">Historial de Registros</h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button onClick={handleExportExcel} className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
                      Descargar Excel
                    </button>
                    <button onClick={handleExportPDF} className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
                      Imprimir PDF
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 print:hidden">
                  <select value={selectedWorkerFilter} onChange={(e) => { setSelectedWorkerFilter(e.target.value); setSelectedFilterValue(""); setCurrentPage(1); }} className="bg-zinc-900/50 border border-white/5 rounded-lg px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-violet-500 transition-all">
                    <option value="all">Todos los trabajadores</option>
                    {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setSelectedFilterValue(""); setCurrentPage(1); }} className="bg-zinc-900/50 border border-white/5 rounded-lg px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-violet-500 transition-all">
                    <option value="all">Filtro de tiempo: Inactivo</option>
                    <option value="month">Filtrar por Mes</option>
                    <option value="week">Filtrar por Semana</option>
                  </select>
                  {filterType === "month" && (
                    <select value={selectedFilterValue} onChange={(e) => { setSelectedFilterValue(e.target.value); setCurrentPage(1); }} className="bg-zinc-900/50 border border-white/5 rounded-lg px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-violet-500 transition-all">
                      <option value="">Seleccionar mes</option>
                      {availableMonthsForWorker.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                  {filterType === "week" && (
                    <select value={selectedFilterValue} onChange={(e) => { setSelectedFilterValue(e.target.value); setCurrentPage(1); }} className="bg-zinc-900/50 border border-white/5 rounded-lg px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-violet-500 transition-all">
                      <option value="">Seleccionar semana</option>
                      {availableWeeksForWorker.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  )}
                </div>

                {loading ? (
                  <div className="py-12 flex justify-center"><span className="text-zinc-600 text-sm">Cargando datos...</span></div>
                ) : filteredRecords.length === 0 ? (
                  <div className="py-12 flex justify-center"><span className="text-zinc-600 text-sm">No se encontraron resultados.</span></div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse min-w-[650px]">
                      <thead>
                        <tr className="bg-zinc-900/30 text-zinc-500 text-[10px] font-medium uppercase tracking-widest border-b border-white/5">
                          <th className="py-3 px-4">Trabajador</th>
                          <th className="py-3 px-4">Fecha</th>
                          <th className="py-3 px-4">Horario</th>
                          <th className="py-3 px-4">Total</th>
                          <th className="py-3 px-4">Cédula</th>
                          <th className="py-3 px-4">Nota</th>
                          {!isReadOnly && <th className="py-3 px-4 text-right print:hidden">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {currentRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-zinc-900/20 transition-colors group">
                            <td className="py-3.5 px-4 font-medium text-zinc-200">{rec.worker_name || rec.trabajador}</td>
                            <td className="py-3.5 px-4 text-zinc-400">{rec.work_date || rec.fecha}</td>
                            <td className="py-3.5 px-4 text-zinc-500">{rec.entry_time || rec.hora_entrada} - {rec.exit_time || rec.hora_salida}</td>
                            <td className="py-3.5 px-4"><span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-white/5">{Number(rec.calculated_hours || rec.horas || 0).toFixed(1)}h</span></td>
                            <td className="py-3.5 px-4 text-zinc-500">{rec.cost_center || rec.centro_costo || "-"}</td>
                            <td className="py-3.5 px-4 text-zinc-500 max-w-[120px] truncate" title={rec.description || rec.descripcion}>{rec.description || rec.descripcion || "-"}</td>
                            {!isReadOnly && (
                              <td className="py-3.5 px-4 text-right space-x-2 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(rec)} className="text-zinc-400 hover:text-white transition-colors">Editar</button>
                                <span className="text-zinc-700">|</span>
                                <button onClick={() => handleDelete(rec.id)} className="text-zinc-400 hover:text-red-400 transition-colors">Eliminar</button>
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
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6 print:hidden">
                  <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="text-zinc-400 hover:text-white disabled:opacity-30 text-xs font-medium transition-colors">
                    ← Anterior
                  </button>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    <span className="text-zinc-200">{currentPage}</span> / {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="text-zinc-400 hover:text-white disabled:opacity-30 text-xs font-medium transition-colors">
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : currentTab === "empleados" && !isReadOnly ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#0c0c0e] border border-white/5 p-6 sm:p-8 rounded-[20px]">
              <h2 className="text-sm font-medium text-zinc-100 mb-1">Generar Acceso</h2>
              <p className="text-xs text-zinc-500 mb-6">Crea cuentas limitadas para visualización.</p>

              {empSuccessMsg && (
                <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-center font-medium">
                  {empSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Usuario</label>
                  <input type="text" required value={empUsername} onChange={(e) => setEmpUsername(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 text-zinc-200 text-sm focus:outline-none focus:border-violet-500" placeholder="Ej. juan" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Contraseña</label>
                  <input type="password" required value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 text-zinc-200 text-sm focus:outline-none focus:border-violet-500" placeholder="••••••••" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Cédula</label>
                  <input type="text" required value={empCedula} onChange={(e) => setEmpCedula(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 text-zinc-200 text-sm focus:outline-none focus:border-violet-500" placeholder="17000000" />
                </div>
                <div className="md:col-span-1">
                  <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-2 rounded-xl transition-all text-sm">
                    Crear Cuenta
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 p-6 sm:p-8 rounded-[20px]">
              <h2 className="text-sm font-medium text-zinc-100 mb-6">Directorio de Accesos</h2>
              {usersList.length === 0 ? (
                <div className="py-8 flex justify-center"><span className="text-zinc-600 text-sm">No hay usuarios registrados.</span></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900/30 text-zinc-500 text-[10px] font-medium uppercase tracking-widest border-b border-white/5">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Cédula</th>
                        <th className="py-3 px-4 text-right">Revocar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-900/20 transition-colors">
                          <td className="py-3 px-4 text-zinc-500">#{u.id}</td>
                          <td className="py-3 px-4 font-medium text-zinc-200">{u.username}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${u.role === 'admin' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-zinc-800 text-zinc-400 border-white/5'}`}>
                              {u.role === 'admin' ? 'Admin' : 'Empleado'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-mono">{u.cedula || "-"}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-zinc-500 hover:text-red-400 transition-colors">Eliminar</button>
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
            <div className="bg-[#0c0c0e] border border-white/5 p-4 rounded-[16px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-zinc-300 text-sm font-medium">Analíticas Mensuales</h3>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-zinc-900/50 border border-white/5 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-violet-500 transition-all w-full sm:w-auto">
                <option value="all">Historico global</option>
                {availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-[20px] flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-medium mb-1">Total Horas</p>
                  <h3 className="text-3xl font-semibold text-zinc-100">{totalHorasStats.toFixed(1)} <span className="text-lg text-zinc-600 font-normal">hrs</span></h3>
                </div>
              </div>
              <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-[20px] flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-medium mb-1">Total Jornadas</p>
                  <h3 className="text-3xl font-semibold text-zinc-100">{recordsForStats.length}</h3>
                </div>
              </div>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 p-6 sm:p-8 rounded-[20px]">
              <h3 className="text-zinc-100 text-sm font-medium mb-8">Rendimiento por Empleado</h3>
              {chartData.length === 0 ? (
                <div className="py-12 flex justify-center"><span className="text-zinc-600 text-sm">Sin datos para graficar.</span></div>
              ) : (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px", color: "#f4f4f5", fontSize: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)" }} cursor={{fill: '#27272a', opacity: 0.4}} />
                      <Bar dataKey="horas" fill="#f4f4f5" radius={[4, 4, 0, 0]} />
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