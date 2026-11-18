export const CAMPUS = {
  lat: Number(import.meta.env.VITE_CAMPUS_CENTER_LAT || 5.1128),
  lng: Number(import.meta.env.VITE_CAMPUS_CENTER_LNG || -1.2921),
  radius: Number(import.meta.env.VITE_CAMPUS_RADIUS_KM || 3.5)
};

export const BASE_FARE = Number(import.meta.env.VITE_BASE_FARE_GHS || 5);
export const PER_KM = Number(import.meta.env.VITE_FARE_PER_KM_GHS || 2);

export const money = n => `GH₵ ${Number(n || 0).toFixed(2)}`;

export function distanceKm(a, b) {
  if (!a || !b) return 0;
  const r = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

export function insideCampus(p) {
  if (!p) return false;
  return distanceKm(CAMPUS, p) <= CAMPUS.radius;
}

export const fareFor = km => BASE_FARE + km * PER_KM;

export const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map(x => x.trim().toLowerCase())
  .filter(Boolean);

export const campusPlaces = [
  {
    name: "Science Market",
    site: "New Site",
    lat: 5.1125,
    lng: -1.2922,
    type: "Landmark",
    desc: "Bustling student hub for food, stationery, banking, and quick campus shuttles.",
    image: "https://unsplash.com"
  },
  {
    name: "Sam Jonah Library",
    site: "New Site",
    lat: 5.1151,
    lng: -1.2934,
    type: "Library",
    desc: "UCC's main multi-story academic library and quiet study complex at New Site.",
    image: "/samjonah.jpg"
  },
  {
    name: "New Lecture Theater (NLT)",
    site: "New Site",
    lat: 5.1220,
    lng: -1.296083,
    type: "Lecture Theater",
    desc: "Major lecture complex hosting large undergraduate classes near Valco and Amamoma.",
    image: "https://unsplash.com"
  },
  {
    name: "CALC Lecture Theatre",
    site: "New Site",
    lat: 5.119457,
    lng: -1.291910,
    type: "Lecture Theater",
    desc: "Major lecture complex hosting large undergraduate classes near Valco and Amamoma.",
    image: "https://unsplash.com"
  },
  {
    name: "CANS (Science Building)",
    site: "New Site",
    lat: 5.116261,
    lng: -1.293603,
    type: "Lecture Theater",
    desc: "Major lecture complex hosting large undergraduate classes near Valco and Amamoma.",
    image: "https://unsplash.com"
  },
   {
    name: "Sandwich Lecture Theatre (SWLT)",
    site: "New Site",
    lat: 5.118089,
    lng: -1.298193,
    type: "Lecture Theater",
    desc: "Major lecture complex hosting large undergraduate classes near Valco and Amamoma.",
    image: "https://unsplash.com"
  },
   {
    name: "New Science Annex",
    site: "New Site",
    lat: 5.115064,
    lng: -1.294270,
    type: "Lecture Theater",
    desc: "Major lecture complex hosting large undergraduate classes near Valco and Amamoma.",
    image: "https://unsplash.com"
  },
   {
    name: "G - Block",
    site: "New Site",
    lat: 5.117453,
    lng: -1.292806,
    type: "Lecture Theater",
    desc: "Major lecture complex hosting large undergraduate classes near Valco and Amamoma.",
    image: "https://unsplash.com"
  },
  {
    name: "Administration Block",
    site: "New Site",
    lat: 5.1059,
    lng: -1.2948,
    type: "Administration",
    desc: "Central administrative offices, registry, and Vice-Chancellor's complex at Old Site.",
    image: "https://unsplash.com"
  },
  {
    name: "Oguaa Hall",
    site: "Old Site",
    lat: 5.1165,
    lng: -1.2908,
    type: "Hall",
    desc: "Premier mixed hall of residence located centrally at New Site.",
    image: "https://unsplash.com"
  },
  {
    name: "Adehye Hall",
    site: "Old Site",
    lat: 5.105306,
    lng: -1.286306,
    type: "Hall",
    desc: "Premier girls hall of residence located centrally at New Site.",
    image: "https://unsplash.com"
  },
  
  {
    name: "Valco Hall",
    site: "New Site",
    lat: 5.1181,
    lng: -1.2962,
    type: "Hall",
    desc: "Large residential hall close to the New Lecture Theater and Amamoma.",
    image: "https://unsplash.com"
  },
  {
    name: "SRC Hall",
    site: "New Site",
    lat: 5.133886,
    lng: -1.286950,
    type: "Hall",
    desc: "Large residential hall close to the New Lecture Theater and Amamoma.",
    image: "https://unsplash.com"
  },
  {
    name: "Superannuation Hall",
    site: "New Site",
    lat: 5.133522,
    lng: -1.288811,
    type: "Hall",
    desc: "Large residential hall close to the New Lecture Theater and Amamoma.",
    image: "https://unsplash.com"
  },
  {
    name: "Kwame Nkrumah Hall",
    site: "New Site",
    lat: 5.1181,
    lng: -1.2962,
    type: "Hall",
    desc: "Large residential hall close to the New Lecture Theater and Amamoma.",
    image: "https://unsplash.com"
  },
  {
    name: "Casford Hall",
    site: "New Site",
    lat: 5.1085,
    lng: -1.2960,
    type: "Hall",
    desc: "Historic all-male hall of residence situated at UCC Old Site.",
    image: "https://unsplash.com"
  },
  {
    name: "Atlantic Hall",
    site: "Old Site",
    lat: 5.1215,
    lng: -1.2903,
    type: "Hall",
    desc: "Vibrant hall of residence near the northern New Site academic zone.",
    image: "https://unsplash.com"
  },
  {
    name: "School of Business",
    site: "New Site",
    lat: 5.1138,
    lng: -1.2897,
    type: "Academic",
    desc: "Home to the UCC School of Business lecture halls and faculty offices.",
    image: "https://unsplash.com"
  },
  {
    name: "UCC Sports Complex",
    site: "New Site",
    lat: 5.1230,
    lng: -1.2930,
    type: "Sports",
    desc: "University stadium, athletics track, and indoor sports courts.",
    image: "https://unsplash.com"
  },
  {
    name: "Amamoma Gate",
    site: "New Site",
    lat: 5.1208,
    lng: -1.2983,
    type: "Gate",
    desc: "Main pedestrian and shuttle access point connecting campus to Amamoma hostels.",
    image: "https://unsplash.com"
  },
  {
    name: "SRC Secretariat",
    site: "New Site",
    lat: 5.1163,
    lng: -1.2925,
    type: "Student services",
    desc: "Students' Representative Council offices and student union center.",
    image: "https://unsplash.com"
  },
  {
    name: "Old Site Main Gate",
    site: "Old Site",
    lat: 5.1047,
    lng: -1.2918,
    type: "Gate",
    desc: "Primary southern entrance to UCC Old Site facing Cape Coast town.",
    image: "https://unsplash.com"
  }
];

export function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}
