"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Icons } from "../icons";

const benefits = [
  { title: "Your photos, together.", text: "Go straight to the moments you’re in." },
  { title: "Ready to keep.", text: "Download your favorites in full resolution." },
  { title: "Just a selfie away.", text: "Find your photos right in your browser." },
];

export default function MemoriesSection() {
  const reducedMotion = useReducedMotion();
  const reveal = {
    hidden: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 22 },
    visible: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className="cd-memories" id="experience" aria-labelledby="experience-title">
      <motion.div className="cd-container cd-memories-layout" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} transition={{ staggerChildren: reducedMotion ? 0 : 0.12 }}>
        <div className="cd-memories-copy">
          <motion.p variants={reveal} className="cd-memories-eyebrow"><span /> MADE FOR YOUR MEMORIES</motion.p>
          <motion.h2 variants={reveal} id="experience-title">The moments<br />that feel<br /><em>like you.</em></motion.h2>
          <motion.p variants={reveal} className="cd-memories-description">The big laughs. The unexpected hugs. Find the photos you’re in, and keep a little of that day with you.</motion.p>
          <motion.div variants={reveal}><Link href="/find" className="cd-memories-button">Find my photos <Icons.ArrowRight size={18} /></Link></motion.div>
        </div>
        <motion.figure variants={reveal} className="cd-memories-figure">
          <div className="cd-memories-photo"><Image src="/images/landing/event-memory.webp" alt="A guest laughing with friends at a wedding celebration" fill sizes="(max-width: 760px) 90vw, 50vw" /></div>
          <figcaption><span>A moment worth keeping.</span><Icons.Camera size={17} /></figcaption>
          <span className="cd-memories-side-note" aria-hidden="true">LIFE LOOKS GOOD ON YOU</span>
        </motion.figure>
        <motion.ul variants={reveal} className="cd-memories-benefits">
          {benefits.map((benefit, index) => <li key={benefit.title}><span className="cd-memories-index">0{index + 1}</span><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></li>)}
        </motion.ul>
      </motion.div>
    </section>
  );
}
