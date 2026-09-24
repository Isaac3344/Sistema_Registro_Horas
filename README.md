# ⚡ Plataforma Profesional de Registro de Horas y Costos

Sistema web moderno y seguro desarrollado para el control de jornadas laborales, cálculo automático de horas, filtrado avanzado por trabajador/semana/mes, reportes profesionales en Excel y PDF, y gestión de accesos con roles diferenciados (Administradores y Empleados).

---

## 🚀 Características Principales

- **Seguridad por Token de Administrador:** Inicio de sesión protegido con contraseña y token secreto para cuentas de administrador (`ADMIN123*`).
- **Roles Separados:**
  - 👑 **Administradores:** Control total, creación y edición de registros, visualización de todos los empleados y creación de cuentas de acceso.
  - 👁️ **Empleados:** Acceso de solo vista vinculado de forma segura a su número de cédula para consultar exclusivamente sus propias jornadas.
- **Diseño Responsive Moderno:** Interfaz adaptada con Tailwind CSS para una experiencia fluida tanto en computadoras como en tablets y celulares.
- **Paginación y Filtros en Cascada:** Visualización optimizada de registros (7 por página) con filtros dinámicos por trabajador, mes y semana.
- **Dashboard Estadístico:** Gráficos de barras interactivos (mediante Recharts) para analizar las horas trabajadas por cada colaborador en tiempo real.
- **Exportación Profesional:** Botones integrados para generar reportes limpios y formateados en Excel (`xlsx-js-style`) y documentos listos para impresión/PDF.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React.js, Tailwind CSS, Recharts, `xlsx-js-style`.
- **Backend:** Python (FastAPI), SQLAlchemy.
- **Base de Datos:** PostgreSQL.
- **Despliegue y Alojamiento:** Render (Backend/Base de Datos) y Vercel (Frontend).

---

## 📂 Estructura del Repositorio

```text
📁 control-de-horas/
│
├── 📁 backend/             # API en FastAPI y modelos de base de datos PostgreSQL
│   ├── main.py
│   └── ...
│
├── 📁 frontend/            # Interfaz de usuario en React.js y Tailwind CSS
│   ├── src/
│   │   ├── App.jsx
│   │   └── api.js
│   └── package.json
│
└── README.md               # Documentación del proyecto


#CLONAR EL REPOSITORIO

git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
cd tu-repositorio

#CONFIGURAR EL BACKEND

cd backend
# Instalar dependencias
pip install -r requirements.txt
# Iniciar servidor local
uvicorn main:app --reload

#CONFIGURAR EL FRONTEND 

cd backend
# Instalar dependencias
pip install -r requirements.txt
# Iniciar servidor local
uvicorn main:app --reload

