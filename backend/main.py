from typing import Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from database import engine, get_db

# Migración de estructura y eliminación de restricciones NOT NULL en PostgreSQL
try:
    models.Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        # 1. Ajustes en tabla users
        try:
            conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR;"))
        except Exception:
            pass

        # 2. Agregar nuevas columnas si no existen
        new_cols = [
            ("worker_name", "VARCHAR"),
            ("work_date", "VARCHAR"),
            ("entry_time", "VARCHAR"),
            ("exit_time", "VARCHAR"),
            ("calculated_hours", "FLOAT"),
            ("cost_center", "VARCHAR"),
            ("description", "VARCHAR"),
            ("user_id", "INTEGER")
        ]
        for col, col_type in new_cols:
            try:
                conn.execute(text(f"ALTER TABLE records ADD COLUMN IF NOT EXISTS {col} {col_type};"))
            except Exception:
                pass

        # 3. Remover restricciones NOT NULL de columnas en español
        legacy_cols = ["trabajador", "fecha", "hora_entrada", "hora_salida", "horas", "centro_costo", "descripcion"]
        for col in legacy_cols:
            try:
                conn.execute(text(f"ALTER TABLE records ALTER COLUMN {col} DROP NOT NULL;"))
            except Exception:
                pass

        conn.commit()
except Exception as e:
    print(f"Sincronizando base de datos: {e}")

app = FastAPI(title="API Multiusuario Control de Horas")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "API Multiusuario activa"}

# REGISTRO
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

# LOGIN
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

# OBTENER REGISTROS DE USUARIO
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
        w_name = record_data.get("worker_name") or record_data.get("trabajador") or ""
        w_date = record_data.get("work_date") or record_data.get("fecha") or ""
        e_time = record_data.get("entry_time") or record_data.get("hora_entrada") or ""
        x_time = record_data.get("exit_time") or record_data.get("hora_salida") or ""
        calc_hrs = float(record_data.get("calculated_hours") or record_data.get("horas") or 0.0)
        c_center = record_data.get("cost_center") or record_data.get("centro_costo") or ""
        desc = record_data.get("description") or record_data.get("descripcion") or ""

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
            user_id=user_id
        )

        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record
    except Exception as e:
        db.rollback()
        print(f"Error al crear registro: {e}")
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