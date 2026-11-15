/* The theory code of the original single-file app (index.html at commit 28a0ab7), copied
   verbatim so the TypeScript port can be checked against it. Test-only. Do not edit. */
export function makeLegacy(){
const LET=['C','D','E','F','G','A','B'],LPC=[0,2,4,5,7,9,11],MAJ=[0,2,4,5,7,9,11];
const mod=(a,n)=>((a%n)+n)%n;
const FORMS={major:[0,2,4,5,7,9,11],natural:[0,2,3,5,7,8,10],melodic:[0,2,3,5,7,9,11],harmonic:[0,2,3,5,7,8,11]};
const TYPES={
 major:{label:'Major',keys:['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'],
  modes:['Ionian','Dorian','Phrygian','Lydian','Mixolydian','Aeolian','Locrian'],nums:['Imaj7','iim7','iiim7','IVmaj7','V7','vim7','viiø7']},
 natural:{label:'Natural Minor',keys:['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],
  modes:['Aeolian','Locrian','Ionian','Dorian','Phrygian','Lydian','Mixolydian'],nums:['im7','iiø7','♭IIImaj7','ivm7','vm7','♭VImaj7','♭VII7']},
 melodic:{label:'Melodic Minor',keys:['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],
  modes:['Melodic Minor','Dorian ♭2','Lydian Augmented','Lydian Dominant','Mixolydian ♭6','Locrian ♮2','Super Locrian'],nums:['im(maj7)','iim7','♭IIImaj7♯5','IV7','V7','viø7','viiø7']},
 harmonic:{label:'Harmonic Minor',keys:['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],
  modes:['Harmonic Minor','Locrian ♮6','Ionian ♯5','Dorian ♯4','Phrygian Dominant','Lydian ♯2','Altered ♭♭7'],nums:['im(maj7)','iiø7','♭IIImaj7♯5','ivm7','V7','♭VImaj7','vii°7']}
};
function parse(n){let acc=0;for(const c of n.slice(1))acc+=c==='#'?1:-1;return{li:LET.indexOf(n[0]),acc};}
function pcOf(n){const p=parse(n);return mod(LPC[p.li]+p.acc,12);}
function spell(li,pc){let d=mod(pc-LPC[li],12);if(d>6)d-=12;return LET[li]+(d>0?'#'.repeat(d):'b'.repeat(-d));}
function fmt(n){return n[0]+n.slice(1).replace(/##/g,'𝄪').replace(/bb/g,'𝄫').replace(/#/g,'♯').replace(/b/g,'♭');}
function scaleNotes(root,type){const r=parse(root),rp=pcOf(root);return FORMS[type].map((s,i)=>spell((r.li+i)%7,(rp+s)%12));}
const QUAL={'4,7,11':'maj7','3,7,10':'m7','4,7,10':'7','3,6,10':'m7♭5','3,7,11':'m(maj7)','4,8,11':'maj7♯5','3,6,9':'°7'};
function rot(a,k){return a.slice(k).concat(a.slice(0,k));}
function formula(m){const r=pcOf(m[0]);return m.map((n,j)=>{const a=mod(pcOf(n)-r,12)-MAJ[j];return(a<0?'♭'.repeat(-a):'♯'.repeat(a))+(j+1);});}
function chordInfo(root,type,deg){
  const sc=scaleNotes(root,type),tones=[0,2,4,6].map(o=>sc[(deg+o)%7]),r=pcOf(tones[0]);
  const q=QUAL[tones.slice(1).map(n=>mod(pcOf(n)-r,12)).join(',')]||'?';
  const mn=rot(sc,deg);
  return{root,type,deg,tones,q,sym:fmt(tones[0])+q,modeNotes:mn,modeName:TYPES[type].modes[deg],num:TYPES[type].nums[deg],formula:formula(mn)};
}
const HOME={
  major:{label:'Major',name:'major',keys:TYPES.major.keys,rn:['I','ii','iii','IV','V','vi','vii'],src:()=>'major',
    presets:[['I → IV',[0,3]],['I → vi → ii → V',[0,5,1,4]],['I → vi → IV → V',[0,5,3,4]],['I → iii → vi → ii → V → I',[0,2,5,1,4,0]],['I → IV → iii → vi',[0,3,2,5]]]},
  minor:{label:'Minor',name:'minor',keys:TYPES.natural.keys,rn:['i','ii','♭III','iv','V','♭VI','♭VII'],src:d=>d===4?'harmonic':'natural',
    presets:[['i → iv',[0,3]],['i → ♭VI → V',[0,5,4]],['i → iv → ♭VII → ♭III',[0,3,6,2]],['i → ♭III → ♭VI → V',[0,2,5,4]],['i → ♭VII → ♭VI → V',[0,6,5,4]]]}
};
const SPELLS=['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];
const accCount=ns=>ns.reduce((s,n)=>s+(n.length-1)*(n.length>2?2:1),0);
function modeFrom(root,fam,deg){const p=parse(root),f=FORMS[fam],iv=rot(f,deg).map(x=>mod(x-f[deg],12)),pc=pcOf(root);return iv.map((x,j)=>spell((p.li+j)%7,(pc+x)%12));}
function bestMode(pc,fam,deg){let best=null,bs=1e9;SPELLS.filter(n=>pcOf(n)===pc).forEach(n=>{const ns=modeFrom(n,fam,deg),sc=accCount(ns);if(sc<bs){bs=sc;best=ns;}});return best;}
function bestParent(pc,fam){let best=null,bs=1e9;SPELLS.filter(n=>pcOf(n)===pc).forEach(n=>{const sc=accCount(scaleNotes(n,fam));if(sc<bs){bs=sc;best=n;}});return best;}
const FAM={
 major:{label:'Major',order:[3,0,4,1,5,2,6],char:[3,5,1,3,6,5,4],info:[
  ['The plain major scale. Bright, settled, home.','Major 7 chords that are home (the I). The 4th rubs against the 3rd, so pass through it.'],
  ['Minor with a natural 6th. Warm and cool at once, not sad.','The ii chord in a 2‑5‑1, and minor vamps like So What.'],
  ['Minor with a ♭2. Dark, with a Spanish edge.','The iii chord, and sus♭9 or flamenco sounds.'],
  ['Major with a ♯4. Floating and dreamy, the film-score sound.','Any maj7 chord that is not home, especially the IV. Try it on the I for a modern sound.'],
  ['Major with a ♭7. Bluesy and open.','Dominant 7 chords: the V in a 2‑5‑1, blues, rock.'],
  ['Natural minor. Sad and plain.','The vi chord, and minor keys.'],
  ['♭2 and ♭5. Unstable, it never sounds like home.','Half-diminished chords: the vii in major, the ii in minor.']]},
 melodic:{label:'Melodic Minor',order:[0,1,2,3,4,5,6],char:[6,1,4,3,5,1,3],info:[
  ['Minor 3rd with a major 6th and 7th. The smooth, modern "jazz minor".','Minor tonic chords: m6 and m(maj7).'],
  ['Dorian with a ♭2. Dark but light on its feet.','sus♭9 chords.'],
  ['Lydian with a ♯5. Bright and unresolved.','maj7♯5 chords.'],
  ['Mixolydian with a ♯4. A bright dominant, the 7♯11 sound.','Dominants that do not resolve down a 5th: tritone subs, the IV7 in a blues.'],
  ['Mixolydian with a ♭6. A dominant that leans toward minor.','A V7 going to a minor chord (7♭13).'],
  ['Locrian with a natural 2nd. A softer half-diminished.','The ii in a minor 2‑5. Smoother than plain Locrian.'],
  ['Every tension at once: ♭9, ♯9, ♯11, ♭13. The 4th acts as the major 3rd.','A V7 right before it resolves, to major or minor.']]},
 harmonic:{label:'Harmonic Minor',order:[0,1,2,3,4,5,6],char:[6,5,4,3,2,1,6],info:[
  ['Natural minor with a raised 7th. Classical and exotic.','Minor tonic chords: m(maj7).'],
  ['Locrian with a natural 6th.','The ii in a minor 2‑5 (the Dark setting).'],
  ['Major with a ♯5. Tense and bright.','maj7♯5 chords.'],
  ['Dorian with a ♯4. Eastern European, klezmer flavor.','Minor 7 chords when you want an exotic color.'],
  ['A ♭2 with a major 3rd. Middle Eastern and flamenco.','The V7 resolving to a minor chord (7♭9 ♭13).'],
  ['Lydian with a ♯2. Bright and exotic.','maj7 chords for an unusual color.'],
  ['Stacked minor 3rds. The diminished sound.','Diminished 7 chords: the vii°7 in harmonic minor.']]}
};
const famOf=i=>i.type==='natural'?['major',(i.deg+5)%7]:[i.type,i.deg];
const IVN={'3':{3:'♭3',4:'3'},'5':{6:'♭5',7:'5',8:'♯5'},'7':{9:'𝄫7',10:'♭7',11:'7'},'9':{1:'♭9',2:'9',3:'♯9'},'11':{5:'11',6:'♯11'}};
const VDEF=[
 ['Basic','Root position','R 3 5 7',['R','3','5','7'],48],
 ['Basic','1st inversion','3 on the bottom',['3','5','7','R'],52],
 ['Basic','2nd inversion','5 on the bottom',['5','7','R','3'],52],
 ['Basic','3rd inversion','7 on the bottom',['7','R','3','5'],52],
 ['Jazz','Shell 1‑3‑7','left hand',['R','3','7'],41],
 ['Jazz','Shell 1‑7‑3','left hand',['R','7','3'],41],
 ['Jazz','Rootless A','3 5 7 9',['3','5','7','9'],50],
 ['Jazz','Rootless B','7 9 3 5',['7','9','3','5'],50],
 ['Jazz','Drop 2','guitar-style spread',['5','R','3','7'],48],
 ['Jazz','Two hands','L: 1‑7 · R: 3‑5‑9',['R','7','3','5','9'],36]];
function degNotes(c){
  const t=c.tones,m=c.modeNotes||[],r=pcOf(t[0]);let nine=m[1],nl='9';
  if(!nine)nine=spell((parse(t[0]).li+1)%7,(r+2)%12);
  else if(mod(pcOf(nine)-r,12)===1&&c.q!=='7')nine=spell((parse(t[0]).li+1)%7,(r+2)%12);
  return{R:t[0],'3':t[1],'5':t[2],'7':t[3],'9':nine,nl};
}
function buildVoicing(c,def){
  const D=degNotes(c),r=pcOf(c.tones[0]),items=[];let prev=-1;
  def[3].forEach((k,i)=>{const n=D[k],pc=pcOf(n);let m;
    if(i===0)m=def[4]+mod(pc-def[4],12);else{m=pc;while(m<=prev)m+=12;}prev=m;
    const kind=k==='9'?D.nl:k,semi=mod(pc-r,12);
    items.push({m,n,lab:k==='R'?'R':((IVN[kind]||{})[semi]||kind),col:k==='R'?'var(--gold)':(k==='3'||k==='7')?'var(--c2)':'var(--c0)'});});
  return{group:def[0],name:def[1],sub:def[2],items};
}
const S={mode:'major',pc:0,tab:'move',from:0,to:3,flavor:'auto',tempo:92,loop:false,playing:'',chart:'major',
  prog:[{d:0,a:false},{d:3,a:true}],quiz:null,score:{r:0,t:0},tipDone:false,soundOut:null,px:'move',pstrict:false,phint:true,pall:false,psound:false,midiOn:false,
  mfam:'major',mview:'parallel',mdeg:1,mroot:null,dmode:'spell',efam:'major',ear:null,escore:{r:0,t:0},voiceHover:true};
const ORDER=[0,1,2,3,4,5,6,7,8,9,10,11];
const keyName=(pc,list)=>(list||HOME[S.mode].keys).find(k=>pcOf(k)===pc);
const homeRoot=()=>keyName(S.pc);
const homeTitle=()=>fmt(homeRoot())+' '+HOME[S.mode].name;
function homeChords(){
  const root=homeRoot(),H=HOME[S.mode];
  return [0,1,2,3,4,5,6].map(d=>{const c=chordInfo(root,H.src(d),d);c.rn=H.rn[d];c.ok=!/m7♭5|°7/.test(c.q);return c;});
}
function homePcs(){const s=new Set();homeChords().forEach(c=>c.tones.forEach(n=>s.add(pcOf(n))));return s;}
function approach(t,fl){
  if(!t.ok)return null;
  const minor=/^m(?!aj)/.test(t.q),f=fl==='auto'?(minor?'dark':'bright'):fl;
  const type=f==='dark'?'harmonic':(minor?'melodic':'major');
  const r=t.tones[0];
  return{type,f,ii:chordInfo(r,type,1),V:chordInfo(r,type,4),chart:fmt(r)+' '+TYPES[type].label};
}
function voicing(tones,ref){
  const bass=36+pcOf(tones[0]);
  const up=tones.slice(1).map(n=>{const pc=pcOf(n);let best=pc+48,d=1e9;for(let m=pc+48;m<=pc+72;m+=12){const dd=Math.abs(m-ref);if(dd<d){d=dd;best=m;}}return best;});
  return{notes:[bass,...up],ref:up.reduce((a,b)=>a+b,0)/up.length};
}
const modeRootPc=()=>S.mroot==null?S.pc:S.mroot;
function modeInfo(fam,deg){
  const pc=modeRootPc(),notes=S.mview==='parent'?rot(scaleNotes(bestParent(pc,fam),fam),deg):bestMode(pc,fam,deg);
  const tones=[0,2,4,6].map(i=>notes[i]),r=pcOf(tones[0]),q=QUAL[tones.slice(1).map(n=>mod(pcOf(n)-r,12)).join(',')]||'?';
  return{fam,deg,notes,modeNotes:notes,tones,q,sym:fmt(tones[0])+q,name:TYPES[fam].modes[deg],formula:formula(notes),
    parent:fmt(notes[(7-deg)%7])+' '+TYPES[fam].label.toLowerCase(),char:FAM[fam].char[deg],sound:FAM[fam].info[deg][0],use:FAM[fam].info[deg][1]};
}
const voiceFor=c=>buildVoicing(c,VDEF[c.q==='7'?7:(/°7/.test(c.q)?0:6)]);
function mkStep(c,label){
  const v=voiceFor(c),sc=new Set((c.modeNotes||c.tones).map(pcOf));c.tones.forEach(n=>sc.add(pcOf(n)));v.items.forEach(i=>sc.add(mod(i.m,12)));
  return{kind:'chord',c,label,v,vp:v.items.map(i=>mod(i.m,12)),p3:pcOf(c.tones[1]),p7:pcOf(c.tones[3]),scale:sc};
}
return{S,parse,pcOf,spell,fmt,scaleNotes,formula,chordInfo,TYPES,HOME,FAM,famOf,modeFrom,bestMode,bestParent,VDEF,degNotes,buildVoicing,keyName,homeChords,homePcs,approach,voicing,modeInfo,voiceFor,mkStep,homeTitle};
}
