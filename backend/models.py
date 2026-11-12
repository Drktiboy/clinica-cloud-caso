from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

# Tabla / Entidad: Usuario (Define los roles: admin, medico, recepcion)
class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    rol: str 
    email: str

# Tabla / Entidad: Paciente
class Paciente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre_completo: str
    curp: str = Field(unique=True, index=True)
    telefono: str
    email: str

# Tabla / Entidad: Cita (Relaciona Pacientes con Médicos)
class Cita(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="paciente.id")
    medico_id: int = Field(foreign_key="usuario.id")
    fecha_hora: datetime
    motivo: str
    estado: str = Field(default="programada") # programada, completada, cancelada

# Tabla / Entidad: LogETL (Histórico de auditoría de respaldos IaaS)
class LogETL(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fecha_ejecucion: datetime = Field(default_factory=datetime.utcnow)
    registros_procesados: int
    archivo_log: str