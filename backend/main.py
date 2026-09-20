from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
from database import engine, get_db

# Crear las tablas automáticamente en PostgreSQL (Neon) al iniciar el servidor
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Advertencia al crear tablas: {e}")

app = FastAPI(
    title="API de Registro de Horas",
    description="Backend FastAPI para la gestión e imputación de jornadas laborales",
    version="1.0.0"
)

# Configuración de CORS para permitir solicitudes desde Vercel y entorno local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "API de Registro de Horas activa y conectada"
    }

# Obtener todos los registros
@app.get("/records")
def get_records(db: Session = Depends(get_db)):
    try:
        records = db.query(models.Record).order_by(models.Record.id.desc()).all()
        return records
    except Exception as e:
        print(f"Error al obtener registros: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al obtener los registros: {str(e)}"
        )

# Crear un nuevo registro
@app.post("/records")
def create_record(record_data: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        db_record = models.Record(**record_data)
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record
    except Exception as e:
        db.rollback()
        print(f"Error al crear el registro: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear el registro en la base de datos: {str(e)}"
        )

# Actualizar un registro existente
@app.put("/records/{record_id}")
def update_record(record_id: int, record_data: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        db_record = db.query(models.Record).filter(models.Record.id == record_id).first()
        if not db_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El registro solicitado no existe."
            )

        for key, value in record_data.items():
            if hasattr(db_record, key):
                setattr(db_record, key, value)

        db.commit()
        db.refresh(db_record)
        return db_record
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al actualizar el registro: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar el registro: {str(e)}"
        )

# Eliminar un registro
@app.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    try:
        db_record = db.query(models.Record).filter(models.Record.id == record_id).first()
        if not db_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El registro a eliminar no fue encontrado."
            )

        db.delete(db_record)
        db.commit()
        return {
            "message": "Registro eliminado exitosamente de PostgreSQL",
            "id": record_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al eliminar el registro: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar el registro de la base de datos: {str(e)}"
        )