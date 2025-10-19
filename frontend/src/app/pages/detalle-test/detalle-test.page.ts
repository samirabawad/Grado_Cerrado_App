import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-detalle-test',
  templateUrl: './detalle-test.page.html',
  styleUrls: ['./detalle-test.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DetalleTestPage implements OnInit {
  
  testId: number = 0;
  isLoading: boolean = true;
  
  // Datos del test
  testInfo: any = null;
  stats: any = null;
  questions: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    // Obtener el testId de la URL
    this.testId = parseInt(this.route.snapshot.paramMap.get('testId') || '0');
    
    if (this.testId > 0) {
      this.loadTestDetail();
    } else {
      console.error('ID de test inválido');
      this.goBack();
    }
  }

  loadTestDetail() {
    this.isLoading = true;
    
    this.apiService.getTestDetail(this.testId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.testInfo = response.data.testInfo;
          this.stats = response.data.stats;
          this.questions = response.data.questions;
          
          console.log('✅ Detalle del test cargado:', response.data);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando detalle del test:', error);
        this.isLoading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/civil/civil-reforzar']);
  }
}