import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },

  // ========================================
  // BIENVENIDA
  // ========================================
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.page').then(m => m.WelcomePage)
  },
  {
    path: 'welcome2',
    loadComponent: () => import('./pages/welcome2/welcome2.page').then(m => m.Welcome2Page)
  },

  // ========================================
  // ONBOARDING
  // ========================================
  {
    path: 'onboarding1',
    loadComponent: () => import('./pages/onboarding/onboarding1/onboarding1.page').then(m => m.Onboarding1Page)
  },
  {
    path: 'onboarding2',
    loadComponent: () => import('./pages/onboarding/onboarding2/onboarding2.page').then(m => m.Onboarding2Page)
  },
  {
    path: 'onboarding3',
    loadComponent: () => import('./pages/onboarding/onboarding3/onboarding3.page').then(m => m.Onboarding3Page)
  },

  // ========================================
  // AUTENTICACIÓN
  // ========================================
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then(m => m.RegistroPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'felicidades',
    loadComponent: () => import('./pages/felicidades/felicidades.page').then(m => m.FelicidadesPage)
  },


  // ========================================
// HOME Y DASHBOARD
// ========================================
{
  path: 'home',
  loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
},
{
  path: 'dashboard',
  loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
},
{
  path: 'racha',
  loadComponent: () => import('./pages/racha/racha.page').then(m => m.RachaPage)
},
{
  path: 'profile',
  loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage)
},

{
  path: 'logros',
  loadComponent: () => import('./pages/logros/logros.page').then(m => m.LogrosPage)
},

{
  path: 'historial',
  loadComponent: () => import('./pages/historial/historial.page').then(m => m.HistorialPage)
},

  // ========================================
  // NOTIFICACIONES
  // ========================================

 {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications.page').then(m => m.NotificationsPage)
  },

  // ========================================
  // CIVIL - PÁGINA PRINCIPAL
  // ========================================
  {
    path: 'civil',
    loadComponent: () => import('./pages/civil/civil.page').then(m => m.CivilPage)
  },

  // ========================================
  // CIVIL - ESCRITO
  // ========================================
  {
    path: 'civil/civil-escrito',
    loadComponent: () => import('./pages/civil/civil-escrito/civil-escrito.page').then(m => m.CivilEscritoPage)
  },
  {
    path: 'civil/civil-escrito/test-escrito-civil',
    loadComponent: () => import('./pages/civil/civil-escrito/test-escrito-civil/test-escrito-civil.page').then(m => m.TestEscritoCivilPage)
  },
  {
    path: 'civil/civil-escrito/resumen-test-civil',
    loadComponent: () => import('./pages/civil/civil-escrito/resumen-test-civil/resumen-test-civil.page').then(m => m.ResumenTestCivilPage)
  },

  // ========================================
  // CIVIL - REFORZAR  ⬅️ NUEVA RUTA
  // ========================================
  {
    path: 'civil/civil-reforzar',
    loadComponent: () => import('./pages/civil/civil-reforzar/civil-reforzar.page').then(m => m.CivilReforzarPage)
  },


  // ========================================
  // CIVIL - ORAL
  // ========================================
  {
    path: 'civil/civil-oral',
    loadComponent: () => import('./pages/civil/civil-oral/civil-oral.page').then(m => m.CivilOralPage)
  },
  {
    path: 'civil/civil-oral/test-oral-civil',
    loadComponent: () => import('./pages/civil/civil-oral/test-oral-civil/test-oral-civil.page').then(m => m.TestOralCivilPage)
  },
  {
    path: 'civil/civil-oral/resumen-test-civil-oral',
    loadComponent: () => import('./pages/civil/civil-oral/resumen-test-civil-oral/resumen-test-civil-oral.page').then(m => m.ResumenTestCivilOralPage)
  },

  // ========================================
  // CIVIL - RECURSOS
  // ========================================
  {
    path: 'civil/material-estudio-civil',
    loadComponent: () => import('./pages/civil/material-estudio-civil/material-estudio-civil.page').then(m => m.MaterialEstudioCivilPage)
  },

// ========================================
  // PROCESAL - PÁGINA PRINCIPAL
  // ========================================
  {
    path: 'procesal',
    loadComponent: () => import('./pages/procesal/procesal.page').then(m => m.ProcesalPage)
  },

  // ========================================
  // PROCESAL - ESCRITO
  // ========================================
  {
    path: 'procesal/procesal-escrito',
    loadComponent: () => import('./pages/procesal/procesal-escrito/procesal-escrito.page').then(m => m.ProcesalEscritoPage)
  },
  {
    path: 'procesal/procesal-escrito/test-escrito-procesal',
    loadComponent: () => import('./pages/procesal/procesal-escrito/test-escrito-procesal/test-escrito-procesal.page').then(m => m.TestEscritoProcesalPage)
  },
  {
    path: 'procesal/procesal-escrito/resumen-test-procesal',
    loadComponent: () => import('./pages/procesal/procesal-escrito/resumen-test-procesal/resumen-test-procesal.page').then(m => m.ResumenTestProcesalPage)
  },

  // ========================================
  // PROCESAL - REFORZAR
  // ========================================

  {
    path: 'procesal/procesal-reforzar',
    loadComponent: () => import('./pages/procesal/procesal-reforzar/procesal-reforzar.page').then(m => m.ProcesalReforzarPage)
  },

  // ========================================
  // PROCESAL - ORAL
  // ========================================
  {
    path: 'procesal/procesal-oral',
    loadComponent: () => import('./pages/procesal/procesal-oral/procesal-oral.page').then(m => m.ProcesalOralPage)
  },
  {
    path: 'procesal/procesal-oral/test-oral-procesal',
    loadComponent: () => import('./pages/procesal/procesal-oral/test-oral-procesal/test-oral-procesal.page').then(m => m.TestOralProcesalPage)
  },
  {
    path: 'procesal/procesal-oral/resumen-test-procesal-oral',
    loadComponent: () => import('./pages/procesal/procesal-oral/resumen-test-procesal-oral/resumen-test-procesal-oral.page').then(m => m.ResumenTestProcesalOralPage)
  },

  // ========================================
  // PROCESAL - RECURSOS
  // ========================================
  {
    path: 'procesal/material-estudio-procesal',
    loadComponent: () => import('./pages/procesal/material-estudio-procesal/material-estudio-procesal.page').then(m => m.MaterialEstudioProcesalPage)
  },
  

  // ========================================
  // FALLBACK
  // ========================================
  { path: '**', redirectTo: '/welcome' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      preloadingStrategy: PreloadAllModules 
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}