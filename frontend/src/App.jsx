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
      ["N°", "Trabajador", "Fecha", "Entrada", "Salida", "Horas", "Centro de Costo", "Descripción de Tareas"]
    ];
    let totalHorasSuma = 0;
    filteredRecords.forEach((r, index) => {
      const h = Number(r.calculated_hours || r.horas || 0);
      totalHorasSuma += h;
      aoa.push([index + 1, r.worker_name || r.trabajador || "", r.work_date || r.fecha || "", r.entry_time || r.hora_entrada || "", r.exit_time || r.hora_salida || "", h, r.cost_center || r.centro_costo || "General", r.description || r.descripcion || ""]);
    });
    aoa.push(["", "", "", "", "TOTAL HORAS:", totalHorasSuma, "", ""]);
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const headerStyle = { font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1D4ED8" } }, alignment: { horizontal: "center", vertical: "center" } };
    const titleStyle = { font: { name: "Arial", sz: 12, bold: true, color: { rgb: "0A2540" } }, alignment: { horizontal: "center", vertical: "center" } };
    const cellStyle = { font: { name: "Arial", sz: 9 }, alignment: { vertical: "center" } };
    const totalStyle = { font: { name: "Arial", sz: 10, bold: true }, fill: { fgColor: { rgb: "E0F2FE" } }, alignment: { horizontal: "right", vertical: "center" } };

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

  // ----- PANTALLA DE LOGIN (DARK NEUMORPHISM) -----
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A2540] flex items-center justify-center p-4 font-sans text-[#F1F5F9] selection:bg-[#60A5FA]/30">
        
        <div className="bg-[#0A2540] shadow-[12px_12px_24px_#061728,-12px_-12px_24px_#0e3358] p-10 rounded-[2.5rem] w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-[#F1F5F9] tracking-tight">Bienvenido</h1>
            <p className="text-[#60A5FA] text-sm mt-2 font-medium">Plataforma Segura</p>
          </div>

          <div className="flex bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] p-1.5 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => setLoginRoleType("admin")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                loginRoleType === "admin" 
                  ? "bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] text-[#60A5FA]" 
                  : "text-[#E0F2FE]/50 hover:text-[#E0F2FE]"
              }`}
            >
              Administrador
            </button>
            <button
              type="button"
              onClick={() => setLoginRoleType("employee")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                loginRoleType === "employee" 
                  ? "bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] text-[#60A5FA]" 
                  : "text-[#E0F2FE]/50 hover:text-[#E0F2FE]"
              }`}
            >
              Empleado
            </button>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-2xl text-red-400 text-xs font-bold text-center border border-red-500/20">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-[#0A2540] shadow-[inset_6px_6px_10px_#061728,inset_-6px_-6px_10px_#0e3358] rounded-2xl px-5 py-4 text-sm text-[#F1F5F9] font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all placeholder:text-[#E0F2FE]/30"
                placeholder="Usuario"
              />
            </div>

            <div>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#0A2540] shadow-[inset_6px_6px_10px_#061728,inset_-6px_-6px_10px_#0e3358] rounded-2xl px-5 py-4 text-sm text-[#F1F5F9] font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all placeholder:text-[#E0F2FE]/30"
                placeholder="Contraseña"
              />
            </div>

            {loginRoleType === "admin" && (
              <div>
                <input
                  type="password"
                  required
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  className="w-full bg-[#0A2540] shadow-[inset_6px_6px_10px_#061728,inset_-6px_-6px_10px_#0e3358] rounded-2xl px-5 py-4 text-sm text-[#60A5FA] font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA] border-none transition-all placeholder:text-[#1D4ED8]"
                  placeholder="Token de Seguridad"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] shadow-[6px_6px_12px_#061728,-6px_-6px_12px_#0e3358] text-[#F1F5F9] font-bold py-4 rounded-2xl hover:opacity-90 active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3)] transition-all duration-200 text-sm"
            >
              Sign Up / Iniciar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----- PLATAFORMA PRINCIPAL (DARK NEUMORPHISM) -----
  return (
    <div className="min-h-screen bg-[#0A2540] text-[#F1F5F9] flex flex-col font-sans selection:bg-[#60A5FA]/30">
      
      <header className="mx-4 sm:mx-8 mt-6 bg-[#0A2540] shadow-[8px_8px_16px_#061728,-8px_-8px_16px_#0e3358] rounded-3xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-40 print:hidden">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] rounded-2xl flex items-center justify-center text-[#60A5FA] font-extrabold text-lg">
              AR
            </div>
            <div>
              <h1 className="font-bold text-[#F1F5F9] text-lg tracking-tight">App Registro</h1>
              <p className="text-[11px] font-semibold text-[#60A5FA] uppercase tracking-widest mt-0.5">
                {isReadOnly ? "Modo Empleado" : "Administrador"}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="md:hidden bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] text-red-400 px-4 py-2 rounded-xl text-xs font-bold active:shadow-[inset_2px_2px_4px_#061728,inset_-2px_-2px_4px_#0e3358]">
            Salir
          </button>
        </div>

        <div className="flex items-center bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto gap-1">
          <button onClick={() => setCurrentTab("gestion")} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${currentTab === "gestion" ? "bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] text-[#60A5FA]" : "text-[#E0F2FE]/50 hover:text-[#E0F2FE]"}`}>
            Gestión
          </button>
          <button onClick={() => setCurrentTab("estadisticas")} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${currentTab === "estadisticas" ? "bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] text-[#60A5FA]" : "text-[#E0F2FE]/50 hover:text-[#E0F2FE]"}`}>
            Estadísticas
          </button>
          {!isReadOnly && (
            <button onClick={() => setCurrentTab("empleados")} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${currentTab === "empleados" ? "bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] text-[#60A5FA]" : "text-[#E0F2FE]/50 hover:text-[#E0F2FE]"}`}>
              Accesos
            </button>
          )}
        </div>

        <button onClick={handleLogout} className="hidden md:block bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] hover:text-red-400 text-[#E0F2FE]/70 px-5 py-3 rounded-2xl text-xs font-bold transition-all active:shadow-[inset_2px_2px_4px_#061728,inset_-2px_-2px_4px_#0e3358]">
          Cerrar Sesión
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {currentTab === "gestion" ? (
          <div className={`grid grid-cols-1 ${isReadOnly ? "lg:grid-cols-1" : "lg:grid-cols-3"} gap-8`}>
            
            {!isReadOnly && (
              <div className="bg-[#0A2540] shadow-[8px_8px_16px_#061728,-8px_-8px_16px_#0e3358] p-8 rounded-[2rem] h-fit print:hidden">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-bold text-[#F1F5F9] text-lg">
                    {editingId ? "Editar Registro" : "Nuevo Registro"}
                  </h2>
                  <span className="text-[#60A5FA] bg-[#0A2540] shadow-[inset_3px_3px_6px_#061728,inset_-3px_-3px_6px_#0e3358] px-4 py-2 rounded-xl text-xs font-bold">
                    {calculatedHours.toFixed(2)} hrs
                  </span>
                </div>

                <form onSubmit={handleSubmitRecord} className="space-y-6">
                  <div>
                    <input type="text" required value={workerName} onChange={(e) => setWorkerName(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all placeholder:text-[#E0F2FE]/30" placeholder="Nombre del trabajador *" />
                  </div>
                  <div>
                    <input type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <input type="time" required value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all" />
                    </div>
                    <div>
                      <input type="time" required value={exitTime} onChange={(e) => setExitTime(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <input type="text" required value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all placeholder:text-[#E0F2FE]/30" placeholder="Cédula / CC *" />
                  </div>
                  <div>
                    <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all placeholder:text-[#E0F2FE]/30 resize-none" placeholder="Descripción opcional..."></textarea>
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] shadow-[6px_6px_12px_#061728,-6px_-6px_12px_#0e3358] text-[#F1F5F9] font-bold py-4 rounded-2xl hover:opacity-90 active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3)] transition-all duration-200 text-sm mt-4">
                    {editingId ? "Actualizar" : "Agregar (+)"}
                  </button>
                </form>
              </div>
            )}

            <div className={`${isReadOnly ? "lg:col-span-1" : "lg:col-span-2"} bg-[#0A2540] shadow-[8px_8px_16px_#061728,-8px_-8px_16px_#0e3358] p-6 sm:p-8 rounded-[2rem] flex flex-col justify-between`}>
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 print:hidden">
                  <h2 className="font-bold text-[#F1F5F9] text-lg">Historial de Registros</h2>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    <button onClick={handleExportExcel} className="bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] text-[#60A5FA] px-5 py-2.5 rounded-xl text-xs font-bold active:shadow-[inset_2px_2px_4px_#061728,inset_-2px_-2px_4px_#0e3358] transition-all">
                      Descargar
                    </button>
                    <button onClick={handleExportPDF} className="bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] text-[#E0F2FE]/70 px-5 py-2.5 rounded-xl text-xs font-bold active:shadow-[inset_2px_2px_4px_#061728,inset_-2px_-2px_4px_#0e3358] transition-all">
                      Imprimir
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 print:hidden">
                  <select value={selectedWorkerFilter} onChange={(e) => { setSelectedWorkerFilter(e.target.value); setSelectedFilterValue(""); setCurrentPage(1); }} className="bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-2xl px-4 py-3.5 text-[#E0F2FE]/80 text-xs font-bold focus:outline-none border-none">
                    <option value="all">Categoría (Todos)</option>
                    {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setSelectedFilterValue(""); setCurrentPage(1); }} className="bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-2xl px-4 py-3.5 text-[#E0F2FE]/80 text-xs font-bold focus:outline-none border-none">
                    <option value="all">Filtro de Tiempo</option>
                    <option value="month">Por Mes</option>
                    <option value="week">Por Semana</option>
                  </select>
                  {filterType === "month" && (
                    <select value={selectedFilterValue} onChange={(e) => { setSelectedFilterValue(e.target.value); setCurrentPage(1); }} className="bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-2xl px-4 py-3.5 text-[#E0F2FE]/80 text-xs font-bold focus:outline-none border-none">
                      <option value="">Selecciona el mes...</option>
                      {availableMonthsForWorker.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                  {filterType === "week" && (
                    <select value={selectedFilterValue} onChange={(e) => { setSelectedFilterValue(e.target.value); setCurrentPage(1); }} className="bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-2xl px-4 py-3.5 text-[#E0F2FE]/80 text-xs font-bold focus:outline-none border-none">
                      <option value="">Selecciona la semana...</option>
                      {availableWeeksForWorker.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  )}
                </div>

                {loading ? (
                  <div className="py-16 flex justify-center"><span className="text-[#E0F2FE]/50 text-sm font-bold">Cargando...</span></div>
                ) : filteredRecords.length === 0 ? (
                  <div className="py-16 flex justify-center"><span className="text-[#E0F2FE]/50 text-sm font-bold">No se encontraron resultados.</span></div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] p-2">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="text-[#E0F2FE]/50 text-[10px] font-bold uppercase tracking-widest">
                          <th className="py-4 px-5">Trabajador</th>
                          <th className="py-4 px-5">Fecha</th>
                          <th className="py-4 px-5">Horario</th>
                          <th className="py-4 px-5">Horas</th>
                          <th className="py-4 px-5">Cédula</th>
                          <th className="py-4 px-5">Descripción</th>
                          {!isReadOnly && <th className="py-4 px-5 text-right print:hidden">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0e3358]/50 text-sm font-medium text-[#E0F2FE]/80">
                        {currentRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-[#061728]/30 transition-colors">
                            <td className="py-4 px-5 text-[#F1F5F9] font-bold">{rec.worker_name || rec.trabajador}</td>
                            <td className="py-4 px-5">{rec.work_date || rec.fecha}</td>
                            <td className="py-4 px-5 text-xs">{rec.entry_time || rec.hora_entrada} - {rec.exit_time || rec.hora_salida}</td>
                            <td className="py-4 px-5"><span className="bg-[#0A2540] shadow-[2px_2px_4px_#061728,-2px_-2px_4px_#0e3358] text-[#60A5FA] px-3 py-1.5 rounded-lg font-bold text-xs">{Number(rec.calculated_hours || rec.horas || 0).toFixed(1)}</span></td>
                            <td className="py-4 px-5 text-xs">{rec.cost_center || rec.centro_costo || "-"}</td>
                            <td className="py-4 px-5 text-xs max-w-[150px] truncate">{rec.description || rec.descripcion || "-"}</td>
                            {!isReadOnly && (
                              <td className="py-4 px-5 text-right space-x-3 print:hidden whitespace-nowrap">
                                <button onClick={() => handleEdit(rec)} className="text-[#E0F2FE]/50 hover:text-[#60A5FA] text-xs font-bold transition-all">Edit</button>
                                <button onClick={() => handleDelete(rec.id)} className="text-[#E0F2FE]/50 hover:text-red-400 text-xs font-bold transition-all">Del</button>
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
                <div className="flex items-center justify-between pt-8 print:hidden">
                  <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-10 h-10 flex items-center justify-center bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] rounded-xl text-[#E0F2FE]/50 hover:text-[#60A5FA] disabled:opacity-40 active:shadow-[inset_2px_2px_4px_#061728,inset_-2px_-2px_4px_#0e3358] transition-all font-bold">
                    ←
                  </button>
                  <div className="flex gap-2">
                    <span className="w-10 h-10 flex items-center justify-center bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-xl text-[#60A5FA] font-bold text-sm">
                      {currentPage}
                    </span>
                  </div>
                  <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-10 h-10 flex items-center justify-center bg-[#0A2540] shadow-[4px_4px_8px_#061728,-4px_-4px_8px_#0e3358] rounded-xl text-[#E0F2FE]/50 hover:text-[#60A5FA] disabled:opacity-40 active:shadow-[inset_2px_2px_4px_#061728,inset_-2px_-2px_4px_#0e3358] transition-all font-bold">
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : currentTab === "empleados" && !isReadOnly ? (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-[#0A2540] shadow-[8px_8px_16px_#061728,-8px_-8px_16px_#0e3358] p-10 rounded-[2.5rem]">
              <h2 className="text-xl font-bold text-[#F1F5F9] mb-2">Crear Acceso</h2>
              <p className="text-sm text-[#E0F2FE]/60 mb-8 font-medium">Configuración de cuentas</p>

              {empSuccessMsg && (
                <div className="mb-6 p-4 bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-2xl text-[#60A5FA] text-sm text-center font-bold border border-[#1D4ED8]/30">
                  {empSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="md:col-span-1">
                  <input type="text" required value={empUsername} onChange={(e) => setEmpUsername(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all placeholder:text-[#E0F2FE]/30" placeholder="Usuario" />
                </div>
                <div className="md:col-span-1">
                  <input type="password" required value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all placeholder:text-[#E0F2FE]/30" placeholder="Contraseña" />
                </div>
                <div className="md:col-span-1">
                  <input type="text" required value={empCedula} onChange={(e) => setEmpCedula(e.target.value)} className="w-full bg-[#0A2540] shadow-[inset_5px_5px_10px_#061728,inset_-5px_-5px_10px_#0e3358] rounded-2xl px-5 py-3.5 text-[#F1F5F9] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/50 border-none transition-all placeholder:text-[#E0F2FE]/30" placeholder="Cédula" />
                </div>
                <div className="md:col-span-1">
                  <button type="submit" className="w-full bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] shadow-[6px_6px_12px_#061728,-6px_-6px_12px_#0e3358] text-[#F1F5F9] font-bold py-3.5 rounded-2xl hover:opacity-90 active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3)] transition-all text-sm">
                    Guardar
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-[#0A2540] shadow-[8px_8px_16px_#061728,-8px_-8px_16px_#0e3358] p-10 rounded-[2.5rem]">
              <h2 className="text-xl font-bold text-[#F1F5F9] mb-8">Directorio de Usuarios</h2>
              {usersList.length === 0 ? (
                <div className="py-12 flex justify-center"><span className="text-[#E0F2FE]/50 text-sm font-bold">No hay usuarios cargados.</span></div>
              ) : (
                <div className="overflow-x-auto shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-2xl p-2">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr className="text-[#E0F2FE]/50 text-[10px] font-bold uppercase tracking-widest">
                        <th className="py-4 px-5">ID</th>
                        <th className="py-4 px-5">Usuario</th>
                        <th className="py-4 px-5">Rol</th>
                        <th className="py-4 px-5">Cédula</th>
                        <th className="py-4 px-5 text-right">Settings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0e3358]/50 text-sm font-medium text-[#E0F2FE]/80">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-[#061728]/30 transition-colors">
                          <td className="py-4 px-5">#{u.id}</td>
                          <td className="py-4 px-5 text-[#F1F5F9] font-bold">{u.username}</td>
                          <td className="py-4 px-5">
                            <span className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow-[2px_2px_4px_#061728,-2px_-2px_4px_#0e3358] ${u.role === 'admin' ? 'bg-[#0A2540] text-[#60A5FA]' : 'bg-[#0A2540] text-[#E0F2FE]/60'}`}>
                              {u.role === 'admin' ? 'Admin' : 'Empleado'}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-mono text-xs">{u.cedula || "-"}</td>
                          <td className="py-4 px-5 text-right">
                            <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-[#E0F2FE]/50 hover:text-red-400 text-xs font-bold transition-all">
                              Revocar
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
          <div className="space-y-8 max-w-5xl mx-auto">
            
            <div className="bg-[#0A2540] shadow-[8px_8px_16px_#061728,-8px_-8px_16px_#0e3358] p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-[#F1F5F9] font-bold text-lg">Analíticas</h3>
              </div>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] rounded-2xl px-5 py-3 text-[#E0F2FE]/80 text-sm font-bold focus:outline-none border-none w-full sm:w-auto">
                <option value="all">Filtro Global</option>
                {availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="bg-[#0A2540] shadow-[12px_12px_24px_#061728,-12px_-12px_24px_#0e3358] p-10 rounded-[2.5rem] flex items-center justify-between">
                <div>
                  <p className="text-[#E0F2FE]/50 text-[11px] font-bold uppercase tracking-widest mb-3">LOREM IPSUM (Horas)</p>
                  <h3 className="text-4xl font-extrabold text-[#F1F5F9] tracking-tight">
                    {totalHorasStats.toFixed(1)} <span className="text-xl text-[#60A5FA] font-medium">hrs</span>
                  </h3>
                </div>
                <div className="w-24 h-24 rounded-full shadow-[8px_8px_16px_#061728,-8px_-8px_16px_#0e3358] flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full border-[6px] border-[#60A5FA] border-l-transparent border-t-transparent opacity-80 transform rotate-45"></div>
                   <div className="w-16 h-16 rounded-full bg-[#0A2540] shadow-[inset_4px_4px_8px_#061728,inset_-4px_-4px_8px_#0e3358] flex items-center justify-center">
                     <span className="font-bold text-sm text-[#F1F5F9]">75%</span>
                   </div>
                </div>
              </div>

              <div className="bg-[#0A2540] shadow-[12px_12px_24px_#061728,-12px_-12px_24px_#0e3358] p-10 rounded-[2.5rem] flex items-center justify-between">
                <div>
                  <p className="text-[#E0F2FE]/50 text-[11px] font-bold uppercase tracking-widest mb-3">Jornadas Totales</p>
                  <h3 className="text-4xl font-extrabold text-[#F1F5F9] tracking-tight">{recordsForStats.length}</h3>
                </div>
                <div className="w-20 h-20 rounded-[1.5rem] shadow-[8px_8px_16px_#061728,-8px_-8px_16px_#0e3358] flex items-center justify-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#1D4ED8] to-[#60A5FA] rounded-xl shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center text-[#F1F5F9] font-bold text-xs">
                    ON
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0A2540] shadow-[12px_12px_24px_#061728,-12px_-12px_24px_#0e3358] p-10 rounded-[3rem]">
              <div className="mb-10">
                <h3 className="text-[#F1F5F9] font-extrabold text-2xl tracking-tight">2201</h3>
                <p className="text-[#E0F2FE]/50 text-xs font-medium mt-1">Horas Totales por Trabajador</p>
              </div>
              
              {chartData.length === 0 ? (
                <div className="py-16 flex justify-center"><span className="text-[#E0F2FE]/50 text-sm font-bold">No hay datos suficientes para mostrar el gráfico.</span></div>
              ) : (
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorBlueDarkNeo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60A5FA" stopOpacity={1}/>
                          <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="0" stroke="#0e3358" opacity={0.5} vertical={false} />
                      <XAxis dataKey="name" stroke="#E0F2FE" opacity={0.6} fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={15} />
                      <YAxis stroke="#E0F2FE" opacity={0.6} fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#0e3358', opacity: 0.3}} contentStyle={{ backgroundColor: "#0A2540", borderColor: "transparent", borderRadius: "20px", color: "#F1F5F9", fontSize: "12px", fontWeight: "bold", boxShadow: "8px 8px 16px #061728, -8px -8px 16px #0e3358" }} />
                      <Bar dataKey="horas" fill="url(#colorBlueDarkNeo)" radius={[12, 12, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-8 flex items-center justify-center gap-4">
                 <div className="h-4 w-full max-w-sm bg-[#0A2540] shadow-[inset_3px_3px_6px_#061728,inset_-3px_-3px_6px_#0e3358] rounded-full relative">
                   <div className="absolute top-0 left-0 h-4 w-2/3 bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] rounded-full shadow-[2px_0px_4px_rgba(0,0,0,0.3)]"></div>
                   <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-[#0A2540] border-[5px] border-[#60A5FA] rounded-full shadow-[2px_2px_5px_#061728]"></div>
                 </div>
                 <span className="font-bold text-[#60A5FA] text-sm">71%</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}