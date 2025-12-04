import { Component, OnInit, OnDestroy } from '@angular/core';
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
  imports: [IonicModule, CommonModule, BottomNavComponent],
})
export class CivilPage implements OnInit, OnDestroy {

  civilStats: any = null;
  isLoading: boolean = true;

  carouselImages: string[] = [
    'assets/image/bannerhome.png',
    'assets/image/banner-2.png',
    'assets/image/banner-3.png',
  ];
  currentImageIndex: number = 0;
  carouselInterval: any;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.loadCivilStats();
    this.startCarousel();
  }

  ngOnDestroy() {
    this.stopCarousel();
  }

  ionViewWillEnter() {
    this.loadCivilStats();
    this.startCarousel();
  }

  ionViewWillLeave() {
    this.stopCarousel();
  }

  async loadCivilStats() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        console.warn('⚠️ No hay usuario logueado, redirigiendo a login');
        this.isLoading = false;
        await this.router.navigate(['/login']);
        return;
      }

      const studentId = currentUser.id;
      console.log('Cargando estadísticas de Civil para estudiante:', studentId);

      const areaResponse = await this.apiService.getHierarchicalStats(studentId).toPromise();
      console.log('Respuesta completa del API:', areaResponse);

      if (areaResponse && areaResponse.success && areaResponse.data) {
        const civilArea = areaResponse.data.find(
          (item: any) => item.type === 'area' && item.area === 'Derecho Civil'
        );

      if (civilArea) {
          // Calcular successRate igual que el Dashboard: promedio de subtemas
          const temasConPorcentaje = civilArea.temas.map((tema: any) => {
            const subtemasConPorcentaje = tema.subtemas.map((subtema: any) => subtema.porcentajeAcierto || 0);
            return subtemasConPorcentaje.length > 0
              ? Math.round(subtemasConPorcentaje.reduce((sum: number, p: number) => sum + p, 0) / subtemasConPorcentaje.length)
              : 0;
          });
          
          const successRate = temasConPorcentaje.length > 0
            ? Math.round(temasConPorcentaje.reduce((sum: number, p: number) => sum + p, 0) / temasConPorcentaje.length)
            : 0;

          this.civilStats = {
            area: civilArea.area,
            successRate,
            temas: civilArea.temas,
          };

          console.log('✅ Estadísticas de Derecho Civil:', this.civilStats);
        }
      }

    } catch (error) {
      console.error('❌ Error cargando estadísticas de Civil:', error);
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
    this.currentImageIndex =
      (this.currentImageIndex + 1) % this.carouselImages.length;
  }

  goToSlide(index: number) {
    this.currentImageIndex = index;
    this.stopCarousel();
    this.startCarousel();
  }

  goToEscrito() {
    this.router.navigate(['/civil/civil-escrito']);
  }

  goToConversacion() {
    this.router.navigate(['/civil/civil-oral']);
  }

  goToMaterialEstudio() {
    this.router.navigate(['/civil/material-estudio-civil']);
  }

  goToReforzar() {
    this.router.navigate(['/civil/civil-reforzar']);
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
