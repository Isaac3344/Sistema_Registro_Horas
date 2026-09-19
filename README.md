# ⏱️ APP REGISTRO - Control de Jornadas y Costeo

Un sistema web Full-Stack moderno para el registro, cálculo de horas netas trabajadas, control por centro de costo y generación de reportes gerenciales en PDF y Excel.

## 🚀 Características Principales

* 🔐 **Autenticación y Seguridad:** Inicio de sesión protegido con encriptación de contraseñas (`bcrypt`), sesiones persistentes y gestión de usuarios.

* ⏱️ **Cálculo Automático de Jornadas:** Cálculo dinámico e inmediato de horas netas trabajadas aplicando la fórmula:
  

  $$
  \text{Horas Trabajadas} = (\text{Hora Salida} - \text{Hora Entrada}) - \text{Horas Almuerzo}
  $$

* 📊 **Dashboard Estadístico e Indicadores KPI:**

  * Métricas clave: Total de horas acumuladas, total de jornadas, mayor centro de costo e intensidad promedio.

  * Gráfico de barras visuales de distribución por centro de costo.

  * Filtros interactivos por **Histórico Completo**, **Por Mes** (`YYYY-MM`) o **Rango de Fechas** (`Desde` / `Hasta`).

* 📑 **Historial Paginado y Filtros:** Tabla interactiva paginada a **8 registros por página** con barra de búsqueda por nombre, fecha exacta y centro de costo.

* 📄 **Exportación de Reportes Profesional:**

  * **Excel (`.xlsx`):** Generación binaria nativa con SheetJS, limpia de código HTML o metadatos.

  * **PDF Vectorial:** Reporte imprimible y descargable generado directamente desde memoria con `jsPDF` + `AutoTable`.

* 📥 **Importación Masiva Limpia:** Lector de plantillas `.xlsx` / `.csv` con motor de normalización de horas y descarte automático de etiquetas HTML o filas corruptas.

## 🛠️ Tecnologías Utilizadas

### **Frontend**

* **React 18** (Vite)

* **Tailwind CSS** (Estilo oscuro *Slate/Emerald/Cyan*)

* **Lucide React** (Iconografía vectorial)

* **SheetJS (XLSX)** (Procesamiento binario de Excel)

* **jsPDF + AutoTable** (Generación vectorial de PDF)

### **Backend**

* **FastAPI** (Python Web Framework)

* **SQLAlchemy** (ORM)

* **Pydantic** (Validación de esquemas)

* **Passlib & Bcrypt** (Seguridad y hashing)

* **Uvicorn** (Servidor ASGI)

### **Base de Datos & Despliegue**

* **PostgreSQL** (Neon.tech en producción) / **SQLite** (Pruebas locales)

* **Vercel** (Hosting Frontend)

* **Render** (Hosting Backend)

## 📁 Estructura del Proyecto

```
registro-personal/
├── backend/
│   ├── main.py            # API FastAPI y Endpoints
│   ├── models.py          # Modelos de SQLAlchemy (Users, Records)
│   ├── database.py        # Conexión a PostgreSQL / SQLite
│   ├── auth_utils.py      # Hashing y verificación bcrypt
│   └── requirements.txt   # Dependencias de Python
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx            # Formulario de Acceso
│   │   │   ├── RegistroForm.jsx     # Formulario de Jornada
│   │   │   ├── RegistrosTabla.jsx   # Tabla Paginada y Exportación
│   │   │   └── Estadisticas.jsx     # Dashboard KPI y Gráficos
│   │   ├── api.js                   # Cliente HTTP (Fetch)
│   │   └── App.jsx                  # Estado Global y Navegación
│   ├── package.json
│   └── vite.config.js
└── .gitignore

```

## ⚙️ Instalación y Configuración Local

### 1. Clonar el Repositorio

```
git clone https://github.com/TU-USUARIO/registro-personal.git
cd registro-personal

```

### 2. Configurar el Backend (FastAPI)

```
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor local
uvicorn main:app --reload --port 8000

```

> El servidor estará disponible en `http://localhost:8000` y la documentación interactiva Swagger en `http://localhost:8000/docs`.

### 3. Configurar el Frontend (React)

```
cd ../frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

```

> La aplicación estará disponible en `http://localhost:5173`.

## 🌐 Variables de Entorno para Despliegue

### **Render / Backend**

| 

| **Variable** | **Descripción** | **Ejemplo** | 
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | 

### **Vercel / Frontend**

| **Variable** | **Descripción** | **Ejemplo** | 
| `VITE_API_URL` | URL pública del Backend en Render | `https://backend-registro-personal.onrender.com` | 

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Puedes usarlo y modificarlo libremente.