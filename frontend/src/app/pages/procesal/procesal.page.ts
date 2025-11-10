import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-procesal',
  templateUrl: './procesal.page.html',
  styleUrls: ['./procesal.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class ProcesalPage implements OnInit, OnDestroy {
  
  procesalStats: any = null;
  isLoading: boolean = true;
  
  carouselImages: string[] = [
    'assets/image/bannerhome.png',
    'assets/image/banner-2.png',
    'assets/image/banner-3.png'
  ];
  currentImageIndex: number = 0;
  carouselInterval: any;
  
  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }
  
  ngOnInit() {
    this.loadProcesalStats();
    this.startCarousel();
  }

  ngOnDestroy() {
    this.stopCarousel();
  }

  ionViewWillEnter() {
    this.loadProcesalStats();
    this.startCarousel();
  }

  ionViewWillLeave() {
    this.stopCarousel();
  }

  async loadProcesalStats() {
    this.isLoading = true;
    
    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.isLoading = false;
        return;
      }

      const studentId = currentUser.id;
      console.log('Cargando estadísticas de Procesal para estudiante:', studentId);

      const areaResponse = await this.apiService.getHierarchicalStats(studentId).toPromise();
      console.log('Respuesta completa del API:', areaResponse);
      
      if (areaResponse && areaResponse.success && areaResponse.data) {
        console.log('Datos jerárquicos recibidos:', areaResponse.data);
        
        const procesalArea = areaResponse.data.find((item: any) => 
          item.type === 'area' && item.area === 'Derecho Procesal'
        );
        
        if (procesalArea) {
          const temasConPorcentaje = procesalArea.temas.map((tema: any) => {
            const subtemasConPorcentaje = tema.subtemas.map((subtema: any) => {
              const porcentaje = subtema.totalPreguntas > 0 
                ? Math.round((subtema.preguntasCorrectas / subtema.totalPreguntas) * 100)
                : 0;
              return porcentaje;
            });
            
            const porcentajeTema = subtemasConPorcentaje.length > 0
              ? Math.round(subtemasConPorcentaje.reduce((sum: number, p: number) => sum + p, 0) / subtemasConPorcentaje.length)
              : 0;
            
            return porcentajeTema;
          });
          
          const successRate = temasConPorcentaje.length > 0
            ? Math.round(temasConPorcentaje.reduce((sum: number, p: number) => sum + p, 0) / temasConPorcentaje.length)
            : 0;
          
          this.procesalStats = {
            area: procesalArea.area,
            successRate: successRate,
            temas: procesalArea.temas
          };
          
          console.log('✅ Estadísticas de Derecho Procesal:', this.procesalStats);
        } else {
          console.log('⚠️ No se encontró Derecho Procesal');
        }
      }
      
    } catch (error) {
      console.error('❌ Error cargando estadísticas de Procesal:', error);
    } finally {
      this.isLoading = false;
    }
  }

  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 4000);
  }

  stopCarousel() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  nextSlide() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.carouselImages.length;
  }

  goToSlide(index: number) {
    this.currentImageIndex = index;
    this.stopCarousel();
    this.startCarousel();
  }

  goToEscrito() {
    this.router.navigate(['/procesal/procesal-escrito']);
  }

  goToConversacion() {
    this.router.navigate(['/procesal/procesal-oral']);
  }

  goToMaterialEstudio() {
    this.router.navigate(['/procesal/material-estudio-procesal']);
  }

  goToReforzar() {
    this.router.navigate(['/procesal/procesal-reforzar']);
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
