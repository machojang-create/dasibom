/* 그때그시절 퀴즈 시드 — AI 생성 전, 손으로 쓴 진짜 퀴즈 8개를 데이터에 주입.
   실행: node tools/seed_quiz.mjs  (한 번만; 이미 quizV 있으면 건너뜀) */
import fs from 'node:fs';
import path from 'node:path';
const DATA = path.resolve(import.meta.dirname, '..', 'nostalgia_data.json');

const SEED = {
  1: { q:'옛날 봄철, 묵은 곡식이 떨어졌을 때 끼니를 잇게 해준 것은?', choices:['컵라면','산과 들의 나물과 쑥','냉동 만두','통조림'], answer:1,
       explain:'보릿고개에는 들에서 캔 나물과 쑥으로 죽을 끓여 봄을 견뎠습니다. 흰 쌀밥 한 그릇이 큰 선물이던 시절이었지요.' },
  2: { q:'예전 학창시절, 점심을 담아 다니던 것은 무엇일까요?', choices:['양은 도시락','밀키트 배송','편의점 삼각김밥','급식 카드'], answer:0,
       explain:'어머니가 새벽에 싸 주신 양은 도시락은 난로 위에 데워 먹기도 했지요. 그 온기가 곧 사랑이었습니다.' },
  3: { q:'쌀 소비를 줄이려 정부가 장려하던 식사 방식은?', choices:['채식 위주','외식 장려','혼분식(보리·밀 섞기)','간헐적 단식'], answer:2,
       explain:'도시락에 보리를 섞었는지 검사하던 시절이었습니다. 지금은 잡곡밥이 오히려 건강식으로 사랑받지요.' },
  4: { q:'연탄불 위에서 설탕과 소다로 부풀려 만든 추억의 간식은?', choices:['달고나(뽑기)','탕후루','마카롱','젤리'], answer:0,
       explain:'국자에 설탕을 녹여 소다를 넣으면 노랗게 부풀던 달고나. 모양을 잘 떼면 하나 더 주던 재미가 있었지요.' },
  5: { q:'한여름 동네를 돌며 종을 울리던 아저씨가 팔던 것은?', choices:['붕어빵','호떡','솜사탕','아이스케키'], answer:3,
       explain:'"아이스케키~" 종소리가 들리면 아이들이 우르르 모여들었지요. 얼음과자 하나가 큰 행복이었습니다.' },
  6: { q:'학교 앞 문방구에서 팔던 군것질을 흔히 뭐라 불렀나요?', choices:['건강식','불량식품','유기농 간식','수제 디저트'], answer:1,
       explain:'쫀드기·아폴로 같은 군것질이 가득했지요. 몸에 좋진 않았어도 추억만은 달콤합니다.' },
  7: { q:'대가족이 살던 옛 한옥 마당에서 된장·간장 항아리를 두던 곳은?', choices:['장독대','냉장고','베란다','다용도실'], answer:0,
       explain:'햇볕 드는 장독대에 항아리가 줄지어 있었지요. 어머니의 손맛이 익어가던 자리입니다.' },
  8: { q:'고향 떠나 상경한 청춘들이 머물던, 주인집에 딸린 작은 방은?', choices:['호텔','오피스텔','문간방 하숙','1인 기숙사'], answer:2,
       explain:'좁아도 꿈만은 컸던 하숙방. 주인집 아주머니 밥상에 정이 오갔지요.' }
};

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
let n = 0;
data.items.forEach(it => {
  if (SEED[it.id] && it.quizV !== 1) { it.quiz = SEED[it.id]; it.quizV = 1; n++; }
});
if (!fs.existsSync(DATA + '.bak')) fs.copyFileSync(DATA, DATA + '.bak');
fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');
console.log('시드 주입:', n, '개 · 총 quiz 보유:', data.items.filter(i => i.quiz).length);
