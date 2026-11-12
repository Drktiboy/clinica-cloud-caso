import { Routes } from '@angular/router';
import { LoginPacienteComponent } from './pages/login-paciente/login-paciente';
import { LoginPersonalComponent } from './pages/login-personal/login-personal';
import { DashboardClinicaComponent } from './pages/dashboard-clinica/dashboard-clinica';
import { PortalPacienteComponent } from './pages/portal-paciente/portal-paciente';

export const routes: Routes = [
  { path: '', redirectTo: '/pacientes', pathMatch: 'full' },
  { path: 'pacientes', component: LoginPacienteComponent },
  { path: 'mi-portal', component: PortalPacienteComponent },
  { path: 'admin', component: LoginPersonalComponent },
  { path: 'dashboard', component: DashboardClinicaComponent }
];