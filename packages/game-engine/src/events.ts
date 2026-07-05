import type { DevCard, EdgeId, HexId, PlayerId, ResourceType, VertexId } from './types.js';

export interface SettlementBuiltEvent {
  type: 'SettlementBuilt';
  playerId: PlayerId;
  vertexId: VertexId;
}
export interface RoadBuiltEvent {
  type: 'RoadBuilt';
  playerId: PlayerId;
  edgeId: EdgeId;
}
export interface ResourcesGainedEvent {
  type: 'ResourcesGained';
  playerId: PlayerId;
  resources: Partial<Record<ResourceType, number>>;
}
export interface DiceRolledEvent {
  type: 'DiceRolled';
  die1: number;
  die2: number;
  total: number;
  /** Players who owe a discard as a result of this roll (total === 7 and hand > 7 cards), computed at roll time so the reducer never needs to re-derive it from fold order. */
  playersToDiscard: PlayerId[];
}
export interface ResourcesDiscardedEvent {
  type: 'ResourcesDiscarded';
  playerId: PlayerId;
  resources: Partial<Record<ResourceType, number>>;
}
/** Emitted whenever a player pays a resource cost to the bank (building, buying a dev card). Symmetric to ResourcesGained. */
export interface ResourcesSpentEvent {
  type: 'ResourcesSpent';
  playerId: PlayerId;
  resources: Partial<Record<ResourceType, number>>;
}
export interface RobberMovedEvent {
  type: 'RobberMoved';
  hexId: HexId;
  /** Players adjacent to the new hex with a building and at least 1 resource card, computed at move time (excludes the mover). Empty means the STEAL interrupt is skipped. */
  stealTargets: PlayerId[];
}
export interface ResourceStolenEvent {
  type: 'ResourceStolen';
  thiefId: PlayerId;
  victimId: PlayerId;
  resource: ResourceType | null;
}
export interface CityUpgradedEvent {
  type: 'CityUpgraded';
  playerId: PlayerId;
  vertexId: VertexId;
}
export interface DevelopmentCardBoughtEvent {
  type: 'DevelopmentCardBought';
  playerId: PlayerId;
  card: DevCard;
}
export interface KnightPlayedEvent {
  type: 'KnightPlayed';
  playerId: PlayerId;
  cardId: string;
}
export interface RoadBuildingPlayedEvent {
  type: 'RoadBuildingPlayed';
  playerId: PlayerId;
  cardId: string;
}
export interface YearOfPlentyPlayedEvent {
  type: 'YearOfPlentyPlayed';
  playerId: PlayerId;
  cardId: string;
  resources: [ResourceType, ResourceType];
}
export interface MonopolyPlayedEvent {
  type: 'MonopolyPlayed';
  playerId: PlayerId;
  cardId: string;
  resource: ResourceType;
  totalStolen: number;
}
export interface ResourcesTradedEvent {
  type: 'ResourcesTraded';
  playerId: PlayerId;
  give: ResourceType;
  giveAmount: number;
  receive: ResourceType;
}
export interface TurnEndedEvent {
  type: 'TurnEnded';
  nextPlayerId: PlayerId;
}
export interface LongestRoadChangedEvent {
  type: 'LongestRoadChanged';
  holder: PlayerId | null;
  length: number;
}
export interface LargestArmyChangedEvent {
  type: 'LargestArmyChanged';
  holder: PlayerId | null;
  count: number;
}
export interface GameWonEvent {
  type: 'GameWon';
  playerId: PlayerId;
}

export type Event =
  | SettlementBuiltEvent
  | RoadBuiltEvent
  | ResourcesGainedEvent
  | DiceRolledEvent
  | ResourcesDiscardedEvent
  | ResourcesSpentEvent
  | RobberMovedEvent
  | ResourceStolenEvent
  | CityUpgradedEvent
  | DevelopmentCardBoughtEvent
  | KnightPlayedEvent
  | RoadBuildingPlayedEvent
  | YearOfPlentyPlayedEvent
  | MonopolyPlayedEvent
  | ResourcesTradedEvent
  | TurnEndedEvent
  | LongestRoadChangedEvent
  | LargestArmyChangedEvent
  | GameWonEvent;
