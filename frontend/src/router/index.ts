import { createRouter, createWebHistory } from 'vue-router';
import { authGuard } from './guards';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: { name: 'dashboard' },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/users/UserListView.vue'),
          meta: { roles: ['ADMIN', 'MANAGER'] },
        },
        {
          path: 'users/new',
          name: 'users-new',
          component: () => import('@/views/users/UserFormView.vue'),
          meta: { roles: ['ADMIN'] },
        },
        {
          path: 'users/:id/edit',
          name: 'users-edit',
          component: () => import('@/views/users/UserFormView.vue'),
          meta: { roles: ['ADMIN'] },
        },
      ],
    },
  ],
});

router.beforeEach(authGuard);

export default router;
