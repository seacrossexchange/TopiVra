import i18n from '@/i18n';

// 世界地图气泡可视化组件
// 使用简化坐标映射，无需外部地图库
interface GeoItem {
  country: string;
  countryName: string;
  visits: number;
}

interface Props {
  geoData: GeoItem[];
}

// 主要国家的近似 SVG 坐标（基于 960x500 投影）
const COUNTRY_COORDS: Record<string, [number, number]> = {
  CN: [760, 230], US: [200, 210], RU: [620, 150], BR: [295, 360],
  AU: [800, 400], IN: [695, 275], DE: [500, 175], FR: [480, 188],
  GB: [462, 165], JP: [825, 220], KR: [810, 225], CA: [190, 165],
  MX: [190, 270], AR: [265, 400], ZA: [535, 400], EG: [550, 265],
  NG: [490, 320], TR: [570, 230], SA: [600, 280], AE: [635, 285],
  PK: [670, 255], ID: [785, 330], TH: [745, 290], VN: [765, 290],
  PH: [800, 295], MY: [770, 315], SG: [775, 320], TW: [800, 245],
  HK: [790, 250], IT: [510, 195], ES: [462, 205], PL: [525, 168],
  NL: [490, 163], BE: [487, 170], SE: [515, 148], NO: [505, 142],
  DK: [505, 155], FI: [530, 143], CH: [500, 183], AT: [515, 181],
  PT: [453, 208], GR: [535, 205], RO: [540, 183], UA: [555, 175],
  NZ: [870, 440], IL: [570, 248], BD: [725, 272], MM: [745, 278],
  CO: [245, 325], CL: [250, 395], PE: [240, 360], VE: [260, 305],
  IQ: [590, 255], IR: [625, 250], AF: [660, 245],
};

export default function WorldMap({ geoData }: Props) {
  if (!geoData || geoData.length === 0) return null;

  const maxVisits = Math.max(...geoData.map((d) => d.visits), 1);

  // 气泡半径：4 ~ 28px
  const getRadius = (visits: number) => {
    return 4 + (visits / maxVisits) * 24;
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        viewBox="0 0 960 500"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label={i18n.t('admin.worldVisitorMap', '世界访客地图')}
      >
        {/* 背景 */}
        <rect width="960" height="500" fill="var(--color-bg-secondary)" rx="8" />

        {/* 简化大陆轮廓 */}
        <g fill="var(--color-border)" opacity="0.5">
          {/* 北美 */}
          <ellipse cx="200" cy="210" rx="110" ry="80" />
          {/* 南美 */}
          <ellipse cx="270" cy="370" rx="65" ry="90" />
          {/* 欧洲 */}
          <ellipse cx="500" cy="180" rx="70" ry="50" />
          {/* 非洲 */}
          <ellipse cx="510" cy="340" rx="65" ry="90" />
          {/* 亚洲 */}
          <ellipse cx="700" cy="220" rx="160" ry="90" />
          {/* 东南亚 */}
          <ellipse cx="780" cy="310" rx="60" ry="40" />
          {/* 澳洲 */}
          <ellipse cx="810" cy="410" rx="70" ry="50" />
          {/* 俄罗斯 */}
          <ellipse cx="620" cy="155" rx="180" ry="35" />
        </g>

        {/* 气泡 */}
        {geoData.map((item) => {
          const coords = COUNTRY_COORDS[item.country];
          if (!coords) return null;
          const [cx, cy] = coords;
          const r = getRadius(item.visits);
          const intensity = item.visits / maxVisits;
          const opacity = 0.35 + intensity * 0.55;

          return (
            <g key={item.country}>
              <circle
                cx={cx} cy={cy} r={r + 4}
                fill="#a78bfa"
                opacity={0.15}
              />
              <circle
                cx={cx} cy={cy} r={r}
                fill="#a78bfa"
                opacity={opacity}
              >
                <title>{i18n.t('admin.countryVisitsTitle', '{{country}}: {{visits}} 次访问', { country: item.countryName, visits: item.visits.toLocaleString() })}</title>
              </circle>
              {r > 10 && (
                <text
                  x={cx} y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(r * 0.7, 11)}
                  fill="white"
                  fontWeight="600"
                  style={{ pointerEvents: 'none' }}
                >
                  {item.country}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 图例 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
        <span>{i18n.t('admin.bubbleSizeEqualsVisits', '气泡大小 = 访问量')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', opacity: 0.4 }} />
          <span>{i18n.t('common.less', '少')}</span>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#a78bfa', opacity: 0.9 }} />
          <span>{i18n.t('common.more', '多')}</span>
        </div>
      </div>
    </div>
  );
}


