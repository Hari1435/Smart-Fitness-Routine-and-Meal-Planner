import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      // User not authenticated, redirect to login
      this.authService.setRedirectUrl(state.url);
      this.router.navigate(['/login']);
      return false;
    }

    const requiredRoles = route.data['roles'] as string[];
    
    if (!requiredRoles || requiredRoles.length === 0) {
      // No specific roles required, allow access if authenticated
      return true;
    }

    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // User doesn't have required role, redirect to unauthorized page
    this.router.navigate(['/unauthorized']);
    return false;
  }
}