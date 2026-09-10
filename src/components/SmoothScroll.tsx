'use client';

import { useEffect } from 'react';

const REFERENCE_LERP = 0.12;
const FRAME_DURATION = 1000 / 60;
const SETTLE_DISTANCE = 0.25;

function clampScroll(value: number) {
  const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(maximum, Math.max(0, value));
}

function normalizedWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function nestedScrollerCanMove(target: EventTarget | null, delta: number) {
  let element = target instanceof Element ? target : null;

  while (element && element !== document.documentElement) {
    const style = getComputedStyle(element);
    const scrollable = /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    if (scrollable) {
      const canMoveUp = delta < 0 && element.scrollTop > 0;
      const canMoveDown = delta > 0 && element.scrollTop + element.clientHeight < element.scrollHeight;
      if (canMoveUp || canMoveDown) return true;
    }
    element = element.parentElement;
  }

  return false;
}

export default function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    let current = window.scrollY;
    let target = current;
    let lastWrittenScroll = current;
    let animationFrame = 0;
    let lastFrame = performance.now();
    let animating = false;

    const cancel = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      animating = false;
      current = window.scrollY;
      target = current;
      lastWrittenScroll = current;
    };

    const tick = (time: number) => {
      if (window.scrollY !== lastWrittenScroll) {
        cancel();
        return;
      }

      const elapsed = Math.min(50, Math.max(0, time - lastFrame));
      const frameAdjustedLerp = 1 - (1 - REFERENCE_LERP) ** (elapsed / FRAME_DURATION);
      lastFrame = time;
      current += (target - current) * frameAdjustedLerp;

      if (Math.abs(target - current) <= SETTLE_DISTANCE) {
        current = target;
        window.scrollTo({ top: target, behavior: 'auto' });
        lastWrittenScroll = window.scrollY;
        animationFrame = 0;
        animating = false;
        return;
      }

      window.scrollTo({ top: current, behavior: 'auto' });
      lastWrittenScroll = window.scrollY;
      animationFrame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (animating) return;
      animating = true;
      lastFrame = performance.now();
      animationFrame = requestAnimationFrame(tick);
    };

    const onWheel = (event: WheelEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        reducedMotion.matches ||
        !finePointer.matches ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ) return;

      const delta = normalizedWheelDelta(event);
      if (!delta || nestedScrollerCanMove(event.target, delta)) return;

      event.preventDefault();
      if (!animating) {
        current = window.scrollY;
        target = current;
        lastWrittenScroll = current;
      }
      target = clampScroll(target + delta);
      start();
    };

    const onNativeScroll = () => {
      if (animating && window.scrollY === lastWrittenScroll) return;
      cancel();
    };

    const onResize = () => {
      target = clampScroll(target);
      current = clampScroll(current);
    };

    const onMotionPreferenceChange = () => {
      if (reducedMotion.matches) cancel();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onNativeScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('keydown', cancel);
    window.addEventListener('pointerdown', cancel, { passive: true });
    reducedMotion.addEventListener('change', onMotionPreferenceChange);

    return () => {
      cancel();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onNativeScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('pointerdown', cancel);
      reducedMotion.removeEventListener('change', onMotionPreferenceChange);
    };
  }, []);

  return null;
}
