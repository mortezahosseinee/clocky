import { useEffect, useRef } from 'react';

interface UseModalFocusTrapOptions {
  isOpen: boolean;
  onClose?: () => void;
  initialFocusSelector?: string;
}

export function useModalFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  initialFocusSelector
}: UseModalFocusTrapOptions) {
  const containerRef = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const initialFocusSelectorRef = useRef(initialFocusSelector);
  initialFocusSelectorRef.current = initialFocusSelector;
  const hasFocusedForCurrentOpen = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasFocusedForCurrentOpen.current = false;
      return;
    }

    // Save previous active element only on opening
    if (!hasFocusedForCurrentOpen.current) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }

    const container = containerRef.current;
    if (!container) return;

    // Only set initial focus once per modal opening, and only if focus is not already inside
    if (!hasFocusedForCurrentOpen.current) {
      hasFocusedForCurrentOpen.current = true;

      const timer = setTimeout(() => {
        const targetContainer = containerRef.current;
        if (!targetContainer) return;

        // If user already clicked or focused on an element inside this modal, don't hijack!
        if (targetContainer.contains(document.activeElement)) {
          return;
        }

        const focusableSelector =
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        let targetToFocus: HTMLElement | null = null;
        if (initialFocusSelectorRef.current) {
          targetToFocus = targetContainer.querySelector(initialFocusSelectorRef.current) as HTMLElement | null;
        }

        if (!targetToFocus) {
          const allFocusable = Array.from(
            targetContainer.querySelectorAll<HTMLElement>(focusableSelector)
          ).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

          // Prefer input, select, textarea over close X button
          targetToFocus =
            allFocusable.find(el => el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') ||
            allFocusable.find(el => !el.classList.contains('modal-close-btn') && !el.getAttribute('aria-label')?.includes('close')) ||
            allFocusable[0] ||
            null;
        }

        if (targetToFocus && typeof targetToFocus.focus === 'function') {
          // Double check focus isn't already inside
          if (!targetContainer.contains(document.activeElement)) {
            targetToFocus.focus();
          }
        }
      }, 50);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab') {
        const focusableSelector =
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(
          currentContainer.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const currentActive = document.activeElement as HTMLElement | null;

        // If focus is outside the modal, bring it inside
        if (!currentActive || !currentContainer.contains(currentActive)) {
          e.preventDefault();
          firstElement.focus();
          return;
        }

        if (e.shiftKey) {
          // Shift + Tab
          if (currentActive === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (currentActive === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return containerRef;
}
