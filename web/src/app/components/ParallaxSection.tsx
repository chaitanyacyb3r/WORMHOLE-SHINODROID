"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface ParallaxSectionProps {
  children: React.ReactNode;
  speed?: number; // negative = slower (parallax), positive = faster
  style?: React.CSSProperties;
  className?: string;
}

export default function ParallaxSection({
  children,
  speed = -0.2,
  style,
  className,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], [0, speed * 300]);
  const y = useSpring(rawY, { stiffness: 100, damping: 30, mass: 0.5 });

  return (
    <div ref={ref} style={{ overflow: "visible", ...style }} className={className}>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}

/* Smooth scale-on-scroll — element scales up slightly as it enters center of viewport */
export function ScaleOnScroll({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const rawScale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const scale = useSpring(rawScale, { stiffness: 100, damping: 25 });
  const rawOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const opacity = useSpring(rawOpacity, { stiffness: 100, damping: 25 });

  return (
    <div ref={ref} style={{ ...style }} className={className}>
      <motion.div style={{ scale, opacity }}>
        {children}
      </motion.div>
    </div>
  );
}

/* Horizontal slide on scroll */
export function SlideOnScroll({
  children,
  direction = "left",
  style,
  className,
}: {
  children: React.ReactNode;
  direction?: "left" | "right";
  style?: React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const offset = direction === "left" ? -80 : 80;
  const rawX = useTransform(scrollYProgress, [0, 1], [offset, 0]);
  const x = useSpring(rawX, { stiffness: 80, damping: 20 });
  const rawOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  const opacity = useSpring(rawOpacity, { stiffness: 100, damping: 25 });

  return (
    <div ref={ref} style={{ overflow: "visible", ...style }} className={className}>
      <motion.div style={{ x, opacity }}>
        {children}
      </motion.div>
    </div>
  );
}
