import React from 'react';
import { Book, Trophy, Star } from 'lucide-react';
import { SpawnData } from '../types';
import { GuppySVG } from './GuppySVG';

export const EncyclopediaTab = React.memo(function EncyclopediaTab() {
  const encyclopediaData = [
    {
      id: 'goldfish',
      name: '주황 금붕어',
      description: '어항 키우기의 기본! 온순하고 주황빛이 아름다운 금붕어입니다.',
      maxLevel: 6,
      trait: '호기심 많은 모험가',
      speed: '1.2 m/s',
      unlockLevel: '수족관 Lv.1',
      cost: 200,
      data: { body_color: '#F59E0B', tail_color: '#D97706', pattern_color: '#FCD34D', rarity: '일반', guppy_name: '주황 금붕어' } as SpawnData
    },
    {
      id: 'clownfish',
      name: '니모 클라운피쉬',
      description: '주황색과 흰색 줄무늬가 특징인 호기심 많고 활기찬 물고기입니다.',
      maxLevel: 6,
      trait: '호기심 많은 모험가',
      speed: '1.5 m/s',
      unlockLevel: '수족관 Lv.1',
      cost: 500,
      data: { body_color: '#F97316', tail_color: '#EA580C', pattern_color: '#FFFFFF', rarity: '일반', guppy_name: '니모 클라운피쉬' } as SpawnData
    },
    {
      id: 'bluetang',
      name: '블루 탱',
      description: '푸른 바다의 색을 품은 선명한 파란색 몸과 노란 꼬리를 가진 친구입니다.',
      maxLevel: 6,
      trait: '호기심 많은 모험가',
      speed: '1.8 m/s',
      unlockLevel: '수족관 Lv.2',
      cost: 1000,
      data: { body_color: '#3B82F6', tail_color: '#EAB308', pattern_color: '#1D4ED8', rarity: '희귀', guppy_name: '블루 탱' } as SpawnData
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 h-full min-h-0 overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-[#2a3679] rounded-[32px] p-8 shadow-sm flex flex-col gap-8 shrink-0 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl border border-white/20 bg-white/5 flex items-center justify-center text-white/70">
            <Book className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              바다 수족관 도감 
              <span className="text-xs font-bold bg-white/10 text-white px-3 py-1 rounded-full border border-white/20">Encyclopedia</span>
            </h2>
            <p className="text-sm text-indigo-200 mt-1">지금까지 함께 성장하고 키워본 물고기 종류와 최고 레벨을 기록하는 수족관 도감입니다.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="bg-[#212b63]/50 border border-indigo-400/20 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-bold text-indigo-300">도감 발견율</span>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-black text-[#60a5fa] leading-none">9</span>
              <span className="text-sm font-bold text-indigo-300 mb-1">/ 12 종류</span>
              <span className="text-xs font-bold bg-[#1e3a8a] text-blue-300 px-2 py-0.5 rounded ml-2 mb-1">75%</span>
            </div>
            <div className="h-1.5 w-full bg-[#1e293b] rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 w-[75%] rounded-full"></div>
            </div>
          </div>
          <div className="bg-[#212b63]/50 border border-indigo-400/20 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <span className="text-xs font-bold text-indigo-300">만렙 도달 어종</span>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-black text-[#facc15] leading-none">0</span>
              <span className="text-sm font-bold text-indigo-300 mb-1">종류 마스터</span>
            </div>
            <p className="text-[10px] text-indigo-400 mt-3">Lv.10 최고 등급에 오른 자랑스러운 종수</p>
            <div className="absolute right-4 bottom-4 w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-500/70" />
            </div>
          </div>
          <div className="bg-[#212b63]/50 border border-indigo-400/20 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <span className="text-xs font-bold text-indigo-300">역대 최강의 물고기</span>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 pointer-events-none">
                 <GuppySVG bodyColor="#F59E0B" tailColor="#D97706" patternColor="#FCD34D" expression="main" pose="side" hideFloaters />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black text-white leading-tight">주황 금붕어</span>
                <span className="text-sm font-bold text-[#facc15]">최고 Lv.6</span>
              </div>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
        {encyclopediaData.map(item => (
          <div key={item.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col gap-4">
            <div className="flex justify-between items-start mb-2">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center pointer-events-none border border-slate-100">
                <GuppySVG {...item.data} expression="main" pose="side" hideFloaters />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> 최고 Lv.{item.maxLevel}
                </span>
                <span className="text-xs font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">어항 거주 중</span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{item.name}</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium min-h-[40px]">{item.description}</p>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mt-2 text-xs font-bold">
              <span className="text-cyan-500">도감 성장 등급</span>
              <span className="text-blue-500">{item.trait} ⛵</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">헤엄 속도</span>
                <span className="text-sm font-black text-slate-700">{item.speed}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">해금 등급</span>
                <span className="text-sm font-black text-slate-700">{item.unlockLevel}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 text-sm font-bold text-slate-500">
              <span>상점 분양 비용</span>
              <span className="text-slate-800 flex items-center gap-1"><span className="text-lg">🐚</span> {item.cost.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.guppies.length !== next.guppies.length) return false;
  return true;
});
