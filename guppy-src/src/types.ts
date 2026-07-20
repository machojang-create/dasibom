export type ActionType = '생성' | '먹이주기';

export interface SpawnData {
  guppy_name: string;
  body_color: string;
  tail_color: string;
  pattern_color: string;
  rarity: '일반' | '희귀' | '전설';
}

export interface FeedData {
  expression_frame: '웃음' | '정면' | '놀람' | '슬픔' | '잠' | '신남' | '크게 웃음' | '반짝';
  water_quality_change: number;
  guppy_status: string;
}

export interface GuppyResponse {
  type: ActionType;
  data: SpawnData | FeedData;
  timestamp: string;
}
