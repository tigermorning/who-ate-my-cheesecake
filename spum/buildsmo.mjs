import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
// 16x16 픽셀 소품. '.' 은 투명.
const art = {
  wood_floor: { name:'나무 바닥', cat:'terrain', layer:'back', block:false, pal:{a:'#B98A5A',b:'#A87A4C',c:'#C79A69'}, rows:[
    'aaaabbbbaaaabbbb','aaaabbbbaaaabbbb','ccccbbbbccccbbbb','aaaabbbbaaaabbbb',
    'bbbbaaaabbbbaaaa','bbbbaaaabbbbaaaa','bbbbccccbbbbcccc','bbbbaaaabbbbaaaa',
    'aaaabbbbaaaabbbb','aaaabbbbaaaabbbb','ccccbbbbccccbbbb','aaaabbbbaaaabbbb',
    'bbbbaaaabbbbaaaa','bbbbaaaabbbbaaaa','bbbbccccbbbbcccc','bbbbaaaabbbbaaaa'] },
  castle_wall: { name:'성벽', cat:'solid', layer:'front', block:true, pal:{a:'#8C8477',b:'#7A7268',c:'#9E9689'}, rows:[
    'aaaaaaabaaaaaaab','aaaaaaabaaaaaaab','ccccccccccccccbc','bbbbbbbbbbbbbbbb',
    'aaabaaaaaaabaaaa','aaabaaaaaaabaaaa','ccbccccccccbcccc','bbbbbbbbbbbbbbbb',
    'aaaaaaabaaaaaaab','aaaaaaabaaaaaaab','ccccccccccccccbc','bbbbbbbbbbbbbbbb',
    'aaabaaaaaaabaaaa','aaabaaaaaaabaaaa','ccbccccccccbcccc','bbbbbbbbbbbbbbbb'] },
  garden_grass:{ name:'뜰 잔디', cat:'terrain', layer:'back', block:false, pal:{a:'#79B75B',b:'#6BA750',c:'#8CC96C'}, rows:[
    'aaaaaaaaaaaaaaaa','aaacaaaaaaaaacaa','aaaaaaabaaaaaaaa','abaaaaaaaacaaaaa',
    'aaaaacaaaaaaaaba','aaaaaaaaacaaaaaa','aacaaaaaaaaaaaca','aaaaaabaaaaaaaaa',
    'aaaaaaaaaaacaaaa','acaaaaaaaaaaaaab','aaaaabaaacaaaaaa','aaaaaaaaaaaaacaa',
    'abaaaaacaaaaaaaa','aaaaaaaaaaabaaaa','aaacaaaaaaaaaaca','aaaaaaaaaaaaaaaa'] },
  fridge: { name:'냉장고', cat:'furniture', layer:'front', block:true, prompt:'냉장고를 연다', pal:{a:'#E8EEF2',b:'#C7D2DA',c:'#9AA7B1',d:'#6E7A84'}, rows:[
    '..dddddddddddd..','..dbbbbbbbbbbd..','..dbaaaaaaaabd..','..dbaaaaaaaabd..',
    '..dbaaaaaaccbd..','..dbaaaaaaaabd..','..dcccccccccdd..','..dbaaaaaaaabd..',
    '..dbaaaaaaccbd..','..dbaaaaaaaabd..','..dbaaaaaaaabd..','..dbaaaaaaaabd..',
    '..dbaaaaaaaabd..','..dbbbbbbbbbbd..','..dddddddddddd..','...d..........d.'] },
  hearth: { name:'난로', cat:'furniture', layer:'front', block:true, prompt:'난로를 쬔다', pal:{a:'#7A6A5A',b:'#5D5047',c:'#F2A93B',d:'#E85D2A',e:'#FFE08A'}, rows:[
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb',
    'baa..........aab','ba............ab','ba.....e......ab','ba....ece.....ab',
    'ba...ecdce....ab','ba..ecddcce...ab','ba..cddddc....ab','ba.ecddddce...ab',
    'ba..dddddd....ab','bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb'] },
  long_table:{ name:'긴 식탁', cat:'furniture', layer:'front', block:true, prompt:'식탁을 살핀다', pal:{a:'#C08B4E',b:'#A3743E',c:'#D9A468'}, rows:[
    '................','................','cccccccccccccccc','aaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaa','bbbbbbbbbbbbbbbb','..bb........bb..','..bb........bb..',
    '..bb........bb..','..bb........bb..','..bb........bb..','..bb........bb..',
    '..bb........bb..','..bb........bb..','................','................'] },
  shelf: { name:'선반', cat:'furniture', layer:'front', block:true, prompt:'선반을 뒤진다', pal:{a:'#9A6B3F',b:'#7C5430',c:'#C9A06A',d:'#D6C08E'}, rows:[
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','b.dd..dd...dd..b','b.dd..dd...dd..b',
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','b..cc...cc..cc.b','b..cc...cc..cc.b',
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','b.dd...dd..dd..b','b.dd...dd..dd..b',
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','b..cc..cc...cc.b','bbbbbbbbbbbbbbbb'] },
  ladder: { name:'사다리', cat:'furniture', layer:'front', block:false, prompt:'사다리를 오른다', pal:{a:'#B0803F',b:'#8A6330'}, rows:[
    '..aa........aa..','..aa........aa..','..aabbbbbbbbaa..','..aa........aa..',
    '..aa........aa..','..aabbbbbbbbaa..','..aa........aa..','..aa........aa..',
    '..aabbbbbbbbaa..','..aa........aa..','..aa........aa..','..aabbbbbbbbaa..',
    '..aa........aa..','..aa........aa..','..aabbbbbbbbaa..','..aa........aa..'] },
  empty_plate:{ name:'빈 케이크 접시', cat:'prop', layer:'front', block:false, prompt:'빈 접시를 들여다본다', pal:{a:'#F4F1EC',b:'#D9D3C8',c:'#EFD9A8'}, rows:[
    '................','................','................','.....bbbbbb.....',
    '...bbaaaaaabb...','..baaaaaaaaaab..','..baaaacaaaaab..','..baaaaaaaaaab..',
    '..bbaaaaaaaabb..','...bbbaaaabbb...','.....bbbbbb.....','................',
    '................','................','................','................'] },
  yard_tree:{ name:'뜰 나무', cat:'nature', layer:'front', block:true, pal:{a:'#4E8B3C',b:'#3E7030',c:'#66A64E',d:'#8A5F35'}, rows:[
    '.....cccc.......','...ccaaaacc.....','..caaaaaaacc....','.caaaabaaaaac...',
    '.caaaaaaaaaac...','ccaaabaaaaaaacc.','caaaaaaaabaaaac.','caaaaaaaaaaaaac.',
    '.caaaabaaaaaac..','..ccaaaaaaacc...','....ccaaacc.....','......dd........',
    '......dd........','......dd........','.....dddd.......','....dddddd......'] },
  bed_top: { name:'침대 머리', cat:'furniture', layer:'front', block:true, prompt:'침대를 살핀다', pal:{a:'#C9A46A',b:'#8A6435',c:'#F6F1E4',d:'#DDD3C0',e:'#7FA86A',f:'#6A9058'}, rows:[
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb',
    '.b............b.','.bccccccccccccb.','.bccccccccccccb.','.bcccccccccccdb.',
    '.bddddddddddddb.','.beeeeeeeeeeeeb.','.beffffffffffeb.','.beeeeeeeeeeeeb.',
    '.beffffffffffeb.','.beeeeeeeeeeeeb.','.beffffffffffeb.','.beeeeeeeeeeeeb.'] },
  bed_bottom: { name:'침대 발치', cat:'furniture', layer:'front', block:true, pal:{a:'#C9A46A',b:'#8A6435',e:'#7FA86A',f:'#6A9058'}, rows:[
    '.beeeeeeeeeeeeb.','.beffffffffffeb.','.beeeeeeeeeeeeb.','.beffffffffffeb.',
    '.beeeeeeeeeeeeb.','.beffffffffffeb.','.beeeeeeeeeeeeb.','.beffffffffffeb.',
    '.beeeeeeeeeeeeb.','.b............b.','bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab',
    'bbbbbbbbbbbbbbbb','.b............b.','.bb..........bb.','.bb..........bb.'] },
  sofa_l: { name:'소파 왼쪽', cat:'furniture', layer:'front', block:true, prompt:'소파에 앉는다', pal:{a:'#C46A4E',b:'#9E4F38',c:'#E08A6B',d:'#6B4A31'}, rows:[
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaaa','bacccccccccccccc','baaaaaaaaaaaaaaa',
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaaa','baaacccccccccccc','baaacccccccccccc',
    'baaacccccccccccc','baaacccccccccccc','baaacccccccccccc','bbbbaaaaaaaaaaaa',
    'baaabbbbbbbbbbbb','bbbb............','.dd.............','.dd.............'] },
  sofa_r: { name:'소파 오른쪽', cat:'furniture', layer:'front', block:true, pal:{a:'#C46A4E',b:'#9E4F38',c:'#E08A6B',d:'#6B4A31'}, rows:[
    'bbbbbbbbbbbbbbbb','aaaaaaaaaaaaaaab','ccccccccccccccab','aaaaaaaaaaaaaaab',
    'bbbbbbbbbbbbbbbb','aaaaaaaaaaaaaaab','ccccccccccccaaab','ccccccccccccaaab',
    'ccccccccccccaaab','ccccccccccccaaab','ccccccccccccaaab','aaaaaaaaaaaabbbb',
    'bbbbbbbbbbbbaaab','............bbbb','.............dd.','.............dd.'] },
  sink: { name:'개수대', cat:'furniture', layer:'front', block:true, prompt:'개수대를 본다', pal:{a:'#B9AFA0',b:'#8E8577',c:'#7FB8CF',d:'#6B4A31'}, rows:[
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','babbbbbbbbbbbbab','babccccccccccbab',
    'babccccccccccbab','babccccccccccbab','babbbbbbbbbbbbab','baaaaaaaaaaaaaab',
    'bbbbbbbbbbbbbbbb','bddddddddddddddb','bddddddddddddddb','bdddbbbbbbbbdddb',
    'bddddddddddddddb','bddddddddddddddb','bbbbbbbbbbbbbbbb','................'] },
  wardrobe: { name:'옷장', cat:'furniture', layer:'front', block:true, prompt:'옷장을 열어 본다', pal:{a:'#A0743F',b:'#7A5530',c:'#C79A5F',d:'#E8D9A8'}, rows:[
    'bbbbbbbbbbbbbbbb','bccccccccccccccb','bcaaaaaabaaaaacb','bcaaaaaabaaaaacb',
    'bcaaaaaabaaaaacb','bcaaadaabaadaacb','bcaaaaaabaaaaacb','bcaaaaaabaaaaacb',
    'bcaaaaaabaaaaacb','bcaaaaaabaaaaacb','bcaaaaaabaaaaacb','bcaaaaaabaaaaacb',
    'bccccccccccccccb','bbbbbbbbbbbbbbbb','.bb..........bb.','................'] },
  stove: { name:'화덕', cat:'furniture', layer:'front', block:true, prompt:'화덕을 살핀다', pal:{a:'#5A5750', b:'#3E3C37', c:'#F2A93B', d:'#E85D2A', e:'#8C877D'}, rows:[
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','baeeeeeeeeeeeeab','baeaaaaaaaaaaeab',
    'baeabbbbbbbbaeab','baeab......baeab','baeab..cdc..baea','baeab.cdc...baea',
    'baeab..cdc..baea','baeab.......baea','baeab......baeab','baeabbbbbbbbaeab',
    'baeaaaaaaaaaaeab','baeeeeeeeeeeeeab','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb'] },
  counter: { name:'조리대', cat:'furniture', layer:'front', block:true, prompt:'조리대를 본다', pal:{a:'#C9A46A', b:'#8A6435', c:'#E3C894', d:'#6B4A31'}, rows:[
    'bbbbbbbbbbbbbbbb','bccccccccccccccb','bccccccccccccccb','bbbbbbbbbbbbbbbb',
    'baaaaaaaaaaaaaab','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb','baaabbbbbbbbaaab',
    'baaabbbbbbbbaaab','bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','baaaaaaaaaaaaaab',
    'bbbbbbbbbbbbbbbb','bddddddddddddddb','bddddddddddddddb','bbbbbbbbbbbbbbbb'] },
  cupboard: { name:'찬장', cat:'furniture', layer:'front', block:true, prompt:'찬장을 연다', pal:{a:'#A0743F', b:'#7A5530', c:'#D8CDB4', d:'#E8D9A8'}, rows:[
    'bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','baccbbaccbbaccab','baccbbaccbbaccab',
    'baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab','baccbbaccbbaccab',
    'baccbbaccbbaccab','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb','baaadaabaadaaaab',
    'baaaaaabaaaaaaab','baaaaaabaaaaaaab','baaaaaabaaaaaaab','bbbbbbbbbbbbbbbb'] },
  nightstand: { name:'머리맡 탁자', cat:'furniture', layer:'front', block:true, pal:{a:'#B58650', b:'#8A6435', c:'#E8D9A8'}, rows:[
    '................','................','bbbbbbbbbbbbbbbb','baaaaaaaaaaaaaab',
    'baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb','baaaaaccaaaaaaab','baaaaaaaaaaaaaab',
    'bbbbbbbbbbbbbbbb','baaaaaccaaaaaaab','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb',
    '.bb..........bb.','.bb..........bb.','................','................'] },
  chest: { name:'궤짝', cat:'furniture', layer:'front', block:true, prompt:'궤짝을 열어 본다', pal:{a:'#A87243', b:'#6F4A28', c:'#D8B36A', d:'#E8D9A8'}, rows:[
    '................','....bbbbbbbb....','..bbaaaaaaaabb..','.bbaaaaaaaaaabb.',
    '.baaaaaaaaaaaab.','.bccccccccccccb.','.baaaaaaaaaaaab.','.baaaaaddaaaaab.',
    '.bccccccddccccb.','.baaaaaaaaaaaab.','.baaaaaaaaaaaab.','.bccccccccccccb.',
    '.baaaaaaaaaaaab.','.bbaaaaaaaaaabb.','..bbbbbbbbbbbb..','................'] },
  stairs: { name:'계단', cat:'furniture', layer:'front', block:true, prompt:'계단을 올려다본다', pal:{a:'#B58650', b:'#7A5530', c:'#D9B77E'}, rows:[
    'bbbbbbbbbbbbbbbb','bccccccccccccccb','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb',
    'bccccccccccccccb','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb','bccccccccccccccb',
    'baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb','bccccccccccccccb','baaaaaaaaaaaaaab',
    'bbbbbbbbbbbbbbbb','bccccccccccccccb','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb'] },
  armchair: { name:'안락의자', cat:'furniture', layer:'front', block:true, prompt:'의자에 앉는다', pal:{a:'#C46A4E', b:'#9E4F38', c:'#E08A6B', d:'#6B4A31'}, rows:[
    '..bbbbbbbbbbbb..','.bbaaaaaaaaaabb.','.baccccccccccab.','.baccccccccccab.',
    '.baccccccccccab.','.bbaaaaaaaaaabb.','bbaaaaaaaaaaaabb','baaaccccccccaaab',
    'baaaccccccccaaab','baaaccccccccaaab','baaaccccccccaaab','bbaaaaaaaaaaaabb',
    '.bbbbbbbbbbbbbb.','..dd........dd..','..dd........dd..','................'] },
  desk: { name:'책상', cat:'furniture', layer:'front', block:true, prompt:'책상을 들여다본다', pal:{a:'#B58650', b:'#7A5530', c:'#D9B77E', d:'#F4EFE2'}, rows:[
    '................','bbbbbbbbbbbbbbbb','bccccccccccccccb','baaaaaaaaaaaaaab',
    'baaddaaaaaaaaaab','baaddaaaaaaaaaab','baaaaaaaaaaaaaab','bbbbbbbbbbbbbbbb',
    'baaabbbbbbbbaaab','baaabbbbbbbbaaab','bbbbbbbbbbbbbbbb','.bb..........bb.',
    '.bb..........bb.','.bb..........bb.','.bb..........bb.','................'] },
  washtub: { name:'대야', cat:'furniture', layer:'front', block:true, prompt:'대야를 들여다본다', pal:{a:'#8FA9B8', b:'#5F7684', c:'#BFD6E2', d:'#7A5530'}, rows:[
    '................','................','...bbbbbbbbbb...','..bccccccccccb..',
    '.bcaaaaaaaaaacb.','.bcaaaaaaaaaacb.','.bcaaaaaaaaaacb.','.bcaaaaaaaaaacb.',
    '.bcaaaaaaaaaacb.','.bcaaaaaaaaaacb.','..bcaaaaaaaacb..','...bbbbbbbbbb...',
    '....dd....dd....','....dd....dd....','................','................'] },
  lamp: { name:'등', cat:'prop', layer:'front', block:true, prompt:'등을 들여다본다', pal:{a:'#C4A263', b:'#A08040', c:'#FFE08A', d:'#FF6B2A'}, rows:[
    '................','................','......cc........','.....cddc.......',
    '......cc........','.......b........','.......b........','.......b........',
    '......bbb.......','.......b........','.......b........','.......b........',
    '......bbb.......','.....aaaaaa.....','....aaaaaaaa....','................'] },
  cheesecake: { name:'치즈케이크', cat:'prop', layer:'front', block:false, prompt:'치즈케이크를 본다', pal:{a:'#F4E8C8', b:'#E8D4A0', c:'#D4B878', d:'#F8F0D8'}, rows:[
    '................','................','................','................',
    '................','.....dddddd.....','....dabbbbad....','...dabcccbad....',
    '...dabcccbad....','...dabcccbad....','....dabbbbad....','.....dddddd.....',
    '......bbbb......','.....bbbbbb.....','................','................'] },
  bookshelf_large: { name:'큰 책장', cat:'furniture', layer:'front', block:true, prompt:'큰 책장을 살핀다', pal:{a:'#8B6B4A', b:'#6B4F33', c:'#C9A06A', d:'#A07850'}, rows:[
    'bbbbbbbbbbbbbbbb','bccccccccccccccb','bccccccccccccccb','bbbbbbbbbbbbbbbb',
    'bccccccccccccccb','bccccccccccccccb','bbbbbbbbbbbbbbbb','bccccccccccccccb',
    'bccccccccccccccb','bbbbbbbbbbbbbbbb','bccccccccccccccb','bccccccccccccccb',
    'bbbbbbbbbbbbbbbb','bccccccccccccccb','bccccccccccccccb','bbbbbbbbbbbbbbbb'] },
  plant_pot: { name:'화분', cat:'prop', layer:'front', block:false, prompt:'화분을 본다', pal:{a:'#C46A4E', b:'#9E4F38', c:'#66A64E', d:'#4E8B3C'}, rows:[
    '................','................','.....ccc........','....ccddc.......',
    '...ccccc........','....ccc.........','.....c..........','................',
    '....aaaa........','...abbbba.......','...abbbba.......','...abbbba.......',
    '....abba........','....aaaa........','................','................'] },
  watering_can: { name:'물주기통', cat:'prop', layer:'front', block:false, prompt:'물주기통을 본다', pal:{a:'#8FA9B8', b:'#5F7684', c:'#BFD6E2'}, rows:[
    '................','................','..cc............','..c.............',
    '..caaaaaaaaaa...','..cbbbbbbbbbba..','..cbbbbbbbbbba..','..cbbbbbbbbbba..',
    '..caaaaaaaaaa...','..cbbbbbbbbbba..','..caaaaaaaaaa...','...bbbbbbbbbb...',
    '................','................','................','................'] },
  note: { name:'쪽지', cat:'prop', layer:'front', block:false, prompt:'쪽지를 읽는다', pal:{a:'#F8F0D8', b:'#E8DCC0', c:'#B0A080'}, rows:[
    '................','................','................','................',
    '................','................','..bbbbbbbbbb....','..bccccccccb....',
    '..bccccccccb....','..bccccccccb....','..bccccccccb....','..bbbbbbbbbb....',
    '................','................','................','................'] },
  diary: { name:'일기장', cat:'prop', layer:'front', block:false, prompt:'일기장을 펼친다', pal:{a:'#8B4513', b:'#6B3410', c:'#F4E8C8', d:'#D4C8A0'}, rows:[
    '................','................','................','....bbbbbb......',
    '...baaaaaab.....','...bccccccb.....','...bccccccb.....','...bccccccb.....',
    '...bccccccb.....','...bccccccb.....','...bccccccb.....','...baaaaaab.....',
    '....bbbbbb......','................','................','................'] },
  wooden_door: { name:'나무 문', cat:'solid', layer:'front', block:true, prompt:'문을 연다', pal:{a:'#B0803F', b:'#8A6330', c:'#D9A468', d:'#5D4420'}, rows:[
    'dddddddddddddddd','daaaaaaaaaaaaaad','daaaabaaabaaabad','daaaaaaaaaaaaaad',
    'daaaabaaabaaabad','daaaaaaaaaaaaaad','daaaabaaabaaabad','daaaaaaaaaaaaaad',
    'daaaabaaabaaabad','daaaaaaaaaaaaaad','daaaabaaabaaabad','daaaaaaaaaaaaaad',
    'daaaabaaabaaabad','daaaaaaaaaaaaaad','daaaaaaaaaaaaaad','dddddddddddddddd'] },
  cooking_pot: { name:'조리 솥', cat:'prop', layer:'front', block:false, prompt:'조리 솥을 들여다본다', pal:{a:'#5F7684', b:'#4A5D6A', c:'#8FA9B8'}, rows:[
    '................','................','................','................',
    '..bbbbbb........','..baaaab........','..baaaab........','..baaaab........',
    '..baaaab........','..baaaab........','..bbbbbb........','................',
    '................','................','................','................'] },
  boxes: { name:'상자', cat:'furniture', layer:'front', block:true, prompt:'상자를 열어 본다', pal:{a:'#C08B4E', b:'#A3743E', c:'#D9A468'}, rows:[
    '................','................','................','................',
    '....aaaaaaaa....','...abbbbbbbba...','...abbbbbbbba...','...abbbbbbbba...',
    '....aaaaaaaa....','..aaaaaaaaaaaa..','..abbbbbbbbbbba.','..abbbbbbbbbbba.',
    '..aaaaaaaaaaaa..','..abbbbbbbbbbba.','..aaaaaaaaaaaa..','................'] },
  baskets: { name:'바구니', cat:'prop', layer:'front', block:false, prompt:'바구니를 들여다본다', pal:{a:'#C08B4E', b:'#A3743E', c:'#D9A468'}, rows:[
    '................','................','................','................',
    '...bbbbbbbbbb...','..bccccccccccb..','..bccccccccccb..','..bccccccccccb..',
    '..bccccccccccb..','..bccccccccccb..','...cccccccccc...','....cccccccc....',
    '................','................','................','................'] },
  books: { name:'책 더미', cat:'prop', layer:'front', block:false, prompt:'책을 본다', pal:{a:'#8B4513', b:'#6B3410', c:'#F4E8C8', d:'#4A6B3A'}, rows:[
    '................','................','................','................',
    '................','....dddddd......','....cccccc......','....aaaaaa......',
    '....dddddd......','....cccccc......','....aaaaaa......','....dddddd......',
    '................','................','................','................'] },
  plates: { name:'접시 더미', cat:'prop', layer:'front', block:false, prompt:'접시를 본다', pal:{a:'#F4F1EC', b:'#D9D3C8', c:'#EFD9A8'}, rows:[
    '................','................','................','................',
    '................','................','.....aaaa.......','....aabba.......',
    '.....aaaa.......','....aabba.......','.....aaaa.......','....aabba.......',
    '................','................','................','................'] },
};
const now = new Date().toISOString();
const out = Object.entries(art).map(([key, a]) => {
  const pixels = [];
  a.rows.forEach(row => { for (const ch of row) pixels.push(ch === '.' ? '' : a.pal[ch]); });
  if (pixels.length !== 256) throw new Error(key + ' pixels=' + pixels.length);
  return {
    id: 'SMO_SGN_' + key.toUpperCase(), key, name: a.name, category: a.cat, layerHint: a.layer,
    size: { cols: 1, rows: 1 },
    visual: { kind: 'pixel', width: 16, height: 16, color: Object.values(a.pal)[0], symbol: key.slice(0,2).toUpperCase(),
              tileSize: 16, pixels, palette: [], imageDataUrl: '', imageUrl: '', referenceImageDataUrl: '', referenceName: '' },
    collision: { blocksMovement: !!a.block, blocksVision: a.cat === 'solid' },
    terrain: { type: a.cat === 'terrain' ? key : 'floor', moveSpeed: 1, staminaCost: 0, footstep: 'soft', damagePerSecond: 0 },
    interaction: { kind: a.prompt ? 'inspect' : 'none', prompt: a.prompt || '' },
    tags: ['치즈케이크의밤', a.cat], mapTheme: null, builtin: false,
    meta: { createdAt: now, updatedAt: now },
  };
});
writeFileSync(join(__dirname, 'smo.json'), JSON.stringify(out), 'utf8');
