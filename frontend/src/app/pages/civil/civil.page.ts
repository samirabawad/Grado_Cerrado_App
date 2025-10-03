import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-civil',
  templateUrl: './civil.page.html',
  styleUrls: ['./civil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class CivilPage implements OnInit {
  
  civilStats: any = null;
  isLoading: boolean = true;
  
  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }
  
  ngOnInit() {
    this.loadCivilStats();
  }

  ionViewWillEnter() {
    this.loadCivilStats();
  }

  async loadCivilStats() {
    this.isLoading = true;
    
    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.isLoading = false;
        return;
      }

      const studentId = currentUser.id;
      console.log('Cargando estadísticas de Civil para estudiante:', studentId);

      const areaResponse = await this.apiService.getAreaStats(studentId).toPromise();
      console.log('Respuesta completa del API:', areaResponse);
      
      if (areaResponse && areaResponse.success && areaResponse.data) {
        console.log('Todas las áreas recibidas:', areaResponse.data);
        
        // Buscar exactamente "Derecho Civil"
        const civilArea = areaResponse.data.find((area: any) => 
          area.area === 'Derecho Civil'
        );
        
        if (civilArea) {
          this.civilStats = civilArea;
          console.log('✅ Estadísticas de Derecho Civil:', this.civilStats);
        } else {
          console.log('❌ No se encontró "Derecho Civil". Áreas disponibles:', 
            areaResponse.data.map((a: any) => a.area).join(', '));
        }
      } else {
        console.log('⚠️ Respuesta del API no válida');
      }
      
    } catch (error) {
      console.error('❌ Error cargando estadísticas de Civil:', error);
    } finally {
      this.isLoading = false;
    }
  }

  goToEscrito() {
    this.router.navigate(['/civil/civil-escrito']);
  }

  goToConversacion() {
    this.router.navigate(['/civil/civil-oral']);
  }

  goToTest() {
    console.log('Ir a Test');
  }

  goToMaterialEstudio() {
    this.router.navigate(['/civil/material-estudio-civil']);
  }

  goToPlanEstudio() {
    this.router.navigate(['/civil/plan-estudio-civil']);
  }

  goToDestacados() {
    console.log('Ir a Destacados');
  }
}