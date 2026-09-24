const API_URL = "https://backend-registro-horas.onrender.com";

// Función auxiliar para manejar las peticiones HTTP
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error en la petición del servidor");
  }
  return data;
}

// Registro general o de empleados
export async function registerUser(userData) {
  // Soporta tanto si se pasa un objeto (nuevo) como texto directo (antiguo)
  const payload = typeof userData === "object" ? userData : { username: userData.username, password: userData.password, role: "admin" };
  
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// Inicio de sesión
export async function loginUser(username, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse(response);
  if (data.token) {
    localStorage.setItem("token", data.token);
  }
  return data;
}

// Obtener registros de jornadas
export async function fetchRecords() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/records`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
  });
  return handleResponse(response);
}

// Crear registro
export async function createRecord(recordData) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/records`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(recordData),
  });
  return handleResponse(response);
}

// Actualizar registro
export async function updateRecord(recordId, recordData) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/records/${recordId}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(recordData),
  });
  return handleResponse(response);
}

// Eliminar registro
export async function deleteRecord(recordId) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/records/${recordId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
  });
  return handleResponse(response);
}