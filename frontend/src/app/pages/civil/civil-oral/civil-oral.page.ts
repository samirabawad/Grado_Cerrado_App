import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-civil-oral',
  templateUrl: './civil-oral.page.html',
  styleUrls: ['./civil-oral.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class CivilOralPage implements OnInit, OnDestroy {
  
  selectedQuantity: number = 1;

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

  async startVoicePractice() {
    const loading = await this.loadingController.create({
      message: this.selectedQuantity === 1 ? 'Preparando tu pregunta oral...' : 'Preparando tu test oral...',
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
        questionCount: Number(this.selectedQuantity)
      };
      
      console.log('📤 Enviando request ORAL:', sessionData);
      
      const sessionResponse = await this.apiService.startOralStudySession(sessionData).toPromise();
      console.log('📥 Respuesta del servidor ORAL:', sessionResponse);
      
      if (sessionResponse && sessionResponse.success) {
        console.log('✅ Preguntas orales recibidas:', sessionResponse.totalQuestions);
        this.apiService.setCurrentSession(sessionResponse);
        await this.router.navigate(['/civil/civil-oral/test-oral-civil']);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        alert('No se pudo iniciar el test oral. Intenta nuevamente.');
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error al iniciar test oral:', error);
      alert('Hubo un error al iniciar el test oral. Intenta nuevamente.');
    }
  }
}