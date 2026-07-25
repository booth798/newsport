import 'normalize.css';

import { createApp } from 'vue';

import App from '@/App.vue';
import i18n from '@/i18n';
import router from '@/router';
import { clearChunkReloadFlag } from '@/router/lazyView';
import pinia from '@/store';
import '@/styles/global.scss';

const app = createApp(App);

app.use(pinia);
app.use(i18n);
app.use(router);

app.mount('#app');
// 启动成功后清掉 chunk 自动刷新标记，避免正常使用被误刷
clearChunkReloadFlag();
