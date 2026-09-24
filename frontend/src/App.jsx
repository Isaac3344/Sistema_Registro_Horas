import React, { useState, useEffect } from "react";
import { 
  registerUser, 
  loginUser, 
  fetchRecords, 
  createRecord, 
  updateRecord, 
  deleteRecord 
} from "./api";

export default function App() {
  // Estados de Autenticación
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isLoginView, setIsLoginView] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Estados de la Aplicación (Pestañas y Registros)
  const [currentTab, setCurrentTab] = useState("gestion"); // "gestion" o "estadisticas"
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Campos del Formulario de Registro de Jornada
  const [workerName, setWorkerName] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryTime, setEntryTime] = useState("08:00");
  const [exitTime, setExitTime] = useState("17:00");
  const [costCenter, setCostCenter] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Cargar registros al iniciar sesión o tener token válido
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
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message);
      if (err.message.includes("expirada") || err.message.includes("401")) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Manejar Login / Registro
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

  // Calcular horas automáticamente
  const calculateHours = (entry, exit) => {
    if (!entry || !exit) return 0;
    const [eHour, eMin] = entry.split(":").map(Number);
    const [xHour, xMin] = exit.split(":").map(Number);
    const totalMinutes = (xHour * 60 + xMin) - (eHour * 60 + eMin);
    const hours = totalMinutes / 60;
    return hours > 0 ? Number(hours.toFixed(2)) : 0;
  };

  const calculatedHours = calculateHours(entryTime, exitTime);

  // Guardar o Actualizar Jornada
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

      // Limpiar formulario y recargar
      setWorkerName("");
      setCostCenter("");
      setDescription("");
      loadRecords();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  // Editar Registro
  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setWorkerName(rec.worker_name || rec.trabajador || "");
    setWorkDate(rec.work_date || rec.fecha || "");
    setEntryTime(rec.entry_time || rec.hora_entrada || "08:00");
    setExitTime(rec.exit_time || rec.hora_salida || "17:00");
    setCostCenter(rec.cost_center || rec.centro_costo || "");
    setDescription(rec.description || rec.descripcion || "");
  };

  // Eliminar Registro
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

  // ================= PANTALLA DE LOGIN / REGISTRO =================
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 text-2xl mb-3">
              🔒
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isLoginView ? "Iniciar Sesión" : "Crear Cuenta"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Control de Jornadas y Costos</p>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition duration-200"
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

  // ================= PANTALLA PRINCIPAL CON PESTAÑAS =================
  const totalHoras = records.reduce((acc, curr) => acc + (Number(curr.calculated_hours || curr.horas) || 0), 0);
  const horasPorTrabajador = records.reduce((acc, curr) => {
    const t = curr.worker_name || curr.trabajador || "Sin nombre";
    const h = Number(curr.calculated_hours || curr.horas) || 0;
    acc[t] = (acc[t] || 0) + h;
    return acc;
  }, {});

  const horasPorCentro = records.reduce((acc, curr) => {
    const c = curr.cost_center || curr.centro_costo || "General";
    const h = Number(curr.calculated_hours || curr.horas) || 0;
    acc[c] = (acc[c] || 0) + h;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegación Superior */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold">
            AR
          </div>
          <div>
            <h1 className="font-bold text-white text-lg">APP REGISTRO</h1>
            <p className="text-xs text-slate-400">Control de Jornadas y Costos</p>
          </div>
        </div>

        {/* Pestañas */}
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

      {/* Contenido Principal */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {currentTab === "gestion" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl h-fit">
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

            {/* Tabla de Historial */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-bold text-white text-lg">Historial de Registros</h2>
                  <p className="text-xs text-slate-400">Consulta y gestiona tus jornadas laborales</p>
                </div>
                <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-xl font-bold">
                  {records.length} Registros
                </span>
              </div>

              {loading ? (
                <p className="text-center text-slate-500 py-8">Cargando registros...</p>
              ) : records.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No se encontraron registros guardados.</p>
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
                        <th className="pb-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {records.map((rec) => (
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
                          <td className="py-3 px-3 text-right space-x-2">
                            <button
                              onClick={() => handleEdit(rec)}
                              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2 py-1 bg-indigo-500/10 rounded-lg"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded-lg"
                            >
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
          /* ================= PESTAÑA DE ESTADÍSTICAS VISUALES ================= */
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total de Horas Registradas</p>
                  <h3 className="text-4xl font-extrabold text-emerald-400 mt-1">{totalHoras.toFixed(1)} hrs</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-2xl">
                  ⏱️
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Jornadas Guardadas</p>
                  <h3 className="text-4xl font-extrabold text-indigo-400 mt-1">{records.length}</h3>
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-2xl">
                  📊
                </div>
              </div>
            </div>

            {/* Gráfico de Horas por Trabajador */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">👤 Distribución de Horas por Trabajador</h3>
              {Object.keys(horasPorTrabajador).length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No hay datos suficientes todavía.</p>
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
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gráfico de Horas por Centro de Costo */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">🏢 Horas por Centro de Costo</h3>
              {Object.keys(horasPorCentro).length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No hay datos suficientes todavía.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(horasPorCentro).map(([centro, horas]) => {
                    const porcentaje = totalHoras > 0 ? (horas / totalHoras) * 100 : 0;
                    return (
                      <div key={centro}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-200 font-medium">{centro || "Sin especificar"}</span>
                          <span className="text-indigo-400 font-bold">{horas.toFixed(1)} hrs ({porcentaje.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${porcentaje}%` }}
                          ></div>
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