import React, { useEffect, useState } from 'react';
import { getHealth } from '../services/api.js';

export default function Navbar() {
  const [health, setHealth] = useState({ status: 'checking', loaded: false, text: 'Connecting...' });

  useEffect(() => {
    let active = true;
    getHealth()
      .then(res => {
        if (!active) return;
        if (res.model_loaded) {
          setHealth({ status: 'online', loaded: true, text: 'Model Online · Port 8000' });
        } else {
          setHealth({ status: 'degraded', loaded: false, text: 'API Online · Model Not Loaded' });
        }
      })
      .catch(() => {
        if (!active) return;
        setHealth({ status: 'offline', loaded: false, text: 'API Offline' });
      });
    return () => { active = false; };
  }, []);

  return (
    <header className="nav">
      <a className="brand" href="#top">
        <span className="brand-mark">N</span>
        <span>NeuralDesk<small>SUPPORT INTELLIGENCE</small></span>
      </a>
      <span className={`live live-${health.status}`} title={health.text} aria-label={health.text}>
        <i className={`dot dot-${health.status}`} />
      </span>
    </header>
  );
}
