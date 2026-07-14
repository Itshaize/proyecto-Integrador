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

  get formularioInvalido(): boolean {
    return (
      this.registro.nombre.trim().length < 3 ||
      this.registro.cedula.trim().length !== 10 ||
      this.registro.correo.trim().length < 5 ||
      this.registro.telefono.trim().length < 9 ||
      this.registro.password.length < 8
    );
  }

  registrar(): void {
    if (this.formularioInvalido) {
      this.api.resultado = {
        titulo: 'Validacion registro',
        metodo: 'POST',
        url: `${this.api.apiBase}/auth/register`,
        estado: 'Formulario incompleto',
        peticion: { ...this.registro },
        respuesta: 'Revisa los datos. La password debe tener minimo 8 caracteres, con letra y numero.',
      };
      return;
    }

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
