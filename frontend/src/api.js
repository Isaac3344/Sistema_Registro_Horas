const API_URL = "https://backend-registro-horas.onrender.com";

export const loginUser = async (username, password) => {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Error al iniciar sesión");
  }
  return await res.json();
};

export const fetchRecords = async (userId) => {
  const res = await fetch(`${API_URL}/records?user_id=${userId}`);
  if (!res.ok) throw new Error("Error al obtener registros");
  return await res.json();
};

export const createRecord = async (data, userId) => {
  const res = await fetch(`${API_URL}/records?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear registro");
  return await res.json();
};

export const updateRecord = async (id, data, userId) => {
  const res = await fetch(`${API_URL}/records/${id}?user_id=${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar registro");
  return await res.json();
};

export const deleteRecord = async (id, userId) => {
  const res = await fetch(`${API_URL}/records/${id}?user_id=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar registro");
  return await res.json();
};