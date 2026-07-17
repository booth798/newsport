import { defineStore } from 'pinia';

/**
 * 联赛筛选选择（市场页 ↔ 联赛筛选页 共享）
 * selectedLeagues：选中的联赛「展示名」数组，直接用作市场接口 league 过滤值，
 *                  与安卓端 MarketFilterActivity 以联赛名传参保持一致。
 * isAllSelected：是否全选（全选等价于不加 league 过滤）。
 */
export const useLeagueFilterStore = defineStore('leagueFilter', {
  state: () => ({
    selectedLeagues: [],
    // 默认全选（不过滤）；与「自选且一项未选」区分开
    isAllSelected: true,
  }),
  actions: {
    setSelection(leagues, isAll) {
      this.selectedLeagues = leagues;
      this.isAllSelected = isAll;
    },
  },
});
