/* Score formatting, shared by the machine glass, the phone and the documents.
   The brief's range is 0 to 999,999.000: six digits, a separator and three decimals. The whole number is the event,
   so the three decimals are set smaller and quieter (class "dec"). html[data-decimals="off"] shows whole points only
   (the Customise panel's Score format control); any other value shows the full length. */
(() => {
  'use strict'

  const MAX = 999999.999
  const on = () => document.documentElement.dataset.decimals !== 'off'
  const clamp = (n) => Math.max(0, Math.min(MAX, Number(n) || 0))

  function split(n) {
    const v = clamp(n)
    let whole = Math.floor(v)
    let dec = Math.round((v - whole) * 1000)
    if (dec === 1000) { whole += 1; dec = 0 }
    return { whole: whole.toLocaleString('en-US'), dec: String(dec).padStart(3, '0') }
  }

  window.PunchFormat = {
    // true when the three decimals show
    decimals: on,
    // plain text, for textContent, aria labels and counting: "999,999.000" or "999,999"
    score(n, forceDecimals) {
      const s = split(n)
      return (forceDecimals ?? on()) ? `${s.whole}.${s.dec}` : s.whole
    },
    // markup with the decimals set apart, for display: 999,999<span class="dec">.000</span>
    scoreHTML(n, forceDecimals) {
      const s = split(n)
      return (forceDecimals ?? on()) ? `${s.whole}<span class="dec">.${s.dec}</span>` : s.whole
    },
    // how many characters the display takes, for the big-number sizing rule (decimals count at their smaller size)
    width(n, decScale = 0.5) {
      const s = split(n)
      return s.whole.length + (on() ? (1 + s.dec.length) * decScale : 0)
    },
    // where a score ranks, from this machine out to the world. This machine is tonight's board (the example players at
    // Dubai machines, punchApp.leaders()); the bigger boards are their sizes times the share of players who beat the
    // score, which thins out sharply towards the top of the scale. So the top of the scale is first everywhere, and a
    // strong hit is a few places down here and some hundreds down in the world.
    ranks(n) {
      const s = clamp(n)
      const list = window.punchApp && window.punchApp.leaders ? window.punchApp.leaders() : []
      const here = list.filter((p) => /Dubai/.test(p.city || ''))
      const machine = Math.max(1, here.findIndex((p) => p.id === 'me') + 1)
      // bounded on both sides: a rank can never be better than first, nor worse than the board it sits on,
      // and an out-of-range score must not cube its way into a number with more digits than the card can hold
      const beat = 0.6 * Math.pow(Math.min(1, Math.max(0, 1 - s / 1000000)), 3)
      const city = Math.min(1204, Math.max(machine, Math.round(1204 * beat)))
      const country = Math.min(8930, Math.max(city, Math.round(8930 * beat)))
      const global = Math.min(63123, Math.max(country, Math.round(63123 * beat)))
      return { machine, city, country, global }
    },
    // a player's score with stable decimals derived from their name, for example data that only has whole points
    withDecimals(whole, seed) {
      let h = 0
      for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
      return Math.floor(Number(whole) || 0) + (h % 1000) / 1000
    },
  }
})()
