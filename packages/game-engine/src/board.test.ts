import { describe, expect, it } from 'vitest';
import { generateBoard } from './board.js';

const identityShuffle = <T>(items: T[]): T[] => [...items];

describe('generateBoard', () => {
  it('generates the standard base-game board topology', () => {
    const board = generateBoard(identityShuffle);

    expect(board.hexes).toHaveLength(19);
    expect(board.vertices).toHaveLength(54);
    expect(board.edges).toHaveLength(72);
    expect(board.ports).toHaveLength(9);

    const resourceCounts = board.hexes.reduce<Record<string, number>>((acc, hex) => {
      acc[hex.resource] = (acc[hex.resource] ?? 0) + 1;
      return acc;
    }, {});
    expect(resourceCounts).toEqual({
      WOOD: 4,
      SHEEP: 4,
      WHEAT: 4,
      BRICK: 3,
      ORE: 3,
      DESERT: 1,
    });

    const desertHex = board.hexes.find((hex) => hex.resource === 'DESERT');
    expect(desertHex?.number).toBeNull();
    expect(board.robberHexId).toBe(desertHex?.id);

    const numbers = board.hexes.filter((hex) => hex.number !== null).map((hex) => hex.number);
    expect(numbers.sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(
      [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12].sort((a, b) => a - b),
    );

    // Every vertex knows at least 1 and at most 3 adjacent hexes, edges, and vertices.
    for (const vertex of board.vertices) {
      expect(vertex.adjacentHexIds.length).toBeGreaterThanOrEqual(1);
      expect(vertex.adjacentHexIds.length).toBeLessThanOrEqual(3);
      expect(vertex.adjacentEdgeIds.length).toBeGreaterThanOrEqual(2);
      expect(vertex.adjacentVertexIds.length).toBe(vertex.adjacentEdgeIds.length);
      expect(vertex.building).toBeNull();
    }

    // Every edge connects two distinct vertices, both present in the board.
    const vertexIds = new Set(board.vertices.map((v) => v.id));
    for (const edge of board.edges) {
      expect(edge.vertexIds[0]).not.toBe(edge.vertexIds[1]);
      expect(vertexIds.has(edge.vertexIds[0])).toBe(true);
      expect(vertexIds.has(edge.vertexIds[1])).toBe(true);
      expect(edge.road).toBeNull();
    }

    // Port kinds: 4 generic 3:1, 1 each of the 5 resource-specific 2:1.
    const genericPorts = board.ports.filter((p) => p.kind.type === 'GENERIC');
    const resourcePorts = board.ports.filter((p) => p.kind.type === 'RESOURCE');
    expect(genericPorts).toHaveLength(4);
    expect(resourcePorts).toHaveLength(5);
    const portResources = resourcePorts
      .map((p) => (p.kind.type === 'RESOURCE' ? p.kind.resource : null))
      .sort();
    expect(portResources).toEqual(['BRICK', 'ORE', 'SHEEP', 'WHEAT', 'WOOD']);
  });

  it('is deterministic given an identity shuffle', () => {
    const boardA = generateBoard(identityShuffle);
    const boardB = generateBoard(identityShuffle);
    expect(boardA).toEqual(boardB);
  });
});
