// 모든 챔피언의 빌드 → data/builds.json
// 실행: node tools/make-builds.mjs
// 빌드 = 역할 프리셋 + 챔피언별 덧붙임 태그. 고칠 땐 아래 BUILDS 표만 고치고 다시 돌린다.
// 출력: { "<alias>": { name, builds: Build[] } }. alias는 Live Client rawChampionName의 끝부분과 같다.
import { readFileSync, writeFileSync } from 'node:fs'

const P = {
  // 원거리 딜러
  crit:      { want: { crit: 1, ad: 0.8, attack_speed: 0.7, range: 0.5, damage: 0.4, item: 0.3 }, avoid: ['ap'] },
  onhit:     { want: { on_hit: 1, attack_speed: 1, ad: 0.5, damage: 0.4, item: 0.3 }, avoid: ['ap'] },
  aponhit:   { want: { on_hit: 1, attack_speed: 0.9, ap: 0.8, damage: 0.3 }, avoid: ['crit'] },
  // 물리 스킬
  lethality: { want: { ad: 1, pen: 0.8, ability_haste: 0.7, damage: 0.5, dash: 0.4 }, avoid: ['ap', 'crit'] },
  adcaster:  { want: { ad: 0.9, ability_haste: 1, pen: 0.5, range: 0.4, damage: 0.4 }, avoid: ['ap'] },
  // 근접 전사
  bruiser:   { want: { ad: 0.8, heal: 0.7, tank: 0.6, ability_haste: 0.6, damage: 0.4, dash: 0.3 }, avoid: ['ap'] },
  fighter:   { want: { attack_speed: 0.8, on_hit: 0.8, ad: 0.7, heal: 0.5, damage: 0.3 }, avoid: ['ap'] },
  // 마법사
  burst:     { want: { ap: 1, pen: 0.6, damage: 0.6, ability_haste: 0.6, burn: 0.3 }, avoid: ['ad', 'crit'] },
  mage:      { want: { ap: 1, ability_haste: 0.8, burn: 0.5, damage: 0.4, cc: 0.4, range: 0.4 }, avoid: ['ad', 'crit'] },
  artillery: { want: { ap: 1, range: 1, ability_haste: 0.6, damage: 0.4 }, avoid: ['ad', 'crit'] },
  apassassin:{ want: { ap: 1, dash: 0.6, pen: 0.6, damage: 0.6, ms: 0.4 }, avoid: ['ad', 'crit'] },
  apbruiser: { want: { ap: 0.9, heal: 0.6, ability_haste: 0.6, tank: 0.4, damage: 0.4, burn: 0.3 }, avoid: ['crit'] },
  apult:     { want: { ult_haste: 1, ap: 0.8, ult: 0.7, ability_haste: 0.7 }, avoid: ['crit'] },
  // 탱커·서포터
  tank:      { want: { tank: 1, resist: 0.8, cc: 0.7, shield: 0.4, heal: 0.4, ability_haste: 0.4 }, avoid: ['crit'] },
  aptank:    { want: { tank: 0.9, ap: 0.6, burn: 0.6, resist: 0.5, cc: 0.5 }, avoid: ['crit'] },
  engage:    { want: { cc: 1, tank: 0.8, resist: 0.6, support: 0.6, shield: 0.3, ms: 0.3 }, avoid: ['crit'] },
  enchanter: { want: { support: 1, heal: 0.9, shield: 0.9, ability_haste: 0.7, ap: 0.5, ms: 0.3 }, avoid: ['ad', 'crit'] }
}

const NAME = {
  crit: '치명타', onhit: '적중', aponhit: 'AP 적중', lethality: '물리 관통', adcaster: '스킬 물리',
  bruiser: '브루저', fighter: '평타 전사', burst: 'AP 폭딜', mage: 'AP 마법사', artillery: 'AP 포킹',
  apassassin: 'AP 암살', apbruiser: 'AP 브루저', apult: 'AP 무한궁', tank: '탱커', aptank: 'AP 탱커',
  engage: '이니시 서폿', enchanter: '보호 서폿'
}

// 패널에 보이는 한 줄 설명
const DESC = {
  crit: '치명타 증강으로 평타 한 방을 키워요', onhit: '공격 속도와 적중 효과로 평타를 키워요',
  aponhit: '주문력과 적중 효과로 평타에 마법 피해를 얹어요', lethality: '물리 관통으로 스킬 한 번에 끝내요',
  adcaster: '스킬 가속과 공격력으로 스킬을 자주 써요', bruiser: '체력과 회복으로 앞에서 오래 싸워요',
  fighter: '공격 속도와 흡혈로 평타 싸움을 이겨요', burst: '주문력과 관통으로 콤보 한 번에 터뜨려요',
  mage: '주문력과 스킬 가속으로 스킬을 계속 돌려요', artillery: '사거리와 주문력으로 멀리서 깎아요',
  apassassin: '주문력과 돌진으로 파고들어 끊어요', apbruiser: '주문력과 회복으로 버티며 싸워요',
  apult: '궁 쿨감을 쌓아 궁을 쉬지 않고 깔아요', tank: '체력과 방어 증강으로 앞을 막아요',
  aptank: '체력에 주문력을 더해 버티며 피해를 줘요', engage: '군중 제어와 체력으로 싸움을 열어요',
  enchanter: '회복과 보호막으로 아군을 지켜요'
}

// 챔피언: [프리셋, 덧붙임 태그?, 이름?] 목록. 첫 번째가 기본(meta) 빌드, 나머지는 재미(fun) 빌드.
// 덧붙임에 같은 태그가 있으면 덮어쓰고, 프리셋의 피할 태그에서도 뺀다.
const BUILDS = {
  Aatrox: [['bruiser', { heal: 1 }], ['lethality']],
  Ahri: [['apassassin', { heal: 0.3 }], ['burst']],
  Akali: [['apassassin'], ['apbruiser']],
  Akshan: [['crit', { on_hit: 0.4 }], ['lethality'], ['onhit']],
  Alistar: [['engage', { heal: 0.4 }], ['aptank']],
  Ambessa: [['bruiser', { dash: 0.7 }], ['lethality']],
  Amumu: [['aptank'], ['burst']],
  Anivia: [['mage', { cc: 0.6 }], ['aptank']],
  Annie: [['burst'], ['aptank', { cc: 0.7 }], ['mage']],
  Aphelios: [['crit'], ['lethality']],
  Ashe: [['crit', { cc: 0.5 }], ['onhit']],
  AurelionSol: [['mage', { stack: 1 }], ['burst']],
  Aurora: [['apassassin', { dash: 0.5 }], ['mage']],
  Azir: [['mage', { summon: 0.6, attack_speed: 0.5 }], ['aponhit']],
  Bard: [['enchanter', { ms: 0.6, cc: 0.6, stack: 0.4 }], ['aponhit'], ['aptank']],
  Belveth: [['fighter', { attack_speed: 1, stack: 0.5 }], ['bruiser']],
  Blitzcrank: [['engage'], ['aptank'], ['burst']],
  Brand: [['mage', { burn: 1 }], ['burst']],
  Braum: [['engage', { shield: 0.7 }], ['tank']],
  Briar: [['bruiser', { attack_speed: 0.6, heal: 0.8 }], ['lethality'], ['fighter']],
  Caitlyn: [['crit', { range: 0.8 }], ['lethality']],
  Camille: [['bruiser', { true_dmg: 0.5 }], ['lethality']],
  Cassiopeia: [['mage', { ms: 0.3 }], ['apbruiser']],
  Chogath: [['tank', { stack: 0.6, ult: 0.5 }], ['burst'], ['aptank']],
  Corki: [['adcaster', { crit: 0.4 }], ['burst', {}, 'AP 코르키'], ['crit']],
  Darius: [['bruiser', { stack: 0.5 }], ['tank']],
  Diana: [['apassassin'], ['apbruiser'], ['aponhit']],
  DrMundo: [['tank', { heal: 1 }], ['bruiser']],
  Draven: [['crit', { ad: 1 }], ['lethality']],
  Ekko: [['apassassin'], ['apbruiser'], ['aponhit']],
  Elise: [['apassassin'], ['aptank'], ['mage']],
  Evelynn: [['apassassin'], ['burst']],
  Ezreal: [['adcaster', { on_hit: 0.5 }], ['burst', {}, 'AP 이즈리얼'], ['crit']],
  FiddleSticks: [['mage', { cc: 0.6 }], ['burst'], ['aptank']],
  Fiora: [['fighter', { true_dmg: 0.6, heal: 0.6 }], ['bruiser']],
  Fizz: [['apassassin'], ['aptank'], ['burst']],
  Galio: [['aptank'], ['burst']],
  Gangplank: [['crit', { ability_haste: 0.4 }, '치명타 배럴'], ['apult', { ap: 0.8 }], ['lethality']],
  Garen: [['bruiser', { crit: 0.4, ms: 0.4 }], ['crit'], ['tank']],
  Gnar: [['bruiser', { tank: 0.7 }], ['onhit'], ['tank']],
  Gragas: [['apbruiser', { cc: 0.5 }], ['tank'], ['burst']],
  Graves: [['crit', { ad: 1, range: 0 }], ['lethality']],
  Gwen: [['apbruiser', { on_hit: 0.6 }], ['apassassin']],
  Hecarim: [['bruiser', { ms: 1 }], ['tank'], ['lethality']],
  Heimerdinger: [['mage', { summon: 1 }], ['burst']],
  Hwei: [['artillery'], ['mage'], ['burst']],
  Illaoi: [['bruiser', { heal: 0.6 }], ['tank']],
  Irelia: [['fighter', { on_hit: 1, dash: 0.6 }], ['bruiser']],
  Ivern: [['enchanter', { summon: 0.5 }], ['aptank'], ['mage']],
  Janna: [['enchanter', { shield: 1 }], ['mage']],
  JarvanIV: [['bruiser', { cc: 0.5 }], ['lethality'], ['tank']],
  Jax: [['fighter'], ['aponhit'], ['bruiser']],
  Jayce: [['adcaster'], ['lethality']],
  Jhin: [['crit', { ad: 1, range: 0.7, attack_speed: 0 }], ['lethality']],
  Jinx: [['crit'], ['onhit']],
  KSante: [['tank', { resist: 0.9 }], ['bruiser']],
  Kaisa: [['onhit', { crit: 0.4 }], ['aponhit', {}, 'AP 카이사'], ['crit']],
  Kalista: [['onhit', { dash: 0.5 }], ['crit']],
  Karma: [['enchanter', { ap: 0.6 }], ['mage']],
  Karthus: [['mage', { ult: 0.6 }], ['burst'], ['aptank']],
  Kassadin: [['apassassin', { ability_haste: 0.6 }], ['mage']],
  Katarina: [['apassassin', { on_hit: 0.4 }], ['aponhit'], ['lethality']],
  Kayle: [['aponhit', { ap: 1, range: 0.4 }], ['onhit']],
  Kayn: [['lethality'], ['bruiser']],
  Kennen: [['mage', { cc: 0.6 }], ['aptank'], ['aponhit']],
  Khazix: [['lethality'], ['bruiser']],
  Kindred: [['crit', { on_hit: 0.5, stack: 0.5 }], ['onhit'], ['lethality']],
  Kled: [['bruiser'], ['lethality']],
  KogMaw: [['onhit', { range: 0.6 }], ['artillery'], ['aponhit']],
  Leblanc: [['apassassin'], ['mage']],
  LeeSin: [['bruiser'], ['lethality'], ['tank']],
  Leona: [['engage'], ['aptank']],
  Lillia: [['apbruiser', { ms: 0.7 }], ['mage'], ['burst']],
  Lissandra: [['mage', { cc: 0.8 }], ['burst'], ['aptank']],
  // ponytail: Locke·Zaahen은 CommunityDragon 역할군만 보고 정함. 직접 해 보고 고친다
  Locke: [['apassassin'], ['burst']],
  Lucian: [['crit', { dash: 0.4 }], ['lethality'], ['onhit']],
  Lulu: [['enchanter', { shield: 1, attack_speed: 0.3 }], ['mage'], ['aponhit']],
  Lux: [['artillery', { shield: 0.3 }], ['enchanter'], ['burst']],
  Malphite: [['tank', { resist: 0.9 }], ['burst'], ['aptank']],
  Malzahar: [['mage', { summon: 0.6 }], ['aptank']],
  Maokai: [['tank', { heal: 0.5 }], ['aptank']],
  MasterYi: [['fighter', { true_dmg: 0.4 }], ['crit'], ['onhit']],
  Mel: [['mage'], ['burst'], ['artillery']],
  Milio: [['enchanter'], ['mage']],
  MissFortune: [['crit', { ult: 0.4 }], ['lethality', { ult: 0.6 }]],
  MonkeyKing: [['bruiser', { crit: 0.4 }], ['crit'], ['tank']],
  Mordekaiser: [['apbruiser', { shield: 0.5 }], ['aptank']],
  Morgana: [['mage', { cc: 0.8, shield: 0.4 }], ['aptank'], ['burst']],
  Naafiri: [['lethality'], ['bruiser']],
  Nami: [['enchanter'], ['mage']],
  Nasus: [['bruiser', { stack: 1, tank: 0.5 }], ['tank']],
  Nautilus: [['engage'], ['aptank']],
  Neeko: [['burst'], ['mage'], ['aptank']],
  Nidalee: [['burst', { range: 0.6 }], ['enchanter']],
  Nilah: [['crit', { heal: 0.5, range: 0 }], ['fighter']],
  Nocturne: [['bruiser', { attack_speed: 0.4 }], ['lethality'], ['fighter']],
  Nunu: [['aptank'], ['burst']],
  Olaf: [['bruiser', { attack_speed: 0.4 }], ['tank'], ['fighter']],
  Orianna: [['mage', { shield: 0.4 }], ['burst'], ['enchanter']],
  Ornn: [['tank', { item: 0.5 }], ['aptank']],
  Pantheon: [['lethality'], ['bruiser']],
  Poppy: [['tank', { cc: 0.7 }], ['lethality']],
  Pyke: [['lethality', { support: 0.4 }], ['bruiser']],
  Qiyana: [['lethality'], ['bruiser']],
  Quinn: [['lethality', { range: 0.3 }], ['crit'], ['onhit']],
  Rakan: [['engage', { ap: 0.5, ms: 0.5, shield: 0.6 }], ['enchanter'], ['burst']],
  Rammus: [['tank', { resist: 1, ms: 0.6 }], ['aptank']],
  RekSai: [['bruiser'], ['lethality']],
  Rell: [['engage'], ['aptank']],
  Renata: [['enchanter', { cc: 0.5 }], ['mage']],
  Renekton: [['bruiser'], ['lethality']],
  Rengar: [['lethality'], ['crit'], ['bruiser']],
  Riven: [['bruiser', { dash: 0.7, shield: 0.4 }], ['lethality']],
  Rumble: [['apbruiser', { burn: 0.8 }], ['burst'], ['aptank']],
  Ryze: [['mage', { ability_haste: 1, tank: 0.4 }], ['aptank']],
  Samira: [['crit', { dash: 0.5, heal: 0.4 }], ['lethality']],
  Sejuani: [['tank'], ['aptank']],
  Senna: [['crit', { stack: 0.6, range: 0.6 }], ['enchanter'], ['lethality']],
  Seraphine: [['enchanter', { ap: 0.8 }], ['mage'], ['artillery']],
  Sett: [['bruiser', { tank: 0.6 }], ['tank']],
  Shaco: [['lethality'], ['mage', { summon: 0.8 }, 'AP 상자'], ['crit']],
  Shen: [['tank', { support: 0.5, shield: 0.4 }], ['bruiser']],
  Shyvana: [['fighter', { on_hit: 0.8 }], ['apbruiser', { burn: 0.8 }]],
  Singed: [['aptank', { ms: 0.8 }], ['apbruiser']],
  Sion: [['tank', { cc: 0.8 }], ['lethality']],
  Sivir: [['crit', { on_hit: 0.3 }], ['lethality']],
  Skarner: [['tank', { cc: 0.8 }], ['bruiser']],
  Smolder: [['adcaster', { stack: 1, burn: 0.4 }], ['crit']],
  Sona: [['enchanter', { ap: 0.6 }], ['mage'], ['aponhit']],
  Soraka: [['enchanter', { heal: 1 }], ['mage']],
  Swain: [['apbruiser', { heal: 0.8, tank: 0.6 }], ['mage'], ['aptank']],
  Sylas: [['apbruiser', { ult: 0.6 }], ['apassassin'], ['aptank']],
  Syndra: [['burst'], ['mage']],
  TahmKench: [['tank', { heal: 0.6, shield: 0.5 }], ['aptank']],
  Taliyah: [['mage'], ['burst']],
  Talon: [['lethality'], ['bruiser']],
  Taric: [['engage', { heal: 0.6, shield: 0.6 }], ['enchanter']],
  Teemo: [['aponhit', { burn: 0.6 }], ['onhit'], ['mage']],
  Thresh: [['engage'], ['aptank'], ['enchanter']],
  Tristana: [['crit'], ['lethality'], ['burst']],
  Trundle: [['fighter', { heal: 0.6, tank: 0.5 }], ['tank']],
  Tryndamere: [['fighter', { crit: 1, on_hit: 0.3 }, '치명타 전사'], ['bruiser']],
  TwistedFate: [['mage'], ['onhit'], ['aponhit']],
  Twitch: [['crit', { on_hit: 0.4 }], ['aponhit'], ['lethality']],
  Udyr: [['fighter', { tank: 0.5 }], ['tank'], ['aptank']],
  Urgot: [['bruiser', { tank: 0.7 }], ['tank']],
  Varus: [['adcaster', { range: 0.6 }], ['onhit'], ['aponhit']],
  Vayne: [['onhit', { true_dmg: 0.6, crit: 0.5 }], ['crit']],
  Veigar: [['burst', { stack: 1 }], ['mage'], ['aptank']],
  Velkoz: [['artillery', { true_dmg: 0.6 }], ['burst'], ['mage']],
  Vex: [['burst'], ['mage']],
  Vi: [['bruiser'], ['lethality']],
  Viego: [['fighter', { on_hit: 0.8, crit: 0.3 }], ['crit']],
  Viktor: [['mage'], ['artillery'], ['burst']],
  Vladimir: [['mage', { heal: 0.8, tank: 0.4 }, '흡혈 AP'], ['burst']],
  Volibear: [['fighter', { tank: 0.6, on_hit: 0.7 }], ['aptank']],
  Warwick: [['fighter', { heal: 0.8 }], ['tank']],
  Xayah: [['crit'], ['lethality']],
  Xerath: [['artillery'], ['burst']],
  XinZhao: [['bruiser', { attack_speed: 0.5 }], ['fighter'], ['crit']],
  Yasuo: [['crit', { dash: 0.6, attack_speed: 0.8, range: 0 }], ['bruiser']],
  Yone: [['crit', { dash: 0.5, attack_speed: 0.8, range: 0 }], ['bruiser']],
  Yorick: [['bruiser', { summon: 1 }], ['tank']],
  Yunara: [['onhit', { crit: 0.6 }], ['crit']],
  Yuumi: [['enchanter'], ['mage']],
  Zaahen: [['bruiser'], ['lethality']],
  Zac: [['tank', { heal: 0.6 }], ['aptank']],
  Zed: [['lethality'], ['bruiser']],
  Zeri: [['crit', { ms: 0.5 }], ['onhit']],
  Ziggs: [['artillery'], ['burst'], ['mage']],
  Zilean: [['enchanter', { ability_haste: 1 }], ['burst'], ['mage']],
  Zoe: [['burst', { range: 0.6 }], ['artillery']],
  Zyra: [['mage', { summon: 0.8 }], ['burst']]
}

// 표에 없는 새 챔피언은 역할군으로 기본 빌드 하나
const BY_ROLE = { marksman: 'crit', mage: 'mage', assassin: 'lethality', fighter: 'bruiser', tank: 'tank', support: 'enchanter' }

const res = await fetch('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/ko_kr/v1/champion-summary.json')
const champs = (await res.json()).filter((c) => c.id > 0 && !c.alias.includes('_')) // Jade_* 등 특수 모드 제외
const labels = JSON.parse(readFileSync(new URL('../data/tags.json', import.meta.url), 'utf8')).labels

const out = {}
const guessed = []
for (const c of champs) {
  let rows = BUILDS[c.alias]
  if (!rows) {
    rows = [[BY_ROLE[c.roles?.[0]] ?? 'bruiser']]
    guessed.push(c.alias)
  }
  const builds = rows.map(([preset, extra = {}, name], i) => {
    const p = P[preset]
    if (!p) throw new Error(`${c.alias}: 없는 프리셋 ${preset}`)
    const wantTags = Object.fromEntries(Object.entries({ ...p.want, ...extra }).filter(([, v]) => v > 0))
    for (const t of Object.keys(wantTags)) if (!labels[t]) throw new Error(`${c.alias}: 없는 태그 ${t}`)
    return {
      id: `${c.alias}-${preset}`,
      name: name ?? NAME[preset],
      desc: DESC[preset],
      style: i === 0 ? 'meta' : 'fun',
      default: i === 0,
      wantTags,
      mustHave: [],
      avoidTags: p.avoid.filter((t) => !(t in extra))
    }
  })
  out[c.alias] = { name: c.name, builds }
}
const unknown = Object.keys(BUILDS).filter((a) => !out[a])
if (unknown.length) throw new Error(`표에만 있고 챔피언 목록에 없음: ${unknown.join(', ')}`)

writeFileSync(new URL('../data/builds.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
const n = Object.values(out).reduce((s, c) => s + c.builds.length, 0)
console.log(`챔피언 ${champs.length}명, 빌드 ${n}개 → data/builds.json`)
if (guessed.length) console.log(`표에 없어 역할군으로 정함: ${guessed.join(', ')}`)
