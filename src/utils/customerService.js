import router from '@/router/index';

let openImpl = null;

export function registerCustomerServiceOpener(fn) {
  openImpl = typeof fn === 'function' ? fn : null;
}

export function openCustomerService() {
  if (openImpl) {
    openImpl();
  } else {
    router.push('/service');
  }
}
