import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-civil-oral',
  templateUrl: './civil-oral.page.html',
  styleUrls: ['./civil-oral.page.scss'],
  standalone: false,
})
export class CivilOralPage implements OnInit, OnDestroy {

  // Carrusel de banners
  carouselImages: string[] = [
    'assets/image/banner-9.png',
    'assets/image/banner-10.png',
    'assets/image/banner-11.png'
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

  async startVoicePractice() {
    console.log('🎤 Iniciando práctica rápida - modo voz ORAL');
    
    const loading = await this.loadingController.create({
      message: 'Preparando tu test oral...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    
    await loading.present();
    
    try {
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
      
      console.log('📤 Enviando datos de sesión ORAL:', sessionData);
      
      const sessionResponse = await this.apiService.startOralStudySession(sessionData).toPromise();
      console.log('✅ Sesión ORAL creada exitosamente:', sessionResponse);
      
      this.apiService.setCurrentSession(sessionResponse);
      
      await this.router.navigate(['/civil/civil-oral/test-oral-civil']);
      
      await loading.dismiss();
      
    } catch (error: any) {
      console.error('Error iniciando test oral:', error);
      await loading.dismiss();
      alert('Error al iniciar el test. Por favor intenta de nuevo.');
    }
  }
}