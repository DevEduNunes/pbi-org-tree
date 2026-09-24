/**
 * Pure data model: turns a flat employee/manager table into a forest.
 * No Power BI or DOM dependencies, so it can be unit-tested on its own.
 */

export interface RawRow {
    rowIndex: number;
    id: string;
    name: string;
    parentId: string;
    parentName: string;
    details: string[];
    image: string;
    color: string;
}

export interface OrgNode {
    id: string;
    name: string;
    details: string[];
    image: string;
    color: string;
    /** Row in the source table. -1 for managers that have no row of their own and for the virtual root. */
    rowIndex: number;
    /** Placeholder root used to hold several top-level nodes. Never drawn. */
    virtual: boolean;
    parent: OrgNode | null;
    children: OrgNode[];
}

export interface BuildResult {
    root: OrgNode;
    nodes: Map<string, OrgNode>;
    /** Number of links that pointed to a cycle and were cut. */
    cyclesBroken: number;
}

export const VIRTUAL_ROOT_ID = "__org_tree_root__";

function makeNode(id: string, name: string, rowIndex: number): OrgNode {
    return {
        id,
        name,
        details: [],
        image: "",
        color: "",
        rowIndex,
        virtual: false,
        parent: null,
        children: [],
    };
}

/**
 * Rules:
 *  - rows with an empty employee ID are ignored; duplicated IDs keep the first row;
 *  - an empty manager ID, or a manager equal to the employee, makes the employee a root;
 *  - a manager that has no row of its own is created from the manager name (top of the tree);
 *  - cycles (A -> B -> A) are broken by promoting one member to root;
 *  - several roots are grouped under a hidden virtual root.
 */
export function buildForest(rows: RawRow[]): BuildResult | null {
    const nodes = new Map<string, OrgNode>();
    const parentOf = new Map<string, string>();
    const parentNames = new Map<string, string>();

    for (const r of rows) {
        if (!r.id || nodes.has(r.id)) {
            continue;
        }
        const node = makeNode(r.id, r.name || r.id, r.rowIndex);
        node.details = r.details;
        node.image = r.image;
        node.color = r.color;
        nodes.set(r.id, node);
        if (r.parentId && r.parentId !== r.id) {
            parentOf.set(r.id, r.parentId);
            if (r.parentName && !parentNames.has(r.parentId)) {
                parentNames.set(r.parentId, r.parentName);
            }
        }
    }

    if (nodes.size === 0) {
        return null;
    }

    // Managers that are not employees (typically the top of the hierarchy).
    for (const pid of new Set(parentOf.values())) {
        if (!nodes.has(pid)) {
            nodes.set(pid, makeNode(pid, parentNames.get(pid) || pid, -1));
        }
    }

    // Break cycles before linking.
    let cyclesBroken = 0;
    for (const id of nodes.keys()) {
        const seen = new Set<string>([id]);
        let cur = parentOf.get(id);
        while (cur !== undefined) {
            if (cur === id) {
                parentOf.delete(id);
                cyclesBroken++;
                break;
            }
            if (seen.has(cur)) {
                break;
            }
            seen.add(cur);
            cur = parentOf.get(cur);
        }
    }

    const roots: OrgNode[] = [];
    for (const node of nodes.values()) {
        const pid = parentOf.get(node.id);
        const parent = pid !== undefined ? nodes.get(pid) : undefined;
        if (parent) {
            node.parent = parent;
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    for (const node of nodes.values()) {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
    }
    roots.sort((a, b) => a.name.localeCompare(b.name));

    if (roots.length === 1) {
        return { root: roots[0], nodes, cyclesBroken };
    }

    const root = makeNode(VIRTUAL_ROOT_ID, "", -1);
    root.virtual = true;
    root.children = roots;
    roots.forEach((r) => (r.parent = root));
    return { root, nodes, cyclesBroken };
}

/** Number of real (non-virtual) ancestors: a top-level node is level 0. */
export function levelOf(node: OrgNode): number {
    let level = 0;
    let cur = node.parent;
    while (cur && !cur.virtual) {
        level++;
        cur = cur.parent;
    }
    return level;
}
