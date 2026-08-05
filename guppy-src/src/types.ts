export type ActionType = '생성' | '먹이주기';

/* 품종(2026-08-05 Macho): 색깔놀이가 아니라 몸·꼬리 실루엣이 다른 진짜 품종 5종.
   mosaic=기본 / ribbon·grass=상점200·변이 / cobra=1000 / tuxedo=2000. 번식 유전·5% 변이. */
export type TailType = 'mosaic' | 'ribbon' | 'grass' | 'cobra' | 'tuxedo';
export const TAIL_TYPES: TailType[] = ['mosaic', 'ribbon', 'grass', 'tuxedo'];   // cobra는 폐기(타입만 호환 유지)
export const TAIL_TYPE_KO: Record<TailType, string> = {
  mosaic: '모자이크', ribbon: '리본테일', grass: '그래스', cobra: '코브라', tuxedo: '턱시도'
};

export interface SpawnData {
  guppy_name: string;
  body_color: string;
  tail_color: string;
  pattern_color: string;
  rarity: '일반' | '희귀' | '전설';
  tail_type?: TailType;   // 없으면 mosaic(기존 저장분 호환)
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
