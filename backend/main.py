from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

import models
from database import engine, get_db
from auth_utils import verify_password, get_password_hash

# Crear tablas en PostgreSQL/SQLite
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Registro Personal")

# CORS activado para Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Esquemas Pydantic
class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str

class RecordSchema(BaseModel):
    id: Optional[int] = None
    worker_name: str
    work_date: str
    entry_time: str
    exit_time: str
    lunch_break: str
    cost_center: Optional[str] = ""
    description: Optional[str] = ""
    calculated_hours: float

    class Config:
        orm_mode = True

# --- ENDPOINTS ---
@app.get("/")
def root():
    return {"status": "ok", "message": "API funcionando correctamente en la nube"}

@app.post("/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    return {"status": "success", "username": user.username}

@app.post("/register-admin")
def register_admin(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    new_user = models.User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(new_user)
    db.commit()
    return {"message": f"Usuario '{new_user.username}' creado con éxito en PostgreSQL"}

@app.get("/records", response_model=List[RecordSchema])
def get_records(db: Session = Depends(get_db)):
    return db.query(models.Record).all()

@app.post("/records", response_model=RecordSchema)
def create_record(record: RecordSchema, db: Session = Depends(get_db)):
    db_record = models.Record(**record.dict(exclude={"id"}))
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@app.put("/records/{record_id}", response_model=RecordSchema)
def update_record(record_id: int, record: RecordSchema, db: Session = Depends(get_db)):
    db_record = db.query(models.Record).filter(models.Record.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    for key, value in record.dict(exclude={"id"}).items():
        setattr(db_record, key, value)
    db.commit()
    db.refresh(db_record)
    return db_record

@app.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    db_record = db.query(models.Record).filter(models.Record.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(db_record)
    db.commit()
    return {"message": "Registro eliminado"}