import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CivilOralPage } from './civil-oral.page';

const routes: Routes = [
  {
    path: '',
    component: CivilOralPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CivilOralPageRoutingModule {}
