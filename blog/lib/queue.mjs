import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const paths = {
  root: ROOT,
  config: path.join(ROOT, 'config.json'),
  queue: path.join(ROOT, 'topic_queue.json'),
  out: path.join(ROOT, 'out'),
};

export function loadConfig() {
  return JSON.parse(fs.readFileSync(paths.config, 'utf8'));
}

export function loadQueue() {
  return JSON.parse(fs.readFileSync(paths.queue, 'utf8'));
}

export function saveQueue(queue) {
  fs.writeFileSync(paths.queue, JSON.stringify(queue, null, 2) + '\n', 'utf8');
}

export function getCategory(config, key) {
  const cat = config.categories.find((c) => c.key === key);
  if (!cat) throw new Error(`알 수 없는 카테고리: ${key}`);
  return cat;
}

/**
 * 다음에 쓸 주제를 고른다.
 *
 * 규칙:
 *  - status 가 pending 인 것만 후보.
 *  - manual: true 인 주제는 자동 파이프라인에서 제외 (인터뷰 글은 직접 씀).
 *  - 이미 발행된 글의 카테고리 분포를 config 비중과 비교해서, 가장 뒤처진 카테고리를 먼저 집는다.
 *  - 같은 카테고리 안에서는 큐에 적힌 순서대로.
 */
export function pickNext(config, queue, { category = null } = {}) {
  const candidates = queue.topics.filter(
    (t) => t.status === 'pending' && !t.manual && (!category || t.category === category)
  );
  if (candidates.length === 0) return null;
  if (category) return candidates[0];

  const published = queue.topics.filter((t) => t.status === 'published');
  const total = published.length;

  // 카테고리별 부족분(목표 비중 - 실제 비중)이 가장 큰 쪽을 우선.
  let best = null;
  let bestDeficit = -Infinity;

  for (const cat of config.categories) {
    if (cat.manual_only) continue;
    const has = candidates.some((t) => t.category === cat.key);
    if (!has) continue;

    const actual = total === 0 ? 0 : published.filter((t) => t.category === cat.key).length / total;
    const target = cat.weight / 100;
    const deficit = target - actual;

    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      best = cat.key;
    }
  }

  return candidates.find((t) => t.category === best) ?? candidates[0];
}

export function markTopic(queue, id, patch) {
  const topic = queue.topics.find((t) => t.id === id);
  if (!topic) throw new Error(`주제를 찾을 수 없습니다: ${id}`);
  Object.assign(topic, patch);
  return topic;
}

export function slugify(id, title) {
  const clean = title
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return `${id}_${clean}`;
}

export function ensureOutDir(sub) {
  const dir = sub ? path.join(paths.out, sub) : paths.out;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function queueStats(config, queue) {
  const rows = config.categories.map((cat) => {
    const all = queue.topics.filter((t) => t.category === cat.key);
    return {
      category: cat.name,
      key: cat.key,
      target: `${cat.weight}%`,
      pending: all.filter((t) => t.status === 'pending').length,
      drafted: all.filter((t) => t.status === 'drafted').length,
      published: all.filter((t) => t.status === 'published').length,
    };
  });
  return rows;
}
