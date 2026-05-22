import { inject } from 'vue';

export function useToast() {
  const toast = inject('toast', {
    success: () => {},
    error: () => {},
    info: () => {},
  });
  return toast;
}
