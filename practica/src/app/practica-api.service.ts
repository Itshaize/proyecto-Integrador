import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AuthResponse {
  token: string;
  usuario: {
    id_usuario: number;
    nombre: string;
    rol: string;
    adultId?: number;
  };
}

export interface ResultadoHttp {
  titulo: string;
  metodo: string;
  url: string;
  estado: number | string;
  peticion?: object;
  respuesta: unknown;
}

@Injectable({ providedIn: 'root' })
export class PracticaApiService {
  apiBase = 'http://localhost:4000/api';
  token = '';
  cargando = '';
  resultado?: ResultadoHttp;

  constructor(private readonly http: HttpClient) {}

  registrarAdministrador(baseUrl: string, body: object): Observable<HttpResponse<AuthResponse>> {
    return this.http.post<AuthResponse>(`${baseUrl}/auth/register`, body, {
      observe: 'response',
    });
  }

  iniciarSesion(baseUrl: string, body: object): Observable<HttpResponse<AuthResponse>> {
    return this.http.post<AuthResponse>(`${baseUrl}/auth/login`, body, {
      observe: 'response',
    });
  }

  sesionActiva(baseUrl: string, token: string): Observable<HttpResponse<object>> {
    return this.http.get<object>(`${baseUrl}/auth/me`, {
      headers: this.authHeaders(token),
      observe: 'response',
    });
  }

  ejecutar<T>(
    titulo: string,
    metodo: string,
    url: string,
    peticion: object | undefined,
    llamada: Observable<HttpResponse<T>>,
  ): void {
    this.cargando = titulo;
    llamada.subscribe({
      next: (response: HttpResponse<T>) => {
        const body = response.body;
        if (this.isAuthResponse(body)) {
          this.token = body.token;
        }

        this.resultado = {
          titulo,
          metodo,
          url,
          estado: response.status,
          peticion,
          respuesta: body,
        };
        this.cargando = '';
      },
      error: (error: HttpErrorResponse) => {
        this.resultado = {
          titulo,
          metodo,
          url,
          estado: error.status || 'Error',
          peticion,
          respuesta: error.error || error.message,
        };
        this.cargando = '';
      },
    });
  }

  get authorizationPreview(): string {
    return this.token ? `Bearer ${this.token}` : 'Bearer <token>';
  }

  private isAuthResponse(body: unknown): body is AuthResponse {
    return Boolean(body && typeof body === 'object' && 'token' in body);
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
