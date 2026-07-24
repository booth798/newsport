import { defineStore } from 'pinia';

/**
 * 联赛筛选选择（市场页 ↔ 联赛筛选页 共享）
 * selectedLeagues：选中的联赛「展示名」数组，直接用作市场接口 league 过滤值，
 *                  与安卓端 MarketFilterActivity 以联赛名传参保持一致。
 * isAllSelected：是否全选（全选等价于不加 league 过滤）。
 * teamSearchQuery：球队搜索关键词（H5 顶栏 / PC 工具栏共用，当前页内联搜索）。
 * teamSearchNonce：提交搜索时递增，市场页监听后重新拉列表。
 */
export const useLeagueFilterStore = defineStore('leagueFilter', {
  state: () => ({
    selectedLeagues: [],
    // 默认全选（不过滤）；与「自选且一项未选」区分开
    isAllSelected: true,
    teamSearchQuery: '',
    teamSearchNonce: 0,
  }),
  actions: {
    setSelection(leagues, isAll) {
      this.selectedLeagues = leagues;
      this.isAllSelected = isAll;
    },
    setTeamSearchQuery(q) {
      this.teamSearchQuery = q ?? '';
    },
    /** 回车 / 点搜索：触发市场页按当前关键词重新请求 */
    submitTeamSearch() {
      this.teamSearchNonce += 1;
    },
    /** 清空关键词并刷新列表（等同取消搜索） */
    clearTeamSearch() {
      this.teamSearchQuery = '';
      this.teamSearchNonce += 1;
    },
  },
});
