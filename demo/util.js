import { Tree } from '../tree-filter.js';

let idCounter = 1;

function createNode(id, parents, type) {
	return { Id: id, Name: `Node ${id}`, Type: type, Parents: parents, IsActive: true };
}

function spawnChildren(node, n) {
	const newNodes = [];
	for (let i = 1; i <= n; i++) {
		newNodes.push(createNode(++idCounter, [node.Id], node.Type + 1));
	}
	return newNodes;
}

export function createNaryTree(n, numNodes) {

	idCounter = 1;

	const nodes = [createNode(1, [0], 0)];
	let newNodes = [...nodes];

	// create each layer of the tree until we have the requisite total number of nodes; drop any excess nodes
	while (nodes.length < numNodes) {

		let children = newNodes.flatMap(node => spawnChildren(node, n));
		if (children.length + nodes.length > numNodes) {
			children = children.slice(0, numNodes - nodes.length);
		}

		nodes.push(...children);
		newNodes = children;
	}

	const numLevels = Math.ceil(Math.log(numNodes - 1) / Math.log(n)); // including level 0 (root node)
	return new Tree({ nodes, leafTypes: [numLevels] });
}
