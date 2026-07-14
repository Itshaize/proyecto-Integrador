import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PracticaApiService } from '../../practica-api.service';

@Component({
  selector: 'app-resultado',
  imports: [CommonModule],
  templateUrl: './resultado.html'
})
export class ResultadoComponent {
  constructor(public api: PracticaApiService) {}
}
