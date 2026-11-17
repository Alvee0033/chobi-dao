import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";

const C = { ink: "#24211f", paper: "#fffaf5", orange: "#f27432", peach: "#ffe1ca", muted: "#77716d", green: "#4f8b69", line: "#eee4dc" };

const scenes = [
  { from: 0, duration: 240, kicker: "MEET CHOBI DAO", title: "You were there.\nWe found the photos.", sub: "Your event memories, finally easy to find." },
  { from: 240, duration: 270, kicker: "THE MOMENT AFTER THE MOMENT", title: "One event.\nHundreds of photos.", sub: "Finding the ones you’re in shouldn’t mean endless scrolling." },
  { from: 510, duration: 390, kicker: "FOR EVERY GUEST", title: "Scan once.\nFind your moments.", sub: "Open the event QR or link, follow a guided face scan, and see your matches." },
  { from: 900, duration: 300, kicker: "YOUR PHOTOS, TOGETHER", title: "A gallery that\nfeels like yours.", sub: "Browse your matches, open a favorite, and save the photos you love." },
  { from: 1200, duration: 330, kicker: "FOR PHOTOGRAPHERS", title: "Share the work.\nLet guests find it.", sub: "Create an event, upload the gallery, then share its link or QR code." },
  { from: 1530, duration: 270, kicker: "CHOBI DAO", title: "Find yourself in\nthe moments that matter.", sub: "Your next event gallery is just a scan away." },
];

const ease = Easing.bezier(0.22, 1, 0.36, 1);

function Background({ frame }: { frame: number }) {
  const drift = Math.sin(frame / 95) * 22;
  return <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 850, height: 850, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,215,188,.68), rgba(255,215,188,0) 70%)", right: -210 + drift, top: -330 }} />
    <div style={{ position: "absolute", width: 650, height: 650, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,237,218,.9), rgba(255,237,218,0) 72%)", left: -280, bottom: -330 }} />
    <div style={{ position: "absolute", inset: 0, opacity: 0.18, backgroundImage: "radial-gradient(#d8c7b9 0.7px, transparent 0.7px)", backgroundSize: "20px 20px" }} />
  </AbsoluteFill>;
}

function Brand() {
  return <div style={{ display: "flex", alignItems: "center", gap: 13, fontSize: 30, fontWeight: 800, letterSpacing: -1.4, color: C.ink }}>
    <span style={{ width: 43, height: 43, borderRadius: 15, background: C.orange, display: "grid", placeItems: "center", color: "white", fontSize: 25 }}>◎</span>
    <span>chobi<span style={{ color: C.orange }}>dao</span></span>
  </div>;
}

function Photo({ tone, label, style }: { tone: string; label: string; style?: React.CSSProperties }) {
  return <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, background: `linear-gradient(145deg, ${tone}, #f3c49c 60%, #a96045)`, ...style }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 25%, rgba(255,245,218,.85), transparent 35%), linear-gradient(0deg, rgba(40,27,20,.32), transparent 58%)" }} />
    <div style={{ position: "absolute", width: "38%", height: "47%", borderRadius: "48% 48% 43% 43%", background: "#794d3e", left: "31%", top: "23%", boxShadow: "0 80px 0 32px #343a37" }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, transparent 35%, rgba(255,255,255,.16) 51%, transparent 68%)" }} />
    <span style={{ position: "absolute", left: 14, bottom: 12, color: "white", fontSize: 12, fontWeight: 700, textShadow: "0 1px 5px #333" }}>{label}</span>
  </div>;
}

function Phone({ mode }: { mode: "scan" | "gallery" }) {
  const f = useCurrentFrame();
  const scanY = 20 + ((f * 2.2) % 250);
  return <div style={{ width: 330, height: 640, borderRadius: 44, background: "#242321", padding: 11, boxShadow: "0 38px 90px rgba(57,39,25,.24), 0 6px 0 #484541", position: "relative" }}>
    <div style={{ height: "100%", borderRadius: 34, background: "#fffdfb", overflow: "hidden", position: "relative" }}>
      <div style={{ height: 42, display: "flex", justifyContent: "center", alignItems: "center" }}><div style={{ width: 74, height: 18, borderRadius: 20, background: "#242321" }} /></div>
      <div style={{ padding: "14px 22px" }}>
        <Brand />
        {mode === "scan" ? <>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 30, color: C.ink }}>Find your photos</div>
          <div style={{ color: C.muted, marginTop: 5, fontSize: 13 }}>Summer wedding · 2026</div>
          <div style={{ height: 300, marginTop: 22, borderRadius: 26, position: "relative", overflow: "hidden", background: "linear-gradient(145deg,#f9d6bc,#d38b68 60%,#66504b)" }}>
            <div style={{ position: "absolute", left: 91, top: 56, width: 126, height: 170, border: "2px solid rgba(255,255,255,.9)", borderRadius: "48% 48% 42% 42%" }} />
            <div style={{ position: "absolute", left: 74, top: scanY, width: 160, height: 3, background: C.orange, boxShadow: "0 0 18px 5px rgba(242,116,50,.6)" }} />
            <div style={{ position: "absolute", bottom: 19, width: "100%", textAlign: "center", color: "white", fontSize: 13, fontWeight: 700 }}>Center your face in the frame</div>
          </div>
          <div style={{ marginTop: 18, padding: 16, borderRadius: 20, background: C.orange, color: "white", textAlign: "center", fontWeight: 800 }}>Start face scan　↗</div>
        </> : <>
          <div style={{ marginTop: 30, fontSize: 21, fontWeight: 800, color: C.ink }}>Your moments</div>
          <div style={{ color: C.muted, marginTop: 5, fontSize: 13 }}>A few memories from the day</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 22 }}>
            <Photo tone="#e7a982" label="The big day" style={{ height: 150 }} /><Photo tone="#d4bb8b" label="Just married" style={{ height: 150 }} /><Photo tone="#bc856b" label="Dance floor" style={{ height: 150 }} /><Photo tone="#d3a18a" label="With friends" style={{ height: 150 }} />
          </div>
          <div style={{ marginTop: 18, color: C.orange, fontWeight: 800, textAlign: "center", fontSize: 14 }}>View and save your photos ↓</div>
        </>}
      </div>
    </div>
  </div>;
}

function DashboardMock() {
  return <div style={{ width: 780, borderRadius: 26, background: "white", padding: 22, boxShadow: "0 30px 80px rgba(57,39,25,.18)", border: `1px solid ${C.line}` }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 20, borderBottom: `1px solid ${C.line}` }}><Brand /><div style={{ padding: "12px 19px", background: C.orange, borderRadius: 13, color: "white", fontSize: 14, fontWeight: 800 }}>＋ Create event</div></div>
    <div style={{ display: "flex", gap: 20, marginTop: 22 }}>
      <div style={{ width: 225, padding: 20, borderRadius: 18, background: "#fff6ef" }}><div style={{ fontSize: 13, color: C.muted }}>EVENT STATUS</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>Ready to share</div><div style={{ marginTop: 24, height: 1, background: C.line }} /><div style={{ marginTop: 19, fontSize: 13, color: C.muted }}>PHOTOS UPLOADED</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>248 photos</div><div style={{ color: C.green, marginTop: 8, fontWeight: 700, fontSize: 13 }}>✓ Gallery indexed</div></div>
      <div style={{ flex: 1, padding: 20, border: `1px solid ${C.line}`, borderRadius: 18 }}><div style={{ fontSize: 20, fontWeight: 800 }}>Nadia & Rafi · Wedding</div><div style={{ color: C.muted, fontSize: 13, marginTop: 5 }}>Dhaka · 12 December 2026</div><div style={{ display: "flex", gap: 12, marginTop: 19 }}><div style={{ width: 98, height: 106, background: "#fff5ec", borderRadius: 12, display: "grid", placeItems: "center", fontSize: 42 }}>▦</div><div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Guest gallery link</div><div style={{ color: C.muted, fontSize: 12 }}>chobidao.app/e/nadia-rafi</div><div style={{ display: "flex", gap: 9, marginTop: 16 }}><span style={{ padding: "10px 14px", background: C.orange, borderRadius: 11, color: "white", fontWeight: 700, fontSize: 13 }}>Copy link</span><span style={{ padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 11, color: C.ink, fontWeight: 700, fontSize: 13 }}>Download QR</span></div></div></div></div>
    </div>
  </div>;
}

function SceneVisual({ index }: { index: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 18, stiffness: 90, mass: 0.8 } });
  const float = Math.sin(f / 20) * 8;
  if (index === 0) return <div style={{ position: "relative", width: 620, height: 600 }}>
    <div style={{ position: "absolute", width: 490, height: 490, borderRadius: "50%", background: "linear-gradient(145deg,#ffe4d0,#ffd1af)", left: 64, top: 44, transform: `scale(${0.85 + enter * 0.15})` }} />
    <Photo tone="#db9d78" label="A day worth remembering" style={{ position: "absolute", width: 255, height: 330, left: 62, top: 114, transform: `rotate(-9deg) translateY(${float}px)`, boxShadow: "0 24px 50px rgba(92,52,28,.18)" }} />
    <Photo tone="#d4bb8b" label="Together, always" style={{ position: "absolute", width: 270, height: 350, left: 300, top: 112, transform: `rotate(8deg) translateY(${-float}px)`, boxShadow: "0 24px 50px rgba(92,52,28,.2)" }} />
    <div style={{ position: "absolute", top: 38, right: 0, padding: "15px 21px", borderRadius: 16, background: "white", boxShadow: "0 15px 40px #c68b6650", fontWeight: 800, color: C.green }}>✓ Moments found</div>
  </div>;
  if (index === 1) return <div style={{ width: 560, position: "relative", height: 500 }}>
    {Array.from({ length: 12 }, (_, i) => <Photo key={i} tone={["#d9a187", "#c9aa7e", "#ddbc99", "#b78572"][i % 4]} label="event photo" style={{ position: "absolute", width: 160, height: 190, left: 10 + (i % 4) * 122, top: Math.floor(i / 4) * 125, transform: `rotate(${(i % 3 - 1) * 6}deg)`, opacity: 0.9 - Math.floor(i / 4) * 0.12, boxShadow: "0 9px 24px #60412b25" }} />)}
    <div style={{ position: "absolute", left: 145, top: 165, width: 250, height: 175, borderRadius: 25, background: "#fffaf4", border: `1px solid ${C.line}`, boxShadow: "0 24px 65px #513d2b30", display: "grid", placeItems: "center", fontSize: 48, color: C.orange, fontWeight: 800 }}>⌕</div>
  </div>;
  if (index === 2) return <div style={{ transform: `translateY(${float}px) scale(${0.88 + enter * 0.12})` }}><Phone mode="scan" /></div>;
  if (index === 3) return <div style={{ transform: `translateY(${float}px) scale(${0.88 + enter * 0.12})` }}><Phone mode="gallery" /></div>;
  if (index === 4) return <div style={{ transform: `translateY(${float}px) scale(${0.9 + enter * 0.1})` }}><DashboardMock /></div>;
  return <div style={{ position: "relative", width: 570, height: 520, display: "grid", placeItems: "center" }}>
    <div style={{ width: 380, height: 380, borderRadius: "50%", background: "linear-gradient(145deg,#ffe3d0,#ffd0ad)", display: "grid", placeItems: "center", color: C.orange, fontSize: 150 }}>◎</div>
    {[[35,60],[410,35],[90,390],[390,350]].map(([x,y],i)=><div key={i} style={{ position: "absolute", left: x, top: y, width: 110, height: 135, borderRadius: 17, background: ["#d9a187","#d4bb8b","#be8d71","#d4a78c"][i], transform: `rotate(${(i%2?1:-1)*9}deg)`, boxShadow: "0 14px 35px #563c2d25" }}><div style={{ width: 43, height: 53, borderRadius: "50%", background: "#895948", margin: "23px auto", boxShadow: "0 35px 0 12px #3e4941" }} /></div>)}
    <div style={{ position: "absolute", bottom: 0, left: 112, padding: "14px 21px", borderRadius: 17, background: "white", color: C.ink, fontWeight: 800, boxShadow: "0 12px 30px #563c2d20" }}>Your moments, in one place ✨</div>
  </div>;
}

function Scene({ index, kicker, title, sub, duration }: { index: number; kicker: string; title: string; sub: string; duration: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 20, stiffness: 100 } });
  const exit = interpolate(f, [duration - 18, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" }) * exit;
  const y = interpolate(enter, [0, 1], [34, 0]);
  return <AbsoluteFill style={{ opacity }}>
    <Background frame={f} />
    <AbsoluteFill style={{ padding: "54px 100px 62px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Brand /><div style={{ color: C.muted, fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>EVENT PHOTOS, FOUND</div></div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", gap: 45 }}>
        <div style={{ transform: `translateY(${y}px)`, opacity: enter }}>
          <div style={{ color: C.orange, letterSpacing: 3.2, fontSize: 17, fontWeight: 800, marginBottom: 23 }}>{kicker}</div>
          <div style={{ whiteSpace: "pre-line", fontSize: 72, lineHeight: 1.06, letterSpacing: -3.5, color: C.ink, fontWeight: 800 }}>{title}</div>
          <div style={{ marginTop: 24, color: C.muted, fontSize: 25, lineHeight: 1.42, maxWidth: 700 }}>{sub}</div>
          {index === 5 && <div style={{ marginTop: 34, padding: "17px 25px", width: "fit-content", borderRadius: 15, background: C.orange, color: "white", fontSize: 19, fontWeight: 800, boxShadow: "0 12px 25px #f2743250" }}>chobidao.app　↗</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "center", transform: `translateY(${y * 0.5}px)`, opacity: enter }}><SceneVisual index={index} /></div>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "#eadfd6", overflow: "hidden" }}><div style={{ width: `${((index + (f / duration)) / scenes.length) * 100}%`, height: "100%", background: C.orange }} /></div>
    </AbsoluteFill>
  </AbsoluteFill>;
}

export const ChobiDaoLaunch: React.FC = () => <AbsoluteFill style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
  {scenes.map((scene, index) => <Sequence key={scene.from} from={scene.from} durationInFrames={scene.duration} premountFor={15}>
    <Scene index={index} kicker={scene.kicker} title={scene.title} sub={scene.sub} duration={scene.duration} />
  </Sequence>)}
</AbsoluteFill>;
