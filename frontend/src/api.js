const API_URL = "https://backend-registro-horas.onrender.com";

// Función maestra para obtener la cabecera de seguridad JWT
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}` // Aquí inyectamos el Token secreto
  };
};

export const registerUser = async (username, password) => {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Error al registrar usuario");
  }
  const data = await res.json();
  localStorage.setItem("token", data.token); // Guardamos el token
  return data;
};

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
  const data = await res.json();
  localStorage.setItem("token", data.token); // Guardamos el token
  return data;
};

// Las demás peticiones ya no usan el ID en la URL, usan getAuthHeaders()
export const fetchRecords = async () => {
  const res = await fetch(`${API_URL}/records`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Sesión expirada o inválida. Vuelve a iniciar sesión.");
  return await res.json();
};

export const createRecord = async (data) => {
  const res = await fetch(`${API_URL}/records`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear registro");
  return await res.json();
};

export const updateRecord = async (id, data) => {
  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar registro");
  return await res.json();
};

export const deleteRecord = async (id) => {
  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Error al eliminar registro");
  return await res.json();
};