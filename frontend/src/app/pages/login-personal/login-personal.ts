import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// Ajustamos la ruta para subir correctamente a la carpeta services
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-login-personal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // Ajustamos los nombres exactos que aparecen en tu explorador izquierdo
  templateUrl: './login-personal.html',
  styleUrls: ['./login-personal.css']
})
export class LoginPersonalComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private apiService: ApiService, private router: Router) {}

  onLogin() {
    this.apiService.login(this.username, this.password).subscribe({
      // Le agregamos ": any" para solucionar el error de tipo estricto
      next: (response: any) => {
        localStorage.setItem('token', response.access_token);
        alert('¡Autenticación JWT Exitosa!');
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.errorMessage = 'Usuario o contraseña incorrectos';
        alert('Error de acceso: Credenciales inválidas');
      }
    });
  }
}