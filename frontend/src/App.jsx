import React, { useState, useEffect } from "react";
import XLSX from "xlsx-js-style";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import CustomModal from "./components/CustomModal";
import Toast from "./components/Toast";
import { 
  fetchRecords, 
  createRecord, 
  updateRecord, 
  deleteRecord 
} from "./api";

function LoginIllustration({ slideIndex }) {
  return (
    <div className="relative w-full h-56 flex items-center justify-center my-auto">
      <div className="absolute w-40 h-40 bg-blue-500/40 rounded-full blur-xl animate-pulse"></div>

      {slideIndex === 0 && (
        <div className="relative z-10 animate-bounce duration-1000 transform -rotate-3">
          <div className="w-36 h-48 bg-white rounded-3xl shadow-2xl p-4 border-4 border-blue-100 flex flex-col justify-between">
            <div className="w-12 h-4 bg-blue-200 rounded-full mx-auto -mt-6"></div>
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>
                <div className="w-16 h-2 bg-slate-200 rounded-full"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>
                <div className="w-20 h-2 bg-slate-200 rounded-full"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">⏱</div>
                <div className="w-12 h-2 bg-blue-200 rounded-full"></div>
              </div>
            </div>
            <div className="bg-blue-600 h-8 rounded-2xl flex items-center justify-center text-white font-black text-[10px]">
              JornadaPro
            </div>
          </div>
        </div>
      )}

      {slideIndex === 1 && (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-full flex items-center justify-center text-white text-2xl shadow-xl backdrop-blur-md">
            👥
          </div>
          <div className="flex gap-2">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-blue-600 font-black text-xs">Admin</div>
            <div className="w-12 h-12 bg-blue-500 rounded-2xl shadow-lg flex items-center justify-center text-white font-black text-xs border border-white/20">User</div>
          </div>
        </div>
      )}

      {slideIndex === 2 && (
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-2xl flex items-end gap-3 h-40 w-48 justify-center">
          <div className="w-8 bg-blue-400 rounded-t-xl h-20 shadow-md"></div>
          <div className="w-8 bg-white rounded-t-xl h-32 shadow-md"></div>
          <div className="w-8 bg-indigo-400 rounded-t-xl h-24 shadow-md"></div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "admin");
  const [currentUsername, setCurrentUsername] = useState(localStorage.getItem("currentUsername") || "");
  
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode);
  };
  
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [adminTokenInput, setAdminTokenInput] = useState("");
  const [loginRoleType, setLoginRoleType] = useState("admin");
  const [authError, setAuthError] = useState("");

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "confirm",
    onConfirm: () => {}
  });

  const showAlert = (title, message, type = "info") => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (title, message, type = "confirm", onConfirmAction) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        onConfirmAction();
      }
    });
  };

  const [loginSlide, setLoginSlide] = useState(0);
  const loginSlidesData = [
    { title: "Control Profesional de Jornadas", desc: "Gestiona horas de entrada, salida y reportes en tiempo real con máxima precisión." },
    { title: "Gestión Multi-Usuario Ágil", desc: "Administra accesos seguros y diferenciados para empleados y administradores." },
    { title: "Reportes Inteligentes y Listos", desc: "Exporta reportes detallados en Excel y PDF optimizados para control de nómina." }
  ];

  useEffect(() => {
    if (!token) {
      const interval = setInterval(() => {
        setLoginSlide((prev) => (prev + 1) % loginSlidesData.length);
      }, 4500);
      return () => clearInterval(interval);
    }
  }, [token]);

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

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  const isReadOnly = userRole === "employee";

  useEffect(() => {
    if (!token) return;
    let inactivityTimer;
    const logoutDueToInactivity = () => {
      showAlert("Sesión Expirada", "Tu sesión ha expirado por inactividad.", "info");
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
    showConfirm("Eliminar Usuario", `¿Estás seguro de eliminar al usuario "${username}"?`, "danger", async () => {
      try {
        const response = await fetch(`https://backend-registro-horas.onrender.com/users/${userId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          loadUsers();
          showToast("Usuario eliminado correctamente");
        } else {
          const errData = await response.json();
          showAlert("Error", "Error al eliminar usuario: " + (errData.detail || "Error desconocido"), "danger");
        }
      } catch (err) {
        showAlert("Error", "Error de conexión: " + err.message, "danger");
      }
    });
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
      setCurrentUsername(usernameInput);
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", assignedRole);
      localStorage.setItem("currentUsername", usernameInput);
      localStorage.setItem("currentPassword", passwordInput);

      setUsernameInput("");
      setPasswordInput("");
      setAdminTokenInput("");
      showToast("¡Bienvenido a JornadaPro!");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("https://backend-registro-horas.onrender.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: empUsername, password: empPassword, role: "employee", cedula: empCedula })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Error al crear empleado");

      showToast(`¡Acceso creado para ${empUsername}!`);
      setEmpUsername("");
      setEmpPassword("");
      setEmpCedula("");
      loadUsers();
    } catch (err) {
      showAlert("Error", "Error al crear empleado: " + err.message, "danger");
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setProfileMsg("");

    const savedPassword = localStorage.getItem("currentPassword") || "";

    if (oldPassword !== savedPassword) {
      setProfileMsg("Error: La contraseña actual es incorrecta.");
      return;
    }

    if (newPassword === oldPassword) {
      setProfileMsg("Error: La nueva contraseña no puede ser igual a la actual.");
      return;
    }

    localStorage.setItem("currentPassword", newPassword);
    showToast("¡Contraseña actualizada con éxito!");
    setOldPassword("");
    setNewPassword("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("currentUsername");
    localStorage.removeItem("currentPassword");
    setToken("");
    setUserRole("admin");
    setCurrentUsername("");
    setRecords([]);
    showToast("Sesión cerrada correctamente", "info");
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
        showToast("Registro actualizado con éxito");
      } else {
        await createRecord(recordData);
        showToast("Registro guardado con éxito");
      }
      setWorkerName(""); setCostCenter(""); setDescription("");
      loadRecords();
    } catch (err) {
      showAlert("Error", "Error al guardar: " + err.message, "danger");
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
    showConfirm("Eliminar Registro", "¿Estás seguro de eliminar este registro?", "danger", async () => {
      try {
        await deleteRecord(id);
        loadRecords();
        showToast("Registro eliminado");
      } catch (err) {
        showAlert("Error", "Error al eliminar: " + err.message, "danger");
      }
    });
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
      showAlert("Atención", "No hay registros para exportar.", "info");
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
    showToast("Reporte Excel exportado con éxito");
  };

  // Exportar a PDF Formal corregido usando autoTable correctamente
  const handleExportPDF = () => {
    if (filteredRecords.length === 0) {
      showAlert("Atención", "No hay registros para exportar en PDF.", "info");
      return;
    }
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text("JornadaPro - Reporte Oficial de Jornadas", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado el: ${new Date().toLocaleDateString()} | Usuario: ${currentUsername || userRole}`, 14, 28);

    const tableColumn = ["N°", "Trabajador", "Fecha", "Entrada", "Salida", "Horas", "Cédula"];
    const tableRows = [];

    let totalSumaHoras = 0;
    filteredRecords.forEach((r, index) => {
      const h = Number(r.calculated_hours || r.horas || 0);
      totalSumaHoras += h;
      tableRows.push([
        index + 1,
        r.worker_name || r.trabajador || "",
        r.work_date || r.fecha || "",
        r.entry_time || r.hora_entrada || "",
        r.exit_time || r.hora_salida || "",
        `${h.toFixed(1)} hrs`,
        r.cost_center || r.centro_costo || "-"
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    const finalY = doc.lastAutoTable.finalY || 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total de Horas Acumuladas: ${totalSumaHoras.toFixed(1)} hrs`, 14, finalY + 10);

    doc.save("Reporte_Oficial_Jornadas.pdf");
    showToast("PDF formal generado con éxito");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans text-slate-800">
        <CustomModal {...modalConfig} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />
        <Toast {...toast} onClose={() => setToast({ message: "", type: "success" })} />
        <div className="bg-white shadow-[0_25px_50px_rgba(0,0,0,0.3)] border border-slate-100 rounded-[2.5rem] w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">
          
          <div className="w-full md:w-1/2 bg-blue-600 text-white p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500 rounded-full opacity-50 blur-2xl"></div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-700 rounded-full opacity-50 blur-2xl"></div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg shadow-lg">
                J
              </div>
              <span className="font-black text-xl tracking-tight text-white">JornadaPro</span>
            </div>

            <LoginIllustration slideIndex={loginSlide} />

            <div className="relative z-10 transition-all duration-500">
              <h2 className="text-xl md:text-2xl font-black mb-2 leading-tight">{loginSlidesData[loginSlide].title}</h2>
              <p className="text-blue-100 text-xs font-medium leading-relaxed">{loginSlidesData[loginSlide].desc}</p>
            </div>

            <div className="flex items-center gap-2 relative z-10 mt-6">
              {loginSlidesData.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setLoginSlide(idx)}
                  className={`h-2.5 rounded-full transition-all ${loginSlide === idx ? "w-8 bg-white" : "w-2.5 bg-blue-400"}`}
                />
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
            <div className="mb-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Iniciar Sesión</h1>
              <p className="text-slate-400 text-xs font-semibold mt-1">Accede al panel de control de jornadas</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setLoginRoleType("admin")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  loginRoleType === "admin" ? "bg-white shadow-md text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Administrador
              </button>
              <button
                type="button"
                onClick={() => setLoginRoleType("employee")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  loginRoleType === "employee" ? "bg-white shadow-md text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Empleado
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs font-bold text-center">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Usuario</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                  placeholder="Tu usuario"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                  placeholder="••••••••"
                />
              </div>

              {loginRoleType === "admin" && (
                <div>
                  <label className="block text-[11px] font-black text-blue-600 uppercase mb-1">🔑 Token de Seguridad</label>
                  <input
                    type="password"
                    required
                    value={adminTokenInput}
                    onChange={(e) => setAdminTokenInput(e.target.value)}
                    className="w-full bg-blue-50/50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-900 font-bold focus:outline-none focus:border-blue-600"
                    placeholder="Token secreto"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-600/30 transition-all text-sm"
              >
                Ingresar al Sistema
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-[#0B0F19] text-slate-100" : "bg-[#f1f5f9] text-slate-900"} flex flex-col md:flex-row font-sans transition-colors duration-300`}>
      <CustomModal {...modalConfig} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />
      <Toast {...toast} onClose={() => setToast({ message: "", type: "success" })} />

      <aside className={`w-full md:w-72 ${darkMode ? "bg-[#0F172A] border-r border-slate-800" : "bg-[#0F172A]"} text-white p-6 md:sticky md:top-0 md:h-screen flex flex-col justify-between shrink-0 print:hidden shadow-xl z-50`}>
        <div>
          <div className="flex items-center gap-3 mb-6 md:mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/40">
              J
            </div>
            <span className="font-black text-xl tracking-tight text-white">JornadaPro</span>
          </div>

          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-3">Menú Principal</p>
          
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            <button 
              onClick={() => setCurrentTab("gestion")} 
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'gestion' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <span>📊</span> <span className="hidden sm:inline">Panel / Gestión</span><span className="sm:hidden">Gestión</span>
            </button>
            <button 
              onClick={() => setCurrentTab("estadisticas")} 
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'estadisticas' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <span>📈</span> <span className="hidden sm:inline">Analíticas y Reportes</span><span className="sm:hidden">Reportes</span>
            </button>
            {!isReadOnly && (
              <button 
                onClick={() => setCurrentTab("empleados")} 
                className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'empleados' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <span>👥</span> <span className="hidden sm:inline">Accesos / Usuarios</span><span className="sm:hidden">Usuarios</span>
              </button>
            )}
            <button 
              onClick={() => setCurrentTab("perfil")} 
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'perfil' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <span>⚙️</span> <span className="hidden sm:inline">Mi Perfil</span><span className="sm:hidden">Perfil</span>
            </button>
          </nav>
        </div>

        <div className="hidden md:block mt-8 bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-3xl text-white shadow-lg">
          <p className="text-xs font-bold text-blue-200 uppercase">Sesión Activa</p>
          <p className="font-black text-sm mt-1">{currentUsername || userRole}</p>
          <button onClick={handleLogout} className="mt-4 w-full bg-white text-slate-900 font-black py-2.5 rounded-xl text-xs hover:bg-slate-100 transition-all shadow-md">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        
        <header className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border-b px-6 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-40 print:hidden shadow-sm transition-colors duration-300`}>
          <div>
            <h1 className="text-lg sm:text-xl font-black">¡Bienvenido de nuevo, {currentUsername || userRole}!</h1>
            <p className={`text-xs font-bold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Resumen general y control de jornadas</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Botón de Modo Oscuro */}
            <button 
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-2xl text-sm font-bold border transition-all ${darkMode ? "bg-slate-800 border-slate-700 text-amber-400" : "bg-slate-100 border-slate-200 text-slate-700"}`}
              title="Cambiar Modo Oscuro/Claro"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <div className={`hidden sm:flex items-center gap-3 border px-4 py-2 rounded-2xl ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                {(currentUsername || userRole).charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className={`text-xs font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{currentUsername || "Usuario"}</p>
                <p className={`text-[10px] font-bold capitalize ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{userRole}</p>
              </div>
            </div>

            {/* Botón Salir: Visible SOLO en pantallas pequeñas */}
            <button onClick={handleLogout} className="md:hidden bg-slate-100 text-red-600 px-3.5 py-2 rounded-xl text-xs font-black hover:bg-slate-200 transition-all">
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-10 max-w-7xl mx-auto w-full">
          {currentTab === "gestion" ? (
            <div className={`grid grid-cols-1 ${isReadOnly ? "lg:grid-cols-1" : "lg:grid-cols-3"} gap-8`}>
              
              {!isReadOnly && (
                <div className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-6 sm:p-8 rounded-[2rem] shadow-sm h-fit print:hidden`}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-black text-base">
                      {editingId ? "Editar Registro" : "Nuevo Registro"}
                    </h2>
                    <span className="text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-black">
                      {calculatedHours.toFixed(2)} hrs
                    </span>
                  </div>

                  <form onSubmit={handleSubmitRecord} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Trabajador</label>
                      <input type="text" required value={workerName} onChange={(e) => setWorkerName(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-600 ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} placeholder="Nombre completo" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Fecha</label>
                      <input type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-600 ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Entrada</label>
                        <input type="time" required value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-600 ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Salida</label>
                        <input type="time" required value={exitTime} onChange={(e) => setExitTime(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-600 ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Cédula / CC</label>
                      <input type="text" required value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-600 ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} placeholder="Ej. 1700000000" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Descripción</label>
                      <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-600 resize-none ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} placeholder="Opcional..."></textarea>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-600/30 transition-all text-sm mt-2">
                      {editingId ? "Actualizar Registro" : "Guardar Registro"}
                    </button>
                  </form>
                </div>
              )}

              <div className={`${isReadOnly ? "lg:col-span-1" : "lg:col-span-2"} ${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-4 sm:p-8 rounded-[2rem] shadow-sm flex flex-col justify-between`}>
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
                    <h2 className="font-black text-lg">Historial de Registros</h2>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button onClick={handleExportExcel} className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-2xl text-xs font-black transition-all">
                        Exportar Excel
                      </button>
                      <button onClick={handleExportPDF} className="bg-slate-100 border border-slate-300 text-slate-800 px-4 py-2 rounded-2xl text-xs font-black transition-all">
                        Exportar PDF
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 print:hidden">
                    <select value={selectedWorkerFilter} onChange={(e) => { setSelectedWorkerFilter(e.target.value); setSelectedFilterValue(""); setCurrentPage(1); }} className={`border rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}>
                      <option value="all">Todos los trabajadores</option>
                      {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setSelectedFilterValue(""); setCurrentPage(1); }} className={`border rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}>
                      <option value="all">Filtro de Tiempo</option>
                      <option value="month">Por Mes</option>
                      <option value="week">Por Semana</option>
                    </select>
                    {filterType === "month" && (
                      <select value={selectedFilterValue} onChange={(e) => { setSelectedFilterValue(e.target.value); setCurrentPage(1); }} className={`border rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}>
                        <option value="">Selecciona el mes...</option>
                        {availableMonthsForWorker.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )}
                    {filterType === "week" && (
                      <select value={selectedFilterValue} onChange={(e) => { setSelectedFilterValue(e.target.value); setCurrentPage(1); }} className={`border rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}>
                        <option value="">Selecciona la semana...</option>
                        {availableWeeksForWorker.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    )}
                  </div>

                  {loading ? (
                    <div className="py-12 flex justify-center"><span className="text-sm font-bold opacity-75">Cargando registros...</span></div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="py-12 flex justify-center"><span className="text-sm font-bold opacity-75">No se encontraron registros.</span></div>
                  ) : (
                    <div className={`overflow-x-auto rounded-2xl border ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <table className="w-full text-left min-w-[650px]">
                        <thead>
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
                        <tbody className={`divide-y text-xs font-bold ${darkMode ? "divide-slate-800 text-slate-200" : "divide-slate-200 text-slate-900"}`}>
                          {currentRecords.map((rec) => (
                            <tr key={rec.id} className={`transition-colors ${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}>
                              <td className="py-4 px-4 font-black">{rec.worker_name || rec.trabajador}</td>
                              <td className="py-4 px-4 opacity-90">{rec.work_date || rec.fecha}</td>
                              <td className="py-4 px-4 opacity-80">{rec.entry_time || rec.hora_entrada} - {rec.exit_time || rec.hora_salida}</td>
                              <td className="py-4 px-4">
                                <span className="inline-block min-w-[85px] text-center bg-blue-100 text-blue-900 px-3 py-1.5 rounded-xl font-black shadow-sm">
                                  {Number(rec.calculated_hours || rec.horas || 0).toFixed(1)} hrs
                                </span>
                              </td>
                              <td className="py-4 px-4 opacity-80">{rec.cost_center || rec.centro_costo || "-"}</td>
                              <td className="py-4 px-4 opacity-80 max-w-[130px] truncate">{rec.description || rec.descripcion || "-"}</td>
                              {!isReadOnly && (
                                <td className="py-4 px-4 text-right space-x-3 print:hidden whitespace-nowrap">
                                  <button onClick={() => handleEdit(rec)} className="text-blue-500 hover:underline font-black">Editar</button>
                                  <button onClick={() => handleDelete(rec.id)} className="text-red-500 hover:underline font-black">Borrar</button>
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
                  <div className={`flex items-center justify-between border-t pt-4 mt-6 print:hidden ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-xs font-black disabled:opacity-40">
                      ← Anterior
                    </button>
                    <span className="text-xs font-bold opacity-80">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-xs font-black disabled:opacity-40">
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : currentTab === "empleados" && !isReadOnly ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-6 sm:p-8 rounded-[2rem] shadow-sm`}>
                <h2 className="text-lg font-black mb-1">Crear Acceso para Empleado</h2>
                <p className="text-xs mb-6 font-bold opacity-75">Genera una cuenta de solo visualización asociada a la cédula.</p>

                <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Usuario</label>
                    <input type="text" required value={empUsername} onChange={(e) => setEmpUsername(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} placeholder="Ej. juan" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Contraseña</label>
                    <input type="password" required value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Cédula</label>
                    <input type="text" required value={empCedula} onChange={(e) => setEmpCedula(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} placeholder="17000000" />
                  </div>
                  <div className="md:col-span-3">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl transition-all text-sm shadow-lg shadow-blue-600/30">
                      Crear Cuenta de Empleado
                    </button>
                  </div>
                </form>
              </div>

              <div className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-6 sm:p-8 rounded-[2rem] shadow-sm`}>
                <h2 className="text-lg font-black mb-4">Directorio de Usuarios</h2>
                {usersList.length === 0 ? (
                  <div className="py-8 flex justify-center"><span className="text-sm font-bold opacity-75">No hay usuarios cargados.</span></div>
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
                      <tbody className={`divide-y text-xs font-bold ${darkMode ? "divide-slate-800 text-slate-200" : "divide-slate-200 text-slate-900"}`}>
                        {usersList.map((u) => (
                          <tr key={u.id} className={`hover:bg-slate-800/30`}>
                            <td className="py-3.5 px-3 opacity-75">#{u.id}</td>
                            <td className="py-3.5 px-3 font-black">{u.username}</td>
                            <td className="py-3.5 px-3">
                              <span className={`px-3 py-1 rounded-xl font-black ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-900' : 'bg-blue-100 text-blue-900'}`}>
                                {u.role === 'admin' ? 'Admin' : 'Empleado'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-mono opacity-80">{u.cedula || "-"}</td>
                            <td className="py-3.5 px-3 text-right">
                              <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-500 font-black hover:underline">Eliminar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : currentTab === "perfil" ? (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-8 rounded-[2rem] shadow-sm`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                    {(currentUsername || userRole).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{currentUsername || "Usuario"}</h2>
                    <p className="text-xs font-bold uppercase tracking-wider mt-0.5 opacity-75">Rol: {userRole === 'admin' ? 'Administrador' : 'Empleado'}</p>
                  </div>
                </div>

                <hr className={`my-6 ${darkMode ? "border-slate-800" : "border-slate-100"}`} />

                <h3 className="text-base font-black mb-4">Cambiar Contraseña</h3>

                {profileMsg && (
                  <div className={`mb-4 p-3 rounded-2xl text-xs font-black text-center ${profileMsg.includes("éxito") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                    {profileMsg}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Contraseña Actual</label>
                    <input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase mb-1 opacity-80">Nueva Contraseña</label>
                    <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} placeholder="••••••••" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl transition-all text-sm shadow-lg shadow-blue-600/30">
                    Actualizar Contraseña
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto">
              
              <div className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-6 rounded-[2rem] shadow-sm flex items-center justify-between`}>
                <div>
                  <h3 className="font-black text-lg">Resumen y Analíticas</h3>
                </div>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`border rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}>
                  <option value="all">Todos los meses (Histórico)</option>
                  {availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-8 rounded-[2rem] shadow-sm flex items-center justify-between`}>
                  <div>
                    <p className="text-xs font-black uppercase opacity-75">Total Horas</p>
                    <h3 className="text-4xl font-black mt-1">{totalHorasStats.toFixed(1)} <span className="text-xl font-bold opacity-75">hrs</span></h3>
                  </div>
                  <div className="px-3.5 py-1.5 bg-blue-100 text-blue-900 rounded-xl text-xs font-black">+18.5%</div>
                </div>

                <div className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-8 rounded-[2rem] shadow-sm flex items-center justify-between`}>
                  <div>
                    <p className="text-xs font-black uppercase opacity-75">Total Jornadas</p>
                    <h3 className="text-4xl font-black mt-1">{recordsForStats.length}</h3>
                  </div>
                  <div className="px-3.5 py-1.5 bg-blue-100 text-blue-900 rounded-xl text-xs font-black">Activo</div>
                </div>
              </div>

              <div className={`${darkMode ? "bg-[#1E293B] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"} border p-8 rounded-[2rem] shadow-sm`}>
                <h3 className="font-black text-lg mb-6">Estadísticas por Trabajador</h3>
                {chartData.length === 0 ? (
                  <div className="py-12 flex justify-center"><span className="text-sm font-bold opacity-75">No hay datos suficientes para graficar.</span></div>
                ) : (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#cbd5e1"} vertical={false} />
                        <XAxis dataKey="name" stroke={darkMode ? "#94a3b8" : "#334155"} fontSize={11} fontWeight={800} tickLine={false} axisLine={false} />
                        <YAxis stroke={darkMode ? "#94a3b8" : "#334155"} fontSize={11} fontWeight={800} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? "#0F172A" : "#ffffff", borderColor: darkMode ? "#334155" : "#94a3b8", borderRadius: "16px", color: darkMode ? "#ffffff" : "#0f172a", fontSize: "12px", fontWeight: "bold", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
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