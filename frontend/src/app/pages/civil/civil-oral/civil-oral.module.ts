import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CivilOralPageRoutingModule } from './civil-oral-routing.module';

import { CivilOralPage } from './civil-oral.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CivilOralPageRoutingModule
  ],
  declarations: [CivilOralPage]
})
export class CivilOralPageModule {}
