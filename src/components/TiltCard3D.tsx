import React, { useRef, useState, useCallback, useMemo } from 'react';

interface TiltCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees, default 10
  scale?: number;   // hover lift scale, default 1.02
  glare?: boolean;  // show subtle gold specular glare, default true
}

export const TiltCard3D: React.FC<TiltCard3DProps> = ({
  children,
  className = '',
  maxTilt = 9.5,
  scale = 1.02,
  glare = true,
  style,
  ...rest
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rx: 0, ry: 0, isHovered: false });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  const isCoarse = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isCoarse || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const normX = px / rect.width - 0.5;
      const normY = py / rect.height - 0.5;

      const rx = -normY * maxTilt;
      const ry = normX * maxTilt;

      setTransform({ rx, ry, isHovered: true });
      if (glare) {
        setGlarePos({ x: px, y: py });
      }
    },
    [isCoarse, maxTilt, glare]
  );

  const handleMouseEnter = useCallback(() => {
    if (isCoarse) return;
    setTransform((prev) => ({ ...prev, isHovered: true }));
  }, [isCoarse]);

  const handleMouseLeave = useCallback(() => {
    if (isCoarse) return;
    setTransform({ rx: 0, ry: 0, isHovered: false });
  }, [isCoarse]);

  const cardTransform = useMemo(() => {
    if (isCoarse || !transform.isHovered) {
      return 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }
    return `perspective(1000px) rotateX(${transform.rx.toFixed(2)}deg) rotateY(${transform.ry.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
  }, [isCoarse, transform, scale]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
      style={{
        transform: cardTransform,
        transformStyle: 'preserve-3d',
        transition: transform.isHovered
          ? 'transform 0.08s ease-out, box-shadow 0.25s ease, border-color 0.25s ease'
          : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.4s ease',
        willChange: 'transform',
        boxShadow: transform.isHovered
          ? '0 20px 40px -10px rgba(0, 0, 0, 0.75), 0 0 25px -4px rgba(212, 175, 55, 0.18)'
          : undefined,
        ...style,
      }}
      {...rest}
    >
      {/* Specular Glare Overlay */}
      {glare && !isCoarse && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
          style={{
            opacity: transform.isHovered ? 1 : 0,
            background: `radial-gradient(circle 320px at ${glarePos.x}px ${glarePos.y}px, rgba(247, 231, 180, 0.16) 0%, rgba(212, 175, 55, 0.05) 45%, transparent 75%)`,
            mixBlendMode: 'overlay',
            borderRadius: 'inherit',
          }}
        />
      )}

      {/* Card Content */}
      {children}
    </div>
  );
};
