import React, { useState, useCallback, Suspense, lazy } from 'react';
import type { SceneId, ModuleId } from './types';
import { BootGateScene } from './scenes/BootGateScene';
import { OpeningScene } from './scenes/OpeningScene';
import { ControlRoomScene } from './scenes/ControlRoomScene';
import { SurpriseScene } from './scenes/SurpriseScene';
import { CertificateScene } from './scenes/CertificateScene';
import { CakeScene } from './scenes/CakeScene';
import { FinalMessageScene } from './scenes/FinalMessageScene';
import { FakeCrashScene } from './scenes/FakeCrashScene';
import { WorldFallback } from './components/world/WorldFallback';
import { isWebGLAvailable } from './utils/webgl';
import { useReducedMotion } from './hooks/useReducedMotion';
import { APP_META } from './copy';
import './App.css';

// Persistent 3D World Canvas loaded asynchronously
const WorldCanvas = lazy(() =>
  import('./components/world/WorldCanvas').then(module => ({
    default: module.WorldCanvas,
  }))
);

export default function App(): React.JSX.Element {
  const [currentScene, setCurrentScene] = useState<SceneId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sceneParam = params.get('scene') as SceneId | null;
      if (sceneParam) return sceneParam;
    }
    return 'boot';
  });
  const [visitedModules, setVisitedModules] = useState<ModuleId[]>([]);
  const [cakeResetKey, setCakeResetKey] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [webGLSupported] = useState<boolean>(() => isWebGLAvailable());

  const prefersReducedMotion = useReducedMotion();

  // Mark a module as visited if it hasn't been recorded yet
  const markModuleVisited = useCallback((moduleId: ModuleId) => {
    setVisitedModules(prev => (prev.includes(moduleId) ? prev : [...prev, moduleId]));
  }, []);

  // Safe navigation handler that guards against duplicate triggers
  const handleNavigate = useCallback(
    (to: SceneId) => {
      if (isNavigating) return;
      setIsNavigating(true);

      // Track visited state when entering one of the three modules
      if (to === 'surprise' || to === 'certificate' || to === 'cake') {
        markModuleVisited(to);
      }

      setCurrentScene(to);

      // Short lock to prevent accidental double-tap/clicks
      setTimeout(() => {
        setIsNavigating(false);
      }, 100);
    },
    [isNavigating, markModuleVisited]
  );

  const handleSelectModule = useCallback(
    (moduleId: ModuleId) => {
      handleNavigate(moduleId);
    },
    [handleNavigate]
  );

  // "Replay cake" resets the cake scene's state and opens it
  const handleReplayCake = useCallback(() => {
    setCakeResetKey(prev => prev + 1);
    handleNavigate('cake');
  }, [handleNavigate]);

  const handleProceedToFinal = useCallback(() => {
    handleNavigate('final-message');
  }, [handleNavigate]);

  const isStoryIntro =
    currentScene === 'boot' ||
    currentScene === 'opening' ||
    currentScene === 'control-room' ||
    currentScene === 'surprise' ||
    currentScene === 'certificate' ||
    currentScene === 'cake' ||
    currentScene === 'final-message' ||
    currentScene === 'fake-crash';

  return (
    <div className="app-root-shell">
      {/* ========================================================
          Persistent 3D Dream Garden Viewport (Full-Screen Edge-to-Edge)
          ======================================================== */}
      <div
        className={`world-3d-viewport ${
          currentScene === 'control-room' ? 'interactive' : ''
        }`}
        aria-hidden="true"
      >
        {webGLSupported ? (
          <Suspense fallback={<WorldFallback />}>
            <WorldCanvas
              currentScene={currentScene}
              reducedMotion={prefersReducedMotion}
              onSelectModule={handleSelectModule}
              visitedModules={visitedModules}
            />
          </Suspense>
        ) : (
          <WorldFallback />
        )}
      </div>

      {/* ========================================================
          Foreground Interactive UI Layer (Transparent HUD Overlay)
          ======================================================== */}
      <div className="app-container">
        {/* Top Application Bar (Discreet for inner scenes, hidden during romantic intro) */}
        {!isStoryIntro && (
          <header className="app-nav-bar" aria-label="System Information">
            <div className="app-brand">
              <span className="brand-dot"></span>
              <span className="brand-name">{APP_META.title}</span>
              <span className="brand-version">v{APP_META.version}</span>
            </div>
            <div className="scene-indicator">
              <span className="scene-indicator-label">SCENE:</span>
              <span className="scene-indicator-val">{currentScene}</span>
            </div>
          </header>
        )}

        {/* Main Scene Render Area */}
        <main className="scene-viewport">
          {currentScene === 'boot' && (
            <BootGateScene onNavigate={handleNavigate} />
          )}

          {currentScene === 'opening' && (
            <OpeningScene onNavigate={handleNavigate} />
          )}

          {currentScene === 'control-room' && (
            <ControlRoomScene
              onNavigate={handleNavigate}
              visitedModules={visitedModules}
              onSelectModule={handleSelectModule}
            />
          )}

          {currentScene === 'surprise' && (
            <SurpriseScene onNavigate={handleNavigate} />
          )}

          {currentScene === 'certificate' && (
            <CertificateScene onNavigate={handleNavigate} />
          )}

          {currentScene === 'cake' && (
            <CakeScene
              key={cakeResetKey}
              onNavigate={handleNavigate}
              onProceedToFinal={handleProceedToFinal}
              resetKey={cakeResetKey}
              hasVisitedSurprise={visitedModules.includes('surprise')}
            />
          )}

          {currentScene === 'final-message' && (
            <FinalMessageScene onNavigate={handleNavigate} />
          )}

          {currentScene === 'fake-crash' && (
            <FakeCrashScene
              onNavigate={handleNavigate}
              onReplayCake={handleReplayCake}
            />
          )}
        </main>

        {/* Navigation Footer (Visible during later modules) */}
        {!isStoryIntro && (
          <footer className="skeleton-footer">
            <div className="footer-status">
              <span>FAARA.EXE · Protocol {APP_META.protocol} Active</span>
              {visitedModules.length > 0 && (
                <span className="visited-count">
                  · Visited ({visitedModules.length}/3 modules)
                </span>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
