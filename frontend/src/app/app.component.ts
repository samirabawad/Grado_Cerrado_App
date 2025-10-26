import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private router: Router,
    private platform: Platform
  ) {
    this.initializeApp();
  }
  
  async initializeApp() {
    await this.platform.ready();
    this.checkSession();
  }

  checkSession() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (currentUser) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/welcome']);
    }
  }
}