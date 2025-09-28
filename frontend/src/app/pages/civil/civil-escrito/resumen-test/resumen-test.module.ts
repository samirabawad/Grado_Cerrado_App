import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ResumenTestPageRoutingModule } from './resumen-test-routing.module';

import { ResumenTestPage } from './resumen-test.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ResumenTestPageRoutingModule
  ],
  declarations: [ResumenTestPage]
})
export class ResumenTestPageModule {}