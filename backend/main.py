import traceback
from typing import Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from database import engine, get_db

app = FastAPI(title="API Multiusuario Control de Horas")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled Exception: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error en servidor: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

# Saneamiento automático de base de datos Neon PostgreSQL
try:
    models.Base.metadata.create_all(bind=engine)
    all_columns = [
        "trabajador", "fecha", "hora_entrada", "hora_salida", "horas", "centro_costo", "descripcion",
        "worker_name", "work_date", "entry_time", "exit_time", "calculated_hours", "cost_center", "description", "user_id"
    ]
    with engine.connect() as conn:
        for col in all_columns:
            # 1. Asegurar que la columna existe
            try:
                col_type = "DOUBLE PRECISION" if col in ["horas", "calculated_hours"] else ("INTEGER" if col == "user_id" else "VARCHAR")
                conn.execute(text(f"ALTER TABLE records ADD COLUMN IF NOT EXISTS {col} {col_type};"))
                conn.commit()
            except Exception:
                pass
            # 2. Remover restricciones NOT NULL antiguas que causan error 500
            try:
                conn.execute(text(f"ALTER TABLE records ALTER COLUMN {col} DROP NOT NULL;"))
                conn.commit()
            except Exception:
                pass
except Exception as e:
    print(f"Aviso de sincronización DB: {e}")

@app.get("/")
def read_root():
    return {"status": "online", "message": "API Multiusuario activa"}

# REGISTRO DE USUARIOS
@app.post("/register")
def register(credentials: Dict[str, str], db: Session = Depends(get_db)):
    username = credentials.get("username", "").strip()
    password = credentials.get("password", "").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña requeridos")

    existing_user = db.query(models.User).filter(models.User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    new_user = models.User(username=username, password=password, hashed_password=password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"id": new_user.id, "username": new_user.username, "message": "Usuario registrado exitosamente"}

# INICIO DE SESIÓN
@app.post("/login")
def login(credentials: Dict[str, str], db: Session = Depends(get_db)):
    username = credentials.get("username", "").strip()
    password = credentials.get("password", "").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña requeridos")

    user = db.query(models.User).filter(models.User.username == username).first()

    if not user:
        raise HTTPException(status_code=401, detail="El usuario no existe. Por favor regístrate primero.")

    user_pass = user.password or user.hashed_password
    if user_pass != password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    return {"id": user.id, "username": user.username, "message": "Autenticación exitosa"}

# OBTENER REGISTROS DE UN USUARIO
@app.get("/records")
def get_records(user_id: int, db: Session = Depends(get_db)):
    try:
        return db.query(models.Record).filter(models.Record.user_id == user_id).order_by(models.Record.id.desc()).all()
    except Exception as e:
        print(f"Error GET /records: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error al obtener registros: {str(e)}")

# CREAR REGISTRO PARA UN USUARIO
@app.post("/records")
def create_record(record_data: Dict[str, Any], user_id: int, db: Session = Depends(get_db)):
    try:
        w_name = str(record_data.get("worker_name") or record_data.get("trabajador") or "")
        w_date = str(record_data.get("work_date") or record_data.get("fecha") or "")
        e_time = str(record_data.get("entry_time") or record_data.get("hora_entrada") or "")
        x_time = str(record_data.get("exit_time") or record_data.get("hora_salida") or "")
        calc_hrs = float(record_data.get("calculated_hours") or record_data.get("horas") or 0.0)
        c_center = str(record_data.get("cost_center") or record_data.get("centro_costo") or "")
        desc = str(record_data.get("description") or record_data.get("descripcion") or "")

        # Validar existencia de usuario para evitar conflicto de Clave Foránea
        user_exists = db.query(models.User).filter(models.User.id == user_id).first()
        valid_user_id = user_id if user_exists else None

        db_record = models.Record(
            worker_name=w_name,
            work_date=w_date,
            entry_time=e_time,
            exit_time=x_time,
            calculated_hours=calc_hrs,
            cost_center=c_center,
            description=desc,
            trabajador=w_name,
            fecha=w_date,
            hora_entrada=e_time,
            hora_salida=x_time,
            horas=calc_hrs,
            centro_costo=c_center,
            descripcion=desc,
            user_id=valid_user_id
        )

        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record
    except Exception as e:
        db.rollback()
        print(f"Error POST /records: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error al guardar registro: {str(e)}")

# ACTUALIZAR REGISTRO
@app.put("/records/{record_id}")
def update_record(record_id: int, record_data: Dict[str, Any], user_id: int, db: Session = Depends(get_db)):
    try:
        db_record = db.query(models.Record).filter(models.Record.id == record_id, models.Record.user_id == user_id).first()
        if not db_record:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        w_name = record_data.get("worker_name") or record_data.get("trabajador") or db_record.worker_name
        w_date = record_data.get("work_date") or record_data.get("fecha") or db_record.work_date
        e_time = record_data.get("entry_time") or record_data.get("hora_entrada") or db_record.entry_time
        x_time = record_data.get("exit_time") or record_data.get("hora_salida") or db_record.exit_time
        calc_hrs = float(record_data.get("calculated_hours") or record_data.get("horas") or db_record.calculated_hours or 0.0)
        c_center = record_data.get("cost_center") or record_data.get("centro_costo") or db_record.cost_center
        desc = record_data.get("description") or record_data.get("descripcion") or db_record.description

        db_record.worker_name = w_name
        db_record.work_date = w_date
        db_record.entry_time = e_time
        db_record.exit_time = x_time
        db_record.calculated_hours = calc_hrs
        db_record.cost_center = c_center
        db_record.description = desc

        db_record.trabajador = w_name
        db_record.fecha = w_date
        db_record.hora_entrada = e_time
        db_record.hora_salida = x_time
        db_record.horas = calc_hrs
        db_record.centro_costo = c_center
        db_record.descripcion = desc

        db.commit()
        db.refresh(db_record)
        return db_record
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ELIMINAR REGISTRO
@app.delete("/records/{record_id}")
def delete_record(record_id: int, user_id: int, db: Session = Depends(get_db)):
    try:
        db_record = db.query(models.Record).filter(models.Record.id == record_id, models.Record.user_id == user_id).first()
        if not db_record:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        db.delete(db_record)
        db.commit()
        return {"message": "Eliminado correctamente", "id": record_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))