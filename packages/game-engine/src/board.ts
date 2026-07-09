import type { Board, Edge, Hex, HexResource, Port, PortKind, Vertex } from './types.js';

export type Shuffle = <T>(items: T[]) => T[];

export const defaultShuffle: Shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const HEX_RESOURCE_COUNTS: Record<HexResource, number> = {
  WOOD: 4,
  SHEEP: 4,
  WHEAT: 4,
  BRICK: 3,
  ORE: 3,
  DESERT: 1,
};

const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

const PORT_KINDS: PortKind[] = [
  { type: 'GENERIC', ratio: 3 },
  { type: 'GENERIC', ratio: 3 },
  { type: 'GENERIC', ratio: 3 },
  { type: 'GENERIC', ratio: 3 },
  { type: 'RESOURCE', resource: 'WOOD', ratio: 2 },
  { type: 'RESOURCE', resource: 'BRICK', ratio: 2 },
  { type: 'RESOURCE', resource: 'SHEEP', ratio: 2 },
  { type: 'RESOURCE', resource: 'WHEAT', ratio: 2 },
  { type: 'RESOURCE', resource: 'ORE', ratio: 2 },
];

const HEX_SIZE = 1;

function axialCoords(): { q: number; r: number }[] {
  const coords: { q: number; r: number }[] = [];
  for (let q = -2; q <= 2; q++) {
    const rMin = Math.max(-2, -q - 2);
    const rMax = Math.min(2, -q + 2);
    for (let r = rMin; r <= rMax; r++) {
      coords.push({ q, r });
    }
  }
  return coords;
}

function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * (3 / 2) * r;
  return { x, y };
}

function hexCorner(center: { x: number; y: number }, i: number): { x: number; y: number } {
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + HEX_SIZE * Math.cos(angleRad),
    y: center.y + HEX_SIZE * Math.sin(angleRad),
  };
}

function roundToThousandths(n: number): number {
  const rounded = Math.round(n * 1000) / 1000;
  // Normalize -0 (and tiny negatives that round to zero) so they don't
  // produce a "-0.000" key distinct from "0.000" for the same point.
  return rounded === 0 ? 0 : rounded;
}

function pointKey(point: { x: number; y: number }): string {
  return `${roundToThousandths(point.x).toFixed(3)},${roundToThousandths(point.y).toFixed(3)}`;
}

function edgeKey(vertexIdA: string, vertexIdB: string): string {
  return [vertexIdA, vertexIdB].sort().join('|');
}

export function generateBoard(shuffle: Shuffle = defaultShuffle): Board {
  const resourcePool = shuffle(
    Object.entries(HEX_RESOURCE_COUNTS).flatMap(([resource, count]) =>
      Array<HexResource>(count).fill(resource as HexResource),
    ),
  );
  const numberPool = shuffle(NUMBER_TOKENS);

  const vertexByKey = new Map<string, Vertex>();
  const edgeByKey = new Map<string, Edge>();
  const hexes: Hex[] = [];
  let numberIndex = 0;

  for (const [index, { q, r }] of axialCoords().entries()) {
    const resource = resourcePool[index];
    const number = resource === 'DESERT' ? null : numberPool[numberIndex++];
    const hexId = `hex-${q}-${r}`;
    hexes.push({ id: hexId, resource, number, coord: { q, r } });

    const center = hexToPixel(q, r);
    const cornerVertexIds: string[] = [];
    for (let i = 0; i < 6; i++) {
      const corner = hexCorner(center, i);
      const key = pointKey(corner);
      let vertex = vertexByKey.get(key);
      if (!vertex) {
        vertex = {
          id: `v-${key}`,
          adjacentHexIds: [],
          adjacentVertexIds: [],
          adjacentEdgeIds: [],
          building: null,
          portId: null,
        };
        vertexByKey.set(key, vertex);
      }
      vertex.adjacentHexIds.push(hexId);
      cornerVertexIds.push(vertex.id);
    }

    for (let i = 0; i < 6; i++) {
      const a = cornerVertexIds[i];
      const b = cornerVertexIds[(i + 1) % 6];
      const key = edgeKey(a, b);
      if (!edgeByKey.has(key)) {
        edgeByKey.set(key, { id: `e-${key}`, vertexIds: [a, b], road: null });
      }
    }
  }

  const vertices = [...vertexByKey.values()];
  const edges = [...edgeByKey.values()];

  const vertexById = new Map(vertices.map((v) => [v.id, v]));
  for (const edge of edges) {
    const [aId, bId] = edge.vertexIds;
    const a = vertexById.get(aId)!;
    const b = vertexById.get(bId)!;
    a.adjacentVertexIds.push(bId);
    a.adjacentEdgeIds.push(edge.id);
    b.adjacentVertexIds.push(aId);
    b.adjacentEdgeIds.push(edge.id);
  }

  // Perimeter edges border exactly one hex; interior edges border two.
  const hexBordersPerEdge = new Map<string, number>();
  for (const hex of hexes) {
    const hexVertexIds = vertices.filter((v) => v.adjacentHexIds.includes(hex.id)).map((v) => v.id);
    for (const edge of edges) {
      const [a, b] = edge.vertexIds;
      if (hexVertexIds.includes(a) && hexVertexIds.includes(b)) {
        hexBordersPerEdge.set(edge.id, (hexBordersPerEdge.get(edge.id) ?? 0) + 1);
      }
    }
  }
  const perimeterEdges = edges.filter((e) => hexBordersPerEdge.get(e.id) === 1);

  // Angle each perimeter edge's midpoint around the board center (0,0) and
  // step through them at even intervals to place the 9 port slots.
  const sortedPerimeter = [...perimeterEdges].sort((edgeA, edgeB) => {
    const angleOf = (edge: Edge) => {
      const [a, b] = edge.vertexIds.map((id) => vertexById.get(id)!);
      const midKey = (v: Vertex) => v.id.slice(2).split(',').map(Number);
      const [ax, ay] = midKey(a);
      const [bx, by] = midKey(b);
      return Math.atan2((ay + by) / 2, (ax + bx) / 2);
    };
    return angleOf(edgeA) - angleOf(edgeB);
  });

  const shuffledPortKinds = shuffle(PORT_KINDS);
  const step = Math.floor(sortedPerimeter.length / shuffledPortKinds.length);
  const ports: Port[] = shuffledPortKinds.map((kind, i) => {
    const edge = sortedPerimeter[i * step];
    const portId = `port-${i}`;
    for (const vertexId of edge.vertexIds) {
      vertexById.get(vertexId)!.portId = portId;
    }
    return { id: portId, vertexIds: edge.vertexIds, kind };
  });

  const desertHex = hexes.find((h) => h.resource === 'DESERT')!;

  return { hexes, vertices, edges, ports, robberHexId: desertHex.id };
}
