const GITHUB_ICON = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 fill-current"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

export function AppFooter() {
  return (
    <footer className="w-full border-t border-gray-200 bg-gray-50 px-8 py-10 text-sm text-gray-500">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
        <p className="text-base font-semibold text-gray-700">
          YGO Tournaments Charts
        </p>

        <p className="max-w-xl text-xs leading-relaxed">
          A free tool for generating Yu-Gi-Oh! tournament infographics. Card and
          deck artwork data is provided by the{" "}
          <a
            href="https://ygoprodeck.com/api-guide/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            YGOProDeck API
          </a>
          . Built with Next.js, Chart.js and Tailwind CSS.
        </p>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/waltercorneli/ygo-tournaments-charts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-600 transition-colors hover:text-gray-900"
          >
            {GITHUB_ICON}
            <span className="text-xs">
              waltercorneli/ygo-tournaments-charts
            </span>
          </a>
          <a
            href="https://github.com/waltercorneli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-600 transition-colors hover:text-gray-900"
          >
            {GITHUB_ICON}
            <span className="text-xs">@waltercorneli</span>
          </a>
        </div>

        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} waltercorneli
        </p>
      </div>
    </footer>
  );
}
