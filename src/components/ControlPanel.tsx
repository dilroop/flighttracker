import { useState } from 'react';
import { Search, MapPin, Activity, Navigation } from 'lucide-react';

interface ControlPanelProps {
  onSearch: (address: string) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  isLoading: boolean;
  flightCount: number;
  className?: string;
  hideTitle?: boolean;
  onUseLocation?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onSearch,
  radius,
  onRadiusChange,
  isLoading,
  flightCount,
  className = "controls-overlay",
  hideTitle = false,
  onUseLocation,
}) => {
  const [addressInput, setAddressInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      onSearch(addressInput.trim());
    }
  };

  return (
    <div className={`${className} glass-panel`}>
      {!hideTitle && (
        <div className="app-title">
          <Activity className="icon-glow" size={28} />
          <span>AeroTracker</span>
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="input-group">
        <label htmlFor="address">Location Search</label>
        <div className="input-row">
          {onUseLocation && (
            <button 
              type="button" 
              onClick={onUseLocation} 
              disabled={isLoading}
              title="Use current location"
              style={{ padding: '0 16px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--accent-color)' }}
            >
              <Navigation size={18} />
            </button>
          )}
          <input
            id="address"
            type="text"
            placeholder="Enter your house address or city..."
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={!addressInput.trim() || isLoading}>
            {isLoading ? <Activity className="loading-indicator" size={20} /> : <Search size={20} />}
          </button>
        </div>
      </form>

      <div className="input-group">
        <label htmlFor="radius">Scan Radius (KM)</label>
        <div className="slider-container">
          <MapPin size={18} className="icon-glow" />
          <input
            id="radius"
            type="range"
            min="10"
            max="200"
            step="5"
            value={radius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
          />
          <span className="slider-value">{radius} km</span>
        </div>
      </div>

      <div className="input-group" style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          <span>Active Flights in Area:</span>
          <span style={{ fontWeight: 600, color: '#fff', fontSize: '18px' }}>{flightCount}</span>
        </div>
      </div>
    </div>
  );
};
