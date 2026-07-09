export { BUILD_COSTS, PIECE_LIMITS } from './constants.js';
export { createInitialGameState } from './state.js';
export { applyCommand } from './engine.js';
export type { CommandHandler } from './engine.js';
export { getStateView } from './view.js';
export type { PlayerPublicView, PlayerView } from './view.js';
export type { Result, RuleViolation } from './result.js';
export type { Command } from './commands.js';
export type { Event } from './events.js';
export type {
  Board,
  DevCard,
  DevCardType,
  Edge,
  EdgeId,
  GameState,
  Hex,
  HexId,
  HexResource,
  Phase,
  PlayerId,
  PlayerState,
  Port,
  PortId,
  PortKind,
  ResourceType,
  Vertex,
  VertexId,
} from './types.js';

// Handler modules register themselves with the engine at import time (see each
// module's closing `registerHandler(...)` calls) — these imports exist purely
// for that side effect and are otherwise unused in this file.
import './handlers/setup.js';
import './handlers/roll.js';
import './handlers/robber.js';
import './handlers/build.js';
import './handlers/devCards.js';
import './handlers/trade.js';
import './handlers/turn.js';
