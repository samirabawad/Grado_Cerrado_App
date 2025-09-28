import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class RegistroPage implements OnInit {

  // Datos del formulario
  nombreCompleto: string = '';
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
    private apiService: ApiService
  ) { }

  ngOnInit() {
  }

  // Validación de email
  isEmailValid(): boolean {
    return this.emailPattern.test(this.correoElectronico);
  }

  // Validación de contraseña
  isPasswordValid(): boolean {
    return this.contrasena.length >= 6;
  }

  // Validación de confirmación de contraseña
  doPasswordsMatch(): boolean {
    return this.contrasena === this.confirmarContrasena;
  }

  // Validación de nombre
  isNameValid(): boolean {
    return this.nombreCompleto.trim().length >= 2;
  }

  // Validación completa del formulario
  isFormValid(): boolean {
    return this.isNameValid() && 
           this.isEmailValid() && 
           this.isPasswordValid() && 
           this.doPasswordsMatch();
  }

  // Toggle para mostrar/ocultar contraseña
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Toggle para mostrar/ocultar confirmación de contraseña
  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Método principal de registro - CONECTADO AL BACKEND REAL
  async registrarse() {
    if (!this.isFormValid()) {
      await this.showAlert('Error de validación', 'Por favor, completa correctamente todos los campos.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creando tu cuenta...',
      spinner: 'circles'
    });
    
    await loading.present();
    this.isLoading = true;

    // Datos para enviar al backend
    const registerData = {
      name: this.nombreCompleto.trim(),
      email: this.correoElectronico.toLowerCase().trim()
    };

    try {
      // LLAMADA REAL AL BACKEND usando ApiService
      const response = await this.apiService.registerUser(registerData).toPromise();
      
      console.log('✅ Usuario registrado exitosamente en BD:', response);
      
      await loading.dismiss();
      this.isLoading = false;
      
      // Guardar datos del usuario en localStorage
      localStorage.setItem('currentUser', JSON.stringify(response));
      
      // Navegar a la página de felicidades
      this.router.navigate(['/felicidades']);
      
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      
      await loading.dismiss();
      this.isLoading = false;
      
      let errorMessage = 'Error al crear la cuenta. Inténtalo nuevamente.';
      
      // Manejo específico de errores del backend
      if (error.status === 400) {
        errorMessage = 'El email ya está registrado. Intenta con otro email.';
      } else if (error.status === 0) {
        errorMessage = 'No se puede conectar al servidor. Verifica tu conexión.';
      }
      
      await this.showAlert('Error en el registro', errorMessage);
    }
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