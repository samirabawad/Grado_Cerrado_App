import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resumen-test-civil-oral',
  templateUrl: './resumen-test-civil-oral.page.html',
  styleUrls: ['./resumen-test-civil-oral.page.scss'],
  standalone: true,  // DEBE ESTAR ESTO
  imports: [IonicModule, CommonModule]
})
export class ResumenTestCivilOralPage implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
  }

  // Hacer nuevo test oral
  takeNewTest() {
    this.router.navigate(['/civil/civil-oral']);
  }

  // Volver al inicio
  goBack() {
    this.router.navigate(['/civil']);
  }
}