import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

export function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const auth = useAuthStore();
  const requiresAuth = to.meta.requiresAuth !== false;
  const requiredRoles = (to.meta.roles as string[] | undefined) ?? [];

  if (to.name === 'login' && auth.isAuthenticated) {
    next({ name: 'dashboard' });
    return;
  }

  if (requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  if (requiredRoles.length > 0 && auth.user && !requiredRoles.includes(auth.user.role)) {
    next({ name: 'dashboard' });
    return;
  }

  next();
}
