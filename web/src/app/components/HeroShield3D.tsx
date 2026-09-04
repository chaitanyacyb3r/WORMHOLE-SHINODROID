"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function HeroShield3D() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: "100%",
        height: "300px",
        marginTop: "-20px",
        marginBottom: "-40px",
      }}
    >
      {/* Encryption video background — masked edges for seamless blend */}
      <video
        loop
        muted
        autoPlay
        playsInline
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.45,
          zIndex: 0,
          maskImage:
            "radial-gradient(ellipse 60% 80% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      >
        <source src="/videos/encryption-bg.webm" type="video/webm" />
      </video>

      {/* Lock animation — hoverable */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          position: "relative",
          zIndex: 10,
        }}
        className="group"
      >
        <Image
          src="/lock-top.png"
          alt="Lock top"
          width={50}
          height={50}
          style={{
            transform: "translateY(5px)",
            transition: "transform 0.3s ease",
          }}
          className="group-hover:translate-y-[11px]"
        />
        <Image
          src="/lock-main.png"
          alt="Lock"
          width={70}
          height={70}
          style={{ position: "relative", zIndex: 10 }}
        />
      </motion.div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        style={{
          marginTop: "16px",
          padding: "4px 16px",
          borderRadius: "999px",
          border: "1px solid rgba(124, 58, 237, 0.2)",
          background: "rgba(124, 58, 237, 0.04)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.1em",
            background: "linear-gradient(135deg, #7c3aed, #ec4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ENCRYPTION
        </span>
      </motion.div>
    </div>
  );
}
