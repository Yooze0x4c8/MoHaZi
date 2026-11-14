import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const LABELS = [
  ['ap', '주문력', /주문력/],
  ['ad', '공격력', /공격력/],
  ['attack_speed', '공격 속도', /공격 속도/],
  ['crit', '치명타', /치명타/],
  ['on_hit', '적중 시 효과', /Item_Keyword_OnHit|적중 시/],
  ['ability_haste', '스킬 가속', /스킬 가속/],
  ['ult_haste', '궁 쿨감', /궁극기.{0,20}(초기화|재사용 대기시간)/],
  ['ult', '궁극기 강화', /궁극기/],
  ['tank', '체력', /체력이 [#\d%() ]*증가|체력을 얻|추가 체력/],
  ['resist', '방어력·마저', /방어력|마법 저항력/],
  ['shield', '보호막', /보호막/],
  ['heal', '회복', /체력을? 회복|흡혈|생명력 흡수|체력 재생/],
  ['support', '아군 지원', /아군/],
  ['ms', '이동 속도', /이동 속도/],
  ['dash', '돌진', /돌진|도약|점멸/],
  ['range', '사거리', /사거리/],
  ['burn', '화상', /화상/],
  ['true_dmg', '고정 피해', /고정 피해/],
  ['cc', '군중 제어', /둔화|속박|기절|이동 불가|띄워|공포|변이|밀어/],
  ['pen', '관통력', /관통력/],
  ['auto_cast', '자동 공격', /자동 사용/],
  ['summon', '소환물', /소환물/],
  ['item', '아이템', /아이템|업그레이드/],
  ['random', '무작위', /무작위/],
  ['damage', '피해 증가', /피해량이 [#\d%() ]*증가|추가 피해/],
  ['stack', '중첩', /영구적으로/],
  ['stats', '능력치', /능력치 모루/],
  ['gold', '골드', /골드%i/],
];

// 아이템 업그레이드 증강 → 그 아이템을 사는 빌드의 태그 (증강 이름에 아이템 이름이 들어 있다)
// 실제 게임: AP 이즈리얼에게 폭풍 쇄도 업그레이드가 B로 나왔다 (태그가 item·gold뿐이었음, 2026-11-13)
const ITEMS = [
  [/폭풍 쇄도/, ['ap', 'damage', 'ms']],
  [/죽음불꽃 손아귀/, ['ap', 'damage']],
  [/존야/, ['ap', 'resist']],
  [/오만/, ['ad', 'pen']],
  [/해적검/, ['ad', 'heal']],
  [/징수의 총/, ['ad', 'crit']],
  [/무한의 대검/, ['ad', 'crit']],
  [/굶주린 히드라/, ['ad', 'heal']],
  [/갈라진 하늘/, ['ad', 'tank', 'heal']],
  [/죽음의 무도/, ['ad', 'tank']],
  [/광휘의 검/, ['on_hit', 'ability_haste']],
  [/가시 갑옷/, ['tank', 'resist']],
  [/불사르기/, ['tank', 'burn']],
  [/즈롯 차원문/, ['tank', 'resist', 'summon']],
  [/미카엘/, ['support', 'heal']],
  [/활력증진의 펜던트/, ['support', 'heal', 'shield']],
  [/꽃피는 새벽의 검/, ['support', 'heal']],
];

const data = new URL('../data/', import.meta.url);
const augments = JSON.parse(readFileSync(new URL('augments.json', data), 'utf8'));
const manualFile = new URL('tags.manual.json', data);
const manual = existsSync(manualFile) ? JSON.parse(readFileSync(manualFile, 'utf8')) : {};
const tags = {};
for (const { id, name, desc } of augments.sort((a, b) => a.id - b.id)) {
  const text = name + ' ' + (desc ?? '');
  const found = LABELS
    .filter(([tag, , pattern]) => pattern.test(text)
      || ((tag === 'ap' || tag === 'ad') && text.includes('적응형 능력치')))
    .map(([tag]) => tag);
  // 아이템 업그레이드 증강은 설명이 아이템 효과만 말해서 그 아이템이 어떤 빌드용인지 모른다 → 아이템 성격을 붙인다
  const item = ITEMS.find(([pattern]) => pattern.test(name))?.[1] ?? [];
  tags[id] = Object.hasOwn(manual, id) ? manual[id] : [...new Set([...found, ...item])];
}
const labels = Object.fromEntries(LABELS.map(([tag, label]) => [tag, label]));
writeFileSync(new URL('tags.json', data), JSON.stringify({ labels, tags }, null, 2) + '\n');

const untagged = augments.filter(({ id }) => tags[id].length === 0);
console.log(`총 개수: ${augments.length}`);
console.log(`태그 0개인 증강 수: ${untagged.length}`);
for (const { id, name } of untagged) console.log(`${id} ${name}`);
console.log('태그별 개수:');
for (const [tag, label] of LABELS) {
  console.log(`${tag} (${label}): ${augments.filter(({ id }) => tags[id].includes(tag)).length}`);
}
