import React from 'react';

const ExpandArrowsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        {...props}
    >
        <path d="M15 5H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2zM5 7a1 1 0 011-1h8a1 1 0 011 1v2.586l-1.293-1.293a1 1 0 00-1.414 1.414L15.586 13H5V7z" />
        <path d="M2.5 12a.5.5 0 010-1h15a.5.5 0 010 1h-15z" transform="rotate(45 10 10)" />
    </svg>
);

export default ExpandArrowsIcon;