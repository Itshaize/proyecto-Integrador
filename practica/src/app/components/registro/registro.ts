import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PracticaApiService } from '../../practica-api.service';
import { RespuestaMiniComponent } from '../respuesta-mini/respuesta-mini';

@Component({
  selector: 'app-registro',
  imports: [CommonModule, FormsModule, RespuestaMiniComponent],
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
  mensaje = '';

  constructor(public api: PracticaApiService) {}

  get formularioInvalido(): boolean {
    return (
      this.registro.nombre.trim().length < 3 ||
      !this.cedulaValida(this.registro.cedula) ||
      this.registro.correo.trim().length < 5 ||
      this.registro.telefono.trim().length < 9 ||
      this.registro.password.length < 8
    );
  }

  registrar(): void {
    this.mensaje = 'Click recibido. Validando datos del formulario...';

    if (this.formularioInvalido) {
      this.mensaje = 'No se envio: faltan datos validos en el formulario.';
      this.api.resultado = {
        titulo: 'Validacion registro',
        metodo: 'POST',
        url: `${this.api.apiBase}/auth/register`,
        estado: 'Formulario incompleto',
        peticion: { ...this.registro },
        respuesta: 'Revisa los datos. La cedula debe ser ecuatoriana valida y la password minimo 8 caracteres con letra y numero.',
      };
      return;
    }

    this.mensaje = 'Enviando POST /auth/register al backend...';
    const url = `${this.api.apiBase}/auth/register`;
    this.api.ejecutar(
      'POST registro',
      'POST',
      url,
      { ...this.registro },
      this.api.registrarAdministrador(this.api.apiBase, this.registro),
    );
  }

  private cedulaValida(value: string): boolean {
    if (!/^\d{10}$/.test(value)) {
      return false;
    }

    const province = Number(value.slice(0, 2));
    if (province < 1 || province > 24) {
      return false;
    }

    const digits = value.split('').map(Number);
    const sum = digits.slice(0, 9).reduce((total, digit, index) => {
      const result = digit * (index % 2 === 0 ? 2 : 1);
      return total + (result > 9 ? result - 9 : result);
    }, 0);

    return (10 - (sum % 10)) % 10 === digits[9];
  }
}
