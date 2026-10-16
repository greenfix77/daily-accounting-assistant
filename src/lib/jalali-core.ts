// Server-safe, pure Jalali (Solar Hijri) calendar helpers — no external package.
// Based on the core algorithms of jalaali-js (MIT).
// Exports: toJalali, toGregorian, jalaliMonthKey, jalaliMonthRange

function div(a: number, b: number): number {
  return ~~(a / b)
}

// jalaali-js (MIT) core
function jalCal(jy: number) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ]
  let bl = breaks.length
  let gy = jy + 621
  let leapJ = -14
  let jp = breaks[0]
  let jm: number, jump = 0, leap: number, leapG: number, march: number, n: number, i: number

  for (i = 1; i < bl; i += 1) {
    jm = breaks[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(jump % 33, 4)
    jp = jm
  }
  n = jy - jp

  leapJ = leapJ + div(n, 33) * 8 + div(n % 33 + 3, 4)
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1

  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  march = 20 + leapJ - leapG

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  leap = (((n + 1) % 33) - 1) % 4
  if (leap === -1) leap = 4

  return { leap, gy, gr: march }
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * ((gm + 9) % 12) + 2, 5) +
    gd -
    34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(j % 1461, 4) * 5 + 308
  const gd = div(i % 153, 5) + 1
  const gm = (div(i, 153) % 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy)
  return g2d(r.gy, 3, r.gr) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy
  let jy = gy - 621
  const r = jalCal(jy)
  const jdn1f = g2d(gy, 3, r.gr)
  let jd: number, jm: number, k: number

  k = jdn - jdn1f
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31)
      jd = (k % 31) + 1
      return { jy, jm, jd }
    } else {
      k -= 186
    }
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }
  jm = 7 + div(k, 30)
  jd = (k % 30) + 1
  return { jy, jm, jd }
}

/** Gregorian Date → {jy, jm, jd} */
export function toJalali(d: Date) {
  const jdn = g2d(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return d2j(jdn)
}

/** Jalali (jy, jm, jd) → Gregorian Date (local midnight) */
export function toGregorian(jy: number, jm: number, jd: number): Date {
  const jdn = j2d(jy, jm, jd)
  const g = d2g(jdn)
  return new Date(g.gy, g.gm - 1, g.gd)
}

/** "1403-07" style jalali month key for a Date */
export function jalaliMonthKey(d: Date) {
  const j = toJalali(d)
  return `${j.jy}-${String(j.jm).padStart(2, '0')}`
}

/** Start (inclusive) & end (exclusive) of the jalali month containing `d` */
export function jalaliMonthRange(d: Date) {
  const j = toJalali(d)
  const start = toGregorian(j.jy, j.jm, 1)
  const nextM = j.jm === 12 ? 1 : j.jm + 1
  const nextY = j.jm === 12 ? j.jy + 1 : j.jy
  const end = toGregorian(nextY, nextM, 1)
  return { start, end, jy: j.jy, jm: j.jm }
}
