/**
 * Routing utilities for calculating routes using OSM graph data
 */

export interface GraphNode {
    id: number;
    lat: number;
    lon: number;
}

export interface GraphEdge {
    from: number;
    to: number;
    length: number;
    travel_time: number;
    maxspeed?: number;
}

export interface GraphData {
    nodes: { [key: string]: GraphNode };
    edges: GraphEdge[];
    node_count: number;
    edge_count: number;
}

export interface Coordinate {
    lat: number;
    lon: number;
}

/**
 * Find the nearest node in the graph to a given coordinate
 */
export function findNearestNode(graph: GraphData, point: Coordinate): number {
    let minDistance = Infinity;
    let nearestNodeId = -1;

    for (const nodeId in graph.nodes) {
        const node = graph.nodes[nodeId];
        const distance = haversineDistance(point.lat, point.lon, node.lat, node.lon);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestNodeId = node.id;
        }
    }

    return nearestNodeId;
}

/**
 * Calculate haversine distance between two points in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Build adjacency list from graph edges
 */
function buildAdjacencyList(graph: GraphData): Map<number, Array<{ node: number; weight: number }>> {
    const adjacencyList = new Map<number, Array<{ node: number; weight: number }>>();

    for (const edge of graph.edges) {
        if (!adjacencyList.has(edge.from)) {
            adjacencyList.set(edge.from, []);
        }
        
        // Use travel_time as weight (for fastest route) or length (for shortest)
        const weight = edge.travel_time > 0 ? edge.travel_time : edge.length;
        
        adjacencyList.get(edge.from)!.push({
            node: edge.to,
            weight: weight
        });
    }

    return adjacencyList;
}

/**
 * Calculate heuristic distance (Haversine) from a node to the goal
 * This is used in A* algorithm to guide the search
 */
function heuristicDistance(graph: GraphData, nodeId: number, endNodeId: number): number {
    const node = graph.nodes[nodeId.toString()];
    const endNode = graph.nodes[endNodeId.toString()];
    
    if (!node || !endNode) {
        return Infinity;
    }
    
    // Use haversine distance as heuristic
    // Convert to time estimate: assume average speed of 50 km/h
    const distanceKm = haversineDistance(node.lat, node.lon, endNode.lat, endNode.lon);
    const averageSpeedKmh = 50;
    const timeEstimate = (distanceKm / averageSpeedKmh) * 3600; // Convert to seconds
    
    return timeEstimate;
}

/**
 * A* algorithm to find shortest path
 * More efficient than Dijkstra's as it uses a heuristic to guide the search
 */
export function calculateRoute(
    graph: GraphData,
    startCoord: Coordinate,
    endCoord: Coordinate
): Coordinate[] {
    const startNode = findNearestNode(graph, startCoord);
    const endNode = findNearestNode(graph, endCoord);

    if (startNode === -1 || endNode === -1) {
        throw new Error("Could not find nearest nodes for the given coordinates");
    }

    if (startNode === endNode) {
        // Start and end are the same, return single point
        const node = graph.nodes[startNode.toString()];
        return [{ lat: node.lat, lon: node.lon }];
    }

    const adjacencyList = buildAdjacencyList(graph);
    
    // g(n) = actual cost from start to current node
    const gScore = new Map<number, number>();
    
    // f(n) = g(n) + h(n) = estimated total cost from start to goal through current node
    const fScore = new Map<number, number>();
    
    const previous = new Map<number, number | null>();
    const openSet = new Set<number>(); // Nodes to be evaluated
    const closedSet = new Set<number>(); // Nodes already evaluated

    // Initialize scores
    for (const nodeId in graph.nodes) {
        const node = graph.nodes[nodeId];
        gScore.set(node.id, Infinity);
        fScore.set(node.id, Infinity);
        previous.set(node.id, null);
    }

    // Initialize start node
    gScore.set(startNode, 0);
    const hStart = heuristicDistance(graph, startNode, endNode);
    fScore.set(startNode, hStart);
    openSet.add(startNode);

    // A* algorithm
    while (openSet.size > 0) {
        // Find node in openSet with lowest fScore
        let currentNode = -1;
        let minFScore = Infinity;

        for (const nodeId of openSet) {
            const f = fScore.get(nodeId) || Infinity;
            if (f < minFScore) {
                minFScore = f;
                currentNode = nodeId;
            }
        }

        if (currentNode === -1 || minFScore === Infinity) {
            break; // No path found
        }

        if (currentNode === endNode) {
            // Reached destination, reconstruct path
            const path: number[] = [];
            let pathNode: number | null = endNode;

            while (pathNode !== null) {
                path.unshift(pathNode);
                pathNode = previous.get(pathNode) || null;
            }

            // Convert node IDs to coordinates
            const routeCoords: Coordinate[] = [];
            for (const nodeId of path) {
                const node = graph.nodes[nodeId.toString()];
                if (node) {
                    routeCoords.push({ lat: node.lat, lon: node.lon });
                }
            }

            return routeCoords;
        }

        // Move current node from openSet to closedSet
        openSet.delete(currentNode);
        closedSet.add(currentNode);

        // Explore neighbors
        const neighbors = adjacencyList.get(currentNode) || [];
        for (const neighbor of neighbors) {
            if (closedSet.has(neighbor.node)) {
                continue; // Already evaluated
            }

            // Calculate tentative gScore
            const tentativeGScore = (gScore.get(currentNode) || 0) + neighbor.weight;

            if (!openSet.has(neighbor.node)) {
                openSet.add(neighbor.node); // Discover a new node
            } else if (tentativeGScore >= (gScore.get(neighbor.node) || Infinity)) {
                continue; // This is not a better path
            }

            // This path is the best so far, record it
            previous.set(neighbor.node, currentNode);
            gScore.set(neighbor.node, tentativeGScore);
            
            // Calculate fScore = gScore + heuristic
            const h = heuristicDistance(graph, neighbor.node, endNode);
            fScore.set(neighbor.node, tentativeGScore + h);
        }
    }

    // No path found
    throw new Error("No path found between the given coordinates");
}

