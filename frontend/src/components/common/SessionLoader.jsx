import React from 'react';
import { CollegeLogo } from './CollegeLogo';

/**
 * Standardized Session Loading Screen
 *
 * Displays a centered, bouncing official NEC college logo with institutional
 * blue glow and an optional subtle "Loading..." label underneath.
 * Responsive across web, tablet, mobile, and Capacitor Android app.
 * Automatically respects `prefers-reduced-motion`.
 */
export const SessionLoader = ({ label = 'Loading...' }) => {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label={label || 'Loading session'}>
      <div className="session-loader-container">
        <CollegeLogo variant="loader" alt="Narasaraopeta Engineering College" />
        {label ? <span className="session-loader-label">{label}</span> : null}
      </div>
    </div>
  );
};

export default SessionLoader;

