import type { Phase, PlayerId, ResourceType } from './types.js';

export type RuleViolation =
  | { type: 'WrongPhase'; expected: Phase[]; actual: Phase }
  | { type: 'NotYourTurn'; currentPlayerId: PlayerId }
  | { type: 'InsufficientResources'; needed: Partial<Record<ResourceType, number>> }
  | { type: 'IllegalPlacement'; reason: string }
  | { type: 'NoPiecesRemaining'; piece: 'road' | 'settlement' | 'city' }
  | { type: 'InvalidTarget'; reason: string }
  | { type: 'DevCardAlreadyPlayedThisTurn' }
  | { type: 'DevCardNotOwned' }
  | { type: 'DevCardBoughtThisTurn' }
  | { type: 'NoCardsToDraw' }
  | { type: 'InvalidDiscardAmount'; required: number; provided: number }
  | { type: 'UnknownCommand'; commandType: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: RuleViolation };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: RuleViolation): Result<T> {
  return { ok: false, error };
}
