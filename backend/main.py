from typing import Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from database import engine, get_db

# Migración automática para quitar la restricción NOT NULL de hashed_password y agregar user_id
try:
    models.Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR;"))
        conn.execute(text("ALTER TABLE records ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.commit()
except Exception as e:
    print(f"Sincronizando estructura de base de datos: {e}")

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

# 1. ENDPOINT DE REGISTRO
@app.post("/register")
def register(credentials: Dict[str, str], db: Session = Depends(get_db)):
    username = credentials.get("username", "").strip()
    password = credentials.get("password", "").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña requeridos")

    existing_user = db.query(models.User).filter(models.User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    # Guardar en ambos campos para resolver cualquier restricción de esquema previo
    new_user = models.User(username=username, password=password, hashed_password=password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"id": new_user.id, "username": new_user.username, "message": "Usuario registrado exitosamente"}

# 2. ENDPOINT DE LOGIN
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

# OBTENER REGISTROS DEL USUARIO
@app.get("/records")
def get_records(user_id: int, db: Session = Depends(get_db)):
    try:
        return db.query(models.Record).filter(models.Record.user_id == user_id).order_by(models.Record.id.desc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# CREAR REGISTRO PARA EL USUARIO
@app.post("/records")
def create_record(record_data: Dict[str, Any], user_id: int, db: Session = Depends(get_db)):
    try:
        record_data["user_id"] = user_id
        db_record = models.Record(**record_data)
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ACTUALIZAR REGISTRO DEL USUARIO
@app.put("/records/{record_id}")
def update_record(record_id: int, record_data: Dict[str, Any], user_id: int, db: Session = Depends(get_db)):
    try:
        db_record = db.query(models.Record).filter(models.Record.id == record_id, models.Record.user_id == user_id).first()
        if not db_record:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        for key, value in record_data.items():
            if hasattr(db_record, key) and key not in ["id", "user_id"]:
                setattr(db_record, key, value)

        db.commit()
        db.refresh(db_record)
        return db_record
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ELIMINAR REGISTRO DEL USUARIO
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