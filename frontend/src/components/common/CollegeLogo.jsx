import React from 'react';
import { COLLEGE_LOGO, COLLEGE_LOGO_FALLBACK } from '../../constants/branding';

/**
 * Standardized Official College Logo Component
 * 
 * Ensures strict aspect-ratio preservation, zero distortion,
 * consistent circular white frames with institutional blue glow,
 * and seamless responsiveness across all screen sizes.
 *
 * Variants:
 * - 'nav': Circular emblem for topbar/navbar (40px desktop, 36px mobile)
 * - 'sidebar': Circular emblem for sidebar navigation (46px desktop, 42px mobile)
 * - 'auth': Prominent circular emblem for Login/Register pages (72px desktop, 58px mobile, 48px landscape)
 * - 'hero': Hero banner emblem for department dashboard (72px desktop, 60px tablet, 50px mobile)
 * - 'admin': Circular emblem for AO Admin Dashboard header (48px desktop, 40px mobile)
 * - 'state': Circular emblem for empty and loading states (52px desktop, 44px mobile)
 * - 'doc': Standalone high-res rectangular logo for official PDF and document previews (64px)
 * - 'raw': Plain img tag with aspect-ratio protection and object-fit: contain
 */
export const CollegeLogo = ({
  variant = 'nav',
  className = '',
  imgClassName = '',
  alt = 'Narasaraopet Engineering College Logo',
  pulse = false,
  style = {},
  imgStyle = {},
}) => {
  const handleError = (e) => {
    // If relative asset fails, attempt public fallback
    if (e.target.src !== COLLEGE_LOGO_FALLBACK && !e.target.src.endsWith(COLLEGE_LOGO_FALLBACK)) {
      e.target.src = COLLEGE_LOGO_FALLBACK;
    }
  };

  // Standalone rectangular logo for document previews
  if (variant === 'doc') {
    return (
      <img
        src={COLLEGE_LOGO}
        alt={alt}
        onError={handleError}
        className={`doc-view-college-logo college-logo-doc ${className}`}
        style={{
          objectFit: 'contain',
          ...style,
          ...imgStyle,
        }}
      />
    );
  }

  // Raw image without circular wrapper
  if (variant === 'raw') {
    return (
      <img
        src={COLLEGE_LOGO}
        alt={alt}
        onError={handleError}
        className={`college-logo-img ${className}`}
        style={{
          objectFit: 'contain',
          ...style,
          ...imgStyle,
        }}
      />
    );
  }

  // Map variant to container class
  const frameClassMap = {
    nav: 'topbar-logo-circle frame-nav',
    sidebar: 'sidebar-emblem frame-sidebar',
    auth: 'login-emblem frame-auth',
    hero: 'banner-college-logo frame-hero',
    admin: 'ao-header-logo-circle frame-admin',
    state: `empty-state-logo frame-state ${pulse ? 'pulse-subtle' : ''}`,
  };

  const imgClassMap = {
    nav: 'topbar-logo',
    sidebar: 'sidebar-emblem-img',
    auth: 'login-emblem-img',
    hero: 'banner-college-logo-img',
    admin: 'ao-header-logo',
    state: 'empty-state-logo-img',
  };

  const containerClass = frameClassMap[variant] || frameClassMap.nav;
  const imageClass = imgClassMap[variant] || 'college-logo-img';

  // For hero banner where the img itself is styled as banner-college-logo
  if (variant === 'hero') {
    return (
      <div className={`banner-logo-container ${className}`} style={style}>
        <img
          src={COLLEGE_LOGO}
          alt={alt}
          onError={handleError}
          className={`banner-college-logo ${pulse ? 'pulse-subtle' : ''} ${imgClassName}`}
          style={{
            objectFit: 'contain',
            ...imgStyle,
          }}
        />
      </div>
    );
  }

  // Standard circular frame wrapping the contained logo
  return (
    <div className={`college-logo-frame ${containerClass} ${className}`} style={style}>
      <img
        src={COLLEGE_LOGO}
        alt={alt}
        onError={handleError}
        className={`college-logo-img ${imageClass} ${imgClassName}`}
        style={{
          objectFit: 'contain',
          ...imgStyle,
        }}
      />
    </div>
  );
};

export default CollegeLogo;
