import './styles/base.css';
import './styles/match3.css';
import './styles/dialogs.css';
import './styles/launcher.css';
import './styles/gardenscapes-hp.css';
import './styles/homescapes-hp.css';
import './styles/mobile-world.css';
import './styles/mobile-match3.css';
import './styles/liveops-online.css';
import './styles/world-map.css';
import './styles/mobile-compact.css';
import './styles/farmscapes.css';
import { ScapesApp } from './ui/appShell.js';

const forcedGame = document.body.dataset.forcedGame || null;
window.__scapesApp = new ScapesApp(forcedGame);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch(() => {});
  });
}
