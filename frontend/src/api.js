const API_URL = import.meta.env.VITE_API_URL || "https://backend-registro-horas.onrender.com";

export async function loginUser(credentials) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error de autenticación");
  }
  return await response.json();
}

export async function fetchRecords() {
  const response = await fetch(`${API_URL}/records`);
  if (!response.ok) throw new Error("Error al obtener registros");
  return await response.json();
}

export async function createRecord(record) {
  const payload = {
    worker_name: String(record.worker_name || record.workerName || record.nombre || "").trim(),
    work_date: String(record.work_date || record.workDate || record.fecha || ""),
    entry_time: String(record.entry_time || record.entryTime || record.hora_entrada || ""),
    exit_time: String(record.exit_time || record.exitTime || record.hora_salida || ""),
    lunch_break: String(record.lunch_break || record.lunchBreak || record.almuerzo || "0"),
    cost_center: String(record.cost_center || record.costCenter || record.centro_costo || ""),
    description: String(record.description || record.descripcion || ""),
    calculated_hours: parseFloat(record.calculated_hours || record.calculatedHours || 0)
  };

  const response = await fetch(`${API_URL}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al crear registro");
  }
  return await response.json();
}

export async function updateRecord(id, record) {
  const response = await fetch(`${API_URL}/records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!response.ok) throw new Error("Error al actualizar registro");
  return await response.json();
}

export async function deleteRecord(id) {
  const response = await fetch(`${API_URL}/records/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Error al eliminar registro");
  return await response.json();
}