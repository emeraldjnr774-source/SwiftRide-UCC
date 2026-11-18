import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where,
  onSnapshot, addDoc, serverTimestamp, orderBy, limit, increment
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import {
  CAMPUS, BASE_FARE, PER_KM, money, distanceKm,
  insideCampus, fareFor, adminEmails, campusPlaces
} from "./utils";
import {
  CarFront, MapPin, Navigation, Sun, Moon, LogOut, UserRound,
  ShieldCheck, Search, Clock3, CheckCircle2, Radio, MapPinned,
  Route as RouteIcon, Users, Power, ArrowRight, AlertCircle,
  Volume2, MessageSquare, Send, Phone, Star, Flag, X, BellRing, Compass
} from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {}
}

function useTheme() {
  const [dark, setDark] = useState(localStorage.getItem("sr-theme") === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("sr-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, () => setDark(v => !v)];
}

function usePosition() {
  const [pos, setPos] = useState(null);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("This browser does not support location.");
      setLocating(false);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      p => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(v);
        setLocating(false);
        setError(insideCampus(v) ? "" : "You appear to be outside the UCC campus service area.");
      },
      e => {
        setError(e.message || "Enable GPS location access to trace your pickup pin.");
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { pos, error, locating };
}

function MapView({ center, markers = [], path = [], onMapClick }) {
  const [map, setMap] = useState(null);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    if (!map || !window.google) return;
    const listener = map.addListener("click", e => {
      if (clickRef.current && e.latLng) {
        clickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    });
    return () => window.google.maps.event.removeListener(listener);
  }, [map]);

  useEffect(() => {
    if (!map || !window.google) return;
    if (markers.length > 1 || path.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend(m));
      path.forEach(p => bounds.extend(p));
      map.fitBounds(bounds, 70);
    } else if (markers.length === 1) {
      map.panTo(markers[0]);
      if (map.getZoom() < 16) map.setZoom(16);
    } else if (center) {
      map.panTo(center);
    }
  }, [map, center, markers, path]);

  useEffect(() => {
    if (!map || !window.google) return;
    const pins = markers.map((m, i) => {
      const isDriver = m.kind === "driver";
      const isYou = m.kind === "you";
      return new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map,
        title: m.label || `Location ${i + 1}`,
        label: isDriver
          ? undefined
          : { text: m.short || m.label?.slice(0, 1) || "•", color: "#fff", fontWeight: "700" },
        icon: isDriver
          ? {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: "#147b59",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2
            }
          : isYou
          ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2.5
            }
          : undefined
      });
    });

    let line;
    if (path.length > 1) {
      line = new window.google.maps.Polyline({
        path,
        map,
        strokeColor: "#18a77b",
        strokeOpacity: 0.95,
        strokeWeight: 5
      });
    }
    return () => {
      pins.forEach(p => p.setMap(null));
      line?.setMap(null);
    };
  }, [map, markers, path]);

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="map-placeholder">
        <MapPinned size={34} />
        <b>Google Map setup needed</b>
        <span>Add VITE_GOOGLE_MAPS_API_KEY to your .env file to show the live UCC map.</span>
      </div>
    );
  }

  return (
    <div className="map-wrap">
      <div
        ref={el => {
          if (el && !map && window.google) {
            setMap(
              new window.google.maps.Map(el, {
                center: center || CAMPUS,
                zoom: 16,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                clickableIcons: false
              })
            );
          }
        }}
        className="map-canvas"
      />
    </div>
  );
}

function Button({ children, variant = "primary", ...p }) {
  return <button className={cx("btn", variant)} {...p}>{children}</button>;
}

function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark"><CarFront size={22} /></span>
      <span>Swift<span className="brand-accent">Ride</span><small>UCC CAMPUS</small></span>
    </Link>
  );
}

function Header({ user, dark, toggle }) {
  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "";
  return (
    <header className="topbar">
      <Brand />
      <nav>
        {user && <Link to="/app">Dashboard</Link>}
        <Link to="/explore">Explore</Link>
        <Link to="/how-it-works">How it works</Link>
      </nav>
      <div className="top-actions">
        <button className="icon-btn" onClick={toggle} title="Toggle theme">
          {dark ? <Sun /> : <Moon />}
        </button>
        {user ? (
          <>
            <span className="user-chip">
              <img src={user.photoURL || ""} alt="" />
              {firstName}
            </span>
            <button className="icon-btn" onClick={() => signOut(auth)} title="Sign out">
              <LogOut />
            </button>
          </>
        ) : (
          <Link className="btn primary small" to="/login">
            Get started <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </header>
  );
}

const CAMPUS_DESTINATIONS = [
  {
    name: "Sam Jonah Library",
    site: "New Site",
    desc: "UCC's main multi-story academic library and central study hub.",
    img: "https://unsplash.com"
  },
  {
    name: "New Lecture Theater (NLT)",
    site: "New Site",
    desc: "Large modern lecture complex hosting faculty-wide classes and exams.",
    img: "https://unsplash.com"
  },
  {
    name: "Science Market & Faculty",
    site: "Old Site / Science",
    desc: "Busy campus transit hub connecting Old Site, Science, and New Site.",
    img: "https://unsplash.com"
  },
  {
    name: "Halls of Residence (Valco, Oguaa, Casford, Atlantic)",
    site: "Old & New Site",
    desc: "Direct doorstep pickup and drop-off across all major UCC student halls.",
    img: "https://unsplash.com"
  },
  {
    name: "Administration Block",
    site: "Old Site",
    desc: "Central university administration, registry, and student services.",
    img: "https://unsplash.com"
  },
  {
    name: "UCC Sports Complex",
    site: "New Site",
    desc: "Main stadium, athletics track, and recreational courts on campus.",
    img: "https://unsplash.com"
  }
];

function ExplorePage({ user }) {
  return (
    <main className="info-page">
      <div className="section-heading">
        <span className="eyebrow"><Compass size={14} /> EXPLORE UCC CAMPUS</span>
        <h2>Popular campus destinations & lecture theaters</h2>
        <p className="muted">Tap any landmark or drop a custom pin anywhere inside UCC campus to book a ride.</p>
      </div>
      <div className="explore-grid">
        {CAMPUS_DESTINATIONS.map(place => (
          <article className="explore-card" key={place.name}>
            <div className="explore-img" style={{ backgroundImage: `url('${place.img}')` }}>
              <span>{place.site}</span>
            </div>
            <div className="explore-body">
              <h3>{place.name}</h3>
              <p>{place.desc}</p>
              <Link to={user ? "/app" : "/login"} className="btn secondary small">
                Ride here <ArrowRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function HowItWorksPage({ user }) {
  return (
    <main className="info-page">
      <div className="section-heading">
        <span className="eyebrow">HOW SWIFTRIDE WORKS</span>
        <h2>Everything you need to know about moving around UCC</h2>
        <p className="muted">Built exclusively for students, staff, and verified campus drivers at the University of Cape Coast.</p>
      </div>
      <div className="steps">
        <article>
          <span>01</span>
          <MapPin />
          <h3>Trace location & pick destination</h3>
          <p>Allow GPS to drop your live pickup pin, search any campus building, or tap directly on the map to set your drop-off spot.</p>
        </article>
        <article>
          <span>02</span>
          <MessageSquare />
          <h3>Track & message your driver</h3>
          <p>Watch online campus drivers move in real time, get an instant alert when your driver is within 100m, and chat or call directly.</p>
        </article>
        <article>
          <span>03</span>
          <Star />
          <h3>Confirm, complete & rate</h3>
          <p>Both rider and driver confirm meet-up and trip completion for safety, then rate your driver or report any issue.</p>
        </article>
      </div>
      <div className="guide-box">
        <h3>Key Safety & Campus Rules</h3>
        <ul>
          <li><b>Campus-only geofence:</b> Rides are restricted within a {CAMPUS.radius} km radius of UCC (Old Site, New Site, Amamoma, and Science).</li>
          <li><b>One active ride at a time:</b> Complete or cancel your current trip before placing another request.</li>
          <li><b>Transparent pricing:</b> Base fare of {money(BASE_FARE)} + {money(PER_KM)} per km shown upfront before booking.</li>
        </ul>
        <Link to={user ? "/app" : "/login"} className="btn primary">
          {user ? "Back to Dashboard" : "Get started now"} <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}

const HERO_SLIDES = [
  {
    title: "Sam Jonah Library",
    tag: "CENTRAL CAMPUS · STUDY HUB",
    route: "Valco Hall → Sam Jonah Library",
    fare: "GH₵ 4.50",
    eta: "2 min away",
    img: "/samjonah.jpg"
  },
  {
    title: "UCC Main Gate & Shuttle Bay",
    tag: "SOUTH CAMPUS · MAIN ENTRANCE",
    route: "Old Site → UCC Main Gate",
    fare: "GH₵ 5.20",
    eta: "3 min away",
    img: "/maingate.jpg"
  },
  {
    title: "New Site Lecture Complex",
    tag: "NORTH CAMPUS · ACADEMIC BLOCK",
    route: "Science Market → New Site",
    fare: "GH₵ 6.40",
    eta: "4 min away",
    img: "/nlt.jpg"
  },
  {
    title: "Valco & Casford Halls",
    tag: "STUDENT RESIDENCE · SHUTTLE ROUTE",
    route: "Casford Hall → Calc / Lecture Hall",
    fare: "GH₵ 5.00",
    eta: "2 min away",
    img: "/valco.jpg"
  }
];


function Landing() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const current = HERO_SLIDES[slide];

  return (
    <div className="landing">
      <section className="hero">
        <div>
          <div className="eyebrow"><span className="pulse" /> LIVE ON UCC CAMPUS · CAPE COAST</div>
          <h1>Your campus.<br />Your ride.<br /><em>One simple move.</em></h1>
          <p>Request verified student and campus drivers between Old Site, New Site, halls of residence, and lecture theaters in seconds.</p>
          <div className="hero-actions">
            <Link to="/signup" className="btn primary">Book a ride <ArrowRight size={17} /></Link>
            <Link to="/signup" className="btn secondary">Drive with SwiftRide</Link>
          </div>
          <div className="hero-note"><ShieldCheck size={16} /> Google-verified accounts · Live GPS tracking · Transparent GH₵ fares</div>
        </div>

        <div className="hero-visual">
          <div className="hero-image">
            {HERO_SLIDES.map((item, idx) => (
              <div
                key={item.title}
                className={cx("hero-slide", idx === slide && "active")}
                style={{
                  backgroundImage: `linear-gradient(160deg, rgba(18,53,44,.55), rgba(28,99,77,.45)), url('${item.img}')`
                }}
              />
            ))}
            <div className="image-overlay">
              <span>{current.tag}</span>
              <b>{current.title}</b>
              <div className="slide-dots">
                {HERO_SLIDES.map((item, idx) => (
                  <button
                    key={item.title}
                    type="button"
                    aria-label={item.title}
                    className={cx("slide-dot", idx === slide && "active")}
                    onClick={() => setSlide(idx)}
                  />
                ))}
              </div>
            </div>
          </div>

         
        </div>
      </section>

      <section className="stats">
        <div><b>24/7</b><span>Campus coverage</span></div>
        <div><b>GPS</b><span>Live driver pins</span></div>
        <div><b>GH₵</b><span>Distance-based fares</span></div>
        <div><b>UCC</b><span>Built for Cape Coast</span></div>
      </section>

      <section className="how-section">
        <div className="section-heading">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>Three steps from hostel to lecture hall.</h2>
        </div>
        <div className="steps">
          <article><span>01</span><MapPin /><br /><h3>Pick your destination</h3><p>Your GPS pin loads automatically. Search any UCC hall, library, or gate.</p></article>
          <article><span>02</span><CarFront /><br /><h3>Match with a campus driver</h3><p>See online drivers on the live map and confirm when you meet at the pickup point.</p></article>
          <article><span>03</span><CheckCircle2 /><br /><h3>Arrive & confirm</h3><p>Follow the live route together and both confirm when the trip is complete.</p></article>
        </div>
      </section>

      <footer>
        <b>SwiftRide UCC</b>
        <span>Campus mobility platform for the University of Cape Coast.</span>
      </footer>
    </div>

  );
}


function AuthPage({ mode = "login" }) {
  const nav = useNavigate();
  const [role, setRole] = useState(new URLSearchParams(location.search).get("role") === "driver" ? "driver" : "passenger");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function google() {
    setBusy(true);
    setErr("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const ref = doc(db, "users", result.user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: result.user.uid,
          name: result.user.displayName,
          email: result.user.email,
          photo: result.user.photoURL,
          role,
          createdAt: serverTimestamp(),
          status: role === "driver" ? "offline" : "active",
          profileComplete: role === "passenger"
        });
      } else if (snap.data().role !== role) {
        throw new Error(`This Google account is already registered as ${snap.data().role}.`);
      }
      nav("/app");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <Brand />
        <div className="auth-content">
          <span className="eyebrow">WELCOME TO SWIFTRIDE</span>
          <h1>{mode === "login" ? "Good to see you." : "Join the campus ride network."}</h1>
          <p>Continue securely with your Google account.</p>
          <label className="field-label">I want to join as</label>
          <div className="role-picker">
            <button className={cx(role === "passenger" && "selected")} onClick={() => setRole("passenger")}>
              <UserRound />Passenger
            </button>
            <button className={cx(role === "driver" && "selected")} onClick={() => setRole("driver")}>
              <CarFront />Driver
            </button>
          </div>
          <Button onClick={google} disabled={busy} className="google-btn">
            {busy ? "Connecting..." : <><GoogleMark /> Continue with Google</>}
          </Button>
          {err && <p className="error"><AlertCircle size={15} />{err}</p>}
          <small className="legal">By continuing, you agree to use SwiftRide responsibly and only within UCC campus.</small>
        </div>
        <Link to="/" className="back-link">← Back to home</Link>
      </div>
      <div className="auth-aside">
        <div className="aside-photo">
          <span>THE UNIVERSITY OF CAPE COAST</span>
          <h2>Campus life<br />keeps moving.</h2>
        </div>
        <p>From lecture halls to halls of residence, make every campus trip easier.</p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.3A20 20 0 0 0 24 44z" />
      <path fill="#4A90E2" d="M12.8 27.7a12 12 0 0 1 0-7.4V15H5.9a20 20 0 0 0 0 17.9z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.9 15l6.9 5.3c1.6-4.7 6-8.2 11.2-8.2z" />
    </svg>
  );
}

function ProfileGate({ user, onDone }) {
  const [car, setCar] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [years, setYears] = useState("");
  const [phone, setPhone] = useState("");
  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "Driver";

  async function save(e) {
    e.preventDefault();
    await updateDoc(doc(db, "users", user.uid), {
      carMake: car,
      carModel: model,
      plate,
      experience: Number(years),
      phone,
      profileComplete: true,
      status: "offline"
    });
    onDone();
  }

  return (
    <div className="profile-gate">
      <div className="form-card">
        <span className="eyebrow">DRIVER REGISTRATION</span>
        <h2>One more step, {firstName}.</h2>
        <p>Tell passengers a little about your vehicle and experience.</p>
        <form onSubmit={save} className="form-grid">
          <label>Vehicle make<input required value={car} onChange={e => setCar(e.target.value)} placeholder="e.g. Toyota" /></label>
          <label>Vehicle model<input required value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Corolla" /></label>
          <label>Number plate<input required value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="e.g. GT 1234-24" /></label>
          <label>Years of driving experience<input required type="number" min="0" max="70" value={years} onChange={e => setYears(e.target.value)} /></label>
          <label className="full">Contact phone<input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone number" /></label>
          <Button type="submit">Complete driver profile <ArrowRight size={16} /></Button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ profile, active, setActive }) {
  const links =
    profile.role === "driver"
      ? [["Overview", "overview"], ["Ride requests", "requests"], ["My trips", "trips"]]
      : profile.role === "admin"
      ? [["Overview", "overview"], ["Users", "users"], ["All rides", "rides"]]
      : [["Find a ride", "overview"], ["My trips", "trips"]];

  return (
    <aside className="sidebar">
      <div className="side-user no-pic">
        <div>
          <b>{profile.name}</b>
          <small>{profile.role}</small>
        </div>
      </div>
      <span className="side-label">WORKSPACE</span>
      {links.map(([label, key]) => (
        <button key={key} className={cx("side-link", active === key && "active")} onClick={() => setActive(key)}>
          {key === "overview" ? <MapPinned /> : key === "requests" ? <Radio /> : key === "trips" ? <RouteIcon /> : key === "users" ? <Users /> : <CarFront />}
          {label}
        </button>
      ))}
      <div className="side-bottom">
        <span className="campus-tag"><MapPin size={14} /> UCC campus only</span>
        <button className="side-link" onClick={() => signOut(auth)}><LogOut />Sign out</button>
      </div>
    </aside>
  );
}

function RideChat({ rideId, user, role }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "rides", rideId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [rideId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(msgText) {
    const clean = (msgText ?? text).trim();
    if (!clean) return;
    if (!msgText) setText("");
    const firstName = user?.displayName ? user.displayName.split(" ")[0] : role;
    await addDoc(collection(db, "rides", rideId, "messages"), {
      senderId: user.uid,
      senderName: firstName,
      senderRole: role,
      text: clean,
      createdAt: serverTimestamp()
    });
  }

  const presets = role === "driver"
    ? ["I'm on my way", "Arriving in 2 mins", "I'm at the pickup spot"]
    : ["I'm waiting outside", "Please wait 2 mins", "Wearing a dark top"];

  return (
    <div className="chat-panel">
      <div className="chat-head">
        <b><MessageSquare size={15} /> Direct Ride Chat</b>
        <span>Live messages</span>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && <p className="muted">Send a quick message to coordinate your campus meetup.</p>}
        {messages.map(m => (
          <div key={m.id} className={cx("chat-bubble", m.senderId === user.uid ? "mine" : "theirs")}>
            <small>{m.senderName} ({m.senderRole})</small>
            <p>{m.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-presets">
        {presets.map(p => (
          <button type="button" key={p} onClick={() => sendMessage(p)}>{p}</button>
        ))}
      </div>
      <form className="chat-form" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
        <Button type="submit" variant="primary"><Send size={15} /></Button>
      </form>
    </div>
  );
}

function Dashboard({ user, profile }) {
  const [tab, setTab] = useState("overview");
  const { pos, error, locating } = usePosition();
  const [drivers, setDrivers] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [destPlace, setDestPlace] = useState(null);
  const [origin, setOrigin] = useState("My current location");
  const [search, setSearch] = useState("");
  const [googleResults, setGoogleResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(profile.status === "online");
  const [newReqPopup, setNewReqPopup] = useState(null);
  const [arrivalAlert, setArrivalAlert] = useState(false);
  const [rateModal, setRateModal] = useState(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reportModal, setReportModal] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const knownReqIds = useRef(new Set());
  const firstReqLoad = useRef(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "driver"), where("status", "==", "online"));
    return onSnapshot(q, s => setDrivers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    const q =
      profile.role === "driver"
        ? query(collection(db, "rides"), where("driverId", "==", user.uid))
        : profile.role === "admin"
        ? query(collection(db, "rides"), orderBy("createdAt", "desc"), limit(100))
        : query(collection(db, "rides"), where("passengerId", "==", user.uid));
    return onSnapshot(q, s =>
      setMyRides(
        s.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      )
    );
  }, [profile.role, user.uid]);

  useEffect(() => {
    if (profile.role !== "driver") return;
    const q = query(collection(db, "rides"), where("status", "==", "requested"));
    return onSnapshot(q, s => {
      const list = s.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.passengerId !== user.uid)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      if (!firstReqLoad.current) {
        const brandNew = list.find(r => !knownReqIds.current.has(r.id));
        if (brandNew && online) {
          setNewReqPopup(brandNew);
          playChime();
        }
      }
      knownReqIds.current = new Set(list.map(r => r.id));
      firstReqLoad.current = false;
      setOpenRequests(list);
    });
  }, [profile.role, user.uid, online]);

  useEffect(() => {
    if (!pos || profile.role !== "driver" || !online) return;
    updateDoc(doc(db, "users", user.uid), {
      location: pos,
      locationUpdatedAt: serverTimestamp()
    }).catch(() => {});
  }, [pos, online, profile.role, user.uid]);

  const activeRide = myRides.find(r => !["completed", "cancelled"].includes(r.status));

  useEffect(() => {
    if (!pos || profile.role !== "driver" || !activeRide) return;
    updateDoc(doc(db, "rides", activeRide.id), { driverLocation: pos }).catch(() => {});
  }, [pos, profile.role, activeRide?.id]);

  useEffect(() => {
    if (profile.role !== "passenger" || !activeRide || activeRide.status !== "accepted") {
      setArrivalAlert(false);
      return;
    }
    const assignedDriver = drivers.find(d => d.id === activeRide.driverId);
    const dLoc = assignedDriver?.location || activeRide.driverLocation;
    if (dLoc && activeRide.origin) {
      const dist = distanceKm(dLoc, activeRide.origin);
      if (dist <= 0.1 && !arrivalAlert) {
        setArrivalAlert(true);
        playChime();
      }
    }
  }, [profile.role, activeRide, drivers, arrivalAlert]);

  useEffect(() => {
    const term = search.trim();
    if (!term || term.length < 2 || !window.google?.maps?.places) {
      setGoogleResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const svc = new window.google.maps.places.AutocompleteService();
      svc.getPlacePredictions(
        {
          input: `${term} UCC Cape Coast`,
          locationBias: {
            center: { lat: CAMPUS.lat, lng: CAMPUS.lng },
            radius: CAMPUS.radius * 1000
          }
        },
        preds => setGoogleResults(preds || [])
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function selectGooglePrediction(pred) {
    if (!window.google?.maps?.Geocoder) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId: pred.place_id }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        if (!insideCampus(coords)) {
          setNotice("Selected search result is outside UCC campus boundaries.");
          return;
        }
        const label = pred.structured_formatting?.main_text || pred.description;
        setDestPlace({ name: label, lat: coords.lat, lng: coords.lng, site: "Campus Search" });
        setSearch(label);
        setGoogleResults([]);
      }
    });
  }

  function handleMapClick(coords) {
    if (profile.role !== "passenger" || activeRide) return;
    if (!insideCampus(coords)) {
      setNotice("Please drop your destination pin inside the UCC campus service area.");
      return;
    }
    const fallbackName = `Pinned Spot (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
    setDestPlace({ name: fallbackName, lat: coords.lat, lng: coords.lng, site: "Pinned on Map" });
    setSearch(fallbackName);

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: coords }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const cleanName = results[0].formatted_address.split(",")[0];
          setDestPlace({ name: cleanName, lat: coords.lat, lng: coords.lng, site: "Pinned on Map" });
          setSearch(cleanName);
        }
      });
    }
  }

  const campusMatches = campusPlaces.filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) || p.site.toLowerCase().includes(search.toLowerCase())
  );

  const from = origin === "My current location" ? pos : campusPlaces.find(p => p.name === origin);
  const to = destPlace;
  const km = from && to ? distanceKm(from, to) : 0;
  const fare = fareFor(km);

    async function requestRide() {
    if (activeRide) {
      setNotice("You already have an active ride. Complete or cancel it first.");
      return;
    }
    if (!from) {
      setNotice("Waiting for your GPS location pin—allow location access or pick a campus landmark.");
      return;
    }
    if (!insideCampus(from)) {
      setNotice("Your pickup point must be inside UCC campus.");
      return;
    }
    if (!to) {
      setNotice("Choose or pin a valid campus destination.");
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(db, "rides"), {
        passengerId: user.uid,
        passengerName: profile.name,
        passengerPhoto: profile.photo || "",
        originName: origin === "My current location" ? "Current GPS Location" : origin,
        origin: { lat: from.lat, lng: from.lng },
        destinationName: to.name,
        destination: { lat: to.lat, lng: to.lng },
        distanceKm: Number(km.toFixed(2)),
        fare: Number(fare.toFixed(2)),
        status: "requested",
        createdAt: serverTimestamp(),
        passengerMet: false,
        driverMet: false,
        passengerCompleted: false,
        driverCompleted: false
      });
      setNotice("Ride request sent to online campus drivers.");
      setDestPlace(null);
      setSearch("");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelRide(r) {
    await updateDoc(doc(db, "rides", r.id), {
      status: "cancelled",
      cancelledBy: profile.role,
      cancelledAt: serverTimestamp()
    });
    setNotice("Ride cancelled.");
  }

  async function acceptRide(r) {
    if (profile.role !== "driver" || r.passengerId === user.uid) return;
    if (activeRide) {
      setNotice("Complete your current active ride before accepting another.");
      return;
    }
    await updateDoc(doc(db, "rides", r.id), {
      driverId: user.uid,
      driverName: profile.name,
      driverPhone: profile.phone || "",
      driverVehicle: `${profile.carMake} ${profile.carModel} (${profile.plate})`,
      driverLocation: pos || null,
      status: "accepted",
      acceptedAt: serverTimestamp()
    });
    setNewReqPopup(null);
    setNotice("Ride accepted! Chat with or call your passenger to meet up.");
  }

 async function confirmField(r, field) {
  if (field === "passengerCompleted" || field === "driverCompleted") {
    if (!pos) {
      setNotice("Waiting for your GPS location before confirming completion.");
      return;
    }
    const distToDestKm = distanceKm(pos, r.destination);
    if (distToDestKm > 0.15) {
      setNotice(`You are still ${(distToDestKm * 1000).toFixed(0)}m away from ${r.destinationName}. Arrive at the destination before completing.`);
      return;
    }
  }

  const update = { [field]: true };
  const next = { ...r, ...update };
  if ((field === "passengerMet" && next.driverMet) || (field === "driverMet" && next.passengerMet)) {
    update.status = "in_progress";
  }
  if ((field === "passengerCompleted" && next.driverCompleted) || (field === "driverCompleted" && next.passengerCompleted)) {
    update.status = "completed";
  }
  await updateDoc(doc(db, "rides", r.id), update);
  if (update.status === "completed" && profile.role === "passenger") {
    setRateModal(r);
  }
}


  async function submitRating(e) {
    e.preventDefault();
    if (!rateModal?.driverId) return;
    await updateDoc(doc(db, "users", rateModal.driverId), {
      ratingSum: increment(ratingVal),
      ratingCount: increment(1)
    });
    await updateDoc(doc(db, "rides", rateModal.id), {
      rated: true,
      driverRating: ratingVal
    });
    setRateModal(null);
    setNotice("Thanks for rating your driver!");
  }

  async function submitReport(e) {
    e.preventDefault();
    if (!reportModal || !reportReason.trim()) return;
    await addDoc(collection(db, "reports"), {
      rideId: reportModal.id,
      reporterId: user.uid,
      reporterName: profile.name,
      driverId: reportModal.driverId || "",
      driverName: reportModal.driverName || "Unknown",
      reason: reportReason.trim(),
      createdAt: serverTimestamp()
    });
    setReportModal(null);
    setReportReason("");
    setNotice("Driver report submitted to campus administrators.");
  }

  function speakDirections() {
    if (!activeRide) return;
    const msg = `Your SwiftRide trip to ${activeRide.destinationName}. Follow the highlighted route on the map. Please stay on campus paths and follow campus signs.`;
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(msg));
    }
  }

  async function toggleOnline() {
    const next = !online;
    setOnline(next);
    await updateDoc(doc(db, "users", user.uid), {
      status: next ? "online" : "offline",
      ...(next && pos ? { location: pos, locationUpdatedAt: serverTimestamp() } : {})
    });
  }
    const liveDriverMarkers = drivers
    .filter(d => d.location?.lat && d.location?.lng)
    .map(d => ({
      lat: d.location.lat,
      lng: d.location.lng,
      label: `${d.name} (${d.carMake} ${d.carModel})`,
      kind: "driver"
    }));

  const bookingMarkers = [
    ...(from ? [{ lat: from.lat, lng: from.lng, label: "Pickup", short: "P", kind: "you" }] : []),
    ...(to ? [{ lat: to.lat, lng: to.lng, label: to.name, short: "D" }] : []),
    ...liveDriverMarkers
  ];

  const bookingPath = from && to ? [{ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }] : [];

  const assignedDriverLive = activeRide
    ? drivers.find(d => d.id === activeRide.driverId)?.location || activeRide.driverLocation
    : null;

  const activeRideMarkers = activeRide
    ? [
        { lat: activeRide.origin.lat, lng: activeRide.origin.lng, label: "Pickup", short: "A" },
        { lat: activeRide.destination.lat, lng: activeRide.destination.lng, label: "Destination", short: "B" },
        ...(assignedDriverLive ? [{ lat: assignedDriverLive.lat, lng: assignedDriverLive.lng, label: "Driver", kind: "driver" }] : [])
      ]
    : [];

  return (
    <div className="dashboard-shell">
      <Sidebar profile={profile} active={tab} setActive={setTab} />
      <main className="dash-main">
        <div className="dash-top">
          <div>
            <span className="eyebrow">SWIFTRIDE / {profile.role.toUpperCase()}</span>
            <h1>{profile.role === "driver" ? "Driver dashboard" : profile.role === "admin" ? "Admin overview" : "Where are you heading?"}</h1>
          </div>
        </div>

        {notice && (
          <div className="notice" onClick={() => setNotice("")}>
            <span>{notice}</span>
            <button>×</button>
          </div>
        )}

        {arrivalAlert && activeRide && (
          <div className="arrival-banner">
            <div>
              <BellRing size={18} />
              <div>
                <b>Your driver is nearby / has arrived!</b>
                <small>{activeRide.driverName} ({activeRide.driverVehicle}) is within 100m of your pickup spot.</small>
              </div>
            </div>
            <button onClick={() => setArrivalAlert(false)}><X size={16} /></button>
          </div>
        )}

        {newReqPopup && profile.role === "driver" && (
          <div className="driver-popup">
            <div className="popup-head">
              <b><BellRing size={16} /> New Ride Request!</b>
              <button onClick={() => setNewReqPopup(null)}><X size={16} /></button>
            </div>
            <p><b>{newReqPopup.passengerName}</b> · {newReqPopup.originName} → {newReqPopup.destinationName}</p>
            <small>{newReqPopup.distanceKm} km · {money(newReqPopup.fare)}</small>
            <div className="popup-actions">
              <Button onClick={() => acceptRide(newReqPopup)}>Accept Ride</Button>
              <Button variant="secondary" onClick={() => setNewReqPopup(null)}>Dismiss</Button>
            </div>
          </div>
        )}

        {profile.role === "driver" && (
          <div className="online-banner">
            <div>
              <span className={cx("status-dot", online && "on")} />
              <b>{online ? "You're online" : "You're offline"}</b>
              <small>{online ? "Passengers nearby can see you on the map and send ride requests." : "Go online to receive live ride requests."}</small>
            </div>
            <Button variant={online ? "danger" : "primary"} onClick={toggleOnline}>
              <Power size={16} />{online ? "Go offline" : "Go online"}
            </Button>
          </div>
        )}

        {profile.role === "passenger" && tab === "overview" && (
          <>
            <section className="booking-layout">
              <div className="booking-card">
                <span className="eyebrow">PLAN YOUR RIDE</span>
                <h2>Where to?</h2>
                <p className="muted">
                  {activeRide
                    ? "Finish or cancel your active ride before booking a new one."
                    : "Search any UCC building or tap directly on the map to drop a destination pin."}
                </p>

                <label className="field-label">Pickup point</label>
                <select value={origin} onChange={e => setOrigin(e.target.value)} disabled={!!activeRide}>
                  <option value="My current location">
                    {locating ? "Tracing my GPS location..." : pos ? "My current location (GPS pinned)" : "My current location (GPS unavailable)"}
                  </option>
                  {campusPlaces.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>

                <label className="field-label">Destination (Search or click map)</label>
                <div className="search-box">
                  <Search size={17} />
                  <input
                    disabled={!!activeRide}
                    placeholder="Type any UCC hall, theater, gate, or landmark..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      if (!e.target.value) setDestPlace(null);
                    }}
                  />
                  {search && !activeRide && (
                    <button type="button" className="clear-x" onClick={() => { setSearch(""); setDestPlace(null); }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="place-results">
                  {googleResults.map(pred => (
                    <button
                      type="button"
                      key={pred.place_id}
                      className="place-option"
                      onClick={() => selectGooglePrediction(pred)}
                    >
                      <Search size={15} />
                      <span>
                        <b>{pred.structured_formatting?.main_text || pred.description}</b>
                        <small>{pred.structured_formatting?.secondary_text || "UCC Campus Search"}</small>
                      </span>
                    </button>
                  ))}
                  {(search ? campusMatches : campusPlaces.slice(0, 5)).map(p => (
                    <button
                      type="button"
                      disabled={!!activeRide}
                      key={p.name}
                      className={cx("place-option", destPlace?.name === p.name && "chosen")}
                      onClick={() => { setDestPlace(p); setSearch(p.name); setGoogleResults([]); }}
                    >
                      <MapPin size={16} />
                      <span><b>{p.name}</b><small>{p.site} · {p.type}</small></span>
                      {destPlace?.name === p.name && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
                {error && <p className="location-warning"><AlertCircle size={14} />{error}</p>}

                <div className="fare-preview">
                  <div><small>ESTIMATED DISTANCE</small><b>{km ? km.toFixed(2) + " km" : "—"}</b></div>
                  <div><small>ESTIMATED FARE</small><b>{km ? money(fare) : "—"}</b></div>
                </div>

                <Button
                  disabled={!!activeRide || !destPlace || !from || !insideCampus(from) || busy}
                  onClick={requestRide}
                >
                  {activeRide ? "Active ride in progress" : busy ? "Sending request..." : "Request a ride"} <ArrowRight size={16} />
                </Button>
                <small className="tiny-note">Fare = GH₵ {BASE_FARE.toFixed(2)} base + GH₵ {PER_KM.toFixed(2)} per km.</small>
              </div>

              <div className="map-panel">
                <div className="map-head">
                  <b><MapPinned size={17} /> UCC campus map (Tap map to pin destination)</b>
                  <span><i className="live-dot" /> {drivers.length} drivers live</span>
                </div>
                <MapView center={from || CAMPUS} markers={bookingMarkers} path={bookingPath} onMapClick={handleMapClick} />
                <div className="map-caption">
                  <MapPin size={15} /> Blue dot = Your GPS · Green arrows = Live online drivers · Click map to drop destination pin
                </div>
              </div>
            </section>

            <section className="nearby">
              <div className="section-row">
                <div>
                  <span className="eyebrow">CAMPUS MOBILITY</span>
                  <h2>Drivers online <span className="count">{drivers.length}</span></h2>
                </div>
              </div>
              {drivers.length ? (
                <div className="driver-grid">
                  {drivers.map(d => {
                    const avg = d.ratingCount ? (d.ratingSum / d.ratingCount).toFixed(1) : "New";
                    return (
                      <article className="driver-card" key={d.id}>
                        <div>
                          <b>{d.name} · ★ {avg}</b>
                          <small>{d.carMake} {d.carModel} · {d.plate}</small>
                          <small>{d.experience || 0} yrs exp</small>
                        </div>
                        <span className="online-pill">Online</span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">No drivers are online right now. You can still send a request.</p>
              )}
            </section>
          </>
        )}

        {profile.role === "driver" && tab === "overview" && (
          <>
            <section className="driver-overview">
              <div className="metric-card"><Radio /><small>YOUR STATUS</small><b>{online ? "Online" : "Offline"}</b></div>
              <div className="metric-card"><RouteIcon /><small>OPEN REQUESTS</small><b>{openRequests.length}</b></div>
              <div className="metric-card"><CarFront /><small>YOUR VEHICLE</small><b>{profile.carMake} {profile.carModel}</b></div>
            </section>
            <section className="map-panel driver-map">
              <div className="map-head">
                <b><MapPinned size={17} /> Your live driver location</b>
                <span>{pos && insideCampus(pos) ? "Broadcasting on campus" : "Location unavailable"}</span>
              </div>
              <MapView center={pos || CAMPUS} markers={pos ? [{ ...pos, label: "You", kind: "driver" }] : []} />
            </section>
            <section className="nearby">
              <h2>New ride requests <span className="count">{openRequests.length}</span></h2>
              <RideList rides={openRequests} isDriver onAccept={acceptRide} />
            </section>
          </>
        )}

        {profile.role === "admin" && tab === "overview" && (
          <>
            <section className="driver-overview">
              <div className="metric-card"><Users /><small>DRIVERS ONLINE</small><b>{drivers.length}</b></div>
              <div className="metric-card"><RouteIcon /><small>TOTAL RIDES</small><b>{myRides.length}</b></div>
              <div className="metric-card"><Clock3 /><small>ACTIVE RIDES</small><b>{myRides.filter(r => !["completed", "cancelled"].includes(r.status)).length}</b></div>
            </section>
            <section className="map-panel">
              <div className="map-head"><b>Live campus drivers</b><span>{drivers.length} online</span></div>
              <MapView center={CAMPUS} markers={liveDriverMarkers} />
            </section>
          </>
        )}

        {tab === "requests" && profile.role === "driver" && (
          <section className="nearby">
            <h2>Live ride requests <span className="count">{openRequests.length}</span></h2>
            <RideList rides={openRequests} isDriver onAccept={acceptRide} />
          </section>
        )}

        {tab === "trips" && (
          <section className="nearby">
            <h2>Ride history</h2>
            <RideList
              rides={myRides}
              isDriver={false}
              onRate={profile.role === "passenger" ? r => setRateModal(r) : null}
              onReport={profile.role === "passenger" ? r => setReportModal(r) : null}
            />
          </section>
        )}

        {tab === "users" && profile.role === "admin" && <AdminUsers />}
        {tab === "rides" && profile.role === "admin" && (
          <section className="nearby"><h2>All campus rides</h2><RideList rides={myRides} isDriver={false} /></section>
        )}
        {activeRide && (
          <section className="active-ride">
            <div className="section-row">
              <div>
                <span className="eyebrow">CURRENT ACTIVE RIDE</span>
                <h2>{activeRide.status.replace("_", " ")}</h2>
              </div>
              <div className="ride-top-actions">
                <span className="ride-status">{activeRide.status}</span>
                {profile.role === "passenger" && ["requested", "accepted"].includes(activeRide.status) && (
                  <Button variant="danger" onClick={() => cancelRide(activeRide)}>Cancel ride</Button>
                )}
              </div>
            </div>

            <div className="ride-route">
              <div><MapPin />Pickup: <b>{activeRide.originName}</b></div>
              <div><Navigation />Destination: <b>{activeRide.destinationName}</b></div>
              {activeRide.driverName && (
                <div className="driver-assigned-bar">
                  <CarFront />
                  <span>Driver: <b>{activeRide.driverName}</b> · {activeRide.driverVehicle}</span>
                  {activeRide.driverPhone && (
                    <a className="btn secondary small" href={`tel:${activeRide.driverPhone}`}>
                      <Phone size={14} /> Call {activeRide.driverPhone}
                    </a>
                  )}
                  {profile.role === "passenger" && (
                    <button type="button" className="report-link" onClick={() => setReportModal(activeRide)}>
                      <Flag size={13} /> Report
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="fare-preview">
              <div><small>DISTANCE</small><b>{activeRide.distanceKm} km</b></div>
              <div><small>FARE</small><b>{money(activeRide.fare)}</b></div>
            </div>

            <MapView
              center={activeRide.origin}
              markers={activeRideMarkers}
              path={[activeRide.origin, activeRide.destination]}
            />

            {["accepted", "in_progress"].includes(activeRide.status) && (
              <RideChat rideId={activeRide.id} user={user} role={profile.role} />
            )}

            {activeRide.status === "accepted" && (
              <div className="confirm-grid">
                <p>Meet your {profile.role === "passenger" ? "driver" : "passenger"}, then both confirm before starting.</p>
                {profile.role === "passenger" ? (
                  <Button disabled={activeRide.passengerMet} onClick={() => confirmField(activeRide, "passengerMet")}>
                    {activeRide.passengerMet ? "You confirmed meeting" : "Confirm we have met"}
                  </Button>
                ) : (
                  <Button disabled={activeRide.driverMet} onClick={() => confirmField(activeRide, "driverMet")}>
                    {activeRide.driverMet ? "You confirmed meeting" : "Confirm we have met"}
                  </Button>
                )}
              </div>
            )}

            {activeRide.status === "in_progress" && (
              <div className="confirm-grid">
                <p>Ride in progress. Both people must confirm completion.</p>
                <Button variant="secondary" onClick={speakDirections}><Volume2 size={16} /> Voice directions</Button>
                {profile.role === "passenger" ? (
                  <Button disabled={activeRide.passengerCompleted} onClick={() => confirmField(activeRide, "passengerCompleted")}>
                    {activeRide.passengerCompleted ? "Completion confirmed" : "Confirm ride completed"}
                  </Button>
                ) : (
                  <Button disabled={activeRide.driverCompleted} onClick={() => confirmField(activeRide, "driverCompleted")}>
                    {activeRide.driverCompleted ? "Completion confirmed" : "Confirm ride completed"}
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {rateModal && (
          <div className="modal-backdrop">
            <form className="modal-card" onSubmit={submitRating}>
              <h3>Rate your driver</h3>
              <p className="muted">How was your ride with {rateModal.driverName}?</p>
              <div className="star-row">
                {[1, 2, 3, 4, 5].map(n => (
                  <button type="button" key={n} className={cx("star-btn", ratingVal >= n && "lit")} onClick={() => setRatingVal(n)}>
                    ★
                  </button>
                ))}
              </div>
              <div className="popup-actions">
                <Button type="submit">Submit rating</Button>
                <Button type="button" variant="secondary" onClick={() => setRateModal(null)}>Skip</Button>
              </div>
            </form>
          </div>
        )}

        {reportModal && (
          <div className="modal-backdrop">
            <form className="modal-card" onSubmit={submitReport}>
              <h3>Report driver</h3>
              <p className="muted">Describe the issue with {reportModal.driverName || "this trip"} for UCC admin review.</p>
              <textarea
                required
                rows={4}
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="e.g. Overcharging, unsafe driving, did not arrive..."
              />
              <div className="popup-actions">
                <Button type="submit" variant="danger">Submit report</Button>
                <Button type="button" variant="secondary" onClick={() => setReportModal(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function RideList({ rides, isDriver, onAccept, onRate, onReport }) {
  if (!rides.length) {
    return (
      <div className="empty-state">
        <CarFront />
        <b>No rides to show</b>
        <p>New activity will appear here.</p>
      </div>
    );
  }
  return (
    <div className="ride-list">
      {rides.map(r => (
        <article className="ride-item" key={r.id}>
          <div className="ride-item-main">
            <b>{r.originName} → {r.destinationName}</b>
            <small>{r.passengerName || "Passenger"} · {r.distanceKm} km · {money(r.fare)}</small>
            <span className="ride-status">{r.status}</span>
          </div>
          <div className="ride-item-actions">
            {isDriver && r.status === "requested" && onAccept && (
              <Button onClick={() => onAccept(r)}>Accept ride</Button>
            )}
            {!isDriver && r.status === "completed" && r.driverId && !r.rated && onRate && (
              <Button variant="secondary" onClick={() => onRate(r)}><Star size={14} /> Rate</Button>
            )}
            {!isDriver && r.driverId && onReport && (
              <Button variant="danger" onClick={() => onReport(r)}><Flag size={14} /> Report</Button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => onSnapshot(collection(db, "users"), s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })))), []);
  return (
    <section className="nearby">
      <h2>Registered users</h2>
      <div className="user-table">
        {users.map(u => (
          <div key={u.id}>
            <img src={u.photo || ""} alt="" />
            <span><b>{u.name}</b><small>{u.email}</small></span>
            <span>{u.role}</span>
            <span>{u.status || "active"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, toggle] = useTheme();

  useEffect(
    () =>
      onAuthStateChanged(auth, async u => {
        setUser(u);
        if (u) {
          try {
            const s = await getDoc(doc(db, "users", u.uid));
            if (s.exists()) {
              const p = s.data();
              setProfile({ ...p, role: adminEmails.includes((u.email || "").toLowerCase()) ? "admin" : p.role });
            } else {
              setProfile(null);
            }
          } catch (e) {
            console.error(e);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }),
    []
  );

  if (loading) return <div className="loading"><span className="loader" />Loading SwiftRide...</div>;

  return (
    <>
      <Header user={user} dark={dark} toggle={toggle} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore" element={<ExplorePage user={user} />} />
        <Route path="/how-it-works" element={<HowItWorksPage user={user} />} />
        <Route path="/login" element={user ? <Navigate to="/app" /> : <AuthPage />} />
        <Route path="/signup" element={user ? <Navigate to="/app" /> : <AuthPage mode="signup" />} />
        <Route
          path="/app"
          element={
            !user ? (
              <Navigate to="/login" />
            ) : !profile ? (
              <div className="loading">Preparing your account...</div>
            ) : profile.role === "driver" && !profile.profileComplete ? (
              <ProfileGate
                user={user}
                onDone={async () => {
                  const s = await getDoc(doc(db, "users", user.uid));
                  setProfile(s.data());
                }}
              />
            ) : (
              <Dashboard key={user.uid} user={user} profile={profile} />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;

