import { keyframes } from '@mui/system';

export const hyperJumpAnimation = keyframes`
  0% {
    transform: scale(1) translateZ(0);
    opacity: 1;
  }
  20% {
    transform: scale(1.1) translateZ(0);
    opacity: 1;
  }
  100% {
    transform: scale(30) translateZ(1000px);
    opacity: 0;
  }
`;

export const starStreakAnimation = keyframes`
  0% {
    transform: translateX(0) scaleX(1);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(100vw) scaleX(3);
    opacity: 0;
  }
`;

export const fadeInAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`; 