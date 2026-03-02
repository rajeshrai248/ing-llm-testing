import React from 'react';

interface BrokerLogoProps {
  broker: string;
  size?: 'sm' | 'md' | 'lg';
}

const BROKER_LOGO_MAP: Record<string, string> = {
  'ING Self Invest': '/logos/ing.png',
  'Degiro Belgium': '/logos/degiro.png',
  'DEGIRO Belgium': '/logos/degiro.png',
  'Revolut': '/logos/revolut.png',
  'Rebel': '/logos/rebel.png',
  'ReBel': '/logos/rebel.png',
  'Bolero': '/logos/bolero.png',
  'Saxo': '/logos/saxo.png',
  'Keytrade Bank': '/logos/keytrade.png',
  'MeDirect': '/logos/medirect.png',
  'Trade Republic': '/logos/trade-republic.png',
};

const sizeMap = {
  sm: 20,
  md: 26,
  lg: 34,
};

const BrokerLogo: React.FC<BrokerLogoProps> = ({ broker, size = 'md' }) => {
  const logoPath = BROKER_LOGO_MAP[broker];
  const px = sizeMap[size];

  if (logoPath) {
    return (
      <img
        src={logoPath}
        alt={`${broker} logo`}
        className="broker-logo"
        width={px}
        height={px}
        loading="lazy"
        style={{ borderRadius: size === 'lg' ? 6 : 4, objectFit: 'contain' }}
      />
    );
  }

  // Fallback: colored circle with initials for unknown brokers
  const words = broker.split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : broker.substring(0, 2).toUpperCase();

  return (
    <span
      className="broker-logo broker-logo-fallback"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: px,
        height: px,
        borderRadius: size === 'lg' ? 6 : 4,
        backgroundColor: '#6B7280',
        color: '#fff',
        fontSize: px * 0.4,
        fontWeight: 700,
        flexShrink: 0,
        lineHeight: 1,
      }}
      aria-label={broker}
    >
      {initials}
    </span>
  );
};

export default BrokerLogo;
