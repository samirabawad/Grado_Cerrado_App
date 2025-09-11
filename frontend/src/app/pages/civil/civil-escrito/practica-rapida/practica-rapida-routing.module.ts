import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PracticaRapidaPage } from './practica-rapida.page';

const routes: Routes = [
  {
    path: '',
    component: PracticaRapidaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PracticaRapidaPageRoutingModule {}
