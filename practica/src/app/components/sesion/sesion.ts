import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PracticaApiService } from '../../practica-api.service';
import { RespuestaMiniComponent } from '../respuesta-mini/respuesta-mini';

@Component({
  selector: 'app-sesion',
  imports: [CommonModule, RespuestaMiniComponent],
  templateUrl: './sesion.html'
})
export class SesionComponent {
  constructor(public api: PracticaApiService) {}

  revisarSesion(): void {
    const url = `${this.api.apiBase}/auth/me`;
    this.api.ejecutar(
      'GET sesion activa',
      'GET',
      url,
      { Authorization: this.api.authorizationPreview },
      this.api.sesionActiva(this.api.apiBase, this.api.token),
    );
  }
}
