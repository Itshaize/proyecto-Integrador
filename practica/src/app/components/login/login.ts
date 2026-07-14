import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PracticaApiService } from '../../practica-api.service';
import { RespuestaMiniComponent } from '../respuesta-mini/respuesta-mini';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RespuestaMiniComponent],
  templateUrl: './login.html'
})
export class LoginComponent {
  login = {
    correo: 'ana@cuido.ec',
    password: 'CuidoDemo123',
  };

  constructor(public api: PracticaApiService) {}

  get formularioInvalido(): boolean {
    return this.login.correo.trim().length < 5 || this.login.password.length < 1;
  }

  iniciarSesion(): void {
    if (this.formularioInvalido) {
      this.api.resultado = {
        titulo: 'Validacion login',
        metodo: 'POST',
        url: `${this.api.apiBase}/auth/login`,
        estado: 'Formulario incompleto',
        peticion: { ...this.login },
        respuesta: 'Ingresa correo y password para iniciar sesion.',
      };
      return;
    }

    const url = `${this.api.apiBase}/auth/login`;
    this.api.ejecutar(
      'POST login',
      'POST',
      url,
      { ...this.login },
      this.api.iniciarSesion(this.api.apiBase, this.login),
    );
  }
}
