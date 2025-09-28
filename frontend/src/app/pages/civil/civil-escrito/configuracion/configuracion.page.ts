import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service'; // 

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss'],
  standalone: false
})
export class ConfiguracionPage implements OnInit {

  // Configuración de la sesión personalizada
  sessionConfig = {
    numberOfQuestions: 10,
    difficulty: 'Intermedio',
    adaptiveMode: true,
    immediateFeedback: false,
    onlyFailedQuestions: false
  };

  // Opciones disponibles
  questionOptions = [5, 10, 20, 30];
  difficultyOptions = ['Fácil', 'Intermedio', 'Difícil'];

  constructor(private router: Router,
              private apiService: ApiService
  ) { }

  ngOnInit() {
    // Cargar configuración guardada del usuario si existe
    this.loadSavedConfiguration();
  }

  // Cargar configuración guardada
  loadSavedConfiguration() {
    const savedConfig = localStorage.getItem('civil-escrito-config');
    if (savedConfig) {
      this.sessionConfig = { ...this.sessionConfig, ...JSON.parse(savedConfig) };
    }
  }

  // Guardar configuración
  saveConfiguration() {
    localStorage.setItem('civil-escrito-config', JSON.stringify(this.sessionConfig));
  }

  // Cambiar número de preguntas
  onQuestionsChange(event: any) {
    this.sessionConfig.numberOfQuestions = parseInt(event.detail.value);
    this.saveConfiguration();
  }

  // Cambiar dificultad
  onDifficultyChange(event: any) {
    this.sessionConfig.difficulty = event.detail.value;
    this.saveConfiguration();
  }

  // Toggle para modo adaptativo
  onAdaptiveModeToggle(event: any) {
    this.sessionConfig.adaptiveMode = event.detail.checked;
    this.saveConfiguration();
  }

  // Toggle para feedback inmediato
  onImmediateFeedbackToggle(event: any) {
    this.sessionConfig.immediateFeedback = event.detail.checked;
    this.saveConfiguration();
  }

  // Toggle para solo preguntas falladas
  onFailedQuestionsToggle(event: any) {
    this.sessionConfig.onlyFailedQuestions = event.detail.checked;
    this.saveConfiguration();
  }

  // Iniciar sesión personalizada
    async startCustomSession() {
      try {
        console.log('Iniciando sesión con backend...');
        
        const sessionData = {
          userId: null,
          legalAreas: ['Derecho Civil'],
          difficulty: this.mapDifficultyToNumber(this.sessionConfig.difficulty),
          questionCount: this.sessionConfig.numberOfQuestions
        };
        
        const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
        console.log('Sesión iniciada exitosamente:', sessionResponse);
        
        this.apiService.setCurrentSession(sessionResponse);
        
        // ✅ Navegar a test-escrito-civil
        this.router.navigate(['/civil/civil-escrito/test-escrito-civil']);
        
      } catch (error) {
        console.error('Error iniciando sesión:', error);
      }
    }

  // Volver a la página anterior
  goBack() {
    this.router.navigate(['/civil/civil-escrito']);
  }

  // Convertir dificultad de español a inglés
    private mapDifficultyToNumber(difficulty: string): number {
      switch (difficulty) {
        case 'Fácil':
          return 0;  // Basic
        case 'Intermedio':
          return 1;  // Intermediate
        case 'Difícil':
          return 2;  // Advanced
        default:
          return 1;  // Default: Intermediate
      }
    }


  // Obtener el color del valor según el tipo
  getValueColor(type: string): string {
    switch (type) {
      case 'questions':
        return '#FF6F00';
      case 'difficulty':
        return '#FF6F00';
      default:
        return '#FF6F00';
    }
  }
}