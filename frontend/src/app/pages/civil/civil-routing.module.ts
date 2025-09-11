import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CivilPage } from './civil.page';

const routes: Routes = [
  {
    path: '',
    component: CivilPage,
    children: [
      { path: '', redirectTo: 'civil-escrito', pathMatch: 'full' },

      {
        path: 'civil-escrito',
        loadChildren: () =>
          import('./civil-escrito/civil-escrito.module')
            .then(m => m.CivilEscritoPageModule)
      },
      {
        path: 'civil-oral',
        loadChildren: () =>
          import('./civil-oral/civil-oral.module')
            .then(m => m.CivilOralPageModule)
      },

      // aquí luego puedes agregar la 3ª sección que estás revisando
      // { path: 'otra-seccion', loadChildren: () => import('./otra-seccion/otra-seccion.module').then(m => m.OtraSeccionPageModule) },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CivilPageRoutingModule {}
