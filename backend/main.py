from typing import Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
from database import engine, get_db

# Crear y sincronizar las tablas automáticamente en Neon PostgreSQL
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Error al sincronizar tablas en la base de datos: {e}")

app = FastAPI(title="API Multiusuario Control de Horas")

# Configuración estricta de CORS
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

# ENDPOINT DE LOGIN Y REGISTRO AUTOMÁTICO
@app.post("/login")
def login(credentials: Dict[str, str], db: Session = Depends(get_db)):
    username = credentials.get("username", "").strip()
    password = credentials.get("password", "").strip()

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario y contraseña requeridos"
        )

    try:
        user = db.query(models.User).filter(models.User.username == username).first()

        if not user:
            # Creación automática del usuario en su primer inicio
            user = models.User(username=username, password=password)
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if user.password != password:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Contraseña incorrecta"
                )

        return {"id": user.id, "username": user.username, "message": "Autenticación exitosa"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error en /login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en servidor al autenticar: {str(e)}"
        )

# OBTENER REGISTROS EXCLUSIVOS DEL USUARIO
@app.get("/records")
def get_records(user_id: int, db: Session = Depends(get_db)):
    try:
        return db.query(models.Record).filter(models.Record.user_id == user_id).order_by(models.Record.id.desc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# CREAR REGISTRO VINCULADO AL USUARIO
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