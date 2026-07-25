import { useState, type FormEvent } from 'react';
import { Activity, MapPin, Navigation, Search } from 'lucide-react';

interface SearchControlsProps {
  radius: number;
  flightCount: number;
  isLoading: boolean;
  onRadiusChange: (radius: number) => void;
  onSearch: (address: string) => void;
  onUseLocation: () => void;
  variant?: 'card' | 'inline';
}

export function SearchControls({
  radius,
  flightCount,
  isLoading,
  onRadiusChange,
  onSearch,
  onUseLocation,
  variant = 'card',
}: SearchControlsProps) {
  const [address, setAddress] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = address.trim();
    if (value) onSearch(value);
  };

  return (
    <section className={`search-controls search-controls--${variant}`}>
      <form onSubmit={submit}>
        <label htmlFor={`address-${variant}`}>Location search</label>
        <div className="search-controls__row">
          <button
            className="icon-button icon-button--secondary"
            type="button"
            onClick={onUseLocation}
            disabled={isLoading}
            aria-label="Use current location"
            title="Use current location"
          >
            <Navigation aria-hidden="true" size={18} />
          </button>
          <input
            id={`address-${variant}`}
            type="search"
            autoComplete="street-address"
            placeholder="Address, suburb, or city"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            disabled={isLoading}
          />
          <button
            className="icon-button"
            type="submit"
            disabled={!address.trim() || isLoading}
            aria-label="Search location"
          >
            {isLoading
              ? <Activity className="spinner" aria-hidden="true" size={19} />
              : <Search aria-hidden="true" size={19} />}
          </button>
        </div>
      </form>

      <div className="search-controls__radius">
        <label htmlFor={`radius-${variant}`}>Scan radius</label>
        <div className="range-row">
          <MapPin className="icon-glow" aria-hidden="true" size={18} />
          <input
            id={`radius-${variant}`}
            type="range"
            min="10"
            max="200"
            step="5"
            value={radius}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
          />
          <output htmlFor={`radius-${variant}`}>{radius} km</output>
        </div>
      </div>

      <div className="flight-count" aria-live="polite">
        <span>Active flights</span>
        <strong>{flightCount}</strong>
      </div>
    </section>
  );
}
