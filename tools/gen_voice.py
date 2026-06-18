# -*- coding: utf-8 -*-
# 봄이 음성 생성 (edge-tts, ko-KR-SunHi + 피치 상향으로 10세 소녀 톤)
import asyncio, os, edge_tts

os.makedirs('voice', exist_ok=True)
VOICE = 'ko-KR-SunHiNeural'
PITCH = '+35Hz'   # 피치 ↑ = 어린 소녀 느낌 (조절 가능)
RATE  = '+4%'

LINES = {
    'voice/bom_greet.mp3': '안녕하세요! 저는 봄이예요. 만나서 정말 반가워요! 오늘, 옛이야기 하나 저한테 들려주실래요?',
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
