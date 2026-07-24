// 화분 구입 품목 사전(2026-07-24 Macho: "초등학생 가르치듯 친절한 구입 피드백")
// tip은 봄이 말투. window.DASIBOM_BOM=false면 중립 안내문으로 보임(독립앱 대비).
export type BuyInfo = { icon: string; name: string; tip: string };

const SLOT: Record<string, BuyInfo> = {
  plant_slot4: { icon: '🪴', name: '네 번째 화분 자리', tip: '정원이 넓어졌어요! 새 자리에 씨앗을 심어 친구를 늘려보세요.' },
  plant_slot5: { icon: '🪴', name: '다섯 번째 화분 자리', tip: '자리가 하나 더 생겼어요. 어떤 식물을 심을까요?' },
  plant_slot6: { icon: '🪴', name: '여섯 번째 화분 자리', tip: '정원이 꽉 찼네요! 여섯 친구를 모두 키워보세요.' },
};

export function plantBuyInfo(item: string, seedName?: string, potName?: string): BuyInfo {
  if (SLOT[item]) return SLOT[item];
  if (item === 'seed') return { icon: '🌱', name: (seedName ? seedName + ' 씨앗' : '씨앗'), tip: '빈 화분에 심어 보세요! 물을 주고 쓰다듬으면 무럭무럭 자란답니다 🌱' };
  if (item === 'normal_nut') return { icon: '🌿', name: '영양제', tip: '잎이 쑥 자라요! 밤에 주면 효과가 더 좋답니다.' };
  if (item === 'premium_nut') return { icon: '✨', name: '고급 영양제', tip: '성장이 두 배! 아껴 뒀다가 큰맘 먹고 주는 특별식이에요.' };
  if (item === 'plant_water') return { icon: '💧', name: '물 한 바가지', tip: '화분 친구가 시원해해요! 수분이 촉촉하게 차올랐답니다.' };
  if (item && item.indexOf('pot') === 0) return { icon: '🏺', name: (potName ? potName : '새 화분'), tip: '화분 친구에게 예쁜 새 옷을 입혀줬어요! 참 잘 어울려요 💚' };
  return { icon: '🎁', name: '아이템', tip: '잘 샀어요!' };
}
