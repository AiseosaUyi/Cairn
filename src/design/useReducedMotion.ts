/**
 * Wraps react-native-reanimated's reduced-motion detection so the rest of
 * the app has one stable import path. Motion call sites must check this
 * AND any local `frozen` prop (used inside crisis surfaces — stillness is
 * the signal, never overrideable).
 */
import { useReducedMotion as useReducedMotionRN } from 'react-native-reanimated';

export function useReducedMotion(): boolean {
  return useReducedMotionRN();
}
