import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-civil-escrito',
  templateUrl: './civil-escrito.page.html',
  styleUrls: ['./civil-escrito.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class CivilEscritoPage implements OnInit {
  
  // Propiedades para el mapache
  showSpeech: boolean = false;
  currentMessage: string = '';
  
  // Mensajes del mapache
  private mapacheMessages: string[] = [
    '¡Sigue practicando!',
    '¡Vas muy bien!',
    '¡Excelente progreso!',
    '¡Eres increíble!',
    '¡Ya casi lo tienes!',
    '¡No te rindas!'
  ];

  constructor(private router: Router, private loadingController: LoadingController) { }

  ngOnInit() {
    // Mostrar mensaje inicial del mapache después de 3 segundos
    setTimeout(() => {
      this.mapacheSpeak();
    }, 3000);
  }

  // ========================================
  // FUNCIÓN PRINCIPAL - INICIAR TEST CON LOADING
  // ========================================
  
  async startQuickPractice() {
    console.log('Iniciando test civil escrito...');
    
    // Mostrar loading
    const loading = await this.loadingController.create({
      message: 'Preparando tu test...',
      spinner: 'crescent',
      duration: 2000, // Máximo 2 segundos
      cssClass: 'custom-loading'
    });
    
    await loading.present();
    
    try {
      // Simular tiempo de carga (puedes quitar esto si no es necesario)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navegar al test
      await this.router.navigate(['/civil/civil-escrito/test-escrito-civil']);
      
      console.log('Navegación exitosa al test civil escrito');
      
    } catch (error) {
      console.error('Error al navegar al test:', error);
      
      // Mostrar error si es necesario
      await loading.dismiss();
      alert('Error al cargar el test. Inténtalo nuevamente.');
      
    } finally {
      // Asegurar que el loading se cierre
      await loading.dismiss();
    }
  }

  // ========================================
  // FUNCIÓN DEL MAPACHE
  // ========================================
  
  mapacheSpeak() {
    // Seleccionar mensaje aleatorio
    const randomIndex = Math.floor(Math.random() * this.mapacheMessages.length);
    this.currentMessage = this.mapacheMessages[randomIndex];
    
    // Mostrar burbuja de diálogo
    this.showSpeech = true;
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      this.showSpeech = false;
    }, 3000);
    
    console.log('Mapache dice:', this.currentMessage);
  }

  // ========================================
  // FUNCIONES AUXILIARES
  // ========================================
  
  // Función para obtener el progreso actual (conectar con tu backend)
  getCurrentProgress(): number {
    return 65; // Valor fijo por ahora
  }

  // Función para obtener estadísticas (conectar con tu backend)
  getStats() {
    return {
      completedSessions: 13,
      totalSessions: 20,
      percentage: 65
    };
  }
}