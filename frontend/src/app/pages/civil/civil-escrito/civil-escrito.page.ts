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
  
  constructor(private router: Router) { }
  
  ngOnInit() { }

  // Navegación para Práctica Rápida
  goToQuickPractice() {
    this.router.navigate(['/civil/civil-escrito/practica-rapida']);
  }

  // Navegación para Sesión Estándar
  goToStandardSession() {
    console.log('Ir a sesión estándar');
    // Aquí puedes agregar la navegación cuando esté lista
    // this.router.navigate(['/civil/civil-escrito/sesion-estandar']);
  }

  // Navegación para Configuración
  goToConfiguration() {
    this.router.navigate(['/civil/civil-escrito/configuracion']);
  }

  // Navegación para ver progreso detallado
  goToProgress() {
    this.router.navigate(['/civil/civil-escrito/progreso']);
  }

  // Métodos heredados del civil principal (por si los necesitas)
  goToEscrito() {
    this.router.navigate(['/civil/civil-escrito']);
  }

  goToConversacion() {
    this.router.navigate(['/civil/civil-oral']);
  }

  goToTest() {
    console.log('Ir a Test');
    // Aquí puedes agregar la navegación al test cuando esté listo
  }

  goToMaterialEstudio() {
    console.log('Ir a Material de Estudio');
    // Aquí puedes agregar la navegación cuando esté listo
  }

  goToPlanEstudio() {
    console.log('Ir a Plan de Estudio');
    // Aquí puedes agregar la navegación cuando esté listo
  }

  goToDestacados() {
    console.log('Ir a Destacados');
    // Aquí puedes agregar la navegación cuando esté listo
  }
}