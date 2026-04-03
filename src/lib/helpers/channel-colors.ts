/**
 * 채널별 고정 색상 매핑
 * 모든 차트에서 동일한 채널은 동일한 색상으로 표시
 */

const CHANNEL_COLOR_MAP: Record<string, string> = {
  스마트스토어: '#3B82F6', // Blue
  '스마트스토어(웰스파)': '#60A5FA', // Light Blue
  쿠팡_윙: '#22C55E', // Green
  쿠팡_로켓그로스: '#F59E0B', // Amber
};

const FALLBACK_COLORS = [
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
];

let fallbackIndex = 0;

export function getChannelColor(channelName: string): string {
  if (CHANNEL_COLOR_MAP[channelName]) {
    return CHANNEL_COLOR_MAP[channelName];
  }
  // 새 채널은 fallback 색상 순환 할당
  const color = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
  CHANNEL_COLOR_MAP[channelName] = color;
  fallbackIndex++;
  return color;
}

export function getChannelColors(channelNames: string[]): string[] {
  return channelNames.map(getChannelColor);
}
