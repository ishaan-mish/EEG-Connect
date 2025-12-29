export default function Brain({ isActive }) {
    return (
        <svg
            className={`brain-svg ${isActive ? 'active' : ''}`}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Outer Glow Circle */}
            <circle cx="50" cy="50" r="48" stroke="#ffd700" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />

            {/* Right Hemisphere */}
            <path
                d="M52 25C65 25 75 35 75 50C75 65 65 75 52 75V25Z"
                stroke={isActive ? "#ffd700" : "#ffffff"}
                strokeWidth="2"
                opacity={isActive ? "1" : "0.4"}
            />

            {/* Left Hemisphere */}
            <path
                d="M48 25C35 25 25 35 25 50C25 65 35 75 48 75V25Z"
                stroke={isActive ? "#ffd700" : "#ffffff"}
                strokeWidth="2"
                opacity={isActive ? "1" : "0.4"}
            />

            {/* Neural Center Line */}
            <line x1="50" y1="28" x2="50" y2="72" stroke="#bba2be" strokeWidth="1.5" />

            {/* Neural Nodes (The sparkly bits) */}
            <circle cx="50" cy="35" r="2" fill="#ffd700">
                {isActive && <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />}
            </circle>
            <circle cx="65" cy="50" r="1.5" fill="#bba2be" />
            <circle cx="35" cy="50" r="1.5" fill="#bba2be" />
            <circle cx="50" cy="65" r="2" fill="#ffd700">
                {isActive && <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />}
            </circle>
        </svg>
    );
}