import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PracticaApiService } from '../../practica-api.service';
import { RespuestaMiniComponent } from '../respuesta-mini/respuesta-mini';

@Component({
  selector: 'app-registro',
  imports: [FormsModule, RespuestaMiniComponent],
  templateUrl: './registro.html'
})
export class RegistroComponent {
  registro = {
    nombre: 'Mariana Lopez',
    cedula: '1700000027',
    correo: `mariana.${Date.now()}@cuido.ec`,
    telefono: '0987654322',
    password: 'Clave1234',
  };

  constructor(public api: PracticaApiService) {}

  registrar(): void {
    const url = `${this.api.apiBase}/auth/register`;
    this.api.ejecutar(
      'POST registro',
      'POST',
      url,
      { ...this.registro },
      this.api.registrarAdministrador(this.api.apiBase, this.registro),
    );
  }
}
