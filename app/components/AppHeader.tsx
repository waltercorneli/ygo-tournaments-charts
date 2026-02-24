interface AppHeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export function AppHeader({ onMenuToggle, isMenuOpen }: AppHeaderProps) {
  return (
    <header className="w-full border-b border-gray-200 bg-white px-8 py-3 shrink-0 flex items-center gap-3">
      {onMenuToggle && (
        <button
          className="md:hidden flex flex-col justify-center gap-1 w-6 h-6 shrink-0"
          onClick={onMenuToggle}
          aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
        >
          <span
            className={`block h-0.5 bg-gray-700 transition-all duration-300 origin-center ${
              isMenuOpen ? "rotate-45 translate-y-[5px] w-full" : "w-full"
            }`}
          />
          <span
            className={`block h-0.5 bg-gray-700 transition-all duration-300 ${
              isMenuOpen ? "opacity-0 w-0" : "w-full"
            }`}
          />
          <span
            className={`block h-0.5 bg-gray-700 transition-all duration-300 origin-center ${
              isMenuOpen ? "-rotate-45 -translate-y-[5px] w-full" : "w-full"
            }`}
          />
        </button>
      )}
      <p className="text-sm font-bold tracking-wide text-gray-800">
        YGO Tournament Chart
      </p>
    </header>
  );
}
