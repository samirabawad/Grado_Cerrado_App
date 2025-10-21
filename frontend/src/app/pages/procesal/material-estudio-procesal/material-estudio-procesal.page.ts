import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';

type FileType = 'pdf' | 'apunte' | 'video' | 'enlace';
interface StudyItem { id: number; titulo: string; tipo: FileType; url: string; detalle?: string; }

@Component({
  selector: 'app-material-estudio-procesal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, BottomNavComponent],
  templateUrl: './material-estudio-procesal.page.html',
  styleUrls: ['./material-estudio-procesal.page.scss']
})
export class MaterialEstudioProcesalPage {
  filtro: FileType | 'todos' = 'todos';
  query = '';

  items: StudyItem[] = [
    { id: 1, titulo: 'Manual de Derecho Procesal (PDF)', tipo: 'pdf', url: 'https://tu-enlace/procesal.pdf' },
    { id: 2, titulo: 'Apuntes Jurisdicción y Competencia', tipo: 'apunte', url: 'https://tu-enlace/apuntes-procesal.zip' },
    { id: 3, titulo: 'Clase: Teoría de la Prueba (Video)', tipo: 'video', url: 'https://youtu.be/xxxxxxxx' },
    { id: 4, titulo: 'Códigos Procesales (Enlace)', tipo: 'enlace', url: 'https://www.pjud.cl/' },
  ];

  get filtrados(): StudyItem[] {
    const q = this.query.trim().toLowerCase();
    return this.items
      .filter(i => this.filtro === 'todos' ? true : i.tipo === this.filtro)
      .filter(i => !q ? true : i.titulo.toLowerCase().includes(q));
  }

  setFiltro(f: FileType | 'todos') { this.filtro = f; }
  abrir(item: StudyItem) { window.open(item.url, '_blank'); }
}
