from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)

    records = relationship("Record", back_populates="owner")

class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)

    # Nombres de campos en inglés
    worker_name = Column(String, nullable=True)
    work_date = Column(String, nullable=True)
    entry_time = Column(String, nullable=True)
    exit_time = Column(String, nullable=True)
    calculated_hours = Column(Float, nullable=True)
    cost_center = Column(String, nullable=True)
    description = Column(String, nullable=True)

    # Nombres de campos en español (compatibilidad con esquema antiguo)
    trabajador = Column(String, nullable=True)
    fecha = Column(String, nullable=True)
    hora_entrada = Column(String, nullable=True)
    hora_salida = Column(String, nullable=True)
    horas = Column(Float, nullable=True)
    centro_costo = Column(String, nullable=True)
    descripcion = Column(String, nullable=True)

    user_id = Column(Integer, nullable=True)

    owner = relationship("User", back_populates="records")