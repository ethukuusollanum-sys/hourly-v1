import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Scene1_Desktop.css';

// Register GSAP plugins once.
gsap.registerPlugin(ScrollTrigger);

export default function Scene1_Desktop() {
  const sceneRef = useRef(null);
  const laptopScreenRef = useRef(null);
  const [typedText, setTypedText] = useState('');

  // Simple typewriter effect.
  useEffect(() => {
    const text = `Hi 👋\nI'm Vigneshwaran\nUI/UX Designer`;
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setTypedText(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // GSAP scroll‑triggered zoom on the laptop screen.
  useEffect(() => {
    if (!sceneRef.current || !laptopScreenRef.current) return;
    gsap.to(laptopScreenRef.current, {
      scale: 8,
      opacity: 0,
      ease: 'power2.inOut',
      scrollTrigger: {
        trigger: sceneRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
        pin: true
      }
    });
  }, []);

  return (
    <section ref={sceneRef} className="scene-1">
      <div className="desktop-wrapper">
        <div className="laptop">
          <div className="screen" ref={laptopScreenRef}>
            <pre>{typedText}</pre>
          </div>
        </div>
      </div>
      <p className="scroll-hint">↓ Scroll to enter my world</p>
    </section>
  );
}
