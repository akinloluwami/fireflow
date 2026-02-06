/**
 * Upstream Nodes Utility
 *
 * Finds all nodes that come before a given node in the workflow flow.
 * Used to determine what data is available from previous nodes.
 */

import type { Workflow, WorkflowNode, WorkflowEdge } from "./types";

export interface UpstreamNode {
  node: WorkflowNode;
  depth: number; // How many edges away from the target node
}

/**
 * Get all nodes that are upstream (come before) of a given node
 * Traverses the workflow graph backwards from the target node
 */
export function getUpstreamNodes(
  workflow: Workflow,
  targetNodeId: string,
): UpstreamNode[] {
  const upstream: UpstreamNode[] = [];
  const visited = new Set<string>();

  function traverse(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find all edges that target this node
    const incomingEdges = workflow.edges.filter(
      (edge) => edge.target === nodeId,
    );

    for (const edge of incomingEdges) {
      const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        upstream.push({ node: sourceNode, depth });
        // Continue traversing upstream
        traverse(sourceNode.id, depth + 1);
      }
    }
  }

  // Start traversal from the target node
  traverse(targetNodeId, 1);

  // Sort by depth (closest nodes first), then by position (top to bottom)
  return upstream.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.node.position.y - b.node.position.y;
  });
}

/**
 * Get the trigger node for a workflow
 */
export function getTriggerNode(workflow: Workflow): WorkflowNode | undefined {
  return workflow.nodes.find((node) => node.type === "trigger");
}

/**
 * Check if a node is upstream of another node
 */
export function isUpstreamOf(
  workflow: Workflow,
  sourceNodeId: string,
  targetNodeId: string,
): boolean {
  const upstream = getUpstreamNodes(workflow, targetNodeId);
  return upstream.some((u) => u.node.id === sourceNodeId);
}

/**
 * Get the direct parent nodes (immediate predecessors)
 */
export function getDirectParents(
  workflow: Workflow,
  targetNodeId: string,
): WorkflowNode[] {
  const incomingEdges = workflow.edges.filter(
    (edge) => edge.target === targetNodeId,
  );

  return incomingEdges
    .map((edge) => workflow.nodes.find((n) => n.id === edge.source))
    .filter((node): node is WorkflowNode => node !== undefined);
}

/**
 * Get a node's label for display (falls back to subType if no label)
 */
export function getNodeDisplayName(node: WorkflowNode): string {
  return node.data.label || node.subType;
}

/**
 * Build a map of node ID to node for quick lookups
 */
export function buildNodeMap(workflow: Workflow): Map<string, WorkflowNode> {
  return new Map(workflow.nodes.map((node) => [node.id, node]));
}

/**
 * Get the execution order of nodes (topological sort)
 * Returns nodes in the order they should execute
 */
export function getExecutionOrder(workflow: Workflow): WorkflowNode[] {
  const nodeMap = buildNodeMap(workflow);
  const inDegree = new Map<string, number>();
  const order: WorkflowNode[] = [];

  // Initialize in-degree for all nodes
  for (const node of workflow.nodes) {
    inDegree.set(node.id, 0);
  }

  // Calculate in-degree (number of incoming edges)
  for (const edge of workflow.edges) {
    const current = inDegree.get(edge.target) || 0;
    inDegree.set(edge.target, current + 1);
  }

  // Start with nodes that have no incoming edges (typically triggers)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Process queue
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      order.push(node);
    }

    // Reduce in-degree for downstream nodes
    const outgoingEdges = workflow.edges.filter(
      (edge) => edge.source === nodeId,
    );
    for (const edge of outgoingEdges) {
      const newDegree = (inDegree.get(edge.target) || 1) - 1;
      inDegree.set(edge.target, newDegree);
      if (newDegree === 0) {
        queue.push(edge.target);
      }
    }
  }

  return order;
}
