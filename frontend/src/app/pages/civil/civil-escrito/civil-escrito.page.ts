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
  
  selectedQuantity: number = 5;

  constructor(
    private router: Router, 
    private loadingController: LoadingController, 
    private apiService: ApiService
  ) { }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  goBack() {
    this.router.navigate(['/civil']);
  }

  async startQuickPractice() {
    const loading = await this.loadingController.create({
      message: 'Preparando tu test...',
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

      const sessionData: any = {
        studentId: currentUser.id,
        difficulty: "intermedio",
        legalAreas: ["Derecho Civil"],
        questionCount: Number(this.selectedQuantity),      
      };
      
      console.log('📤 Enviando request:', sessionData);
      
      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      console.log('📥 Respuesta del servidor:', sessionResponse);
      
      if (sessionResponse && sessionResponse.success) {
        console.log('✅ Preguntas recibidas:', sessionResponse.totalQuestions);
        this.apiService.setCurrentSession(sessionResponse);
        await this.router.navigate(['/civil/civil-escrito/test-escrito-civil']);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        alert('No se pudo iniciar el test. Intenta nuevamente.');
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error al iniciar test:', error);
      alert('Hubo un error al iniciar el test. Intenta nuevamente.');
    }
  }
}