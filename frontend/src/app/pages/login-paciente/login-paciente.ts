import { Component, Inject, PLATFORM_ID } from '@angular/core';
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

  // Campos de Login
  curpLogin = '';
  passwordLogin = '';

  // Campos de Registro
  registro = {
    nombre_completo: '',
    curp: '',
    telefono: '',
    email: '',
    password: ''
  };

  constructor(
    private apiService: ApiService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  alternarModo(esRegistro: boolean) {
    this.modoRegistro = esRegistro;
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
        alert('¡Cuenta creada con éxito! Ahora inicia sesión con tu CURP.');
        this.curpLogin = this.registro.curp.toUpperCase();
        this.passwordLogin = '';
        this.modoRegistro = false;
      },
      error: (err: any) => {
        this.cargando = false;
        alert(err?.error?.detail || 'No se pudo crear la cuenta');
      }
    });
  }
}