import smtplib
from email.mime.text import MIMEText
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware # <-- AGREGAR ESTA LÍNEA
from sqlmodel import Session, select
import jwt
from datetime import datetime
from pydantic import BaseModel

from database import engine, create_db_and_tables, get_session
from models import Usuario, Paciente, Cita
from auth import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM

app = FastAPI(title="API Clínica Privada - Cloud")

# ==========================================
# CONFIGURACIÓN CORS (OBLIGATORIO)
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==========================================
# CONFIGURACIÓN SAAS (GMAIL SMTP)
# ==========================================
SMTP_USER = "michaelsnchz18@gmail.com" # Cambia por tu correo
SMTP_PASSWORD = "hggj jvrt aqkt ezab" # Contraseña de 16 caracteres de Google

def enviar_correo_gmail(email_destino: str, mensaje: str):
    """Integración SaaS: Envío asíncrono de correos vía Gmail TLS 587"""
    try:
        msg = MIMEText(mensaje)
        msg['Subject'] = 'Confirmación de Cita Médica - Clínica Cloud'
        msg['From'] = SMTP_USER
        msg['To'] = email_destino

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Correo enviado exitosamente a {email_destino}")
    except Exception as e:
        print(f"Error al enviar correo SaaS: {e}")

# ==========================================
# EVENTO DE INICIO
# ==========================================
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Crear un usuario administrador por defecto si no existe
    with Session(engine) as session:
        admin = session.exec(select(Usuario).where(Usuario.username == "admin")).first()
        if not admin:
            nuevo_admin = Usuario(
                username="admin", 
                password_hash=get_password_hash("admin123"), 
                rol="admin", 
                email="admin@clinica.com"
            )
            session.add(nuevo_admin)
            session.commit()

# ==========================================
# DEPENDENCIA DE SEGURIDAD (JWT & RBAC)
# ==========================================
def obtener_usuario_actual(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        rol: str = payload.get("rol")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se pudo validar el token")
    return {"username": username, "rol": rol}

# ==========================================
# ENDPOINTS DE LA API REST
# ==========================================

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """Autentica credenciales y emite el token JWT"""
    user = session.exec(select(Usuario).where(Usuario.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")
    
    access_token = create_access_token(data={"sub": user.username, "rol": user.rol})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/pacientes/", status_code=201)
def registrar_paciente(paciente: Paciente, user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Registra un nuevo paciente (Solo Admin y Recepción)"""
    if user["rol"] not in ["admin", "recepcion"]:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    session.add(paciente)
    session.commit()
    session.refresh(paciente)
    return paciente

@app.get("/pacientes/")
def listar_pacientes(user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Obtiene el catálogo de pacientes"""
    return session.exec(select(Paciente)).all()

@app.post("/citas/", status_code=201)
def agendar_cita(cita: Cita, background_tasks: BackgroundTasks, user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Agenda cita médica y dispara notificación asíncrona SaaS"""
    if user["rol"] not in ["admin", "recepcion"]:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    
    session.add(cita)
    session.commit()
    session.refresh(cita)
    
    # Obtener email del paciente para el envío SaaS
    paciente = session.get(Paciente, cita.paciente_id)
    if paciente:
        mensaje = f"Hola {paciente.nombre_completo}, su cita ha sido agendada para el {cita.fecha_hora}. Motivo: {cita.motivo}"
        background_tasks.add_task(enviar_correo_gmail, paciente.email, mensaje)
        
    return {"mensaje": "Cita creada y correo en proceso de envío", "cita": cita}

@app.get("/citas/")
def listar_citas(user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Lista las citas médicas registradas"""
    return session.exec(select(Cita)).all()

@app.get("/reporte-diario")
def extraccion_etl_iaas(user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Endpoint reservado para la extracción de datos de la VM en GCP"""
    if user["rol"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo IaaS/Admin.")
    citas = session.exec(select(Cita)).all()
    return {"total_citas": len(citas), "datos": citas}

class RegistroPacienteIn(BaseModel):
    nombre_completo: str
    curp: str
    telefono: str
    email: str
    password: str

class NuevaCitaPacienteIn(BaseModel):
    fecha_hora: str
    motivo: str

@app.post("/registro-paciente", status_code=201)
def registro_publico_paciente(datos: RegistroPacienteIn, session: Session = Depends(get_session)):
    """Crea cuenta de paciente (Usuario con rol paciente + registro en tabla Paciente)"""
    curp_limpio = datos.curp.strip().upper()
    existe = session.exec(select(Usuario).where(Usuario.username == curp_limpio)).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una cuenta registrada con esta CURP")

    nuevo_usuario = Usuario(
        username=curp_limpio,
        password_hash=get_password_hash(datos.password),
        rol="paciente",
        email=datos.email
    )
    session.add(nuevo_usuario)

    existe_paciente = session.exec(select(Paciente).where(Paciente.curp == curp_limpio)).first()
    if not existe_paciente:
        nuevo_paciente = Paciente(
            nombre_completo=datos.nombre_completo,
            curp=curp_limpio,
            telefono=datos.telefono,
            email=datos.email
        )
        session.add(nuevo_paciente)

    session.commit()
    return {"mensaje": "Cuenta de paciente creada exitosamente"}

@app.get("/mis-citas")
def obtener_mis_citas(user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Devuelve el perfil y las citas del paciente autenticado"""
    paciente = session.exec(select(Paciente).where(Paciente.curp == user["username"])).first()
    if not paciente:
        return {"paciente": None, "citas": []}
    citas = session.exec(select(Cita).where(Cita.paciente_id == paciente.id)).all()
    return {"paciente": paciente, "citas": citas}

@app.post("/mis-citas", status_code=201)
def agendar_cita_paciente(datos: NuevaCitaPacienteIn, background_tasks: BackgroundTasks, user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Permite al paciente agendar su propia cita y dispara notificación SaaS"""
    paciente = session.exec(select(Paciente).where(Paciente.curp == user["username"])).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Perfil de paciente no encontrado")

    fecha_dt = datetime.fromisoformat(datos.fecha_hora.replace("Z", "+00:00"))
    nueva_cita = Cita(
        paciente_id=paciente.id,
        medico_id=1,
        fecha_hora=fecha_dt,
        motivo=datos.motivo
    )
    session.add(nueva_cita)
    session.commit()
    session.refresh(nueva_cita)

    mensaje = f"Hola {paciente.nombre_completo}, su cita ha sido agendada para el {nueva_cita.fecha_hora}. Motivo: {nueva_cita.motivo}"
    background_tasks.add_task(enviar_correo_gmail, paciente.email, mensaje)

    return {"mensaje": "Cita agendada y confirmación enviada a tu correo", "cita": nueva_cita}