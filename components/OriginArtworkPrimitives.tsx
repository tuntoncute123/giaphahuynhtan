/** Shared, static vector motifs. All coordinates are local to each motif. */
export function VillageHouse({ x, y, scale = 1, temple = false }: { x: number; y: number; scale?: number; temple?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} strokeLinejoin="round">
    <ellipse cx="0" cy="36" rx="53" ry="8" fill="#254d4230" />
    <path d="M-40-3H40V32H-40Z" fill="#eddbac" stroke="#725942" strokeWidth="1.5" />
    <path d="M-46 0L-31-12L0-34L31-12L46 0Z" fill="#a75139" stroke="#724431" strokeWidth="2" />
    <path d="M-34-9L0-29L34-9M-40-3H40" fill="none" stroke="#d89669" strokeWidth="2" />
    {[-21, -12, 0, 12, 21].map(x => <path key={x} d={`M${x * .55}-23L${x * 1.5}-3`} stroke="#783d30" strokeWidth="1.2" />)}
    <path d="M-9 7H9V32H-9Z" fill="#394e43" /><path d="M0 8V32" stroke="#b79b68" />
    <path d="M-30 9H-19V21H-30ZM19 9H30V21H19Z" fill="#76836a" stroke="#8d754e" />
    <path d="M-45 32H45M-49 36H49" stroke="#b49464" strokeWidth="3" />
    {temple && <><path d="M-52-6Q-42 2-34-4M52-6Q42 2 34-4" fill="none" stroke="#724431" strokeWidth="3" /><rect x="-16" y="-4" width="32" height="8" rx="1" fill="#eacb86" /><path d="M-34 3V30M34 3V30" stroke="#8d4934" strokeWidth="4" /></>}
  </g>;
}

export function VillageTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M0 9L3-62M1-28L-20-47M2-41L23-61" stroke="#756547" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M-30-42C-53-65-22-89-4-81C10-109 45-88 36-69C64-48 28-29 12-40C-3-24-18-34-30-42Z" fill="#456b50" />
    <path d="M-33-62Q-19-80-5-67M7-79Q24-90 34-72M10-49Q28-60 39-50" fill="none" stroke="#81966a" strokeWidth="3" strokeLinecap="round" />
  </g>;
}

export function SailingBoat({ x, y, scale = 1, rotate = 0, wreck = false }: { x: number; y: number; scale?: number; rotate?: number; wreck?: boolean }) {
  return <g data-voyage-boat="true" transform={`translate(${x} ${y}) scale(${scale}) rotate(${rotate})`} strokeLinejoin="round">
    <path d="M-42 1Q0 9 43-3L33 15Q-4 28-32 15Z" fill={wreck ? '#92755c' : '#884a35'} stroke="#543e32" strokeWidth="2" />
    <path d="M-35 7Q0 16 36 4M-26 16Q0 21 29 13" stroke="#c58d5d" fill="none" strokeWidth="1.5" />
    <path d="M0 5V-78" stroke="#63563e" strokeWidth="3" />
    <path d={wreck ? 'M-4-70Q-30-53-34-22L-16-29L-9-15L-4-18Z' : 'M-4-70Q-31-44-34-11L-4-15Z'} fill={wreck ? '#d9cfb8' : '#f9eccb'} stroke="#ae9b72" strokeWidth="1.3" />
    <path d="M5-65Q29-43 31-17L5-14Z" fill={wreck ? '#c3c2ac' : '#e4c68a'} stroke="#ae9b72" strokeWidth="1.3" />
    <path d="M-24-48L-4-45M-31-29L-4-28M5-45L23-43M5-28L29-30" fill="none" stroke="#b7a57e" strokeWidth="1" />
    <path d="M0-77L19-72L0-67Z" fill="#a94e39" /><path d="M-31-4L0-75L35-7" fill="none" stroke="#786d50" strokeWidth=".8" />
  </g>;
}

export function Rooster() {
  return <g strokeLinecap="round" strokeLinejoin="round">
    {/* Separate sickle feathers keep the tail distinct from the upright neck. */}
    <path d="M228 210C181 173 146 155 133 186C131 145 184 117 234 185C205 112 147 90 132 132C142 64 226 112 249 188C243 125 211 105 201 102C246 100 273 155 262 203Z" fill="#214f4b" stroke="#173d3b" strokeWidth="2" />
    <path d="M148 139Q195 120 239 194M149 170Q188 146 236 202M216 119Q247 155 247 193" fill="none" stroke="#57867a" strokeWidth="3" />
    <path d="M231 199C243 181 264 174 285 161L312 165C324 192 302 231 270 236C241 241 221 220 218 208Z" fill="#a64f32" stroke="#6d3e2c" strokeWidth="2" />
    <path d="M244 202Q269 181 290 185C293 209 267 226 243 216L232 208Z" fill="#d2924a" stroke="#895334" strokeWidth="1.5" />
    <path d="M246 208Q270 208 283 192M253 216Q271 212 279 205" fill="none" stroke="#f1c67d" strokeWidth="2" />
    <path d="M279 177C291 158 284 131 297 119C306 108 321 116 324 127C324 141 313 149 313 163L320 181L307 176L308 189L298 182L294 194L286 184L278 189Z" fill="#e1aa53" stroke="#915c32" strokeWidth="1.5" />
    <path d="M295 123C289 116 292 110 298 111C294 96 306 95 309 107C313 94 322 98 320 110C332 104 337 115 324 124Z" fill="#b83e32" stroke="#84372c" strokeWidth="1.5" />
    <path d="M316 142C323 151 324 164 316 164C307 163 311 150 310 145Z" fill="#b83e32" />
    <path d="M325 130L341 135L325 141Z" fill="#e8bf6e" stroke="#8c683b" strokeWidth="1.5" />
    <circle cx="316" cy="129" r="4" fill="#fff5d5" /><circle cx="317" cy="129" r="2.3" fill="#273b33" />
    <path d="M301 143L298 165M308 145L304 171M293 155L289 175" stroke="#f9cf7d" strokeWidth="2" />
    <path d="M258 232L254 257L242 265M254 257L263 265M280 231L283 258L296 264M283 258L275 265" fill="none" stroke="#a3773f" strokeWidth="3.5" />
  </g>;
}

export function ChronicleBook({ variant = 0 }: { variant?: number }) {
  const cover = ['#315e4c', '#9e513d', '#b28b48'][variant % 3];
  return <svg viewBox="0 0 100 106" aria-hidden="true" focusable="false">
    <path d="M20 12H79L85 18V95H23Q16 95 16 88V20Z" fill="#d5c39d" stroke="#7b6747" strokeWidth="1.5" />
    <path d="M22 14H79V87H22Q17 87 17 92V20Q17 14 22 14Z" fill={cover} stroke="#584e38" strokeWidth="1.5" />
    <path d="M25 15V85" stroke="#ead9af" strokeWidth="1" />
    <rect x="37" y="27" width="28" height="42" rx="2" fill="#f1e2bd" />
    <path d="M45 37H57M45 44H57M45 51H57M45 58H52" stroke={cover} strokeWidth="2" />
    <path d="M24 90H79M24 93H79" stroke="#f9f0d9" /><path d="M17 30H28M17 48H28M17 68H28" stroke="#ceb982" strokeWidth="2" />
  </svg>;
}
