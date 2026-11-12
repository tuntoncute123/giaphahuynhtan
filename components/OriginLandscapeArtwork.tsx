import { Rooster, SailingBoat, VillageHouse, VillageTree } from './OriginArtworkPrimitives';

function Homeland() {
  return <>
    <rect width="480" height="320" fill="#f3e9cc" />
    <circle cx="360" cy="77" r="35" fill="#e5bd73" />
    <path d="M0 156L54 109L88 131L148 63L217 129L255 101L324 151L386 113L480 166V320H0Z" fill="#bcc3a3" />
    <path d="M0 190L75 139L125 162L197 117L257 171L332 148L408 178L480 149V320H0Z" fill="#819b7b" />
    <path d="M0 227Q95 167 196 201T480 195V320H0Z" fill="#567e60" />
    <path d="M0 261Q118 210 224 252T480 230V320H0Z" fill="#99ac7c" />
    <path d="M210 183C333 192 286 224 224 242S219 289 340 320H452C275 274 281 269 297 248C337 214 347 192 210 183Z" fill="#bbd0bd" />
    <path d="M253 201C316 214 257 232 242 238M271 282Q296 298 368 313" fill="none" stroke="#e4e9cf" strokeWidth="3" />
    <path d="M5 277Q102 242 169 267M0 294Q91 262 181 285M31 320Q105 285 196 306" fill="none" stroke="#dae1b0" strokeWidth="2" />
    <VillageTree x={50} y={226} scale={.75} /><VillageHouse x={112} y={214} scale={.78} /><VillageHouse x={168} y={231} scale={.52} />
    <VillageTree x={424} y={203} scale={.85} /><VillageHouse x={362} y={220} scale={.83} />
    <path d="M136 266Q224 307 351 263" fill="none" stroke="#fff2c9" strokeWidth="2.5" strokeDasharray="5 7" />
    {[136, 351].map(x => <g key={x}><circle cx={x} cy="266" r="7" fill="#fff2d3" /><circle cx={x} cy="266" r="3.5" fill="#9e5237" /></g>)}
    <path d="M225 72q7-8 14 0q7-8 14 0M265 91q5-6 10 0q5-6 10 0" fill="none" stroke="#728875" strokeWidth="2" />
  </>;
}

function NightWarning() {
  return <>
    <rect width="480" height="320" fill="#243f45" />
    <circle cx="94" cy="66" r="28" fill="#f0d795" /><circle cx="106" cy="57" r="25" fill="#243f45" />
    {[[45, 42], [166, 54], [230, 35], [383, 68], [434, 31], [343, 29], [184, 105], [418, 121]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.5" fill="#e0d4b0" />)}
    <path d="M0 193Q83 128 173 182T340 171T480 181V320H0Z" fill="#36584f" />
    <VillageTree x={416} y={241} scale={1.25} />
    <VillageHouse x={87} y={211} scale={.8} /><VillageHouse x={150} y={220} scale={.5} />
    <path d="M0 257Q113 221 193 249T480 251V320H0Z" fill="#687a5a" />
    <path d="M0 286Q150 256 245 281T480 272V320H0Z" fill="#8b9069" />
    <ellipse cx="266" cy="279" rx="84" ry="10" fill="#283f3b" opacity=".3" />
    <path d="M210 267Q244 256 287 265L304 278H202Z" fill="#d2c49b" stroke="#7c8062" strokeWidth="2" />
    <Rooster />
    <path d="M350 119L364 109M354 134H372M348 149L361 157" fill="none" stroke="#e4c887" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M39 287l-6-15m6 15 8-20m-8 20 15-9M395 291l-8-20m8 20 6-26m-6 26 17-15" fill="none" stroke="#c4bd8c" strokeWidth="2" />
  </>;
}

function SeaVoyage() {
  return <>
    <rect width="480" height="320" fill="#d5dfd7" />
    <path d="M0 48Q30 22 62 43Q74 4 116 25Q154 10 179 42Q212 25 238 51Q284 14 315 39Q349 16 383 40Q438 7 480 32V0H0Z" fill="#879d98" />
    <path d="M0 83L43 67L78 88L122 59L164 93L210 79L254 110L480 107V174H0Z" fill="#96aaa0" />
    <path d="M0 147Q55 134 110 147T220 147T330 147T440 147T550 147V320H0Z" fill="#729b98" />
    <path d="M20 85l-7 15m51-43-7 15m156-12-7 15m137-18-7 15m77-5-7 15m35 17-7 15" stroke="#8ba3a1" strokeWidth="2" />
    <SailingBoat x={87} y={178} scale={.82} rotate={-6} />
    <SailingBoat x={243} y={166} scale={.86} rotate={4} />
    <SailingBoat x={393} y={180} scale={.82} rotate={-5} />
    <path d="M0 207Q35 190 70 207T140 207T210 207T280 207T350 207T420 207T490 207V320H0Z" fill="#4f827f" />
    <SailingBoat x={164} y={267} scale={.78} rotate={-31} wreck />
    <SailingBoat x={322} y={272} scale={.78} rotate={28} wreck />
    <path d="M0 276Q24 262 48 276T96 276T144 276T192 276T240 276T288 276T336 276T384 276T432 276T480 276V320H0Z" fill="#3a6a6b" />
    <path d="M10 278q20-12 40 0m53-1q20-12 40 0m53 0q20-12 40 0m53 0q20-12 40 0m53 0q20-12 40 0M39 223q20-12 40 0m100-1q20-12 40 0m109 0q20-12 40 0M23 303q28-12 56 0m77 0q28-12 56 0m78 0q28-12 56 0m52 0q28-12 56 0" fill="none" stroke="#b1d0c3" strokeWidth="2" strokeLinecap="round" />
  </>;
}

function Settlement() {
  return <>
    <rect width="480" height="320" fill="#f4eacf" />
    <circle cx="100" cy="69" r="29" fill="#e7c786" />
    <path d="M0 131Q72 92 139 126T278 118T480 127V320H0Z" fill="#b4bea0" />
    <path d="M0 190Q146 153 245 185T480 176V320H0Z" fill="#8ba481" />
    <path d="M0 231Q131 193 243 229T480 222V320H0Z" fill="#ced1a1" />
    <path d="M0 260Q126 214 248 254T480 245V320H0Z" fill="#7aa6a0" />
    <path d="M0 282Q126 236 248 276T480 267M26 302Q126 267 224 293M304 302Q399 320 480 296" fill="none" stroke="#bcd3bd" strokeWidth="3" />
    <path d="M18 191L140 178L184 215L38 238ZM24 205L156 192M30 221L171 206M57 187L78 231M99 183L126 224" fill="#d6c485" stroke="#f2e4b4" strokeWidth="2" />
    <VillageTree x={418} y={192} scale={1.1} /><VillageTree x={199} y={170} scale={.7} />
    <VillageHouse x={300} y={174} scale={1.2} temple /><VillageHouse x={396} y={208} scale={.5} />
    <path d="M293 217L265 234L293 243L323 224Z" fill="#e7dab0" />
    <SailingBoat x={111} y={281} scale={.45} />
    <path d="M340 68q7-8 14 0q7-8 14 0M383 87q5-6 10 0q5-6 10 0" fill="none" stroke="#7e8d75" strokeWidth="2" />
  </>;
}

export default function OriginLandscapeArtwork({ chapter }: { chapter: number }) {
  return <svg viewBox="0 0 480 320" aria-hidden="true" focusable="false">
    {chapter === 0 ? <Homeland /> : chapter === 1 ? <NightWarning /> : chapter === 2 ? <SeaVoyage /> : <Settlement />}
  </svg>;
}
