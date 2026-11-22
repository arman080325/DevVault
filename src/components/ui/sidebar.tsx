"use client";

import { cn } from "@/lib/utils";
import React, {
  useState,
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

export interface Links {
  label: string;
  href?: string;
  icon: React.JSX.Element | React.ReactNode;
  badge?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.aside>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as unknown as React.ComponentProps<"div">)} />
    </>
  );
};

export interface DesktopSidebarProps
  extends React.ComponentProps<typeof motion.aside> {
  widthExpanded?: string;
  widthCollapsed?: string;
}

export const DesktopSidebar = ({
  className,
  children,
  widthExpanded = "260px",
  widthCollapsed = "72px",
  ...props
}: DesktopSidebarProps) => {
  const { open, setOpen, animate } = useSidebar();
  const shouldReduceMotion = useReducedMotion();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpen(true);
  }, [setOpen]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // 150ms debounce prevents accidental collapsing when cursor moves across section gaps or borders
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  }, [setOpen]);

  const handleFocus = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpen(true);
  }, [setOpen]);

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // If focus is still within the sidebar container, keep expanded
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      setOpen(false);
    },
    [setOpen]
  );

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <motion.aside
      className={cn(
        "fixed top-0 left-0 bottom-0 h-screen h-[100dvh] hidden md:flex md:flex-col bg-[var(--canvas)] border-r border-[var(--rule)] shrink-0 z-30 select-none overflow-hidden",
        className
      )}
      initial={{ width: widthCollapsed }}
      animate={{
        width: animate ? (open ? widthExpanded : widthCollapsed) : widthExpanded,
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.25,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerEnter={handleMouseEnter}
      onPointerLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-expanded={open}
      aria-label="DevVault Main Navigation"
      aria-expanded={open}
      {...props}
    >
      {children}
    </motion.aside>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  const shouldReduceMotion = useReducedMotion();

  // Escape key closes mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  return (
    <div className={cn("md:hidden", className)} {...props}>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {/* Slide-in drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.28,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-[var(--canvas)] text-[var(--ink)] border-r border-[var(--rule)] p-6 z-[100] flex flex-col justify-between shadow-2xl overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              <div className="absolute right-4 top-4 z-50">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--hover)] transition-colors"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  const shouldReduceMotion = useReducedMotion();

  const content = (
    <>
      <div className="shrink-0 flex items-center justify-center w-6 h-6">
        {link.icon}
      </div>

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
        className="text-[var(--muted)] group-hover/sidebar:text-[var(--ink)] text-sm whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left"
      >
        {link.label}
      </motion.span>
      {link.badge && open && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ml-auto text-xs font-mono text-[var(--accent)] font-medium"
        >
          {link.badge}
        </motion.span>
      )}
    </>
  );

  if (link.href && link.href !== "#") {
    return (
      <a
        href={link.href}
        className={cn(
          "flex items-center justify-start gap-3 group/sidebar py-2 px-2 rounded-md hover:bg-[var(--hover)] transition-colors",
          link.active && "bg-[var(--hover)] text-[var(--ink)] font-semibold",
          className
        )}
        onClick={link.onClick}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2 px-2 w-full rounded-md hover:bg-[var(--hover)] transition-colors text-left",
        link.active && "bg-[var(--hover)] text-[var(--ink)] font-semibold",
        className
      )}
      onClick={link.onClick}
      {...props}
    >
      {content}
    </button>
  );
};
