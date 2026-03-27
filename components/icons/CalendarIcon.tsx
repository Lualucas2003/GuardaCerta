import React from 'react';

const CalendarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor"
        {...props}
    >
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm-2 5a1 1 0 00-1 1v6a1 1 0 102 0v-6a1 1 0 00-1-1zm4 0a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
    </svg>
);

export default CalendarIcon;