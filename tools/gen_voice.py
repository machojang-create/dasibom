# -*- coding: utf-8 -*-
# 봄이 음성 생성 (edge-tts, ko-KR-SunHi + 피치 상향으로 10세 소녀 톤)
import asyncio, os, edge_tts

os.makedirs('voice', exist_ok=True)
VOICE = 'ko-KR-SunHiNeural'
PITCH = '+12Hz'   # 피치 ↑(과하면 어색). edge-tts는 한국어 아동음성 없어 한계 → 클로바 권장
RATE  = '+0%'

# ★ 음성 텍스트 = 화면 자막과 100% 동일해야 함(봄이가 자막을 그대로 읽는 역할)
LINES = {
    'voice/bom_greet.mp3': '안녕하세요! 저는 봄이예요. 만나서 반가워요. 오늘, 옛이야기 하나 들려주실래요?',
    'voice/bom_q1.mp3': '어디에서 태어나셨어요? 그곳은 어떤 곳이었는지 들려주세요.',
    'voice/bom_q2.mp3': '어릴 적 살던 동네와 집은 어떤 모습이었어요? 마당이 있었는지도 궁금해요.',
    'voice/bom_q3.mp3': '어릴 때 어떤 놀이를 하며 노셨어요? 같이 뛰놀던 친구도 떠올려 보세요.',
}

async def main():
    for out, text in LINES.items():
        c = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
        await c.save(out)
        print('saved', out, os.path.getsize(out) // 1024, 'KB')

asyncio.run(main())
