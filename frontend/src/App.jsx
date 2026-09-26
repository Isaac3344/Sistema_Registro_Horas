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
      ["REPORTE DE JORNADAS Y COSTOS"], [],
      ["N°", "Trabajador", "Fecha", "Entrada", "Salida", "Horas", "Cédula", "Descripción de Tareas"]
    ];
    let totalHorasSuma = 0;
    filteredRecords.forEach((r, index) => {
      const h = Number(r.calculated_hours || r.horas || 0);
      totalHorasSuma += h;
      aoa.push([index + 1, r.worker_name || r.trabajador || "", r.work_date || r.fecha || "", r.entry_time || r.hora_entrada || "", r.exit_time || r.hora_salida || "", h, r.cost_center || r.centro_costo || "General", r.description || r.descripcion || ""]);
    });
    aoa.push(["", "", "", "", "TOTAL HORAS:", totalHorasSuma, "", ""]);
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const headerStyle = { font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center", vertical: "center" } };
    const titleStyle = { font: { name: "Arial", sz: 12, bold: true, color: { rgb: "0F172A" } }, alignment: { horizontal: "center", vertical: "center" } };
    const cellStyle = { font: { name: "Arial", sz: 9 }, alignment: { vertical: "center" } };
    const totalStyle = { font: { name: "Arial", sz: 10, bold: true }, fill: { fgColor: { rgb: "DBEAFE" } }, alignment: { horizontal: "right", vertical: "center" } };

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

  // ----- PANTALLA DE LOGIN -----
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] border border-slate-100 p-8 sm:p-10 rounded-[2.5rem] w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/30">
              F
            </div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">Fingoals</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Iniciar Sesión</h1>
            <p className="text-slate-500 text-xs font-bold mt-1">Control de Jornadas y Horas</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setLoginRoleType("admin")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                loginRoleType === "admin" ? "bg-white shadow-md text-blue-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Administrador
            </button>
            <button
              type="button"
              onClick={() => setLoginRoleType("employee")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                loginRoleType === "employee" ? "bg-white shadow-md text-blue-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Empleado
            </button>
          </div>

          {authError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs font-bold text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5">Usuario</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-600 transition-all placeholder:text-slate-400"
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-600 transition-all placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>

            {loginRoleType === "admin" && (
              <div>
                <label className="block text-[11px] font-black text-blue-700 uppercase mb-1.5">🔑 Token de Seguridad</label>
                <input
                  type="password"
                  required
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  className="w-full bg-blue-50 border border-blue-300 rounded-2xl px-4 py-3.5 text-sm text-blue-900 font-bold focus:outline-none focus:border-blue-600 transition-all placeholder:text-blue-400"
                  placeholder="Token secreto"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all text-sm"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----- PLATAFORMA PRINCIPAL (RESPONSIVE + SIDEBAR FIJO) -----
  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col md:flex-row font-sans">
      
      {/* Menú Lateral Fijo en pantallas medianas y grandes */}
      <aside className="w-full md:w-72 bg-[#0F172A] text-white p-6 md:sticky md:top-0 md:h-screen flex flex-col justify-between shrink-0 print:hidden shadow-xl z-50">
        <div>
          <div className="flex items-center gap-3 mb-6 md:mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/40">
              F
            </div>
            <span className="font-black text-xl tracking-tight text-white">Fingoals</span>
          </div>

          <p className="text-[11px] uppercase tracking-wider text-slate-300 font-bold mb-3">Menú Principal</p>
          
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            <button 
              onClick={() => setCurrentTab("gestion")} 
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'gestion' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/30' : 'text-slate-200 hover:bg-slate-800 hover:text-white'}`}
            >
              <span>📊</span> <span className="hidden sm:inline">Panel / Gestión</span><span className="sm:hidden">Gestión</span>
            </button>
            <button 
              onClick={() => setCurrentTab("estadisticas")} 
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'estadisticas' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/30' : 'text-slate-200 hover:bg-slate-800 hover:text-white'}`}
            >
              <span>📈</span> <span className="hidden sm:inline">Analíticas y Reportes</span><span className="sm:hidden">Reportes</span>
            </button>
            {!isReadOnly && (
              <button 
                onClick={() => setCurrentTab("empleados")} 
                className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'empleados' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/30' : 'text-slate-200 hover:bg-slate-800 hover:text-white'}`}
              >
                <span>👥</span> <span className="hidden sm:inline">Accesos / Usuarios</span><span className="sm:hidden">Usuarios</span>
              </button>
            )}
          </nav>
        </div>

        <div className="hidden md:block mt-8 bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-3xl text-white shadow-lg">
          <p className="text-xs font-bold text-blue-200 uppercase">Modo Activo</p>
          <p className="font-black text-sm mt-1">{isReadOnly ? "Empleado" : "Administrador"}</p>
          <button onClick={handleLogout} className="mt-4 w-full bg-white text-slate-900 font-black py-2.5 rounded-xl text-xs hover:bg-slate-100 transition-all shadow-md">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        
        <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-40 print:hidden shadow-sm">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">¡Bienvenido de nuevo!</h1>
            <p className="text-xs text-slate-600 font-bold">Resumen general y control de jornadas</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                {userRole === 'admin' ? 'A' : 'E'}
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-900">Panel Central</p>
                <p className="text-[10px] text-slate-600 font-bold capitalize">{userRole}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="bg-slate-100 text-red-600 px-3.5 py-2 rounded-xl text-xs font-black hover:bg-slate-200 transition-all">
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-10 max-w-7xl mx-auto w-full">
          {currentTab === "gestion" ? (
            <div className={`grid grid-cols-1 ${isReadOnly ? "lg:grid-cols-1" : "lg:grid-cols-3"} gap-8`}>
              
              {!isReadOnly && (
                <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm h-fit print:hidden">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-black text-slate-900 text-base">
                      {editingId ? "Editar Registro" : "Nuevo Registro"}
                    </h2>
                    <span className="text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-black">
                      {calculatedHours.toFixed(2)} hrs
                    </span>
                  </div>

                  <form onSubmit={handleSubmitRecord} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Trabajador</label>
                      <input type="text" required value={workerName} onChange={(e) => setWorkerName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-sm font-bold focus:outline-none focus:border-blue-600" placeholder="Nombre completo" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Fecha</label>
                      <input type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-sm font-bold focus:outline-none focus:border-blue-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Entrada</label>
                        <input type="time" required value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-sm font-bold focus:outline-none focus:border-blue-600" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Salida</label>
                        <input type="time" required value={exitTime} onChange={(e) => setExitTime(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-sm font-bold focus:outline-none focus:border-blue-600" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Cédula / CC</label>
                      <input type="text" required value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-sm font-bold focus:outline-none focus:border-blue-600" placeholder="Ej. 1700000000" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Descripción</label>
                      <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-sm font-bold focus:outline-none focus:border-blue-600 resize-none" placeholder="Opcional..."></textarea>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-600/30 transition-all text-sm mt-2">
                      {editingId ? "Actualizar Registro" : "Guardar Registro"}
                    </button>
                  </form>
                </div>
              )}

              {/* Historial de Registros - Cabecera Azul de Alto Contraste */}
              <div className={`${isReadOnly ? "lg:col-span-1" : "lg:col-span-2"} bg-white border border-slate-200 p-4 sm:p-8 rounded-[2rem] shadow-sm flex flex-col justify-between`}>
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
                    <h2 className="font-black text-slate-900 text-lg">Historial de Registros</h2>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button onClick={handleExportExcel} className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-2xl text-xs font-black transition-all">
                        Exportar Excel
                      </button>
                      <button onClick={handleExportPDF} className="bg-slate-100 border border-slate-300 text-slate-800 px-4 py-2 rounded-2xl text-xs font-black transition-all">
                        Imprimir / PDF
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 print:hidden">
                    <select value={selectedWorkerFilter} onChange={(e) => { setSelectedWorkerFilter(e.target.value); setSelectedFilterValue(""); setCurrentPage(1); }} className="bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-xs font-bold focus:outline-none">
                      <option value="all">Todos los trabajadores</option>
                      {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setSelectedFilterValue(""); setCurrentPage(1); }} className="bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-xs font-bold focus:outline-none">
                      <option value="all">Filtro de Tiempo</option>
                      <option value="month">Por Mes</option>
                      <option value="week">Por Semana</option>
                    </select>
                    {filterType === "month" && (
                      <select value={selectedFilterValue} onChange={(e) => { setSelectedFilterValue(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-xs font-bold focus:outline-none">
                        <option value="">Selecciona el mes...</option>
                        {availableMonthsForWorker.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )}
                    {filterType === "week" && (
                      <select value={selectedFilterValue} onChange={(e) => { setSelectedFilterValue(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 text-xs font-bold focus:outline-none">
                        <option value="">Selecciona la semana...</option>
                        {availableWeeksForWorker.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    )}
                  </div>

                  {loading ? (
                    <div className="py-12 flex justify-center"><span className="text-slate-600 text-sm font-bold">Cargando registros...</span></div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="py-12 flex justify-center"><span className="text-slate-600 text-sm font-bold">No se encontraron registros.</span></div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left min-w-[650px]">
                        <thead>
                          {/* CABECERA AZUL SÓLIDA PARA MÁXIMA LEGIBILIDAD */}
                          <tr className="bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider">
                            <th className="py-4 px-4">Trabajador</th>
                            <th className="py-4 px-4">Fecha</th>
                            <th className="py-4 px-4">Horario</th>
                            <th className="py-4 px-4">Horas</th>
                            <th className="py-4 px-4">Cédula</th>
                            <th className="py-4 px-4">Descripción</th>
                            {!isReadOnly && <th className="py-4 px-4 text-right print:hidden">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs font-bold text-slate-900">
                          {currentRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-4 font-black text-slate-950">{rec.worker_name || rec.trabajador}</td>
                              <td className="py-4 px-4 text-slate-800">{rec.work_date || rec.fecha}</td>
                              <td className="py-4 px-4 text-slate-700">{rec.entry_time || rec.hora_entrada} - {rec.exit_time || rec.hora_salida}</td>
                              <td className="py-4 px-4">
                                <span className="inline-block min-w-[85px] text-center bg-blue-100 text-blue-900 px-3 py-1.5 rounded-xl font-black shadow-sm">
                                  {Number(rec.calculated_hours || rec.horas || 0).toFixed(1)} hrs
                                </span>
                              </td>
                              <td className="py-4 px-4 text-slate-700">{rec.cost_center || rec.centro_costo || "-"}</td>
                              <td className="py-4 px-4 text-slate-700 max-w-[130px] truncate">{rec.description || rec.descripcion || "-"}</td>
                              {!isReadOnly && (
                                <td className="py-4 px-4 text-right space-x-3 print:hidden whitespace-nowrap">
                                  <button onClick={() => handleEdit(rec)} className="text-blue-700 hover:underline font-black">Editar</button>
                                  <button onClick={() => handleDelete(rec.id)} className="text-red-600 hover:underline font-black">Borrar</button>
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
                  <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6 print:hidden">
                    <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-black text-slate-800 disabled:opacity-40">
                      ← Anterior
                    </button>
                    <span className="text-xs text-slate-800 font-bold">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-black text-slate-800 disabled:opacity-40">
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : currentTab === "empleados" && !isReadOnly ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-1">Crear Acceso para Empleado</h2>
                <p className="text-xs text-slate-600 mb-6 font-bold">Genera una cuenta de solo visualización asociada a la cédula.</p>

                {empSuccessMsg && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-800 text-xs font-black text-center">
                    {empSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Usuario</label>
                    <input type="text" required value={empUsername} onChange={(e) => setEmpUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 font-bold" placeholder="Ej. juan" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Contraseña</label>
                    <input type="password" required value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 font-bold" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">Cédula</label>
                    <input type="text" required value={empCedula} onChange={(e) => setEmpCedula(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 font-bold" placeholder="17000000" />
                  </div>
                  <div className="md:col-span-3">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl transition-all text-sm shadow-lg shadow-blue-600/30">
                      Crear Cuenta de Empleado
                    </button>
                  </div>
                </form>
              </div>

              {/* Directorio de Usuarios - Cabecera Azul */}
              <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-4">Directorio de Usuarios</h2>
                {usersList.length === 0 ? (
                  <div className="py-8 flex justify-center"><span className="text-slate-600 text-sm font-bold">No hay usuarios cargados.</span></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[500px]">
                      <thead>
                        <tr className="bg-blue-600 text-white text-[11px] font-black uppercase">
                          <th className="py-3 px-3">ID</th>
                          <th className="py-3 px-3">Usuario</th>
                          <th className="py-3 px-3">Rol</th>
                          <th className="py-3 px-3">Cédula</th>
                          <th className="py-3 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs font-bold text-slate-900">
                        {usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-3 text-slate-600">#{u.id}</td>
                            <td className="py-3.5 px-3 font-black text-slate-950">{u.username}</td>
                            <td className="py-3.5 px-3">
                              <span className={`px-3 py-1 rounded-xl font-black ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-900' : 'bg-blue-100 text-blue-900'}`}>
                                {u.role === 'admin' ? 'Admin' : 'Empleado'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-mono text-slate-800">{u.cedula || "-"}</td>
                            <td className="py-3.5 px-3 text-right">
                              <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-600 font-black hover:underline">Eliminar</button>
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
              
              <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-slate-900 font-black text-lg">Resumen y Analíticas</h3>
                </div>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-slate-900 text-xs font-bold focus:outline-none">
                  <option value="all">Todos los meses (Histórico)</option>
                  {availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-xs font-black uppercase">Total Horas</p>
                    <h3 className="text-4xl font-black text-slate-900 mt-1">{totalHorasStats.toFixed(1)} <span className="text-xl text-slate-600 font-bold">hrs</span></h3>
                  </div>
                  <div className="px-3.5 py-1.5 bg-blue-100 text-blue-900 rounded-xl text-xs font-black">+18.5%</div>
                </div>

                <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-xs font-black uppercase">Total Jornadas</p>
                    <h3 className="text-4xl font-black text-slate-900 mt-1">{recordsForStats.length}</h3>
                  </div>
                  <div className="px-3.5 py-1.5 bg-blue-100 text-blue-900 rounded-xl text-xs font-black">Activo</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
                <h3 className="text-slate-900 font-black text-lg mb-6">Estadísticas por Trabajador</h3>
                {chartData.length === 0 ? (
                  <div className="py-12 flex justify-center"><span className="text-slate-600 text-sm font-bold">No hay datos suficientes para graficar.</span></div>
                ) : (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                        <XAxis dataKey="name" stroke="#334155" fontSize={11} fontWeight={800} tickLine={false} axisLine={false} />
                        <YAxis stroke="#334155" fontSize={11} fontWeight={800} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#94a3b8", borderRadius: "16px", color: "#0f172a", fontSize: "12px", fontWeight: "bold", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="horas" fill="#2563EB" radius={[10, 10, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}