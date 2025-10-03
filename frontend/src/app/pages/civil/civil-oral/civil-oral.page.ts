import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-civil-oral',
  templateUrl: './civil-oral.page.html',
  styleUrls: ['./civil-oral.page.scss'],
  standalone: false,
})
export class CivilOralPage implements OnInit {

  showSpeech = false;
  showMusicNotes = false;
  currentMessage = '';

  oralMessages = [
    '¡Hora de practicar con tu voz!',
    '¿Listo para el desafío oral?',
    '¡Tu conocimiento suena genial!',
    '¡Practiquemos juntos!',
    '¡El modo voz es divertido!'
  ];

  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    setTimeout(() => {
      this.activateSinging();
    }, 1000);
  }

  // 🎤 MODIFICADO: Ahora llama al endpoint de sesión ORAL
  async startVoicePractice() {
    console.log('🎤 Iniciando práctica rápida - modo voz ORAL');
    
    const loading = await this.loadingController.create({
      message: 'Preparando tu test oral con IA...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    
    await loading.present();
    
    try {
      // Obtener el usuario actual logueado
      const currentUser = this.apiService.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        await loading.dismiss();
        alert('Debes iniciar sesión para hacer un test');
        this.router.navigate(['/login']);
        return;
      }

      const sessionData = {
        studentId: currentUser.id,  // Usar el ID real del usuario
        difficulty: "intermedio",
        legalAreas: ["Derecho Civil"],
        numberOfQuestions: 5
      };
      
      console.log('📤 Enviando datos de sesión ORAL:', sessionData);
      
      // 🆕 CAMBIO CLAVE: Usar el método ORAL en lugar del normal
      const sessionResponse = await this.apiService.startOralStudySession(sessionData).toPromise();
      console.log('✅ Sesión ORAL creada exitosamente:', sessionResponse);
      
      // Verificar que se generaron preguntas de tipo oral
      if (sessionResponse.questions && sessionResponse.questions.length > 0) {
        const firstQuestionType = sessionResponse.questions[0].type;
        console.log('✅ Tipo de primera pregunta:', firstQuestionType);
        
        if (firstQuestionType !== 'oral') {
          console.warn('⚠️ Advertencia: Las preguntas no son de tipo oral');
        }
      }
      
      // Guardar la sesión
      this.apiService.setCurrentSession(sessionResponse);
      
      // Navegar al test oral
      await this.router.navigate(['/civil/civil-oral/test-oral-civil']);
      
      // Polling para verificar que las preguntas están cargadas
      let attempts = 0;
      const maxAttempts = 30;
      
      const checkQuestionsLoaded = () => {
        return new Promise<void>((resolve, reject) => {
          const interval = setInterval(() => {
            attempts++;
            
            const currentSession = this.apiService.getCurrentSession();
            const hasQuestions = currentSession?.questions && currentSession.questions.length > 0;
            
            console.log(`🔍 Intento ${attempts}: Preguntas cargadas = ${hasQuestions}`);
            
            if (hasQuestions) {
              clearInterval(interval);
              console.log('✅ Preguntas detectadas, cerrando loading');
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(interval);
              console.log('⏱️ Timeout esperando preguntas');
              reject(new Error('Timeout cargando preguntas'));
            }
          }, 500);
        });
      };
      
      await checkQuestionsLoaded();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🎉 Test oral completamente cargado y listo');
      
    } catch (error) {
      console.error('❌ Error al crear sesión o cargar preguntas:', error);
      alert('Error al cargar el test oral. Verifica tu conexión e inténtalo nuevamente.');
    } finally {
      await loading.dismiss();
      console.log('✅ Loading cerrado');
    }
  }

  mapacheSing() {
    this.activateSinging();
  }

  private activateSinging() {
    this.showMusicNotes = true;
    
    setTimeout(() => {
      this.currentMessage = this.getRandomOralMessage();
      this.showSpeech = true;
    }, 500);

    setTimeout(() => {
      this.showSpeech = false;
      this.showMusicNotes = false;
    }, 3000);
  }

  private getRandomOralMessage(): string {
    const randomIndex = Math.floor(Math.random() * this.oralMessages.length);
    return this.oralMessages[randomIndex];
  }
}