import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PracticaApiService } from '../../practica-api.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  login = {
    correo: 'ana@cuido.ec',
    password: 'CuidoDemo123',
  };

  constructor(public api: PracticaApiService) {}

  iniciarSesion(): void {
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
