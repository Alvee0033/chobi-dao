"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

const slides = [
  {
    image: "/images/landing/clay-scan-qr-light.png",
    alt: "Cream clay phone scanning an event QR ticket",
  },
  {
    image: "/images/landing/clay-face-scan-light.png",
    alt: "Peach clay phone framing a guest’s face for a selfie match",
  },
  {
    image: "/images/landing/clay-photo-gallery-light.png",
    alt: "Ivory clay gallery of celebration photos with a download button",
  },
];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const reduceMotion = useReducedMotion();
  const slide = slides[active];

  useEffect(() => {
    if (!playing || reduceMotion || interacting) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [playing, reduceMotion, interacting, active]);

  const go = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length);

  return (
    <section className="cd-carousel" aria-label="How Chobi Dao works" aria-roledescription="carousel" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={(event) => { if (!(event.target as HTMLElement).closest(".cd-carousel-play")) setPlaying(false); }}>
      <div className="cd-carousel-art" aria-live="off">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            className="cd-carousel-panel"
            onPanEnd={(_, info) => { if (Math.abs(info.offset.x) > 55 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) { setPlaying(false); go(info.offset.x < 0 ? 1 : -1); } }}
            role="img"
            aria-label={slide.alt}
            initial={reduceMotion ? false : { opacity: 0, x: 18, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          ><Image src={slide.image} alt="" fill priority={active === 0} sizes="(max-width: 760px) 90vw, 42vw" /></motion.div>
        </AnimatePresence>
      </div>
      <div className="cd-carousel-caption" aria-live={playing && !reduceMotion ? "off" : "polite"}>
        <div className="cd-carousel-copy">
          <h2>{["Scan the QR.", "Take a selfie.", "Your photos, found."][active]}</h2>
        </div>
        <div className="cd-carousel-controls" aria-label="Carousel controls">
          {slides.map((item, index) => <button className="cd-carousel-dot" type="button" key={item.image} aria-label={`Show step ${index + 1}`} aria-current={index === active ? "step" : undefined} onClick={() => setActive(index)}><span /></button>)}
          {!reduceMotion && <button type="button" className="cd-carousel-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause carousel" : "Play carousel"}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>}
        </div>
      </div>
    </section>
  );
}
