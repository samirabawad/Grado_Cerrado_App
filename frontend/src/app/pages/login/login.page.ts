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
  ) {}

  ngOnInit() {}

  // ✅ Validación de email
  isEmailValid(): boolean {
    return this.emailPattern.test(this.correoElectronico);
  }

  // ✅ Validación de contraseña
  isPasswordValid(): boolean {
    return this.contrasena.length >= 6;
  }

  // ✅ Validación completa del formulario
  isFormValid(): boolean {
    return this.isEmailValid() && this.isPasswordValid();
  }

  // ✅ Mostrar / ocultar contraseña
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // ✅ Método principal de inicio de sesión
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

    const loginData = {
      email: this.correoElectronico.toLowerCase().trim(),
      password: this.contrasena
    };

    try {
      const response = await this.apiService.loginUser(loginData).toPromise();
      console.log('✅ Login exitoso:', response);

      await loading.dismiss();
      this.isLoading = false;

      if (response.success) {
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.router.navigate(['/home']);
      } else {
        await this.showAlert('Error en el login', response.message || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('❌ Error en login:', error);

      await loading.dismiss();
      this.isLoading = false;

      let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';

      if (error.status === 400) {
        errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
      } else if (error.status === 0) {
        errorMessage = 'No se puede conectar al servidor. Verifica tu conexión.';
      }

      await this.showAlert('Error en el inicio de sesión', errorMessage);
    }
  }

  // ✅ Mostrar alertas
  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }

  // ✅ Volver atrás
  goBack() {
    this.router.navigate(['/welcome2']);
  }

  // ✅ Navegar a registro
  irARegistro() {
    this.router.navigate(['/registro']);
  }

  // ✅ Recuperar contraseña (paso 1)
  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Recuperar Contraseña',
      message: 'Ingresa tu email y te enviaremos un código de recuperación',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'tu@email.com'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Enviar',
          handler: async (data) => {
            if (!data.email || !data.email.includes('@')) {
              await this.showAlert('Email inválido', 'Por favor ingresa un email válido');
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Enviando código...',
              spinner: 'circles'
            });

            await loading.present();

            try {
              const response = await this.apiService.requestPasswordReset(data.email).toPromise();
              await loading.dismiss();

              if (response && response.success) {
                await this.resetPasswordWithToken(response.token || '');
              }
            } catch (error: any) {
              await loading.dismiss();
              await this.showAlert('Error', error.friendlyMessage || 'Error al enviar el código');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // ✅ Resetear contraseña con token (paso 2)
  async resetPasswordWithToken(token: string) {
    const alert = await this.alertController.create({
      header: 'Nueva Contraseña',
      message: token
        ? `Tu código de recuperación: ${token}\n\nIngresa tu nueva contraseña:`
        : 'Ingresa el código de recuperación y tu nueva contraseña:',
      inputs: token
        ? [
            { name: 'newPassword', type: 'password', placeholder: 'Nueva contraseña (mínimo 6 caracteres)' },
            { name: 'confirmPassword', type: 'password', placeholder: 'Confirmar nueva contraseña' }
          ]
        : [
            { name: 'token', type: 'text', placeholder: 'Código de recuperación' },
            { name: 'newPassword', type: 'password', placeholder: 'Nueva contraseña (mínimo 6 caracteres)' },
            { name: 'confirmPassword', type: 'password', placeholder: 'Confirmar nueva contraseña' }
          ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cambiar Contraseña',
          handler: async (data) => {
            const resetToken = token || data.token;

            if (!resetToken) {
              await this.showAlert('Error', 'El código de recuperación es obligatorio');
              return false;
            }

            if (!data.newPassword || data.newPassword.length < 6) {
              await this.showAlert('Error', 'La contraseña debe tener al menos 6 caracteres');
              return false;
            }

            if (data.newPassword !== data.confirmPassword) {
              await this.showAlert('Error', 'Las contraseñas no coinciden');
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Actualizando contraseña...',
              spinner: 'circles'
            });

            await loading.present();

            try {
              const response = await this.apiService.resetPassword(resetToken, data.newPassword).toPromise();
              await loading.dismiss();

              if (response && response.success) {
                await this.showAlert(
                  'Contraseña actualizada',
                  'Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión.'
                );
              }
            } catch (error: any) {
              await loading.dismiss();
              await this.showAlert('Error', error.friendlyMessage || 'Error al actualizar la contraseña');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }
}
