import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // URL base de tu API (cambiará por la URL pública de Render en producción)
  private apiUrl = 'https://clinica-cloud-api.onrender.com';

  constructor(private http: HttpClient) {}

  // Autenticación JWT (Endpoint /token)
  login(username: string, password: string): Observable<any> {
    const body = new HttpParams()
      .set('username', username)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post(`${this.apiUrl}/token`, body.toString(), { headers });
  }

  // Obtener citas (Protegido con JWT)
  getCitas(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get(`${this.apiUrl}/citas/`, { headers });
  }
}