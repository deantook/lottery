window.PrizeApp = {
  config: {},
  prizes: [],
  storageKey: 'zyclub_redeem_records',
  deviceIdKey: 'zyclub_device_id',
  legacyStorageKey: 'zyclub_used_redeem_codes',
  chancesStorageKey: 'zyclub_chances',

  applyConfig(config) {
    this.config = config;
    this.prizes = (this.config.prizes || []).map((prize) => ({
      ...prize,
      color: prize.color || '#3498db',
      win: prize.win !== false && !prize.retry,
      retry: !!prize.retry,
    }));
    if (this.prizes.length === 0) throw new Error('奖品配置为空');
  },

  loadConfigScript(src = 'prizes.config.js') {
    return new Promise((resolve, reject) => {
      if (window.PRIZES_CONFIG) {
        this.applyConfig(window.PRIZES_CONFIG);
        resolve(this.config);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        if (window.PRIZES_CONFIG) {
          this.applyConfig(window.PRIZES_CONFIG);
          resolve(this.config);
        } else {
          reject(new Error('奖品配置文件为空'));
        }
      };
      script.onerror = () => reject(new Error('奖品配置文件加载失败'));
      document.head.appendChild(script);
    });
  },

  async loadFromFetch(src = 'prizes.json') {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`加载 ${src} 失败 (${res.status})`);
    this.applyConfig(await res.json());
    return this.config;
  },

  async load() {
    if (window.PRIZES_CONFIG) {
      this.applyConfig(window.PRIZES_CONFIG);
    } else {
      try {
        await this.loadConfigScript();
      } catch {
        await this.loadFromFetch();
      }
    }

    this.migrateLegacyUsedCodes();
    this.getDeviceId();
    return this.config;
  },

  getDeviceId() {
    let id = localStorage.getItem(this.deviceIdKey);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(this.deviceIdKey, id);
    }
    return id;
  },

  getRedeemRecords() {
    try {
      const records = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  },

  getUsedCodesOnDevice() {
    const deviceId = this.getDeviceId();
    return this.getRedeemRecords()
      .filter((record) => record.deviceId === deviceId)
      .map((record) => String(record.code));
  },

  isCodeUsedOnDevice(code) {
    return this.getUsedCodesOnDevice().includes(String(code).trim());
  },

  markCodeUsed(code) {
    const normalized = String(code).trim();
    if (this.isCodeUsedOnDevice(normalized)) return;
    const records = this.getRedeemRecords();
    records.push({
      deviceId: this.getDeviceId(),
      code: normalized,
      time: Date.now(),
    });
    localStorage.setItem(this.storageKey, JSON.stringify(records));
  },

  migrateLegacyUsedCodes() {
    const legacy = localStorage.getItem(this.legacyStorageKey);
    if (!legacy) return;
    try {
      const codes = JSON.parse(legacy);
      if (Array.isArray(codes)) {
        codes.forEach((code) => this.markCodeUsed(String(code)));
      }
    } catch {
      // ignore invalid legacy data
    }
    localStorage.removeItem(this.legacyStorageKey);
  },

  getRedeemCodes() {
    const codes = [...(this.config.redeemCodes || [])];
    if (this.config.redeemCode) codes.push(this.config.redeemCode);
    return codes.map(String);
  },

  getChances() {
    const stored = localStorage.getItem(this.chancesStorageKey);
    if (stored !== null) {
      const value = parseInt(stored, 10);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    }
    return this.config.initialChances ?? 0;
  },

  setChances(value) {
    const next = Math.max(0, Math.floor(Number(value)) || 0);
    localStorage.setItem(this.chancesStorageKey, String(next));
    return next;
  },

  changeChances(delta) {
    return this.setChances(this.getChances() + delta);
  },

  redeem(code) {
    const normalized = String(code).trim();
    if (!normalized) return { ok: false, reason: 'empty' };
    if (!this.getRedeemCodes().includes(normalized)) {
      return { ok: false, reason: 'invalid' };
    }
    if (this.isCodeUsedOnDevice(normalized)) {
      return { ok: false, reason: 'used_on_device' };
    }
    this.markCodeUsed(normalized);
    const bonus = this.config.redeemBonus ?? 1;
    const chances = this.changeChances(bonus);
    return { ok: true, bonus, chances };
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
