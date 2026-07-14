import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegistroComponent } from './components/registro/registro';
import { ResultadoComponent } from './components/resultado/resultado';
import { SesionComponent } from './components/sesion/sesion';

export const routes: Routes = [
  { path: '', component: RegistroComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'login', component: LoginComponent },
  { path: 'sesion', component: SesionComponent },
  { path: 'resultado', component: ResultadoComponent },
  { path: '**', redirectTo: '' },
];
