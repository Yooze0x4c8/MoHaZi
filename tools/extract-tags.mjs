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

const data = new URL('../data/', import.meta.url);
const augments = JSON.parse(readFileSync(new URL('augments.json', data), 'utf8'));
const manualFile = new URL('tags.manual.json', data);
const manual = existsSync(manualFile) ? JSON.parse(readFileSync(manualFile, 'utf8')) : {};
const tags = {};
for (const { id, name, desc } of augments.sort((a, b) => a.id - b.id)) {
  const text = name + ' ' + (desc ?? '');
  tags[id] = Object.hasOwn(manual, id) ? manual[id] : LABELS
    .filter(([tag, , pattern]) => pattern.test(text)
      || ((tag === 'ap' || tag === 'ad') && text.includes('적응형 능력치')))
    .map(([tag]) => tag);
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
