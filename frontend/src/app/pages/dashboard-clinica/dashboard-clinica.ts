import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  // Variables para la vista
  vistaActual = 'pacientes';
  pacientes: any[] = [];
  citas: any[] = [];
  
  // Modelos para formularios
  nuevoPaciente = { nombre_completo: '', curp: '', telefono: '', email: '' };
  nuevaCita = { paciente_id: null, medico_id: 1, fecha_hora: '', motivo: '' };

  private apiUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.cargarDatos();
  }

  // Función para inyectar el token JWT en cada petición
  private getHeaders() {
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
    localStorage.removeItem('token');
    this.router.navigate(['/admin']);
  }

  cargarDatos() {
    const headers = this.getHeaders();
    // Cargar Pacientes
    this.http.get<any[]>(`${this.apiUrl}/pacientes/`, { headers }).subscribe(res => {
      this.pacientes = res;
    });
    // Cargar Citas
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
        this.cargarDatos(); // Recarga la tabla
      },
      error: (err) => alert('Error al registrar paciente')
    });
  }

  agendarCita() {
    const headers = this.getHeaders();
    // Ajuste de formato de fecha ISO para FastAPI
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
      error: (err) => alert('Error al agendar cita')
    });
  }
}