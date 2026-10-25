/**
 * Logo de Hornera FinTrack: un hornero (el ave nacional argentina, famosa por construir su nido
 * con forma de horno) parado sobre una calculadora. Es una silueta sin fondo: midnight purple
 * sobre fondos claros y un violeta más claro sobre fondos oscuros, para que se lea en los dos temas.
 * Es el mismo dibujo que public/favicon.svg.
 */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg
      viewBox="40 78 432 432"
      className={`text-[#4a2b8a] dark:text-[#9a7ae6] ${className}`}
      role="img"
      aria-label="Hornera FinTrack"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M146 158 L192 144 C194 120 212 106 234 108 C256 110 270 126 274 144 C304 152 330 178 342 214 C348 236 352 258 358 284 L330 292 C324 274 316 262 306 254 C290 272 266 280 242 278 C212 276 190 252 186 222 C184 202 192 188 202 178 C196 172 192 166 192 160 ZM219.5 134a5.5 5.5 0 1 0 11.0 0a5.5 5.5 0 1 0 -11.0 0ZM166 312H346A30 30 0 0 1 376 342V472A30 30 0 0 1 346 502H166A30 30 0 0 1 136 472V342A30 30 0 0 1 166 312ZM171 334H341A11 11 0 0 1 352 345V369A11 11 0 0 1 341 380H171A11 11 0 0 1 160 369V345A11 11 0 0 1 171 334ZM170 400H196A6 6 0 0 1 202 406V414A6 6 0 0 1 196 420H170A6 6 0 0 1 164 414V406A6 6 0 0 1 170 400ZM220 400H246A6 6 0 0 1 252 406V414A6 6 0 0 1 246 420H220A6 6 0 0 1 214 414V406A6 6 0 0 1 220 400ZM270 400H296A6 6 0 0 1 302 406V414A6 6 0 0 1 296 420H270A6 6 0 0 1 264 414V406A6 6 0 0 1 270 400ZM320 400H346A6 6 0 0 1 352 406V414A6 6 0 0 1 346 420H320A6 6 0 0 1 314 414V406A6 6 0 0 1 320 400ZM170 430H196A6 6 0 0 1 202 436V444A6 6 0 0 1 196 450H170A6 6 0 0 1 164 444V436A6 6 0 0 1 170 430ZM220 430H246A6 6 0 0 1 252 436V444A6 6 0 0 1 246 450H220A6 6 0 0 1 214 444V436A6 6 0 0 1 220 430ZM270 430H296A6 6 0 0 1 302 436V444A6 6 0 0 1 296 450H270A6 6 0 0 1 264 444V436A6 6 0 0 1 270 430ZM320 430H346A6 6 0 0 1 352 436V444A6 6 0 0 1 346 450H320A6 6 0 0 1 314 444V436A6 6 0 0 1 320 430ZM170 460H196A6 6 0 0 1 202 466V474A6 6 0 0 1 196 480H170A6 6 0 0 1 164 474V466A6 6 0 0 1 170 460ZM220 460H246A6 6 0 0 1 252 466V474A6 6 0 0 1 246 480H220A6 6 0 0 1 214 474V466A6 6 0 0 1 220 460ZM270 460H296A6 6 0 0 1 302 466V474A6 6 0 0 1 296 480H270A6 6 0 0 1 264 474V466A6 6 0 0 1 270 460ZM320 460H346A6 6 0 0 1 352 466V474A6 6 0 0 1 346 480H320A6 6 0 0 1 314 474V466A6 6 0 0 1 320 460Z"
      />
      <path
        d="M238 270 L232 316 M272 270 L276 316"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="262" y="348" width="74" height="20" rx="5" fill="currentColor" />
    </svg>
  );
}

interface LogoProps {
  /** Clases para el tamaño del ícono (por defecto 36 px). */
  markClassName?: string;
  /** Oculta el nombre en pantallas chicas y deja solo el ícono. */
  hideNameOnMobile?: boolean;
  className?: string;
}

/** Ícono + nombre de la app. */
export function Logo({ markClassName, hideNameOnMobile = false, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark {...(markClassName ? { className: markClassName } : {})} />
      <span
        className={`text-lg font-semibold tracking-tight ${hideNameOnMobile ? 'hidden sm:inline' : ''}`}
      >
        Hornera <span className="font-bold text-accent-600 dark:text-accent-300">FinTrack</span>
      </span>
    </span>
  );
}
