import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-civil-escrito',
  templateUrl: './civil-escrito.page.html',
  styleUrls: ['./civil-escrito.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class CivilEscritoPage implements OnInit, OnDestroy {
  
  // Carrusel de banners
  carouselImages: string[] = [
    'assets/image/banner-5.png',
    'assets/image/banner-6.png',
    'assets/image/banner-8.png'
  ];
  currentImageIndex: number = 0;
  carouselInterval: any;

  constructor(
    private router: Router, 
    private loadingController: LoadingController, 
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.startCarousel();
  }

  ngOnDestroy() {
    this.stopCarousel();
  }

  ionViewWillEnter() {
    this.startCarousel();
  }

  ionViewWillLeave() {
    this.stopCarousel();
  }

  // Funciones del carrusel
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

  async startQuickPractice() {
    console.log('Iniciando test civil escrito...');
    
    const loading = await this.loadingController.create({
      message: 'Preparando tu test...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    
    await loading.present();
    
    try {
      console.log('Creando sesión de estudio...');
      
      const currentUser = this.apiService.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        await loading.dismiss();
        alert('Debes iniciar sesión para hacer un test');
        this.router.navigate(['/login']);
        return;
      }

      const sessionData = {
        studentId: currentUser.id,
        difficulty: "intermedio",
        legalAreas: ["Derecho Civil"],
        numberOfQuestions: 5
      };
      console.log('Enviando datos de sesión:', sessionData);
      
      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      console.log('Sesión creada exitosamente:', sessionResponse);
      
      this.apiService.setCurrentSession(sessionResponse);
      
      await this.router.navigate(['/civil/civil-escrito/test-escrito-civil']);
      
      await loading.dismiss();
      
    } catch (error) {
      await loading.dismiss();
      console.error('Error al iniciar test:', error);
      alert('Hubo un error al iniciar el test. Intenta nuevamente.');
    }
  }
}