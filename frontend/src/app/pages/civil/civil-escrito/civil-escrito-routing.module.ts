import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CivilEscritoPage } from './civil-escrito.page';

const routes: Routes = [
  {
    path: '',
    component: CivilEscritoPage
  },
  {
    path: 'configuracion',
    loadChildren: () =>
      import('./configuracion/configuracion.module')
        .then(m => m.ConfiguracionPageModule)
  },
  {
    path: 'practica-rapida',
    loadChildren: () =>
      import('./practica-rapida/practica-rapida.module')
        .then(m => m.PracticaRapidaPageModule)
  },
  {
    path: 'progreso',
    loadChildren: () =>
      import('./progreso/progreso.module')
        .then(m => m.ProgresoPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CivilEscritoPageRoutingModule {}