import { Component, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-login-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login-paciente.html',
  styleUrls: ['./login-paciente.css']
})
export class LoginPacienteComponent {
  modoRegistro = false;
  cargando = false;

  curpLogin = '';
  passwordLogin = '';

  registro = {
    nombre_completo: '',
    curp: '',
    telefono: '',
    email: '',
    password: ''
  };

  especialidades = [
    {
      nombre: 'Medicina General',
      icono: '🩺',
      especialista: 'Dr. Alejandro Mendoza',
      horario: 'Lun - Sáb • 09:00 - 20:00',
      descripcion: 'Valoración integral, diagnóstico oportuno, control preventivo y emisión de recetas digitales.'
    },
    {
      nombre: 'Cardiología Clínica',
      icono: '❤️',
      especialista: 'Dra. Sofía Castellanos',
      horario: 'Lun - Vie • 10:00 - 18:00',
      descripcion: 'Electrocardiograma, monitoreo de presión arterial y evaluación cardiovascular completa.'
    },
    {
      nombre: 'Dermatología',
      icono: '✨',
      especialista: 'Dra. Mariana Ríos',
      horario: 'Mar - Sáb • 11:00 - 19:00',
      descripcion: 'Tratamiento clínico y estético de la piel, detección temprana y cuidado dermatológico personalizado.'
    },
    {
      nombre: 'Laboratorio y Chequeo',
      icono: '🔬',
      especialista: 'Q.F.B. Héctor Navarro',
      horario: 'Lun - Dom • 07:00 - 15:00',
      descripcion: 'Perfil bioquímico, biometría hemática y entrega de resultados directamente en tu correo.'
    }
  ];

  especialidadActiva = this.especialidades[0];

  opiniones = [
    {
      paciente: 'Valeria Gómez',
      iniciales: 'VG',
      servicio: 'Cardiología Clínica',
      fecha: 'Hace 3 días',
      comentario: 'Agendé mi cita en menos de un minuto y al instante me llegó la confirmación a mi Gmail. La atención de la doctora fue excelente.'
    },
    {
      paciente: 'Carlos Hernández',
      iniciales: 'CH',
      servicio: 'Medicina General',
      fecha: 'Hace 1 semana',
      comentario: 'Me da mucha confianza poder ver el historial de mis citas desde mi celular sin tener que hacer filas en recepción.'
    },
    {
      paciente: 'Fernanda Ortiz',
      iniciales: 'FO',
      servicio: 'Dermatología',
      fecha: 'Hace 2 semanas',
      comentario: 'Instalaciones muy limpias, puntualidad exacta con el horario que elegí en el portal y seguimiento muy humano.'
    }
  ];

  faqs = [
    {
      pregunta: '¿Cómo recibo el comprobante de mi cita médica?',
      respuesta: 'En cuanto confirmas tu horario dentro del portal, nuestro sistema envía automáticamente un correo electrónico con tu folio, fecha, hora y motivo de consulta.',
      abierta: true
    },
    {
      pregunta: '¿Por qué se solicita mi CURP para crear una cuenta?',
      respuesta: 'Tu CURP funciona como identificador único en nuestro expediente clínico en la nube, evitando duplicados y protegiendo tu historial médico.',
      abierta: false
    },
    {
      pregunta: '¿Con cuánta anticipación debo llegar a la clínica?',
      respuesta: 'Te recomendamos presentarte 10 minutos antes de tu hora agendada con una identificación oficial.',
      abierta: false
    }
  ];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  alternarModo(esRegistro: boolean) {
    this.modoRegistro = esRegistro;
  }

  seleccionarEspecialidad(esp: any) {
    this.especialidadActiva = esp;
  }

  toggleFaq(index: number) {
    this.faqs[index].abierta = !this.faqs[index].abierta;
  }

  irARegistroConEspecialidad() {
    this.modoRegistro = true;
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onLogin() {
    if (!this.curpLogin || !this.passwordLogin) {
      alert('Ingresa tu CURP y contraseña');
      return;
    }
    this.cargando = true;
    this.apiService.login(this.curpLogin.toUpperCase(), this.passwordLogin).subscribe({
      next: (res: any) => {
        this.cargando = false;
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', res.access_token);
        }
        this.router.navigate(['/mi-portal']);
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
        alert('CURP o contraseña incorrectos');
      }
    });
  }

  onRegister() {
    if (!this.registro.nombre_completo || !this.registro.curp || !this.registro.email || !this.registro.password) {
      alert('Completa todos los campos obligatorios');
      return;
    }
    this.cargando = true;
    this.apiService.registrarCuentaPaciente(this.registro).subscribe({
      next: () => {
        this.cargando = false;
        this.curpLogin = this.registro.curp.toUpperCase();
        this.passwordLogin = '';
        this.modoRegistro = false;
        this.cdr.detectChanges();
        alert('¡Cuenta creada con éxito! Ahora inicia sesión con tu CURP.');
      },
      error: (err: any) => {
        this.cargando = false;
        this.cdr.detectChanges();
        alert(err?.error?.detail || 'No se pudo crear la cuenta');
      }
    });
  }
}