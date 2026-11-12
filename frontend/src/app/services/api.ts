import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://clinica-cloud-api.onrender.com';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    const body = new HttpParams()
      .set('username', username.trim())
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post(`${this.apiUrl}/token`, body.toString(), { headers });
  }

  registrarCuentaPaciente(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro-paciente`, datos);
  }

  getMisCitas(token: string): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/mis-citas`, { headers });
  }

  agendarMiCita(token: string, datos: any): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/mis-citas`, datos, { headers });
  }
}