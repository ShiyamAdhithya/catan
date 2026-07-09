import type { DevCard, EdgeId, HexId, PlayerId, ResourceType, VertexId } from './types.js';

export interface PlaceInitialSettlementCommand {
  type: 'PlaceInitialSettlement';
  playerId: PlayerId;
  vertexId: VertexId;
}
export interface PlaceInitialRoadCommand {
  type: 'PlaceInitialRoad';
  playerId: PlayerId;
  edgeId: EdgeId;
}
export interface RollDiceCommand {
  type: 'RollDice';
  playerId: PlayerId;
  die1: number;
  die2: number;
}
export interface DiscardResourcesCommand {
  type: 'DiscardResources';
  playerId: PlayerId;
  discarded: Partial<Record<ResourceType, number>>;
}
export interface MoveRobberCommand {
  type: 'MoveRobber';
  playerId: PlayerId;
  hexId: HexId;
}
export interface StealResourceCommand {
  type: 'StealResource';
  playerId: PlayerId;
  targetPlayerId: PlayerId;
  /** Coordinator-declared random source (any integer); the engine deterministically maps it onto the victim's current hand via modulo, so every peer resolves the same stolen card without the engine calling Math.random() itself. */
  randomIndex: number;
}
export interface BuildRoadCommand {
  type: 'BuildRoad';
  playerId: PlayerId;
  edgeId: EdgeId;
}
export interface BuildSettlementCommand {
  type: 'BuildSettlement';
  playerId: PlayerId;
  vertexId: VertexId;
}
export interface BuildCityCommand {
  type: 'BuildCity';
  playerId: PlayerId;
  vertexId: VertexId;
}
export interface BuyDevelopmentCardCommand {
  type: 'BuyDevelopmentCard';
  playerId: PlayerId;
  card: DevCard;
}
export interface PlayDevelopmentCardCommand {
  type: 'PlayDevelopmentCard';
  playerId: PlayerId;
  cardId: string;
  // Knight has no payload: playing it transitions phase to MOVE_ROBBER, then
  // the player submits a normal MoveRobber/StealResource pair, reusing the
  // exact same handlers as the roll-a-7 interrupt (DRY — one robber flow).
  roadBuilding?: { edgeIds: [EdgeId, EdgeId] };
  yearOfPlenty?: { resources: [ResourceType, ResourceType] };
  monopoly?: { resource: ResourceType };
}
export interface TradeWithBankCommand {
  type: 'TradeWithBank';
  playerId: PlayerId;
  give: ResourceType;
  giveAmount: number;
  receive: ResourceType;
}
export interface EndTurnCommand {
  type: 'EndTurn';
  playerId: PlayerId;
}

export type Command =
  | PlaceInitialSettlementCommand
  | PlaceInitialRoadCommand
  | RollDiceCommand
  | DiscardResourcesCommand
  | MoveRobberCommand
  | StealResourceCommand
  | BuildRoadCommand
  | BuildSettlementCommand
  | BuildCityCommand
  | BuyDevelopmentCardCommand
  | PlayDevelopmentCardCommand
  | TradeWithBankCommand
  | EndTurnCommand;
