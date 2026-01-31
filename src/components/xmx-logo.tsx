export function XMXLogo({ className = "w-32 h-auto", dark = false }: { className?: string; dark?: boolean }) {
    const primaryColor = dark ? '#ffffff' : '#ffffff';
    const accentColor = '#8b5cf6'; // purple accent

    return (
        <svg
            viewBox="0 0 200 80"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* X - Left */}
            <path
                d="M10 10 L35 40 L10 70"
                stroke={primaryColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <path
                d="M40 10 L15 40 L40 70"
                stroke={primaryColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* M - Middle */}
            <path
                d="M55 70 L55 10 L80 45 L105 10 L105 70"
                stroke={primaryColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* X - Right (with accent) */}
            <path
                d="M120 10 L145 40 L120 70"
                stroke={primaryColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <path
                d="M150 10 L125 40"
                stroke={primaryColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Purple accent on top right */}
            <path
                d="M150 10 L160 10"
                stroke={accentColor}
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M125 40 L150 70"
                stroke={primaryColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* CORP text */}
            <text
                x="100"
                y="78"
                textAnchor="middle"
                fill={primaryColor}
                fontSize="10"
                fontFamily="Arial, sans-serif"
                letterSpacing="8"
            >
                CORP
            </text>
        </svg>
    );
}

// Simple text version for PDF/Print
export function XMXLogoText({ className = "" }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-2xl font-black tracking-wider">
                <span className="text-gray-800">X</span>
                <span className="text-gray-800">M</span>
                <span className="text-gray-800">X</span>
                <span className="text-purple-600 ml-0.5">•</span>
            </span>
            <span className="text-xs tracking-[0.3em] text-gray-500 font-medium">CORP</span>
        </div>
    );
}
