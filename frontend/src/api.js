export async function createRecord(record) {
  // Asegurar que los datos coincidan exactamente con RecordSchema de FastAPI
  const payload = {
    worker_name: String(record.worker_name || record.nombre || record.trabajador || "").trim(),
    work_date: String(record.work_date || record.fecha || ""),
    entry_time: String(record.entry_time || record.hora_entrada || record.entrada || ""),
    exit_time: String(record.exit_time || record.hora_salida || record.salida || ""),
    lunch_break: String(record.lunch_break || record.almuerzo || "0"),
    cost_center: String(record.cost_center || record.centro_costo || ""),
    description: String(record.description || record.descripcion || ""),
    calculated_hours: parseFloat(record.calculated_hours || record.horas || 0)
  };

  const response = await fetch(`${API_URL}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Error backend:", errorData);
    throw new Error(errorData.detail || "Error al crear registro");
  }

  return await response.json();
}