import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login-paciente',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login-paciente.html',
  styleUrls: ['./login-paciente.css']
})
export class LoginPacienteComponent {
  // Aquí irá la lógica del portal de pacientes en el futuro
}