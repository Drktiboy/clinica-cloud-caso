import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-clinica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-clinica.html',
  styleUrls: ['./dashboard-clinica.css']
})
export class DashboardClinicaComponent implements OnInit {
  vistaActual = 'pacientes';
  pacientes: any[] = [];
  citas: any[] = [];
  
  nuevoPaciente = { nombre_completo: '', curp: '', telefono: '', email: '' };
  nuevaCita = { paciente_id: null, medico_id: 1, fecha_hora: '', motivo: '' };

  private apiUrl = 'https://clinica-cloud-api.onrender.com';

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarDatos();
    }
  }

  private getHeaders() {
    if (!isPlatformBrowser(this.platformId)) {
      return new HttpHeaders();
    }
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/admin']);
      return new HttpHeaders();
    }
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  cambiarVista(vista: string) {
    this.vistaActual = vista;
  }

  cerrarSesion() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.router.navigate(['/admin']);
  }

  cargarDatos() {
    const headers = this.getHeaders();
    this.http.get<any[]>(`${this.apiUrl}/pacientes/`, { headers }).subscribe(res => {
      this.pacientes = res;
    });
    this.http.get<any[]>(`${this.apiUrl}/citas/`, { headers }).subscribe(res => {
      this.citas = res;
    });
  }

  registrarPaciente() {
    const headers = this.getHeaders();
    this.http.post(`${this.apiUrl}/pacientes/`, this.nuevoPaciente, { headers }).subscribe({
      next: () => {
        alert('Paciente registrado con éxito');
        this.nuevoPaciente = { nombre_completo: '', curp: '', telefono: '', email: '' };
        this.cargarDatos();
      },
      error: () => alert('Error al registrar paciente')
    });
  }

  agendarCita() {
    const headers = this.getHeaders();
    const citaPayload = {
      ...this.nuevaCita,
      fecha_hora: new Date(this.nuevaCita.fecha_hora).toISOString()
    };

    this.http.post(`${this.apiUrl}/citas/`, citaPayload, { headers }).subscribe({
      next: () => {
        alert('Cita agendada y notificación enviada por correo (SaaS)');
        this.nuevaCita = { paciente_id: null, medico_id: 1, fecha_hora: '', motivo: '' };
        this.cargarDatos();
      },
      error: () => alert('Error al agendar cita')
    });
  }
}