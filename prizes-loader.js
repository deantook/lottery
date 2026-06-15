window.PrizeApp = {
  config: {},
  prizes: [],

  async load() {
    const res = await fetch('prizes.json');
    if (!res.ok) throw new Error(`加载 prizes.json 失败 (${res.status})`);
    this.config = await res.json();
    this.prizes = (this.config.prizes || []).map((prize) => ({
      ...prize,
      color: prize.color || '#3498db',
      win: prize.win !== false && !prize.retry,
      retry: !!prize.retry,
    }));
    if (this.prizes.length === 0) throw new Error('prizes.json 中未配置奖品');
    return this.config;
  },

  pickIndex() {
    const total = this.prizes.reduce((sum, prize) => sum + prize.weight, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < this.prizes.length; i++) {
      rand -= this.prizes[i].weight;
      if (rand <= 0) return i;
    }
    return this.prizes.length - 1;
  },

  isWin(prize) {
    return prize.win !== false;
  },

  isRetry(prize) {
    return !!prize.retry;
  },
};
