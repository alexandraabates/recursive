import { useState, useEffect, useRef, useMemo } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";

const DEPTH = 9;
const ROTATION = 12;
const SCALE = 0.62;
const INK = "rgba(255, 238, 200,";
const FONT = "'Montserrat', sans-serif";
const BODY_FONT = "'DM Sans', sans-serif";
const SERIF = "'Montserrat', sans-serif";
const HEADER_FONT = "'Cy', sans-serif";

const DIM = "rgba(255,238,200,0.6)";
const MID = "rgba(255,238,200,0.6)";
const BRIGHT = "rgba(255,238,200,0.92)";

const SECTION_BG = "linear-gradient(180deg, #120a04 0%, #000000 100%)";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

// ── Seeded RNG (stable across renders) ────────────────────────────────────────

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = Math.imul(1664525, s) + 1013904223 >>> 0; return s / 4294967296; };
}

// ── Generative background ─────────────────────────────────────────────────────

function MinFrame({ depth, maxDepth }) {
  if (depth > maxDepth) return null;
  return (
    <g>
      <rect x="-1" y="-1" width="2" height="2" fill="none" stroke="rgba(255,238,200,0.92)" strokeWidth="0.045" />
      {depth < maxDepth && (
        <g transform={`rotate(${ROTATION}) scale(${SCALE})`}>
          <MinFrame depth={depth + 1} maxDepth={maxDepth} />
        </g>
      )}
    </g>
  );
}

function GenerativeBackground() {
  const clusters = useMemo(() => {
    const rng = makeRng(1337);
    return Array.from({ length: 22 }, () => ({
      x: rng() * 100,
      y: rng() * 100,
      size: 55 + rng() * 130,
      duration: 55 + rng() * 110,
      delay: -(rng() * 110),
      opacity: 0.07 + rng() * 0.11,
      depth: 2 + Math.floor(rng() * 3),
    }));
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden", mixBlendMode: "screen" }}>
      <style>{`@keyframes bgSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      {clusters.map((c, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${c.x}%`, top: `${c.y}%`,
          width: c.size, height: c.size,
          opacity: c.opacity,
          animation: `bgSpin ${c.duration}s linear infinite`,
          animationDelay: `${c.delay}s`,
          willChange: "transform",
        }}>
          <svg viewBox="-1.15 -1.15 2.3 2.3" width="100%" height="100%">
            <MinFrame depth={0} maxDepth={c.depth} />
          </svg>
        </div>
      ))}
    </div>
  );
}

// ── Recursive visual ──────────────────────────────────────────────────────────

// SVG version — text scales naturally with each nested level, no clamping needed
function RecursiveSVGLevel({ depth, maxDepth }) {
  if (depth > maxDepth) return null;
  const S = 450;
  const strokeOpacity = 1;
  return (
    <g>
      <rect x={-S} y={-S} width={S * 2} height={S * 2}
        fill="none"
        stroke={`rgba(255,238,200,${strokeOpacity})`}
        strokeWidth="2.5"
      />
      <g transform={`translate(${-S * 0.9}, ${S * 0.8}) rotate(${ROTATION})`} style={{ userSelect: "none" }}>
        <text fontFamily={HEADER_FONT} fontSize="50" fill="rgba(255,238,200,0.85)">Recursive</text>
        <text fontFamily={FONT} fontSize="15" letterSpacing="4" fill="rgba(255,238,200,0.55)" y="22">MAY 15–17</text>
        <text fontFamily={FONT} fontSize="15" letterSpacing="4" fill="rgba(255,238,200,0.55)" y="42">SAN FRANCISCO</text>
      </g>
      {depth < maxDepth && (
        <g transform={`rotate(${ROTATION}) scale(${SCALE})`}>
          <RecursiveSVGLevel depth={depth + 1} maxDepth={maxDepth} />
        </g>
      )}
    </g>
  );
}

function RecursiveFrameSVG({ maxDepth = DEPTH }) {
  return (
    <svg viewBox="-500 -500 1000 1000" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
      <g transform={`rotate(${-ROTATION / 2})`}>
        <RecursiveSVGLevel depth={0} maxDepth={maxDepth} />
      </g>
    </svg>
  );
}

// Div-based version kept for the small nav logo (text-free, no scaling issue)
function RecursiveFrame({ depth, maxDepth }) {
  if (depth > maxDepth) return null;
  const opacity = 1 - (depth / (maxDepth + 2)) * 0.3;
  const borderWidth = Math.max(0.2, 0.8 - depth * 0.1);
  return (
    <div style={{ position: "absolute", inset: 0, border: `${borderWidth}px solid ${INK} ${opacity})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {depth < maxDepth && (
        <div style={{ position: "relative", width: `${100 * SCALE}%`, height: `${100 * SCALE}%`, transform: `rotate(${ROTATION}deg)`, flexShrink: 0 }}>
          <RecursiveFrame depth={depth + 1} maxDepth={maxDepth} />
        </div>
      )}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const PAGE_LINKS = ["Schedule", "Location"];
const HOME_LINKS = ["Home", "About", "Speakers", "FAQ", "Apply"];
const APPLY_URL = "https://airtable.com/appNKougE3KbWPUln/pagoVKc0aJ1MFG4Gq/form";

function Nav({ scrolled }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onHome = location.pathname === "/";
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleClick = (l) => {
    setMenuOpen(false);
    if (l === "Apply") { window.open(APPLY_URL, "_blank"); return; }
    if (PAGE_LINKS.includes(l)) {
      navigate(`/${l.toLowerCase()}`);
      window.scrollTo({ top: 0 });
      return;
    }
    if (!onHome) {
      navigate("/");
      setTimeout(() => {
        if (l === "Home") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
        const el = document.getElementById(l.toLowerCase());
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return;
    }
    if (l === "Home") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = document.getElementById(l.toLowerCase());
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const allLinks = ["About", "Speakers", "Schedule", "Location", "FAQ", "Apply"];

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "1rem 1.5rem" : "1.2rem 3rem",
        background: scrolled || menuOpen ? "rgba(10,7,5,0.95)" : "transparent",
        backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
        borderBottom: scrolled && !menuOpen ? "1px solid rgba(255,238,200,0.06)" : "none",
        transition: "background 0.4s ease, backdrop-filter 0.4s ease",
        fontFamily: HEADER_FONT,
      }}>
        {/* Logo */}
        <div
          onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); setMenuOpen(false); }}
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", zIndex: 101 }}
        >
          <div style={{ position: "relative", width: "28px", height: "28px", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 0, transform: `rotate(-${ROTATION / 2}deg)` }}>
              <RecursiveFrame depth={0} maxDepth={4} />
            </div>
          </div>
          <span style={{ fontSize: "1rem", color: BRIGHT, fontFamily: HEADER_FONT }}>Recursive</span>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display: "flex", gap: "2.5rem" }}>
            {allLinks.map(l => (
              <button key={l} onClick={() => handleClick(l)}
                style={{ background: "none", border: l === "Apply" ? `1px solid rgba(255,238,200,0.5)` : "none", padding: l === "Apply" ? "0.3rem 1rem" : 0, color: l === "Apply" ? BRIGHT : DIM, fontFamily: HEADER_FONT, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = BRIGHT}
                onMouseLeave={e => e.target.style.color = l === "Apply" ? BRIGHT : DIM}
              >{l.toUpperCase()}</button>
            ))}
          </div>
        )}

        {/* Hamburger / close button */}
        {isMobile && (
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", zIndex: 101, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
            {menuOpen ? (
              <span style={{ color: BRIGHT, fontSize: "1.3rem", lineHeight: 1, fontFamily: FONT }}>✕</span>
            ) : (
              <>
                <span style={{ display: "block", width: "22px", height: "1.5px", background: BRIGHT, borderRadius: "2px" }} />
                <span style={{ display: "block", width: "22px", height: "1.5px", background: BRIGHT, borderRadius: "2px" }} />
                <span style={{ display: "block", width: "14px", height: "1.5px", background: BRIGHT, borderRadius: "2px" }} />
              </>
            )}
          </button>
        )}
      </nav>

      {/* Mobile full-screen menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "rgba(10,5,2,0.98)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "2.8rem", fontFamily: HEADER_FONT,
        }}>
          {allLinks.map(l => (
            <button key={l} onClick={() => handleClick(l)}
              style={{
                background: "none",
                border: l === "Apply" ? `1px solid rgba(255,238,200,0.5)` : "none",
                padding: l === "Apply" ? "0.7rem 3rem" : 0,
                color: l === "Apply" ? BRIGHT : DIM,
                fontFamily: HEADER_FONT, fontSize: "1.1rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.12em",
              }}
            >{l.toUpperCase()}</button>
          ))}
        </div>
      )}
    </>
  );
}

// ── Grain + shell ─────────────────────────────────────────────────────────────

function Shell({ children }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "#0a0705", minHeight: "100vh", color: BRIGHT }}>
      <GenerativeBackground />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", opacity: 0.4, pointerEvents: "none", zIndex: 50 }} />
      <Nav scrolled={scrolled} />
      {children}
      <Footer />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ loaded }) {
  const [hovered, setHovered] = useState(false);
  const isMobile = useIsMobile();
  const sectionRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current || !frameRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / (window.innerHeight * 1.4)));
      frameRef.current.style.transform = `scale(${1 + progress * 4.5})`;
      frameRef.current.style.opacity = String(Math.max(0, 1 - progress * 0.9));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={sectionRef} style={{ minHeight: "185vh", background: "linear-gradient(180deg, #3d1c09 0%, #2a1206 20%, #180b03 50%, #080401 75%, #000000 100%)", position: "relative" }}>
      {/* Sticky viewport — frame stays pinned while section scrolls beneath it */}
      <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* Outer: load fade-in only */}
        <div style={{ opacity: loaded ? 1 : 0, transition: "opacity 1.2s ease" }}>
          {/* Inner ref: scroll zoom, no transition */}
          <div ref={frameRef} style={{ position: "relative", width: "min(82vw, 72vh)", height: "min(82vw, 72vh)", willChange: "transform, opacity", transformOrigin: "center center" }}>
            <RecursiveFrameSVG maxDepth={DEPTH} />
          </div>
        </div>

        {/* Hero bottom text — absolute within the sticky viewport */}
        <div style={{
          position: "absolute", bottom: isMobile ? "1.5rem" : "2.5rem", left: 0, right: 0,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "flex-end",
          justifyContent: "space-between",
          gap: isMobile ? "1.2rem" : 0,
          padding: isMobile ? "0 1.5rem" : "0 3rem",
          opacity: loaded ? 1 : 0, transition: "opacity 1.8s ease 0.4s"
        }}>
          <div>
            <div style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: BRIGHT, fontWeight: 400, lineHeight: 1, fontFamily: HEADER_FONT }}>Recursive</div>
            <div style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)", letterSpacing: "0.3em", color: DIM, marginTop: "0.5rem", fontFamily: FONT, fontWeight: 600 }}>MAY 15–17, 2026</div>
            <div style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)", letterSpacing: "0.3em", color: DIM, marginTop: "0.2rem", fontFamily: FONT, fontWeight: 600 }}>SAN FRANCISCO</div>
            {!isMobile && <div style={{ fontSize: "0.7rem", color: DIM, marginTop: "1rem", fontFamily: FONT, fontWeight: 700, border: "2px solid rgba(255,238,200,0.7)", padding: "0.5rem 0.75rem", display: "inline-block" }}>A Constellation event. Supported by OpenAI.</div>}
          </div>
          <button onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onClick={() => window.open(APPLY_URL, "_blank")}
            style={{ background: hovered ? "rgba(255,238,200,0.1)" : "transparent", border: "1.5px solid rgba(255,238,200,0.7)", color: BRIGHT, fontFamily: HEADER_FONT, fontSize: "clamp(0.7rem, 1.4vw, 0.95rem)", padding: "0.75rem 1.8rem", cursor: "pointer", transition: "all 0.2s ease", transform: hovered ? "scale(1.03)" : "scale(1)", alignSelf: isMobile ? "flex-start" : "auto" }}>
            APPLY NOW
          </button>
        </div>
      </div>
    </section>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────

function About() {
  const isMobile = useIsMobile();
  return (
    <section id="about" style={{ padding: isMobile ? "6rem 1.5rem" : "8rem 3rem", fontFamily: FONT }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <p style={{ fontSize: "1.1rem", letterSpacing: "0.3em", color: DIM, fontWeight: 600, marginBottom: "2rem" }}>ABOUT THE EVENT</p>
        <p style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)", color: BRIGHT, lineHeight: 1.7, fontWeight: 400, letterSpacing: 0, fontFamily: BODY_FONT }}>
          Labs are building automated AI researchers. How do we ensure they're built safely?
        </p>
        <p style={{ fontSize: "0.9rem", color: MID, lineHeight: 1.9, marginTop: "2rem", letterSpacing: 0, fontFamily: BODY_FONT }}>
          Recursive is a three-day conference bringing together researchers and engineers from frontier labs, nonprofits, and academia. Attendees will build relationships and exchange ideas.
        </p>
        <div style={{ marginTop: "3rem", display: "flex", gap: "4rem", flexWrap: "wrap" }}>
          {[["Location", "The Embarcadero, SF"], ["Dates", "May 15–17, 2026"], ["Format", "Invite + Application"]].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.35em", color: DIM, marginBottom: "0.4rem", fontWeight: 600 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: "1rem", color: BRIGHT, letterSpacing: "0.08em" }}>{val}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: DIM, marginTop: "4rem", fontWeight: 600 }}>A CONSTELLATION EVENT, SUPPORTED BY OPENAI</p>
      </div>
    </section>
  );
}

// ── Speakers ──────────────────────────────────────────────────────────────────

function parseSpeakersCSV(text) {
  const [header, ...rows] = text.trim().split("\n");
  const keys = header.split(",");
  return rows.map(row => {
    const vals = row.split(",");
    return Object.fromEntries(keys.map((k, i) => [k.trim(), (vals[i] || "").trim()]));
  });
}

function Speakers() {
  const [speakers, setSpeakers] = useState([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch("/speakers.csv")
      .then(r => r.text())
      .then(text => setSpeakers(parseSpeakersCSV(text)));
  }, []);

  if (!speakers.length) return null;

  return (
    <section id="speakers" style={{ padding: isMobile ? "6rem 1.5rem" : "8rem 3rem", fontFamily: FONT }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <p style={{ fontSize: "1.1rem", letterSpacing: "0.3em", color: DIM, fontWeight: 600, marginBottom: "3rem" }}>SPEAKERS</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "2rem" }}>
          {speakers.map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", marginBottom: "1.2rem", filter: "grayscale(100%) sepia(20%)" }}>
                <img src={`/speakers/${s.image}`} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ fontSize: "1rem", color: BRIGHT, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>{s.name}</div>
              <div style={{ fontSize: "0.65rem", color: DIM, letterSpacing: "0.2em", fontWeight: 600, marginBottom: "0.8rem" }}>{s.affiliation.toUpperCase()}</div>
              <div style={{ fontSize: "0.85rem", color: MID, lineHeight: 1.6, borderTop: "1px solid rgba(255,238,200,0.07)", paddingTop: "0.8rem", fontFamily: BODY_FONT, letterSpacing: 0 }}>{s.topic}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Schedule ──────────────────────────────────────────────────────────────────

const SCHEDULE = [
  { day: "Day 01", date: "May 15", items: ["Opening keynote", "Workshop: Threat models for RSI", "Evening reception"] },
  { day: "Day 02", date: "May 16", items: ["Research presentations", "Breakout sessions", "Open problems workshop", "Dinner discussion"] },
  { day: "Day 03", date: "May 17", items: ["Panel: Governance & policy", "Workshop outputs synthesis", "Closing session"] },
];

function Schedule() {
  const isMobile = useIsMobile();
  return (
    <section style={{ padding: isMobile ? "8rem 1.5rem 5rem" : "12rem 3rem 8rem", background: SECTION_BG, minHeight: "100vh", fontFamily: FONT }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ fontSize: "1.1rem", letterSpacing: "0.3em", color: DIM, fontWeight: 600, marginBottom: "3rem" }}>SCHEDULE</p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {SCHEDULE.map((d, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "160px 1fr", borderTop: "1px solid rgba(255,238,200,0.07)", padding: "2rem 0", gap: isMobile ? "1rem" : 0 }}>
              <div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.3em", color: DIM, fontWeight: 600 }}>{d.day}</div>
                <div style={{ fontSize: "1.1rem", color: BRIGHT, marginTop: "0.3rem", letterSpacing: "0.08em" }}>{d.date}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {d.items.map((item, j) => (
                  <div key={j} style={{ fontSize: "0.85rem", color: MID, letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.8rem" }}>
                    <span style={{ width: "4px", height: "4px", background: "rgba(255,238,200,0.3)", borderRadius: "50%", flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,238,200,0.07)" }} />
        </div>
      </div>
    </section>
  );
}

// ── Location ──────────────────────────────────────────────────────────────────

function Location() {
  const isMobile = useIsMobile();
  return (
    <section style={{ padding: isMobile ? "8rem 1.5rem 5rem" : "12rem 3rem 8rem", background: SECTION_BG, minHeight: "100vh", fontFamily: FONT }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ fontSize: "1.1rem", letterSpacing: "0.3em", color: DIM, fontWeight: 600, marginBottom: "3rem" }}>LOCATION</p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "3rem" : "4rem" }}>
          <div>
            <div style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)", color: BRIGHT, lineHeight: 1.7, letterSpacing: "0.04em" }}>
              The Embarcadero, San Francisco
            </div>
            <div style={{ fontSize: "0.9rem", color: MID, lineHeight: 1.9, marginTop: "1.5rem", letterSpacing: 0, fontFamily: BODY_FONT }}>
              Exact venue details will be shared with accepted attendees ahead of the conference.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {[["Venue", "The Embarcadero, SF"], ["Dates", "May 15–17, 2026"], ["Format", "Invite + Application"], ["Travel Support", "Available for select attendees"]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.35em", color: DIM, marginBottom: "0.4rem", fontWeight: 600 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: "0.95rem", color: BRIGHT, letterSpacing: "0.06em" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "Who should apply?", a: "Recursive is aimed at researchers and practitioners working on AI safety, alignment, and related fields. We welcome applications from academics, industry researchers, and independent researchers at all career stages." },
  { q: "What is the application process?", a: "Submit a short application describing your research interests and what you hope to contribute to the conference. We'll review on a rolling basis and notify applicants as soon as possible." },
  { q: "Is there a fee to attend?", a: "There is no registration fee. We are able to offer travel support for a limited number of attendees — please indicate your need in the application." },
  { q: "What does 'recursive' mean for the conference format?", a: "Each session is designed to feed into the next. Talks surface questions that workshops address; workshop outputs become the raw material for the following day. Expect the agenda to evolve in real time." },
  { q: "Where will the conference be held?", a: "San Francisco, CA. Exact venue details will be shared with accepted attendees." },
];

function FAQ() {
  const [open, setOpen] = useState(null);
  const isMobile = useIsMobile();
  return (
    <section id="faq" style={{ padding: isMobile ? "6rem 1.5rem" : "8rem 3rem", fontFamily: FONT }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <p style={{ fontSize: "1.1rem", letterSpacing: "0.3em", color: DIM, fontWeight: 600, marginBottom: "3rem" }}>FAQ</p>
        {FAQS.map((f, i) => (
          <div key={i} style={{ borderTop: "1px solid rgba(255,238,200,0.07)" }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: "100%", background: "none", border: "none", padding: "1.6rem 0", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: "0.9rem", color: BRIGHT, letterSpacing: "0.06em", fontFamily: FONT }}>{f.q}</span>
              <span style={{ color: DIM, fontSize: "1.2rem", flexShrink: 0, marginLeft: "1rem", transform: open === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
            </button>
            {open === i && (
              <div style={{ fontSize: "0.9rem", color: MID, lineHeight: 1.8, paddingBottom: "1.6rem", letterSpacing: 0, fontFamily: BODY_FONT }}>{f.a}</div>
            )}
          </div>
        ))}
        <div style={{ borderTop: "1px solid rgba(255,238,200,0.07)" }} />
      </div>
    </section>
  );
}

// ── Apply CTA ─────────────────────────────────────────────────────────────────

function Apply() {
  const [hovered, setHovered] = useState(false);
  return (
    <section id="apply" style={{ padding: "10rem 3rem", background: SECTION_BG, textAlign: "center", fontFamily: FONT }}>
      <p style={{ fontSize: "1.1rem", letterSpacing: "0.3em", color: DIM, fontWeight: 600, marginBottom: "2rem" }}>APPLICATIONS OPEN</p>
      <div style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: BRIGHT, marginBottom: "1.5rem", fontFamily: HEADER_FONT }}>Recursive</div>
      <div style={{ fontSize: "0.9rem", color: MID, letterSpacing: "0.2em", marginBottom: "3rem" }}>MAY 15–17, 2026 · SAN FRANCISCO</div>
      <button onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onClick={() => window.open(APPLY_URL, "_blank")}
        style={{ background: hovered ? "rgba(255,238,200,0.1)" : "transparent", border: "1.5px solid rgba(255,238,200,0.7)", color: BRIGHT, fontFamily: HEADER_FONT, fontSize: "0.85rem", padding: "1rem 3rem", cursor: "pointer", transition: "all 0.2s ease", transform: hovered ? "scale(1.03)" : "scale(1)" }}>
        APPLY NOW
      </button>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: SECTION_BG, padding: "2rem 3rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: FONT }}>
      <span style={{ fontSize: "0.65rem", letterSpacing: "0.3em", color: "rgba(255,238,200,0.2)" }}>Recursive · AN RSI EVENT</span>
      <span style={{ fontSize: "0.65rem", letterSpacing: "0.3em", color: "rgba(255,238,200,0.2)" }}>© 2026</span>
    </footer>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function HomePage() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Hero loaded={loaded} />
      <div style={{ background: SECTION_BG }}>
        <About />
        <Speakers />
        <FAQ />
      </div>
      <Apply />
    </>
  );
}

// ── Password gate ─────────────────────────────────────────────────────────────

function PasswordGate({ children }) {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("gate") === "1");
  const [error, setError] = useState(false);

  if (unlocked) return children;

  const attempt = (e) => {
    e.preventDefault();
    if (input === "bayviews") {
      sessionStorage.setItem("gate", "1");
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  };

  return (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: SECTION_BG, fontFamily: FONT }}>
      <form onSubmit={attempt} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
        <p style={{ fontSize: "0.65rem", letterSpacing: "0.35em", color: DIM, fontWeight: 600 }}>ENTER PASSWORD</p>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          autoFocus
          style={{ background: "transparent", border: `1px solid rgba(255,238,200,${error ? "0.6" : "0.2"})`, color: BRIGHT, fontFamily: FONT, fontSize: "0.85rem", letterSpacing: "0.2em", padding: "0.75rem 1.5rem", outline: "none", textAlign: "center", width: "220px", transition: "border-color 0.2s" }}
        />
        {error && <p style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "rgba(255,238,200,0.4)", margin: 0 }}>INCORRECT</p>}
      </form>
    </section>
  );
}

function SchedulePage() {
  return <PasswordGate><Schedule /></PasswordGate>;
}

function LocationPage() {
  return <PasswordGate><Location /></PasswordGate>;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/location" element={<LocationPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
