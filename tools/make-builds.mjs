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
  Aatrox: [['bruiser', { heal: 1 }]],
  Ahri: [['apassassin', { heal: 0.3 }]],
  Akali: [['apassassin']],
  Akshan: [['crit', { on_hit: 0.4 }]],
  Alistar: [['engage', { heal: 0.4 }]],
  Ambessa: [['bruiser', { dash: 0.7 }]],
  Amumu: [['aptank']],
  Anivia: [['mage', { cc: 0.6 }]],
  Annie: [['burst'], ['aptank', { cc: 0.7 }]],
  Aphelios: [['crit']],
  Ashe: [['crit', { cc: 0.5 }], ['onhit']],
  AurelionSol: [['mage', { stack: 1 }]],
  Aurora: [['apassassin', { dash: 0.5 }]],
  Azir: [['mage', { summon: 0.6, attack_speed: 0.5 }]],
  Bard: [['enchanter', { ms: 0.6, cc: 0.6, stack: 0.4 }]],
  Belveth: [['fighter', { attack_speed: 1, stack: 0.5 }]],
  Blitzcrank: [['engage'], ['aptank']],
  Brand: [['mage', { burn: 1 }]],
  Braum: [['engage', { shield: 0.7 }]],
  Briar: [['bruiser', { attack_speed: 0.6, heal: 0.8 }]],
  Caitlyn: [['crit', { range: 0.8 }]],
  Camille: [['bruiser', { true_dmg: 0.5 }]],
  Cassiopeia: [['mage', { ms: 0.3 }]],
  Chogath: [['tank', { stack: 0.6, ult: 0.5 }], ['burst']],
  Corki: [['adcaster', { crit: 0.4 }], ['burst', {}, 'AP 코르키']],
  Darius: [['bruiser', { stack: 0.5 }]],
  Diana: [['apassassin'], ['apbruiser']],
  DrMundo: [['tank', { heal: 1 }]],
  Draven: [['crit', { ad: 1 }]],
  Ekko: [['apassassin'], ['apbruiser']],
  Elise: [['apassassin']],
  Evelynn: [['apassassin']],
  Ezreal: [['adcaster', { on_hit: 0.5 }], ['burst', {}, 'AP 이즈리얼']],
  FiddleSticks: [['mage', { cc: 0.6 }]],
  Fiora: [['fighter', { true_dmg: 0.6, heal: 0.6 }]],
  Fizz: [['apassassin'], ['aptank']],
  Galio: [['aptank'], ['burst']],
  Gangplank: [['crit', { ability_haste: 0.4 }, '치명타 배럴'], ['apult', { ap: 0.8 }]],
  Garen: [['bruiser', { crit: 0.4, ms: 0.4 }]],
  Gnar: [['bruiser', { tank: 0.7 }]],
  Gragas: [['apbruiser', { cc: 0.5 }], ['tank']],
  Graves: [['crit', { ad: 1, range: 0 }]],
  Gwen: [['apbruiser', { on_hit: 0.6 }]],
  Hecarim: [['bruiser', { ms: 1 }]],
  Heimerdinger: [['mage', { summon: 1 }]],
  Hwei: [['artillery']],
  Illaoi: [['bruiser', { heal: 0.6 }]],
  Irelia: [['fighter', { on_hit: 1, dash: 0.6 }]],
  Ivern: [['enchanter', { summon: 0.5 }]],
  Janna: [['enchanter', { shield: 1 }]],
  JarvanIV: [['bruiser', { cc: 0.5 }], ['lethality']],
  Jax: [['fighter'], ['aponhit']],
  Jayce: [['adcaster']],
  Jhin: [['crit', { ad: 1, range: 0.7, attack_speed: 0 }]],
  Jinx: [['crit']],
  KSante: [['tank', { resist: 0.9 }]],
  Kaisa: [['onhit', { crit: 0.4 }], ['aponhit', {}, 'AP 카이사']],
  Kalista: [['onhit', { dash: 0.5 }]],
  Karma: [['enchanter', { ap: 0.6 }], ['mage']],
  Karthus: [['mage', { ult: 0.6 }]],
  Kassadin: [['apassassin', { ability_haste: 0.6 }]],
  Katarina: [['apassassin', { on_hit: 0.4 }]],
  Kayle: [['aponhit', { ap: 1, range: 0.4 }]],
  Kayn: [['lethality'], ['bruiser']],
  Kennen: [['mage', { cc: 0.6 }]],
  Khazix: [['lethality']],
  Kindred: [['crit', { on_hit: 0.5, stack: 0.5 }]],
  Kled: [['bruiser']],
  KogMaw: [['onhit', { range: 0.6 }], ['artillery']],
  Leblanc: [['apassassin']],
  LeeSin: [['bruiser']],
  Leona: [['engage']],
  Lillia: [['apbruiser', { ms: 0.7 }]],
  Lissandra: [['mage', { cc: 0.8 }]],
  // ponytail: Locke·Zaahen은 CommunityDragon 역할군만 보고 정함. 직접 해 보고 고친다
  Locke: [['apassassin']],
  Lucian: [['crit', { dash: 0.4 }]],
  Lulu: [['enchanter', { shield: 1, attack_speed: 0.3 }]],
  Lux: [['artillery', { shield: 0.3 }], ['enchanter']],
  Malphite: [['tank', { resist: 0.9 }], ['burst']],
  Malzahar: [['mage', { summon: 0.6 }]],
  Maokai: [['tank', { heal: 0.5 }], ['aptank']],
  MasterYi: [['fighter', { true_dmg: 0.4 }], ['crit']],
  Mel: [['mage']],
  Milio: [['enchanter']],
  MissFortune: [['crit', { ult: 0.4 }], ['lethality', { ult: 0.6 }]],
  MonkeyKing: [['bruiser', { crit: 0.4 }]],
  Mordekaiser: [['apbruiser', { shield: 0.5 }]],
  Morgana: [['mage', { cc: 0.8, shield: 0.4 }], ['aptank']],
  Naafiri: [['lethality']],
  Nami: [['enchanter']],
  Nasus: [['bruiser', { stack: 1, tank: 0.5 }]],
  Nautilus: [['engage']],
  Neeko: [['burst']],
  Nidalee: [['burst', { range: 0.6 }]],
  Nilah: [['crit', { heal: 0.5, range: 0 }]],
  Nocturne: [['bruiser', { attack_speed: 0.4 }]],
  Nunu: [['aptank'], ['burst']],
  Olaf: [['bruiser', { attack_speed: 0.4 }], ['tank']],
  Orianna: [['mage', { shield: 0.4 }]],
  Ornn: [['tank', { item: 0.5 }]],
  Pantheon: [['lethality']],
  Poppy: [['tank', { cc: 0.7 }], ['lethality']],
  Pyke: [['lethality', { support: 0.4 }]],
  Qiyana: [['lethality']],
  Quinn: [['lethality', { range: 0.3 }], ['crit']],
  Rakan: [['engage', { ap: 0.5, ms: 0.5, shield: 0.6 }]],
  Rammus: [['tank', { resist: 1, ms: 0.6 }]],
  RekSai: [['bruiser']],
  Rell: [['engage']],
  Renata: [['enchanter', { cc: 0.5 }]],
  Renekton: [['bruiser']],
  Rengar: [['lethality'], ['crit']],
  Riven: [['bruiser', { dash: 0.7, shield: 0.4 }]],
  Rumble: [['apbruiser', { burn: 0.8 }]],
  Ryze: [['mage', { ability_haste: 1, tank: 0.4 }]],
  Samira: [['crit', { dash: 0.5, heal: 0.4 }]],
  Sejuani: [['tank']],
  Senna: [['crit', { stack: 0.6, range: 0.6 }], ['enchanter']],
  Seraphine: [['enchanter', { ap: 0.8 }], ['mage']],
  Sett: [['bruiser', { tank: 0.6 }]],
  Shaco: [['lethality'], ['mage', { summon: 0.8 }, 'AP 상자']],
  Shen: [['tank', { support: 0.5, shield: 0.4 }]],
  Shyvana: [['fighter', { on_hit: 0.8 }], ['apbruiser', { burn: 0.8 }]],
  Singed: [['aptank', { ms: 0.8 }]],
  Sion: [['tank', { cc: 0.8 }], ['lethality']],
  Sivir: [['crit', { on_hit: 0.3 }]],
  Skarner: [['tank', { cc: 0.8 }]],
  Smolder: [['adcaster', { stack: 1, burn: 0.4 }]],
  Sona: [['enchanter', { ap: 0.6 }]],
  Soraka: [['enchanter', { heal: 1 }]],
  Swain: [['apbruiser', { heal: 0.8, tank: 0.6 }]],
  Sylas: [['apbruiser', { ult: 0.6 }]],
  Syndra: [['burst']],
  TahmKench: [['tank', { heal: 0.6, shield: 0.5 }]],
  Taliyah: [['mage']],
  Talon: [['lethality']],
  Taric: [['engage', { heal: 0.6, shield: 0.6 }]],
  Teemo: [['aponhit', { burn: 0.6 }], ['onhit']],
  Thresh: [['engage']],
  Tristana: [['crit']],
  Trundle: [['fighter', { heal: 0.6, tank: 0.5 }]],
  Tryndamere: [['fighter', { crit: 1, on_hit: 0.3 }, '치명타 전사']],
  TwistedFate: [['mage'], ['onhit']],
  Twitch: [['crit', { on_hit: 0.4 }], ['aponhit']],
  Udyr: [['fighter', { tank: 0.5 }], ['tank']],
  Urgot: [['bruiser', { tank: 0.7 }]],
  Varus: [['adcaster', { range: 0.6 }], ['onhit'], ['aponhit']],
  Vayne: [['onhit', { true_dmg: 0.6, crit: 0.5 }]],
  Veigar: [['burst', { stack: 1 }]],
  Velkoz: [['artillery', { true_dmg: 0.6 }]],
  Vex: [['burst']],
  Vi: [['bruiser']],
  Viego: [['fighter', { on_hit: 0.8, crit: 0.3 }]],
  Viktor: [['mage']],
  Vladimir: [['mage', { heal: 0.8, tank: 0.4 }, '흡혈 AP']],
  Volibear: [['fighter', { tank: 0.6, on_hit: 0.7 }], ['aptank']],
  Warwick: [['fighter', { heal: 0.8 }], ['tank']],
  Xayah: [['crit']],
  Xerath: [['artillery']],
  XinZhao: [['bruiser', { attack_speed: 0.5 }]],
  Yasuo: [['crit', { dash: 0.6, attack_speed: 0.8, range: 0 }]],
  Yone: [['crit', { dash: 0.5, attack_speed: 0.8, range: 0 }]],
  Yorick: [['bruiser', { summon: 1 }]],
  Yunara: [['onhit', { crit: 0.6 }]],
  Yuumi: [['enchanter']],
  Zaahen: [['bruiser']],
  Zac: [['tank', { heal: 0.6 }]],
  Zed: [['lethality']],
  Zeri: [['crit', { ms: 0.5 }]],
  Ziggs: [['artillery']],
  Zilean: [['enchanter', { ability_haste: 1 }], ['burst']],
  Zoe: [['burst', { range: 0.6 }]],
  Zyra: [['mage', { summon: 0.8 }]]
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
