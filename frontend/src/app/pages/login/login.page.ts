import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class LoginPage implements OnInit {

  // Datos del formulario
  correoElectronico: string = '';
  contrasena: string = '';
  
  // Estados del formulario
  showPassword: boolean = false;
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

  // Validación completa del formulario
  isFormValid(): boolean {
    return this.isEmailValid() && this.isPasswordValid();
  }

  // Toggle para mostrar/ocultar contraseña
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Método principal de login
  async iniciarSesion() {
    if (!this.isFormValid()) {
      await this.showAlert('Error de validación', 'Por favor, completa correctamente todos los campos.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
      spinner: 'circles'
    });
    
    await loading.present();
    this.isLoading = true;

    // Datos para enviar al backend
    const loginData = {
      email: this.correoElectronico.toLowerCase().trim(),
      password: this.contrasena
    };

    try {
      // LLAMADA REAL AL BACKEND para login
      // const response = await this.apiService.loginUser(loginData).toPromise();
      
      // POR AHORA simulamos login exitoso
      console.log('✅ Iniciando sesión con:', loginData);
      
      await loading.dismiss();
      this.isLoading = false;
      
      // Simular datos del usuario
      const userData = {
        id: 1,
        name: 'Usuario',
        email: this.correoElectronico
      };
      
      // Guardar datos del usuario en localStorage
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      // Navegar a civil (página principal)
      this.router.navigate(['/civil']);
      
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      
      await loading.dismiss();
      this.isLoading = false;
      
      let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
      
      await this.showAlert('Error en el inicio de sesión', errorMessage);
    }
  }

  // Mostrar alertas
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

  // Navegar a registro
  irARegistro() {
    this.router.navigate(['/registro']);
  }
}