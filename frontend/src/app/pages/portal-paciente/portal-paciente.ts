import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-portal-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-paciente.html'
})
export class PortalPacienteComponent implements OnInit {
  paciente: any = null;
  citas: any[] = [];
  tabActiva: 'agendar' | 'citas' | 'opiniones' = 'agendar';

  // Control de menús desplegables personalizados
  menuMotivosAbierto = false;
  menuFechaAbierto = false;

  motivosDisponibles = [
    {
      id: 'general',
      titulo: 'Consulta Médica General',
      doctor: 'Dr. Alejandro Mendoza',
      duracion: '30 min',
      icono: '🩺',
      descripcion: 'Revisión de síntomas generales, diagnóstico clínico y receta médica.'
    },
    {
      id: 'cardio',
      titulo: 'Cardiología y Chequeo Preventivo',
      doctor: 'Dra. Sofía Castellanos',
      duracion: '45 min',
      icono: '❤️',
      descripcion: 'Valoración cardiovascular, toma de presión y electrocardiograma.'
    },
    {
      id: 'derma',
      titulo: 'Consulta Dermatológica',
      doctor: 'Dra. Mariana Ríos',
      duracion: '30 min',
      icono: '✨',
      descripcion: 'Evaluación clínica de la piel y tratamiento especializado.'
    },
    {
      id: 'lab',
      titulo: 'Análisis Clínicos y Laboratorio',
      doctor: 'Q.F.B. Héctor Navarro',
      duracion: '20 min',
      icono: '🔬',
      descripcion: 'Toma de muestras de sangre, química sanguínea y perfil general.'
    },
    {
      id: 'seguimiento',
      titulo: 'Seguimiento y Revisión de Resultados',
      doctor: 'Dr. Alejandro Mendoza',
      duracion: '20 min',
      icono: '📋',
      descripcion: 'Interpretación de estudios previos y ajuste de tratamiento.'
    }
  ];

  motivoSeleccionado = this.motivosDisponibles[0];
  notasAdicionales = '';

  diasDisponibles: any[] = [];
  fechaSeleccionada: any = null;
  horariosDisponibles = ['09:00', '10:30', '12:00', '13:30', '16:00', '17:30', '19:00'];
  horaSeleccionada = '10:30';

  enviando = false;

  // Sección de opiniones dentro del portal
  opinionesClinica = [
    {
      autor: 'Valeria Gómez',
      servicio: 'Cardiología y Chequeo Preventivo',
      estrellas: 5,
      comentario: 'Excelente atención y puntualidad. La confirmación llegó al instante a mi correo.',
      fecha: 'Hace 3 días'
    },
    {
      autor: 'Carlos Hernández',
      servicio: 'Consulta Médica General',
      estrellas: 5,
      comentario: 'El doctor me explicó todo con mucha claridad y el portal es súper fácil de usar.',
      fecha: 'Hace 1 semana'
    }
  ];
  nuevaOpinion = { estrellas: 5, comentario: '' };

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.generarProximosDias();
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarMisCitas();
    }
  }

  generarProximosDias() {
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hoy = new Date();
    const lista = [];

    for (let i = 1; i <= 10; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');

      lista.push({
        fechaISO: `${yyyy}-${mm}-${dd}`,
        diaSemana: nombresDias[d.getDay()],
        diaNumero: dd,
        mes: nombresMeses[d.getMonth()],
        etiquetaCompleta: `${nombresDias[d.getDay()]} ${dd} de ${nombresMeses[d.getMonth()]}, ${yyyy}`
      });
    }

    this.diasDisponibles = lista;
    this.fechaSeleccionada = lista[0];
  }

  seleccionarMotivo(motivo: any) {
    this.motivoSeleccionado = motivo;
    this.menuMotivosAbierto = false;
  }

  seleccionarFecha(dia: any) {
    this.fechaSeleccionada = dia;
  }

  seleccionarHora(hora: string) {
    this.horaSeleccionada = hora;
    this.menuFechaAbierto = false;
  }

  cargarMisCitas() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.apiService.getMisCitas(token).subscribe({
      next: (res: any) => {
        this.paciente = res.paciente;
        this.citas = res.citas || [];
        this.cdr.detectChanges();
      },
      error: () => this.cerrarSesion()
    });
  }

  agendarCita() {
    if (!this.fechaSeleccionada || !this.horaSeleccionada) {
      alert('Selecciona una fecha y un horario disponible');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    this.enviando = true;
    const fechaCombinada = new Date(`${this.fechaSeleccionada.fechaISO}T${this.horaSeleccionada}:00`).toISOString();
    const motivoFinal = this.notasAdicionales.trim()
      ? `${this.motivoSeleccionado.titulo} — ${this.notasAdicionales.trim()}`
      : this.motivoSeleccionado.titulo;

    this.apiService.agendarMiCita(token, { fecha_hora: fechaCombinada, motivo: motivoFinal }).subscribe({
      next: () => {
        this.enviando = false;
        this.notasAdicionales = '';
        this.tabActiva = 'citas';
        this.cargarMisCitas();
        alert('¡Cita agendada con éxito! Revisa tu correo Gmail para ver tu pase de consulta.');
      },
      error: () => {
        this.enviando = false;
        this.cdr.detectChanges();
        alert('Ocurrió un error al agendar la cita');
      }
    });
  }

  publicarOpinion() {
    if (!this.nuevaOpinion.comentario.trim()) {
      alert('Escribe un breve comentario sobre tu experiencia');
      return;
    }
    this.opinionesClinica.unshift({
      autor: this.paciente?.nombre_completo || 'Paciente Verificado',
      servicio: this.motivoSeleccionado.titulo,
      estrellas: this.nuevaOpinion.estrellas,
      comentario: this.nuevaOpinion.comentario.trim(),
      fecha: 'Justo ahora'
    });
    this.nuevaOpinion.comentario = '';
    alert('¡Gracias por compartir tu opinión!');
  }

  cerrarSesion() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.router.navigate(['/pacientes']);
  }
}