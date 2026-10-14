import { useState, useCallback, useEffect, useRef } from 'react';

export const useHeaderMobileMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const scrollPositionRef = useRef(0);
    const hamburgerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement | null>(null);

    const open = useCallback(() => {
        scrollPositionRef.current = window.pageYOffset;
        setIsOpen(true);

        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPositionRef.current}px`;
        document.body.style.width = '100%';

        setTimeout(() => closeRef.current?.focus(), 100);
    }, []);

    const close = useCallback(() => {
        if (!isOpen) return;
        setIsOpen(false);

        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        window.scrollTo(0, scrollPositionRef.current);
        setTimeout(() => hamburgerRef.current?.focus(), 0);
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) close();
        };
        const handleResize = () => {
            if (window.innerWidth > 768 && isOpen) close();
        };

        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        };
    }, [isOpen, close]);

    return {
        isOpen,
        open,
        close,
        hamburgerRef,
        closeRef,
    };
};