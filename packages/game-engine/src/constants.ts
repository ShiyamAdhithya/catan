import type { ResourceType } from './types.js';

export const PIECE_LIMITS = {
  roads: 15,
  settlements: 5,
  cities: 4,
} as const;

export const BUILD_COSTS: {
  road: Partial<Record<ResourceType, number>>;
  settlement: Partial<Record<ResourceType, number>>;
  city: Partial<Record<ResourceType, number>>;
  developmentCard: Partial<Record<ResourceType, number>>;
} = {
  road: { BRICK: 1, WOOD: 1 },
  settlement: { BRICK: 1, WOOD: 1, SHEEP: 1, WHEAT: 1 },
  city: { WHEAT: 2, ORE: 3 },
  developmentCard: { SHEEP: 1, WHEAT: 1, ORE: 1 },
};
