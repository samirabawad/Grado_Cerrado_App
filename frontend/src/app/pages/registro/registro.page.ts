import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { PushNotificationService } from 'src/app/services/push-notification.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class RegistroPage implements OnInit {

  // Campos del formulario según tu base de datos
  nombre: string = '';
  segundoNombre: string = '';
  apellidoPaterno: string = '';
  apellidoMaterno: string = '';
  correoElectronico: string = '';
  contrasena: string = '';
  confirmarContrasena: string = '';
  
  // Estados del formulario
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;
  
  // Validaciones
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private apiService: ApiService,
    private pushService: PushNotificationService  // 👈 AGREGAR

  ) { }

  ngOnInit() {
  }

  // Validaciones
  isNombreValid(): boolean {
    return this.nombre.trim().length > 0;
  }

  isEmailValid(): boolean {
    return this.emailPattern.test(this.correoElectronico);
  }

  isPasswordValid(): boolean {
    return this.contrasena.length >= 6;
  }

  isPasswordMatchValid(): boolean {
    return this.contrasena === this.confirmarContrasena;
  }

  isFormValid(): boolean {
    return this.isNombreValid() && 
           this.isEmailValid() && 
           this.isPasswordValid() && 
           this.isPasswordMatchValid();
  }

  // Toggle para mostrar/ocultar contraseñas
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

   // Método principal de registro
  async registrarUsuario() {
    if (!this.isFormValid()) {
      await this.showAlert('Error de validación', 'Por favor, completa correctamente todos los campos obligatorios.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creando tu cuenta...',
      spinner: 'circles'
    });
    
    await loading.present();
    this.isLoading = true;

    const nombreCompleto = this.buildNombreCompleto();

    const registerData = {
      name: nombreCompleto,
      email: this.correoElectronico.toLowerCase().trim(),
      password: this.contrasena
    };

    try {
      // LLAMADA REAL AL BACKEND
      const response = await this.apiService.registerUser(registerData).toPromise();
      
      console.log('✅ Usuario registrado exitosamente:', response);
      
      if (response.success) {
        // Guardar datos del usuario en localStorage
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        
        // 🎉 NUEVO: Inicializar notificaciones push
        try {
          console.log('🔔 Inicializando notificaciones para usuario recién registrado...');
          await this.pushService.initializePushNotifications(response.user.id);
          console.log('✅ Notificaciones inicializadas');
          
          // 🎉 NUEVO: Enviar notificación de bienvenida
          console.log('🎉 Enviando notificación de bienvenida...');
          await this.pushService.sendWelcomeNotification(response.user.id);
          console.log('✅ Notificación de bienvenida enviada');
          
        } catch (notifError) {
          console.warn('⚠️ Error con notificaciones (no crítico):', notifError);
          // No bloqueamos el registro si falla la notificación
        }
        
        await loading.dismiss();
        this.isLoading = false;
        
        // Navegar a felicitaciones
        this.router.navigate(['/felicidades']);
        
      } else {
        await loading.dismiss();
        this.isLoading = false;
        await this.showAlert('Error en el registro', response.message || 'Error desconocido');
      }
      
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      
      await loading.dismiss();
      this.isLoading = false;
      
      let errorMessage = 'Error al crear la cuenta. Inténtalo nuevamente.';
      
      if (error.status === 400) {
        errorMessage = 'El email ya está registrado. Intenta con otro email.';
      } else if (error.status === 0) {
        errorMessage = 'No se puede conectar al servidor. Verifica tu conexión.';
      }
      
      await this.showAlert('Error en el registro', errorMessage);
    }
  }

  // Construir nombre completo
  private buildNombreCompleto(): string {
    const partes = [
      this.nombre.trim(),
      this.segundoNombre.trim(),
      this.apellidoPaterno.trim(),
      this.apellidoMaterno.trim()
    ].filter(parte => parte.length > 0);

    return partes.join(' ');
  }

  // Mostrar alertas generales
  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    
    await alert.present();
  }

  // Volver atrás
  goBack() {
    this.router.navigate(['/welcome2']);
  }

  // Navegar a iniciar sesión
  irAIniciarSesion() {
    this.router.navigate(['/login']);
  }
}