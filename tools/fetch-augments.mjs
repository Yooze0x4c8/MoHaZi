// 증바람 증강 목록·설명·아이콘을 CommunityDragon에서 받는다.
// 실행: node tools/fetch-augments.mjs → data/augments.json, .cache/augment-icons/{id}.png
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'

const CD = 'https://raw.communitydragon.org/latest/'
const ICONS = '.cache/augment-icons'
const get = async (p) => {
  const r = await fetch(CD + p)
  if (!r.ok) throw new Error(`${r.status} ${p}`)
  return r
}
const json = async (p) => (await get(p)).json()

const [list, strings, arena] = await Promise.all([
  json('plugins/rcp-be-lol-game-data/global/ko_kr/v1/cherry-augments.json'),
  json('game/ko_kr/data/menu/en_us/lol.stringtable.json').then((s) => s.entries),
  json('cdragon/arena/ko_kr.json').then((a) => new Map(a.augments.map((x) => [x.name, x.desc])))
])

const clean = (s) => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const SUFFIX = ['kiwi_aram_%_tooltip', 'kiwi_aram_%_summary', 'kiwi_aram_%_desc', 'kiwi_aram_%_description',
  'cherry_%_tooltipdescription', 'cherry_%_tooltip', 'cherry_%_summary']

const augments = list
  .filter((x) => x.augmentNameId.startsWith('ARAM_'))
  .map((x) => {
    const icon = x.augmentSmallIconPath.toLowerCase().replace('/lol-game-data/assets/', 'game/')
    const bases = [x.augmentNameId.slice(5).toLowerCase(), icon.split('/').pop().replace('_small.png', '')]
    const raw = bases.flatMap((b) => SUFFIX.map((k) => strings[k.replace('%', b)])).find((s) => s != null) ?? arena.get(x.nameTRA)
    return {
      id: x.id,
      nameId: x.augmentNameId,
      name: x.nameTRA,
      rarity: x.rarity.slice(1).toLowerCase(),
      desc: raw == null ? null : clean(raw),
      icon: `${x.id}.png`,
      _src: icon
    }
  })
  .sort((a, b) => a.id - b.id)

if (!augments.length || new Set(augments.map((a) => a.id)).size !== augments.length ||
    augments.some((a) => !Number.isInteger(a.id) || !['silver', 'gold', 'prismatic'].includes(a.rarity))) {
  throw new Error('Invalid augment IDs or rarities')
}

mkdirSync(ICONS, { recursive: true })
const failed = []
const queue = [...augments]
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let a; (a = queue.shift()); ) {
    const out = `${ICONS}/${a.icon}`
    if (existsSync(out)) continue
    try {
      const large = a._src.replace('_small.png', '_large.png')
      let r = await fetch(CD + large)
      if (r.status === 404) r = await get(a._src)
      if (!r.ok) throw new Error(`${r.status} ${large}`)
      writeFileSync(out, Buffer.from(await r.arrayBuffer()))
    } catch (e) {
      failed.push(`${a.nameId}: ${e.message}`)
    }
  }
}))

augments.forEach((a) => delete a._src)
mkdirSync('data', { recursive: true })
writeFileSync('data/augments.json', JSON.stringify(augments, null, 2) + '\n')

const by = {}
augments.forEach((a) => (by[a.rarity] = (by[a.rarity] ?? 0) + 1))
console.log('총', augments.length, by, '설명 없음', augments.filter((a) => a.desc === null).length)
console.log('아이콘 실패', failed.length ? failed : '없음')
