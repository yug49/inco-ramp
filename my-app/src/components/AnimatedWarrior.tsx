'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { WarriorNotificationDialog } from './WarriorNotificationDialog';

export const AnimatedWarrior = () => {
  const [currentFrame, setCurrentFrame] = useState(1);
  const totalFrames = 6;
  const frameSpeed = 200; // milliseconds between frame changes
  
  useEffect(() => {
    // Animation loop that changes the frame
    const animationFrame = () => {
      setCurrentFrame((prev) => (prev % totalFrames) + 1);
    };
    
    const interval = setInterval(animationFrame, frameSpeed);
    
    // Clean up the interval when component unmounts
    return () => clearInterval(interval);
  }, []);
  
  return (
    <>
      <WarriorNotificationDialog />
      <div className="fixed bottom-8 right-8 z-50 pointer-events-none select-none">
        <Image
          src={`/warrior/${currentFrame}.png`}
          alt="Assistant Warrior"
          width={384}
          height={384}
          priority
          className="object-contain drop-shadow-xl"
        />
      </div>
    </>
  );
};

export default AnimatedWarrior;
