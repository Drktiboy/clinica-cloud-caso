import json
import smtplib
import urllib.request
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import jwt
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import engine, create_db_and_tables, get_session
from models import Usuario, Paciente, Cita
from auth import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM

app = FastAPI(title="API Clínica Privada - Cloud")

# ==========================================
# CONFIGURACIÓN CORS
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
# CONFIGURACIÓN SAAS (GMAIL HTTPS + RESPALDO SMTP)
# ==========================================
GMAIL_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyog15A_VZTQem7gqr8S39qlj1ycuW8WfRIxzmkBI__QogulxWSrCWvA7rq5e6I1O-2og/exec"

SMTP_USER = "michaelsnchz18@gmail.com"
SMTP_PASSWORD = "hggj jvrt aqkt ezab"

MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


def formatear_fecha_mx(dt: datetime) -> str:
    """Convierte la fecha UTC a horario de México con formato legible"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    try:
        tz_mx = ZoneInfo("America/Mexico_City")
    except Exception:
        tz_mx = timezone(timedelta(hours=-6))
    local_dt = dt.astimezone(tz_mx)
    mes = MESES_ES[local_dt.month - 1]
    return f"{local_dt.day:02d} de {mes}, {local_dt.year} • {local_dt.strftime('%H:%M')} hrs"


def construir_pase_html(nombre: str, curp: str, folio: int, fecha_legible: str, motivo: str) -> str:
    """Genera tarjeta HTML responsiva estilo Pase Digital Clínico"""
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0; padding:0; background-color:#070b14; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#070b14; padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#0f172a; border:1px solid #1e293b; border-top:4px solid #00e5ff; border-radius:16px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
              
              <!-- CABECERA -->
              <tr>
                <td style="padding:28px 32px 20px 32px; border-bottom:1px solid #1e293b;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <span style="display:inline-block; background-color:rgba(0,229,255,0.12); color:#00e5ff; border:1px solid rgba(0,229,255,0.3); font-weight:bold; font-size:12px; padding:5px 12px; border-radius:20px; letter-spacing:0.5px;">
                          ✚ CLÍNICA CLOUD
                        </span>
                      </td>
                      <td align="right">
                        <span style="background-color:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); font-size:11px; font-weight:bold; padding:4px 10px; border-radius:12px;">
                          ● CITA CONFIRMADA
                        </span>
                      </td>
                    </tr>
                  </table>
                  <h1 style="margin:18px 0 6px 0; font-size:22px; color:#ffffff; font-weight:700;">
                    Pase Digital de Consulta
                  </h1>
                  <p style="margin:0; font-size:14px; color:#94a3b8;">
                    Hola <strong style="color:#ffffff;">{nombre}</strong>, tu reservación médica ha sido registrada exitosamente en nuestro sistema.
                  </p>
                </td>
              </tr>

              <!-- DETALLES DE LA CITA -->
              <tr>
                <td style="padding:24px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120; border:1px solid #1e293b; border-radius:12px; padding:18px;">
                    <tr>
                      <td style="padding:8px 0; border-bottom:1px solid #1e293b;">
                        <span style="font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.8px;">Folio de Reservación</span><br>
                        <strong style="font-size:18px; color:#00e5ff; font-family:monospace;">#CC-{folio:04d}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0; border-bottom:1px solid #1e293b;">
                        <span style="font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.8px;">Servicio / Motivo de Consulta</span><br>
                        <strong style="font-size:15px; color:#ffffff;">{motivo}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0; border-bottom:1px solid #1e293b;">
                        <span style="font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.8px;">Fecha y Horario Programado</span><br>
                        <strong style="font-size:15px; color:#38bdf8;">📅 {fecha_legible}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0 4px 0;">
                        <span style="font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.8px;">Expediente CURP</span><br>
                        <span style="font-size:13px; color:#cbd5e1; font-family:monospace;">{curp}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- INDICACIONES -->
              <tr>
                <td style="padding:0 32px 28px 32px;">
                  <div style="background-color:rgba(0,229,255,0.06); border-left:3px solid #00e5ff; padding:12px 16px; border-radius:0 8px 8px 0; font-size:12px; color:#cbd5e1; line-height:1.5;">
                    <strong style="color:#00e5ff;">Indicaciones previas:</strong><br>
                    • Preséntate <strong>10 minutos antes</strong> de tu horario agendado.<br>
                    • Muestra este pase digital o tu CURP en recepción junto con una identificación oficial.
                  </div>
                </td>
              </tr>

              <!-- PIE DE PÁGINA -->
              <tr>
                <td style="background-color:#090e1a; padding:18px 32px; border-top:1px solid #1e293b; text-align:center;">
                  <p style="margin:0; font-size:11px; color:#64748b;">
                    Clínica Cloud • Toluca / Metepec, Estado de México<br>
                    Notificación automatizada generada por la plataforma clínica.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def enviar_correo_gmail(email_destino: str, mensaje_texto: str, html_mensaje: str = "") -> tuple[bool, str]:
    """Envía el correo con diseño HTML vía puente HTTPS de Google Apps Script"""
    asunto = "✚ Pase Digital de Consulta - Clínica Cloud"
    if GMAIL_WEBHOOK_URL:
        try:
            payload = json.dumps({
                "destino": email_destino,
                "asunto": asunto,
                "mensaje": mensaje_texto,
                "html": html_mensaje or mensaje_texto
            }).encode("utf-8")
            req = urllib.request.Request(
                GMAIL_WEBHOOK_URL,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    return True, "Correo HTML enviado exitosamente"
        except Exception as e:
            print(f"Error en puente HTTPS Gmail: {e}")
            return False, str(e)

    # Respaldo SMTP para pruebas locales
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = asunto
        msg["From"] = SMTP_USER
        msg["To"] = email_destino
        msg.attach(MIMEText(mensaje_texto, "plain"))
        if html_mensaje:
            msg.attach(MIMEText(html_mensaje, "html"))
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True, "Correo enviado vía SMTP"
    except Exception as e:
        print(f"Error SMTP: {e}")
        return False, str(e)


# ==========================================
# EVENTO DE INICIO
# ==========================================
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
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
# MODELOS DE ENTRADA (SCHEMAS)
# ==========================================
class RegistroPacienteIn(BaseModel):
    nombre_completo: str
    curp: str
    telefono: str
    email: str
    password: str


class NuevaCitaPacienteIn(BaseModel):
    fecha_hora: str
    motivo: str


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
def agendar_cita(cita: Cita, user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Agenda cita médica desde administración y envía pase HTML"""
    if user["rol"] not in ["admin", "recepcion"]:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    session.add(cita)
    session.commit()
    session.refresh(cita)

    correo_ok = False
    paciente = session.get(Paciente, cita.paciente_id)
    if paciente:
        fecha_legible = formatear_fecha_mx(cita.fecha_hora)
        texto = f"Hola {paciente.nombre_completo}, tu cita (#CC-{cita.id:04d}) está confirmada para el {fecha_legible}. Motivo: {cita.motivo}"
        html = construir_pase_html(paciente.nombre_completo, paciente.curp, cita.id, fecha_legible, cita.motivo)
        correo_ok, _ = enviar_correo_gmail(paciente.email, texto, html)

    return {"mensaje": "Cita creada", "correo_enviado": correo_ok, "cita": cita}


@app.get("/citas/")
def listar_citas(user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Lista las citas médicas registradas"""
    return session.exec(select(Cita)).all()


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
def agendar_cita_paciente(datos: NuevaCitaPacienteIn, user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Permite al paciente agendar su propia cita y envía pase HTML"""
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

    fecha_legible = formatear_fecha_mx(nueva_cita.fecha_hora)
    texto = f"Hola {paciente.nombre_completo}, tu cita (#CC-{nueva_cita.id:04d}) está confirmada para el {fecha_legible}. Motivo: {nueva_cita.motivo}"
    html = construir_pase_html(paciente.nombre_completo, paciente.curp, nueva_cita.id, fecha_legible, nueva_cita.motivo)
    correo_ok, detalle = enviar_correo_gmail(paciente.email, texto, html)

    return {
        "mensaje": "Cita agendada",
        "correo_enviado": correo_ok,
        "detalle_correo": detalle,
        "cita": nueva_cita
    }


@app.get("/reporte-diario")
def extraccion_etl_iaas(user: dict = Depends(obtener_usuario_actual), session: Session = Depends(get_session)):
    """Endpoint reservado para la extracción de datos de la VM en GCP"""
    if user["rol"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo IaaS/Admin.")
    citas = session.exec(select(Cita)).all()
    return {"total_citas": len(citas), "datos": citas}