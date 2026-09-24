from typing import Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
from database import engine, get_db

# Crear las tablas automáticamente en Neon PostgreSQL
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Error al sincronizar tablas: {e}")

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

# LOGIN Y REGISTRO AUTOMÁTICO EN POSTGRESQL
@app.post("/login")
def login(credentials: Dict[str, str], db: Session = Depends(get_db)):
    username = credentials.get("username", "").strip()
    password = credentials.get("password", "").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña requeridos")

    user = db.query(models.User).filter(models.User.username == username).first()

    if not user:
        # Se crea automáticamente en la primera sesión
        user = models.User(username=username, password=password)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Verifica la contraseña registrada
        if user.password != password:
            raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    return {"id": user.id, "username": user.username, "message": "Autenticación exitosa"}

# OBTENER SOLO LOS REGISTROS DEL USUARIO
@app.get("/records")
def get_records(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Record).filter(models.Record.user_id == user_id).order_by(models.Record.id.desc()).all()

# CREAR REGISTRO PERTENECIENTE AL USUARIO
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

# ACTUALIZAR REGISTRO DE ESE USUARIO
@app.put("/records/{record_id}")
def update_record(record_id: int, record_data: Dict[str, Any], user_id: int, db: Session = Depends(get_db)):
    db_record = db.query(models.Record).filter(models.Record.id == record_id, models.Record.user_id == user_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    for key, value in record_data.items():
        if hasattr(db_record, key) and key not in ["id", "user_id"]:
            setattr(db_record, key, value)

    db.commit()
    db.refresh(db_record)
    return db_record

# ELIMINAR REGISTRO DE ESE USUARIO
@app.delete("/records/{record_id}")
def delete_record(record_id: int, user_id: int, db: Session = Depends(get_db)):
    db_record = db.query(models.Record).filter(models.Record.id == record_id, models.Record.user_id == user_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    db.delete(db_record)
    db.commit()
    return {"message": "Eliminado correctamente", "id": record_id}