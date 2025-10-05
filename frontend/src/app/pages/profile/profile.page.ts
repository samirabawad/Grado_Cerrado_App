import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class ProfilePage implements OnInit {

  user = {
    id: 2,
    nombre: 'Usuario',
    email: 'usuario@example.com',
    nivel_actual: 'basico',
    fecha_registro: new Date(),
    avatar: 'assets/image/msombra.png',
    activo: true,
    verificado: false
  };

  stats = {
    racha_dias_actual: 0,
    racha_dias_maxima: 0,
    total_dias_estudiados: 0,
    total_tests: 0,
    total_preguntas: 0,
    promedio_aciertos: 0
  };

  settings = {
    darkMode: false,
    soundEffects: true,
    vibration: true,
    autoSave: true
  };

  constructor(
    private router: Router,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadUserData();
    this.loadSettings();
  }

  loadUserData() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const parsed = JSON.parse(userData);
      this.user.nombre = parsed.name || 'Usuario';
      this.user.email = parsed.email || 'usuario@example.com';
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      this.settings = JSON.parse(saved);
    }
  }

  getNivelFormatted(): string {
    const niveles: any = {
      'basico': 'Básico',
      'intermedio': 'Intermedio',
      'avanzado': 'Avanzado'
    };
    return niveles[this.user.nivel_actual] || 'Básico';
  }

  getFechaRegistroFormatted(): string {
    const fecha = new Date(this.user.fecha_registro);
    return fecha.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  async editProfile() {
    const alert = await this.alertController.create({
      header: 'Editar Perfil',
      message: 'Función en desarrollo. Próximamente podrás editar tu perfil.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async changeAvatar() {
    const alert = await this.alertController.create({
      header: 'Cambiar Foto',
      message: 'Función en desarrollo. Próximamente podrás cambiar tu foto de perfil.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          role: 'destructive',
          handler: () => {
            localStorage.removeItem('currentUser');
            this.router.navigate(['/welcome2']);
          }
        }
      ]
    });
    await alert.present();
  }

  saveSettings() {
    localStorage.setItem('appSettings', JSON.stringify(this.settings));
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  async viewHistory() {
    const alert = await this.alertController.create({
      header: 'Historial',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async viewAchievements() {
    const alert = await this.alertController.create({
      header: 'Logros',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async getHelp() {
    const alert = await this.alertController.create({
      header: 'Ayuda',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async aboutApp() {
    const alert = await this.alertController.create({
      header: 'Acerca de',
      message: 'Grado Cerrado v1.0',
      buttons: ['OK']
    });
    await alert.present();
  }
}