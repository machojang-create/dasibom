// 구입 품목 사전(2026-07-24 Macho: "초등학생 가르치듯 친절한 구입 피드백") — 아이콘·이름·다음 안내
import { TANK_SKINS } from './tankSkins';

export type BuyInfo = { icon: string; name: string; tip: string };

// tip은 봄이 말투(다정하고 초등학생 가르치듯) — 독립앱(DASIBOM_BOM=false)에선 그냥 안내문으로 보임
const FOOD: Record<string, BuyInfo> = {
  guppy_food_normal20: { icon: '🍞', name: '일반 밥 20개', tip: '어항을 톡 눌러 보세요! 구피들이 쪼르르 모여와 밥을 먹는답니다 🐠' },
  guppy_food_normal120: { icon: '🍞', name: '일반 밥 120개', tip: '넉넉히 챙겼네요! 어항을 눌러 배불리 먹여 주세요.' },
  guppy_food_premium10: { icon: '🍿', name: '고급 플레이크 10개', tip: '영양 만점 먹이예요. 이걸 주면 구피가 쑥쑥 자라요!' },
  guppy_food_premium50: { icon: '🍿', name: '고급 플레이크 50개', tip: '한가득 샀어요! 자주 먹이면 금방 어른 구피가 된답니다.' },
  guppy_food_shrimp10: { icon: '🦐', name: '천연 새우 10개', tip: '구피가 제일 좋아하는 간식이에요! 성장도 훨씬 빨라져요.' },
  guppy_food_shrimp50: { icon: '🦐', name: '천연 새우 50개', tip: '아낌없이 챙기셨네요. 특별한 날 새우를 주면 구피가 신나요!' },
  guppy_food_krill10: { icon: '👑', name: '황금 크릴 10개', tip: '최고급 먹이랍니다. 아픈 구피에게 주면 기운을 차려요!' },
  guppy_food_krill50: { icon: '👑', name: '황금 크릴 50개', tip: '든든하게 사셨어요! 크릴은 병도 낫게 하는 보약이에요.' },
};
const TECH: Record<string, BuyInfo> = {
  guppy_tech2: { icon: '🔬', name: '먹이 연구소 Lv.2', tip: '먹이 영양이 더 좋아졌어요! 같은 밥도 효과가 커진답니다.' },
  guppy_tech3: { icon: '🔬', name: '먹이 연구소 Lv.3', tip: '연구가 깊어졌네요. 이제 구피가 더 빨리 자라요!' },
  guppy_tech4: { icon: '🔬', name: '먹이 연구소 Lv.4', tip: '고급 연구소가 됐어요! 먹이 효과가 쑥 올라갔답니다.' },
  guppy_tech5: { icon: '🔬', name: '먹이 연구소 Lv.5', tip: '최고 레벨 연구소예요! 이제 먹이가 최강이랍니다.' },
};
const ADOPT: Record<string, BuyInfo> = {
  guppy_special_normal: { icon: '🐟', name: '일반 구피', tip: '새 식구가 왔어요! 이름도 지어주고 예뻐해 주세요 💕' },
  guppy_special_rare: { icon: '💜', name: '희귀 구피', tip: '귀한 희귀 구피예요! 먹이를 잘 찾는 똑똑한 아이랍니다.' },
  guppy_special_legendary: { icon: '🌟', name: '전설 구피', tip: '와! 전설 구피예요! 남들보다 빨리 자라는 특별한 아이랍니다!' },
  guppy_seed_rand_normal: { icon: '📦', name: '일반 랜덤 구피', tip: '상자에서 새 구피가 나왔어요! 어떤 색일지 구경해 보세요.' },
  guppy_seed_rand_rare: { icon: '📦✨', name: '희귀 랜덤 구피', tip: '두근두근! 희귀한 구피가 나왔네요! 운이 좋으세요 🍀' },
  guppy_seed_rand_legendary: { icon: '📦🌟', name: '전설 랜덤 구피', tip: '대박! 전설 구피가 나왔어요! 최고의 행운이랍니다!' },
};

export function buyInfo(item: string): BuyInfo {
  if (FOOD[item]) return FOOD[item];
  if (TECH[item]) return TECH[item];
  if (ADOPT[item]) return ADOPT[item];
  if (item.indexOf('guppy_skin_') === 0) {
    const sk = TANK_SKINS[item.replace('guppy_skin_', '')];
    return { icon: '🖼️', name: (sk ? sk.name : '어항 스킨'), tip: '어항 물빛을 갈아입혔어요! 설정에서 언제든 바꿀 수 있어요.' };
  }
  if (item.indexOf('guppy_decor_') === 0) {
    return { icon: '🪸', name: '어항 장식', tip: '어항이 예뻐졌어요! 구피들이 더 신나게 헤엄쳐요.' };
  }
  return { icon: '🎁', name: '아이템', tip: '잘 샀어요!' };
}
