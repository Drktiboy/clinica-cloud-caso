import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
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
  nuevaCita = { fecha_hora: '', motivo: '' };
  enviando = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarMisCitas();
    }
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
      },
      error: () => this.cerrarSesion()
    });
  }

  agendarCita() {
    if (!this.nuevaCita.fecha_hora || !this.nuevaCita.motivo) {
      alert('Selecciona fecha/hora y escribe el motivo de tu consulta');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    this.enviando = true;
    const payload = {
      fecha_hora: new Date(this.nuevaCita.fecha_hora).toISOString(),
      motivo: this.nuevaCita.motivo
    };

    this.apiService.agendarMiCita(token, payload).subscribe({
      next: () => {
        this.enviando = false;
        alert('¡Cita agendada! Revisa tu correo electrónico para ver la confirmación.');
        this.nuevaCita = { fecha_hora: '', motivo: '' };
        this.cargarMisCitas();
      },
      error: () => {
        this.enviando = false;
        alert('Error al agendar la cita');
      }
    });
  }

  cerrarSesion() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.router.navigate(['/pacientes']);
  }
}