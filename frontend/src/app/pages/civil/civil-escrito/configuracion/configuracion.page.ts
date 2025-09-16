import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) { }

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
  startCustomSession() {
    console.log('Configuración de sesión:', this.sessionConfig);
    
    // Guardar configuración antes de iniciar
    this.saveConfiguration();
    
    // Navegar a la página de resumen del test
    this.router.navigate(['/civil/civil-escrito/resumen-test'], {
      queryParams: {
        numberOfQuestions: this.sessionConfig.numberOfQuestions,
        difficulty: this.sessionConfig.difficulty,
        adaptiveMode: this.sessionConfig.adaptiveMode,
        immediateFeedback: this.sessionConfig.immediateFeedback,
        onlyFailedQuestions: this.sessionConfig.onlyFailedQuestions
      }
    });
  }

  // Volver a la página anterior
  goBack() {
    this.router.navigate(['/civil/civil-escrito']);
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