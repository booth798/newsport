import { defineStore } from 'pinia';

export const useLeagueFilterStore = defineStore('leagueFilter', {
  state: () => ({
    selectedIds: [],
    isAllSelected: false,
  }),
  actions: {
    setSelection(ids, isAll) {
      this.selectedIds = ids;
      this.isAllSelected = isAll;
    },
  },
});
