import { domAnimation } from 'motion/react';

// Loaded in its own chunk by MotionProvider, so the animation engine never blocks the first render.
export default domAnimation;
