import { useAppStore } from '@/store/modules/app';

export function openCustomerService() {
  useAppStore().openCustomerServiceConfirm();
}
