import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PracticaRapidaPageRoutingModule } from './practica-rapida-routing.module';

import { PracticaRapidaPage } from './practica-rapida.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PracticaRapidaPageRoutingModule
  ],
  declarations: [PracticaRapidaPage]
})
export class PracticaRapidaPageModule {}
