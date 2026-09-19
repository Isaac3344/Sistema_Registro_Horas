const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function loginUser(credentials) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    const errorData = await response.json();
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
  const response = await fetch(`${API_URL}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!response.ok) throw new Error("Error al crear registro");
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