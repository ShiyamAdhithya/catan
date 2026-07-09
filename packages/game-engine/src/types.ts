export type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
export type HexResource = ResourceType | 'DESERT';

export type PlayerId = string;
export type HexId = string;
export type VertexId = string;
export type EdgeId = string;
export type PortId = string;

export interface Hex {
  id: HexId;
  resource: HexResource;
  number: number | null;
  coord: { q: number; r: number };
}

export interface Vertex {
  id: VertexId;
  adjacentHexIds: HexId[];
  adjacentVertexIds: VertexId[];
  adjacentEdgeIds: EdgeId[];
  building: { type: 'SETTLEMENT' | 'CITY'; playerId: PlayerId } | null;
  portId: PortId | null;
}

export interface Edge {
  id: EdgeId;
  vertexIds: [VertexId, VertexId];
  road: { playerId: PlayerId } | null;
}

export type PortKind =
  | { type: 'GENERIC'; ratio: 3 }
  | { type: 'RESOURCE'; resource: ResourceType; ratio: 2 };

export interface Port {
  id: PortId;
  vertexIds: [VertexId, VertexId];
  kind: PortKind;
}

export interface Board {
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
  ports: Port[];
  robberHexId: HexId;
}

export type DevCardType =
  | 'KNIGHT'
  | 'ROAD_BUILDING'
  | 'YEAR_OF_PLENTY'
  | 'MONOPOLY'
  | 'VICTORY_POINT';

export interface DevCard {
  id: string;
  type: DevCardType;
}

export interface PlayerState {
  id: PlayerId;
  resources: Record<ResourceType, number>;
  devCards: DevCard[];
  playedDevCards: DevCard[];
  victoryPoints: number;
  piecesRemaining: { roads: number; settlements: number; cities: number };
}

export type Phase =
  | 'SETUP_SETTLEMENT'
  | 'SETUP_ROAD'
  | 'ROLL'
  | 'DISCARD'
  | 'MOVE_ROBBER'
  | 'STEAL'
  | 'MAIN'
  | 'GAME_OVER';

export interface GameState {
  phase: Phase;
  turnNumber: number;
  currentPlayerId: PlayerId;
  playerOrder: PlayerId[];
  /** 1 during round 1 (forward playerOrder), 2 during round 2 (reversed playerOrder), null outside setup. Setup turn order is derived from this + playerOrder, never stored separately. */
  setupRound: 1 | 2 | null;
  board: Board;
  players: Record<PlayerId, PlayerState>;
  bank: { resources: Record<ResourceType, number>; devCards: DevCard[] };
  longestRoad: { holder: PlayerId | null; length: number };
  largestArmy: { holder: PlayerId | null; count: number };
  pendingDiscards: PlayerId[];
  pendingRobberSteal: { targets: PlayerId[] } | null;
  devCardPlayedThisTurn: boolean;
  /** Card ids bought this turn — those cards cannot be played until next turn (official rule; VICTORY_POINT cards are exempt since they're never "played"). Reset on TurnEnded. */
  devCardsBoughtThisTurn: string[];
  winner: PlayerId | null;
}
