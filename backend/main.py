import traceback
from typing import Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
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

# --- RESET DE BASE DE DATOS (SOLUCIÓN DEFINITIVA) ---
try:
    # 1. Borrar todas las tablas antiguas con errores
    models.Base.metadata.drop_all(bind=engine)
    # 2. Crear las tablas nuevamente con la estructura perfecta de models.py
    models.Base.metadata.create_all(bind=engine)
    print("Base de datos reseteada y creada con éxito.")
except Exception as e:
    print(f"Error al resetear esquema DB: {e}")

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

# OBTENER REGISTROS
@app.get("/records")
def get_records(user_id: int, db: Session = Depends(get_db)):
    try:
        return db.query(models.Record).filter(models.Record.user_id == user_id).order_by(models.Record.id.desc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# CREAR REGISTRO 
@app.post("/records")
def create_record(record_data: Dict[str, Any], user_id: int, db: Session = Depends(get_db)):
    try:
        user_exists = db.query(models.User).filter(models.User.id == user_id).first()
        valid_user_id = user_id if user_exists else None

        db_record = models.Record(
            worker_name=record_data.get("worker_name", ""),
            work_date=record_data.get("work_date", ""),
            entry_time=record_data.get("entry_time", ""),
            exit_time=record_data.get("exit_time", ""),
            calculated_hours=float(record_data.get("calculated_hours", 0.0)),
            cost_center=record_data.get("cost_center", ""),
            description=record_data.get("description", ""),
            user_id=valid_user_id
        )

        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar registro: {str(e)}")

# ACTUALIZAR REGISTRO
@app.put("/records/{record_id}")
def update_record(record_id: int, record_data: Dict[str, Any], user_id: int, db: Session = Depends(get_db)):
    try:
        db_record = db.query(models.Record).filter(models.Record.id == record_id, models.Record.user_id == user_id).first()
        if not db_record:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        db_record.worker_name = record_data.get("worker_name", db_record.worker_name)
        db_record.work_date = record_data.get("work_date", db_record.work_date)
        db_record.entry_time = record_data.get("entry_time", db_record.entry_time)
        db_record.exit_time = record_data.get("exit_time", db_record.exit_time)
        db_record.calculated_hours = float(record_data.get("calculated_hours", db_record.calculated_hours))
        db_record.cost_center = record_data.get("cost_center", db_record.cost_center)
        db_record.description = record_data.get("description", db_record.description)

        db.commit()
        db.refresh(db_record)
        return db_record
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))