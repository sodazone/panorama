const state = (() => {
  let _totalVolume = 0;
  let _cachedData = null;
  let _currentSort = "volume";
  let _currentTimeframe = "90D";

  return {
    get totalVolume() {
      return _totalVolume;
    },
    set totalVolume(value) {
      _totalVolume = value;
    },

    get cachedData() {
      return _cachedData;
    },
    set cachedData(value) {
      _cachedData = value;
    },

    get currentSort() {
      return _currentSort;
    },
    set currentSort(value) {
      _currentSort = value;
    },

    get currentTimeframe() {
      return _currentTimeframe;
    },
    set currentTimeframe(value) {
      _currentTimeframe = value;
    },

    get sortedNodes() {
      if (!_cachedData || !_cachedData.nodes) return [];
      const nodes = [..._cachedData.nodes];
      if (_currentSort === "volume") {
        nodes.sort((a, b) => b.volume - a.volume);
      } else if (_currentSort === "degree") {
        nodes.sort((a, b) => b.degree - a.degree);
      }
      return nodes;
    },
  };
})();

export { state };
