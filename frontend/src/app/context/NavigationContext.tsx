import React, { createContext, useContext } from "react";

interface NavigationContextType {
  navigateHome: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  navigateHome: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider: React.FC<{
  children: React.ReactNode;
  onNavigateHome: () => void;
}> = ({ children, onNavigateHome }) => (
  <NavigationContext.Provider value={{ navigateHome: onNavigateHome }}>
    {children}
  </NavigationContext.Provider>
);
