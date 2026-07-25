import { useState } from "react";

export function useMobileMenu() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return {
    isMobileMenuOpen,
    toggleMobileMenu,
  };
}
