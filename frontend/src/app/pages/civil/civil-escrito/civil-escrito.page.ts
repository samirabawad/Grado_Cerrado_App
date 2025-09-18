import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-civil-escrito',
  templateUrl: './civil-escrito.page.html',
  styleUrls: ['./civil-escrito.page.scss'],
  standalone: false
})
export class CivilEscritoPage implements OnInit {
  
  // Datos del progreso según la imagen
  currentLevel = 'Intermedio';
  progressPercentage = 70;
  congratulationMessage = '¡Sigue así! Vas por buen camino';
  nextLevelProgress = 'Necesitas 81% para alcanzar el Nivel Avanzado';
  
  // Datos de progreso en modo escrito
  writtenModeProgress = 65;
  writtenModeSessions = '13 de 20 sesiones';
  
  // Estadísticas
  averageScore = 85;
  totalQuestions = 247;

  // Últimos resultados del test
  lastTestResults = {
    correctAnswers: 0,
    incorrectAnswers: 0,
    percentage: 0,
    suggestedLevel: 'Intermedio',
    hasResults: false
  };
  
  constructor(private router: Router) { }
  
  ngOnInit() {
    this.loadLastTestResults();
    this.updateProgressData();
  }

  ionViewWillEnter() {
    this.loadLastTestResults();
    this.updateProgressData();
  }

  // CARGAR ÚLTIMOS RESULTADOS DEL TEST
  loadLastTestResults() {
    const savedResults = localStorage.getItem('lastTestResults');
    if (savedResults) {
      this.lastTestResults = JSON.parse(savedResults);
      this.lastTestResults.hasResults = true;
    }
  }

  // ACTUALIZAR DATOS DE PROGRESO
  updateProgressData() {
    if (this.lastTestResults.hasResults) {
      this.currentLevel = this.lastTestResults.suggestedLevel;
      this.congratulationMessage = this.getCongratulatoryMessage(this.lastTestResults.percentage);
      this.progressPercentage = this.calculateProgressPercentage(this.lastTestResults.suggestedLevel);
      this.nextLevelProgress = this.getNextLevelMessage(this.lastTestResults.suggestedLevel);
      this.averageScore = this.lastTestResults.percentage;
    }
  }

  getCongratulatoryMessage(percentage: number): string {
    if (percentage >= 90) return '¡Excelente! Dominas el tema';
    else if (percentage >= 75) return '¡Muy bien! Estás avanzando';
    else if (percentage >= 60) return '¡Sigue así! Vas por buen camino';
    else if (percentage >= 40) return 'Sigue practicando, puedes mejorar';
    else return 'Necesitas más práctica';
  }

  calculateProgressPercentage(level: string): number {
    switch (level) {
      case 'Principiante': return 20;
      case 'Básico': return 40;
      case 'Intermedio': return 60;
      case 'Avanzado': return 80;
      case 'Experto': return 100;
      default: return 60;
    }
  }

  getNextLevelMessage(currentLevel: string): string {
    switch (currentLevel) {
      case 'Principiante': return 'Necesitas 40% para alcanzar el Nivel Básico';
      case 'Básico': return 'Necesitas 60% para alcanzar el Nivel Intermedio';
      case 'Intermedio': return 'Necesitas 75% para alcanzar el Nivel Avanzado';
      case 'Avanzado': return 'Necesitas 90% para alcanzar el Nivel Experto';
      case 'Experto': return '¡Has alcanzado el nivel máximo!';
      default: return 'Continúa practicando para avanzar';
    }
  }

  // Navegación para Práctica Rápida
  goToQuickPractice() {
    this.router.navigate(['/civil/civil-escrito/configuracion']);
  }

  // Navegación para Sesión Estándar
  goToStandardSession() {
    this.router.navigate(['/civil/civil-escrito/configuracion']);
  }

  // Navegación para Configuración
  goToConfiguration() {
    this.router.navigate(['/civil/civil-escrito/configuracion']);
  }

  // Navegación para ver progreso detallado
  goToProgress() {
    this.router.navigate(['/civil/civil-escrito/progreso']);
  }

  // Métodos heredados del civil principal
  goToEscrito() {
    this.router.navigate(['/civil/civil-escrito']);
  }

  goToConversacion() {
    this.router.navigate(['/civil/civil-oral']);
  }

  goToTest() {
    this.router.navigate(['/civil/civil-escrito/configuracion']);
  }

  goToMaterialEstudio() {
    console.log('Ir a Material de Estudio');
  }

  goToPlanEstudio() {
    console.log('Ir a Plan de Estudio');
  }

  goToDestacados() {
    console.log('Ir a Destacados');
  }
}