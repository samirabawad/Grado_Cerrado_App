import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-resumen-test',
  templateUrl: './resumen-test.page.html',
  styleUrls: ['./resumen-test.page.scss'],
  standalone: false
})
export class ResumenTestPage implements OnInit {

  // Configuración recibida desde la página anterior
  testConfig = {
    numberOfQuestions: 10,
    difficulty: 'Intermedio',
    adaptiveMode: true,
    immediateFeedback: false,
    onlyFailedQuestions: false
  };

  // Datos del usuario (simulados por ahora)
  userLevel = 'Intermedio';
  progressToAdvanced = 81;
  timeLimit = 25; // minutos
  passPercentage = 70;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Obtener los parámetros de la configuración
    this.route.queryParams.subscribe(params => {
      if (params['numberOfQuestions']) {
        this.testConfig.numberOfQuestions = parseInt(params['numberOfQuestions']);
      }
      if (params['difficulty']) {
        this.testConfig.difficulty = params['difficulty'];
      }
      if (params['adaptiveMode']) {
        this.testConfig.adaptiveMode = params['adaptiveMode'] === 'true';
      }
      if (params['immediateFeedback']) {
        this.testConfig.immediateFeedback = params['immediateFeedback'] === 'true';
      }
      if (params['onlyFailedQuestions']) {
        this.testConfig.onlyFailedQuestions = params['onlyFailedQuestions'] === 'true';
      }
    });

    // Calcular tiempo límite basado en número de preguntas
    this.calculateTimeLimit();
  }

  // Calcular tiempo límite (aproximadamente 2.5 min por pregunta)
  calculateTimeLimit() {
    this.timeLimit = Math.round(this.testConfig.numberOfQuestions * 2.5);
  }

  // Iniciar la prueba
  startTest() {
    console.log('Iniciando test con configuración:', this.testConfig);
    
    // Navegar a la página del test con las preguntas
    this.router.navigate(['/civil/civil-escrito/test-escrito-civil'], {
      queryParams: {
        numberOfQuestions: this.testConfig.numberOfQuestions,
        difficulty: this.testConfig.difficulty,
        adaptiveMode: this.testConfig.adaptiveMode,
        immediateFeedback: this.testConfig.immediateFeedback,
        onlyFailedQuestions: this.testConfig.onlyFailedQuestions,
        timeLimit: this.timeLimit
      }
    });
  }

  // Volver a configuración
  goBack() {
    this.router.navigate(['/civil/civil-escrito/configuracion']);
  }

  // Ir a modo opciones (para cambiar configuración)
  goToOptions() {
    this.router.navigate(['/civil/civil-escrito/configuracion']);
  }

  // Obtener el texto del modo basado en la configuración
  getModeText(): string {
    const modes = [];
    
    if (this.testConfig.adaptiveMode) {
      modes.push('Adaptativo');
    }
    
    if (this.testConfig.immediateFeedback) {
      modes.push('Feedback inmediato');
    }
    
    if (this.testConfig.onlyFailedQuestions) {
      modes.push('Solo falladas');
    }
    
    return modes.length > 0 ? modes.join(', ') : 'Modo estándar';
  }

  // Obtener color del nivel
  getLevelColor(): string {
    switch (this.testConfig.difficulty) {
      case 'Fácil':
        return '#4CAF50';
      case 'Intermedio':
        return '#FF8F00';
      case 'Difícil':
        return '#F44336';
      default:
        return '#FF8F00';
    }
  }
}