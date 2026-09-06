import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';
import { LoginPage } from './features/auth/login-page';
import { RegisterPage } from './features/auth/register-page';
import { ResetPage } from './features/auth/reset-page';
import { MapPage } from './features/map/map-page';
import { VerifyPage } from './features/account/verify-page';
import { ContactChangePage } from './features/account/contact-change-page';

/**
 * Route map (01 puml). Built up per milestone:
 *  - M2: /login /register /reset (GuestGuard) + home (/map, public)
 *  - M3: /verify + /account (AuthGuard)
 *  - M4: the real Leaflet map replaces the /map placeholder
 *  - M5: /shelters/:id (public), /submit (AuthGuard + VerifiedGuard)
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'map' },
  { path: 'map', component: MapPage },
  { path: 'login', canActivate: [guestGuard], component: LoginPage },
  { path: 'register', canActivate: [guestGuard], component: RegisterPage },
  { path: 'reset', canActivate: [guestGuard], component: ResetPage },
  { path: 'verify', canActivate: [authGuard], component: VerifyPage },
  { path: 'account', canActivate: [authGuard], component: ContactChangePage },
  { path: '**', redirectTo: 'map' },
];
