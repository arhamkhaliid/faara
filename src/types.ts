/**
 * FAARA.EXE — Application Types & Scene Definitions
 */

export type SceneId =
  | 'boot'
  | 'opening'
  | 'control-room'
  | 'surprise'
  | 'certificate'
  | 'cake'
  | 'final-message'
  | 'fake-crash';

export type ModuleId = 'surprise' | 'certificate' | 'cake';

export interface SceneProps {
  onNavigate: (to: SceneId) => void;
}

export interface CakeSceneProps extends SceneProps {
  resetKey: number;
  onProceedToFinal: () => void;
  hasVisitedSurprise?: boolean;
}

export interface ControlRoomSceneProps extends SceneProps {
  visitedModules: ModuleId[];
  onSelectModule: (moduleId: ModuleId) => void;
}

export interface FakeCrashSceneProps extends SceneProps {
  onReplayCake: () => void;
}
