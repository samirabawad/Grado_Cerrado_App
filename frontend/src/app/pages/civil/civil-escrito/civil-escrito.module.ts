import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CivilEscritoPageRoutingModule } from './civil-escrito-routing.module';
import { CivilEscritoPage } from './civil-escrito.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CivilEscritoPageRoutingModule
  ],
  declarations: [CivilEscritoPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CivilEscritoPageModule {}