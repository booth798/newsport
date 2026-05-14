let openImpl = () => {};

export function registerCustomerServiceOpener(fn) {
  openImpl = typeof fn === 'function' ? fn : () => {};
}

export function openCustomerService() {
  openImpl();
}
