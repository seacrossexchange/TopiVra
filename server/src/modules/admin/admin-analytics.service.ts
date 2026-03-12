import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import dayjs from 'dayjs';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly redis: RedisService) {}

  // 实时在线人数：扫描 analytics:online:ip:* 存活 key
  async getRealtimeOnline(): Promise<{ onlineCount: number; timestamp: string }> {
    if (!this.redis.isAvailable()) {
      return { onlineCount: 0, timestamp: new Date().toISOString() };
    }
    const keys = await this.redis.keys('analytics:online:ip:*');
    return {
      onlineCount: keys.length,
      timestamp: new Date().toISOString(),
    };
  }

  // 过去 N 小时每小时访问量
  async getHourlyVisits(hours = 24): Promise<{ hour: string; visits: number }[]> {
    if (!this.redis.isAvailable()) return this.mockHourly(hours);

    const result: { hour: string; visits: number }[] = [];
    const now = dayjs();
    for (let i = hours - 1; i >= 0; i--) {
      const t = now.subtract(i, 'hour');
      const key = `analytics:hourly:${t.format('YYYYMMDDH')}`;
      const val = await this.redis.get(key);
      result.push({
        hour: t.format('MM-DD HH:00'),
        visits: val ? parseInt(val, 10) : 0,
      });
    }
    return result;
  }

  // 过去 N 天每天访问量
  async getDailyVisits(days = 30): Promise<{ date: string; visits: number }[]> {
    if (!this.redis.isAvailable()) return this.mockDaily(days);

    const result: { date: string; visits: number }[] = [];
    const now = dayjs();
    for (let i = days - 1; i >= 0; i--) {
      const t = now.subtract(i, 'day');
      const key = `analytics:daily:${t.format('YYYYMMDD')}`;
      const val = await this.redis.get(key);
      result.push({
        date: t.format('MM-DD'),
        visits: val ? parseInt(val, 10) : 0,
      });
    }
    return result;
  }

  // 今日国家分布
  async getGeoDistribution(): Promise<{ country: string; visits: number; countryName: string }[]> {
    if (!this.redis.isAvailable()) return this.mockGeo();

    const today = dayjs().format('YYYYMMDD');
    const data = await this.redis.hgetall(`analytics:geo:${today}`);
    const countryNames = this.getCountryNames();

    return Object.entries(data)
      .map(([country, visits]) => ({
        country,
        visits: parseInt(visits, 10),
        countryName: countryNames[country] || country,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 50);
  }

  // 综合统计摘要
  async getSummary(): Promise<any> {
    const [realtime, hourly, daily, geo] = await Promise.all([
      this.getRealtimeOnline(),
      this.getHourlyVisits(24),
      this.getDailyVisits(30),
      this.getGeoDistribution(),
    ]);

    const todayVisits = hourly.reduce((s, h) => s + h.visits, 0);
    const yesterdayVisits = daily.length >= 2 ? daily[daily.length - 2].visits : 0;
    const todayVsYesterday = yesterdayVisits
      ? Math.round(((todayVisits - yesterdayVisits) / yesterdayVisits) * 100)
      : 0;

    return {
      realtime,
      todayVisits,
      todayVsYesterday,
      hourly,
      daily,
      geo,
    };
  }

  // ---------- Mock 数据（Redis 不可用时回退）----------
  private mockHourly(hours: number) {
    const now = dayjs();
    return Array.from({ length: hours }, (_, i) => ({
      hour: now.subtract(hours - 1 - i, 'hour').format('MM-DD HH:00'),
      visits: Math.floor(Math.random() * 200 + 20),
    }));
  }

  private mockDaily(days: number) {
    const now = dayjs();
    return Array.from({ length: days }, (_, i) => ({
      date: now.subtract(days - 1 - i, 'day').format('MM-DD'),
      visits: Math.floor(Math.random() * 2000 + 200),
    }));
  }

  private mockGeo() {
    return [
      { country: 'CN', visits: 1840, countryName: '中国' },
      { country: 'US', visits: 620, countryName: '美国' },
      { country: 'SG', visits: 310, countryName: '新加坡' },
      { country: 'JP', visits: 205, countryName: '日本' },
      { country: 'TH', visits: 180, countryName: '泰国' },
      { country: 'MY', visits: 160, countryName: '马来西亚' },
      { country: 'ID', visits: 140, countryName: '印度尼西亚' },
      { country: 'GB', visits: 120, countryName: '英国' },
      { country: 'DE', visits: 95, countryName: '德国' },
      { country: 'AU', visits: 88, countryName: '澳大利亚' },
    ];
  }

  private getCountryNames(): Record<string, string> {
    return {
      CN: '中国', US: '美国', SG: '新加坡', JP: '日本', TH: '泰国',
      MY: '马来西亚', ID: '印度尼西亚', GB: '英国', DE: '德国', AU: '澳大利亚',
      FR: '法国', KR: '韩国', BR: '巴西', IN: '印度', CA: '加拿大',
      RU: '俄罗斯', MX: '墨西哥', IT: '意大利', ES: '西班牙', NL: '荷兰',
      PH: '菲律宾', VN: '越南', TW: '台湾', HK: '香港', PK: '巴基斯坦',
      TR: '土耳其', SA: '沙特阿拉伯', AE: '阿联酋', EG: '埃及', NG: '尼日利亚',
      ZA: '南非', AR: '阿根廷', CO: '哥伦比亚', PL: '波兰', SE: '瑞典',
      NO: '挪威', DK: '丹麦', FI: '芬兰', CH: '瑞士', AT: '奥地利',
      PT: '葡萄牙', GR: '希腊', BE: '比利时', CZ: '捷克', RO: '罗马尼亚',
      UA: '乌克兰', NZ: '新西兰', IL: '以色列', BD: '孟加拉国', MM: '缅甸',
    };
  }
}

