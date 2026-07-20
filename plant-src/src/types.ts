export type WeatherType = 'sunny' | 'rainy' | 'cloudy' | 'snowy' | 'hot' | 'clear' | 'typhoon';

export type DialectType = 'gyeongsang' | 'jeolla' | 'chungcheong' | 'gangwon' | 'jeju' | 'pyongan';
export type StageType = 'seed' | 'sprout' | 'mature' | 'old';

export interface PlantData {
  id: string;
  name: string;
  dialect: DialectType;
  type: string;
  description: string;
  emoji?: string;
  accent?: string;
  environment?: string;
}

export interface EncyclopediaEntry {
  plantId: string;
  discovered: boolean;
  graduated?: boolean;
}

export interface Pot {
  id: string;
  name: string;
  price: number;
}

export interface StoryEvent {
  title: string;
  content: string;
  levelRequired: number;
}

export interface UserPlant {
  id: string;
  type: PlantData;
  stage: StageType;
  level: number;
  waterLevel: number; // 0-100
  lastWatered: number;
  potId: string;
  phrase?: string;
  customName?: string;
}
