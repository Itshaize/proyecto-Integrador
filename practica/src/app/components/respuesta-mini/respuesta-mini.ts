import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PracticaApiService } from '../../practica-api.service';

@Component({
  selector: 'app-respuesta-mini',
  imports: [CommonModule, RouterLink],
  templateUrl: './respuesta-mini.html'
})
export class RespuestaMiniComponent {
  constructor(public api: PracticaApiService) {}
}
