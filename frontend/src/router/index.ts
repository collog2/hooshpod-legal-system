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
          path: 'cases',
          name: 'cases',
          component: () => import('@/views/cases/CaseListView.vue'),
        },
        {
          path: 'cases/new',
          name: 'cases-new',
          component: () => import('@/views/cases/CaseFormView.vue'),
        },
        {
          path: 'cases/:id/edit',
          name: 'cases-edit',
          component: () => import('@/views/cases/CaseFormView.vue'),
        },
        {
          path: 'cases/:id',
          name: 'case-detail',
          component: () => import('@/views/cases/CaseDetailView.vue'),
        },
        {
          path: 'documents',
          name: 'documents',
          component: () => import('@/views/documents/DocumentListView.vue'),
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
