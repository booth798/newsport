const imageModules = import.meta.glob('../assets/images/**/*', {
  eager: true,
  import: 'default',
});

// vite 动态获取 assets/images 下的图片，外链地址直接透传。
export function getImageUrl(name) {
  if (!name) return '';
  if (name.startsWith('http')) {
    return name;
  }
  const imageName = name.replace(/^\/+/, '').replace(/^assets\/images\//, '');
  return imageModules[`../assets/images/${imageName}`] || '';
}
