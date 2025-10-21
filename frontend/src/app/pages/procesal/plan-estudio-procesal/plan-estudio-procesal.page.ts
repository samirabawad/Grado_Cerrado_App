import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';

type PlanKey = 'relax' | 'full' | 'extremo';

interface PlanInfo {
  key: PlanKey;
  titulo: string;
  subtitulo: string;
  resumen: string;
  tips: string[];
  tareasSugeridas: string[];
}

@Component({
  selector: 'app-plan-estudio-procesal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, BottomNavComponent],
  templateUrl: './plan-estudio-procesal.page.html',
  styleUrls: ['./plan-estudio-procesal.page.scss']
})
export class PlanEstudioProcesalPage {
  abierto: PlanKey = 'relax';

  planes: PlanInfo[] = [
    {
      key: 'relax',
      titulo: 'Plan Relax',
      subtitulo: 'Paso a paso, sin morir en el intento',
      resumen: 'Rutina suave para avanzar cada día sin sobrecargarte.',
      tips: [
        'Lee ~100 páginas a la semana (20–25 páginas al día).',
        'Estudia mínimo 30 minutos diarios (mejor 45).',
        'Haz pausas cada 25 min (Pomodoro 25/5).',
        'Crea 5–10 flashcards por sesión para repasar.',
        'Revisa tus apuntes antes de dormir (5 min).'
      ],
      tareasSugeridas: [
        'Lectura: Procesal Parte I – Jurisdicción y Competencia (cap. 1–3).',
        'Test: 10–15 preguntas prácticas diarias.',
        'Repaso: 10 min de errores del día anterior.'
      ]
    },
    {
      key: 'full',
      titulo: 'Plan "Tengo que darlo todo"',
      subtitulo: 'Ritmo intenso, foco y progreso visible',
      resumen: 'Empuje fuerte para cubrir temario amplio en poco tiempo.',
      tips: [
        'Lee 50–80 páginas diarias (2–3 horas de estudio).',
        'Bloques 50/10 con meta clara por bloque.',
        '40 preguntas prácticas al día (mezcla de V/F y casos).',
        'Resumen al cierre: 5 bullets por tema.',
        'Simulacro corto cada 3 días (25–30 preguntas).'
      ],
      tareasSugeridas: [
        'Lectura: Procesal Parte I y II (prueba + recursos).',
        'Test: 30–40 preguntas enfocadas en temas débiles.',
        'Repaso activo: explica en voz alta lo aprendido (5 min).'
      ]
    },
    {
      key: 'extremo',
      titulo: 'Plan Extremo',
      subtitulo: 'Modo contrarreloj – máxima prioridad',
      resumen: 'Cobertura acelerada con práctica intensiva diaria.',
      tips: [
        'Lee 120–150 páginas diarias (4–6 horas).',
        'Simulacro diario (60–80 preguntas).',
        'Estudio activo: mapas mentales y teaching back.',
        'Micro-descansos cada 45–50 min (no redes).',
        'Última hora del día SOLO repaso de errores.'
      ],
      tareasSugeridas: [
        'Lectura: síntesis completa de Procesal I–III.',
        'Test: 60+ preguntas cronometradas.',
        'Repaso: lista de "pitfalls" y conceptos confusos.'
      ]
    }
  ];

  abrirGuia() {
    window.open('https://tu-enlace/guia-plan-procesal.pdf', '_blank');
  }

  toggle(plan: PlanKey) {
    this.abierto = this.abierto === plan ? (null as any) : plan;
  }

  esAbierto(plan: PlanKey) {
    return this.abierto === plan;
  }
}