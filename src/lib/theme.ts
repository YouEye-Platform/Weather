interface HeaderConfig {
  theme?: {
    cssVariables?: string;
    mode?: string;
  } | null;
}

export function getThemeCSSVariables(config: HeaderConfig | null): string | null {
  return config?.theme?.cssVariables ?? null;
}

export function getThemeMode(config: HeaderConfig | null): string {
  return config?.theme?.mode ?? "system";
}

export function generateThemeStyle(cssVariables: string | null): string | null {
  if (!cssVariables) return null;
  const parts = cssVariables.split(" [dark] ");
  const lightVars = parts[0];
  const darkVars = parts[1] || parts[0];
  return `:root { ${lightVars} } .dark { ${darkVars} }`;
}

export function generateSystemThemeScript(): string {
  return `(function(){try{var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme:dark)');function u(){d.className=m.matches?'dark':'light'}u();m.addEventListener('change',u)}catch(e){}})()`;
}
