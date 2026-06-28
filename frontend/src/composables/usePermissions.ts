import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types';

export function usePermissions() {
  const auth = useAuthStore();

  const isViewer = computed(() => auth.user?.role === UserRole.VIEWER);
  const canCreateRecords = computed(() => auth.user?.role !== UserRole.VIEWER);
  const canUploadDocuments = computed(() => auth.user?.role !== UserRole.VIEWER);
  const canReassignOwnership = computed(
    () => auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.MANAGER,
  );

  function canEditOwnedRecord(ownerId: string): boolean {
    if (!auth.user || auth.user.role === UserRole.VIEWER) {
      return false;
    }

    if (auth.user.role === UserRole.ADMIN || auth.user.role === UserRole.MANAGER) {
      return true;
    }

    return auth.user.id === ownerId;
  }

  return {
    isViewer,
    canCreateRecords,
    canUploadDocuments,
    canReassignOwnership,
    canEditOwnedRecord,
  };
}
