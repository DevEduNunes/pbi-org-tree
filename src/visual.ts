"use strict";

import powerbi from "powerbi-visuals-api";
import "../style/visual.less";

import { hierarchy, tree, HierarchyPointNode } from "d3-hierarchy";
import { select, Selection } from "d3-selection";
import { zoom, zoomIdentity, ZoomBehavior } from "d3-zoom";

import { buildForest, levelOf, OrgNode, RawRow } from "./orgModel";
import { readSettings, settingsToInstances, Settings, DEFAULT_SETTINGS } from "./settings";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataView = powerbi.DataView;

function text(value: powerbi.PrimitiveValue | undefined): string {
    return value === null || value === undefined ? "" : String(value).trim();
}

function shorten(value: string, maxChars: number): string {
    return value.length > maxChars ? value.slice(0, Math.max(1, maxChars - 1)) + "…" : value;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private selectionManager: ISelectionManager;

    private container: HTMLDivElement;
    private emptyMessage: HTMLDivElement;
    private searchInput: HTMLInputElement;
    private svg: Selection<SVGSVGElement, unknown, null, undefined>;
    private canvas: Selection<SVGGElement, unknown, null, undefined>;
    private zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;

    private settings: Settings = DEFAULT_SETTINGS;
    private viewport: powerbi.IViewport = { width: 0, height: 0 };
    private lastDataView: DataView | undefined;

    private root: OrgNode | null = null;
    private nodes = new Map<string, OrgNode>();
    private selectionIds = new Map<string, ISelectionId>();
    private collapsed = new Set<string>();
    private knownIds = new Set<string>();
    private lastInitialDepth = -1;
    private query = "";
    private needFit = true;
    private visibleNodes: HierarchyPointNode<OrgNode>[] = [];

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.selectionManager.registerOnSelectCallback(() => this.render());

        this.container = document.createElement("div");
        this.container.className = "org-tree";
        options.element.appendChild(this.container);

        this.container.appendChild(this.buildToolbar());

        this.emptyMessage = document.createElement("div");
        this.emptyMessage.className = "empty";
        this.emptyMessage.textContent =
            "Add Employee ID and Manager ID (and, optionally, names) to build the organization chart.";
        this.container.appendChild(this.emptyMessage);

        this.svg = select(this.container).append("svg");
        this.canvas = this.svg.append("g");

        this.zoomBehavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                this.canvas.attr("transform", event.transform.toString());
            });
        this.svg.call(this.zoomBehavior);
        this.svg.on("dblclick.zoom", null);
        this.svg.on("click", (event: MouseEvent) => {
            if (event.target === this.svg.node()) {
                this.selectionManager.clear().then(() => this.render());
            }
        });
    }

    public update(options: VisualUpdateOptions): void {
        this.viewport = options.viewport;
        const dataView = options.dataViews && options.dataViews[0];

        if (dataView !== this.lastDataView) {
            this.lastDataView = dataView;
            this.settings = readSettings(dataView);
            this.rebuild(dataView);
        }
        this.render();
    }

    public enumerateObjectInstances(
        options: powerbi.EnumerateVisualObjectInstancesOptions
    ): powerbi.VisualObjectInstanceEnumeration {
        return settingsToInstances(options.objectName, this.settings);
    }

    // ---------------------------------------------------------------- data

    private rebuild(dataView: DataView | undefined): void {
        this.root = null;
        this.nodes = new Map();
        this.selectionIds = new Map();

        const table = dataView && dataView.table;
        if (!table) {
            return;
        }

        const idx = (role: string): number => table.columns.findIndex((c) => c.roles && c.roles[role]);
        const idCol = idx("employeeId");
        const nameCol = idx("employeeName");
        const parentCol = idx("managerId");
        const parentNameCol = idx("managerName");
        const flagCol = idx("flag");
        const detailCols: number[] = [];
        table.columns.forEach((c, i) => {
            if (c.roles && c.roles["details"]) {
                detailCols.push(i);
            }
        });

        if (idCol < 0 || parentCol < 0) {
            return;
        }

        const rows: RawRow[] = table.rows.map((row, rowIndex) => ({
            rowIndex,
            id: text(row[idCol]),
            name: nameCol >= 0 ? text(row[nameCol]) : "",
            parentId: text(row[parentCol]),
            parentName: parentNameCol >= 0 ? text(row[parentNameCol]) : "",
            details: detailCols.map((c) => text(row[c])).filter((v) => v !== ""),
            flag: flagCol >= 0 ? text(row[flagCol]) : "",
        }));

        const result = buildForest(rows);
        if (!result) {
            return;
        }
        this.root = result.root;
        this.nodes = result.nodes;

        for (const node of this.nodes.values()) {
            if (node.rowIndex >= 0) {
                this.selectionIds.set(
                    node.id,
                    this.host.createSelectionIdBuilder().withTable(table, node.rowIndex).createSelectionId()
                );
            }
        }

        this.applyInitialCollapse();
        this.needFit = true;
    }

    /** Collapses nodes deeper than "initially expanded levels". Only touches nodes not seen before, unless the setting changed. */
    private applyInitialCollapse(): void {
        const depth = this.settings.initialDepth;
        const reset = depth !== this.lastInitialDepth;
        if (reset) {
            this.collapsed.clear();
            this.knownIds.clear();
            this.lastInitialDepth = depth;
        }
        for (const node of this.nodes.values()) {
            if (node.virtual || node.children.length === 0) {
                continue;
            }
            if (!this.knownIds.has(node.id)) {
                if (levelOf(node) >= depth - 1) {
                    this.collapsed.add(node.id);
                } else {
                    this.collapsed.delete(node.id);
                }
            }
        }
        for (const node of this.nodes.values()) {
            this.knownIds.add(node.id);
        }
    }

    // ------------------------------------------------------------- toolbar

    private buildToolbar(): HTMLDivElement {
        const bar = document.createElement("div");
        bar.className = "toolbar";

        this.searchInput = document.createElement("input");
        this.searchInput.type = "search";
        this.searchInput.placeholder = "Search name or ID";
        this.searchInput.addEventListener("input", () => {
            this.query = this.searchInput.value.trim().toLowerCase();
            this.revealMatches();
            this.needFit = this.query !== "";
            this.render();
        });
        // Keep keystrokes inside the visual (Power BI shortcuts would otherwise grab them).
        this.searchInput.addEventListener("keydown", (e) => e.stopPropagation());

        const button = (label: string, title: string, onClick: () => void): HTMLButtonElement => {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = label;
            b.title = title;
            b.addEventListener("click", onClick);
            return b;
        };

        bar.appendChild(this.searchInput);
        bar.appendChild(
            button("Expand all", "Expand every branch", () => {
                this.collapsed.clear();
                this.needFit = true;
                this.render();
            })
        );
        bar.appendChild(
            button("Collapse all", "Show only the top level", () => {
                for (const node of this.nodes.values()) {
                    if (!node.virtual && node.children.length > 0 && node !== this.root) {
                        this.collapsed.add(node.id);
                    }
                }
                if (this.root && !this.root.virtual) {
                    this.collapsed.delete(this.root.id);
                }
                this.needFit = true;
                this.render();
            })
        );
        bar.appendChild(
            button("Fit", "Fit the chart to the visual", () => {
                this.needFit = true;
                this.render();
            })
        );
        return bar;
    }

    private matches(node: OrgNode): boolean {
        if (!this.query || node.virtual) {
            return false;
        }
        return node.name.toLowerCase().includes(this.query) || node.id.toLowerCase().includes(this.query);
    }

    /** Expands every ancestor of every match so the results are visible. */
    private revealMatches(): void {
        if (!this.query) {
            return;
        }
        for (const node of this.nodes.values()) {
            if (this.matches(node)) {
                let cur = node.parent;
                while (cur) {
                    this.collapsed.delete(cur.id);
                    cur = cur.parent;
                }
            }
        }
    }

    // ----------------------------------------------------------- rendering

    private render(): void {
        const { width, height } = this.viewport;
        this.svg.attr("width", width).attr("height", height);
        this.canvas.selectAll("*").remove();

        if (!this.root) {
            this.svg.style("display", "none");
            this.emptyMessage.style.display = "block";
            return;
        }
        this.svg.style("display", "block");
        this.emptyMessage.style.display = "none";

        const s = this.settings;
        const hier = hierarchy<OrgNode>(this.root, (d) =>
            this.collapsed.has(d.id) || d.children.length === 0 ? null : d.children
        );
        const layout = tree<OrgNode>()
            .nodeSize([s.cardWidth + s.horizontalGap, s.cardHeight + s.verticalGap])
            .separation(() => 1);
        const laid = layout(hier);

        this.visibleNodes = laid.descendants().filter((n) => !n.data.virtual);
        const selected = this.selectionManager.getSelectionIds() as ISelectionId[];

        this.drawLinks(laid);
        this.drawNodes(selected);

        if (this.needFit) {
            this.needFit = false;
            this.fit();
        }
    }

    private drawLinks(laid: HierarchyPointNode<OrgNode>): void {
        const s = this.settings;
        const linkLayer = this.canvas.append("g").attr("fill", "none").attr("stroke", s.linkColor).attr("stroke-width", 1.5);
        for (const link of laid.links()) {
            if (link.source.data.virtual) {
                continue;
            }
            const sx = link.source.x;
            const sy = link.source.y + s.cardHeight;
            const tx = link.target.x;
            const ty = link.target.y;
            const mid = (sy + ty) / 2;
            linkLayer.append("path").attr("d", `M${sx},${sy}V${mid}H${tx}V${ty}`);
        }
    }

    private drawNodes(selected: ISelectionId[]): void {
        const s = this.settings;
        const hasSelection = selected.length > 0;
        const maxChars = Math.floor((s.cardWidth - 16) / 6.4);
        const maxDetailLines = Math.max(0, Math.floor((s.cardHeight - 44) / 14) + 1);
        const flagValue = s.flagValue.toLowerCase();

        const layer = this.canvas.append("g");
        for (const n of this.visibleNodes) {
            const d = n.data;
            const sid = this.selectionIds.get(d.id);
            const isSelected = !!sid && selected.some((x) => x.equals(sid));
            const isMatch = this.matches(d);
            const isFlagged = flagValue !== "" && d.flag.toLowerCase() === flagValue;

            const card = layer
                .append("g")
                .attr("transform", `translate(${n.x - s.cardWidth / 2},${n.y})`)
                .style("cursor", sid ? "pointer" : "default")
                .attr("opacity", hasSelection && !isSelected ? 0.45 : 1);

            card.append("title").text([d.name, `ID: ${d.id}`, ...d.details].join("\n"));

            card.append("rect")
                .attr("width", s.cardWidth)
                .attr("height", s.cardHeight)
                .attr("rx", 8)
                .attr("fill", isFlagged ? s.flagFill : s.cardFill)
                .attr("stroke", isSelected ? "#0078D4" : isMatch ? "#F2A100" : s.cardBorder)
                .attr("stroke-width", isSelected || isMatch ? 2.5 : 1);

            card.append("text")
                .attr("x", 10)
                .attr("y", 21)
                .attr("font-size", 12)
                .attr("font-weight", 600)
                .attr("fill", s.textColor)
                .text(shorten(d.name, maxChars));

            d.details.slice(0, maxDetailLines).forEach((line, i) => {
                card.append("text")
                    .attr("x", 10)
                    .attr("y", 39 + i * 14)
                    .attr("font-size", 11)
                    .attr("fill", s.textColor)
                    .attr("fill-opacity", 0.75)
                    .text(shorten(line, maxChars + 2));
            });

            card.on("click", (event: MouseEvent) => {
                event.stopPropagation();
                if (!sid) {
                    return;
                }
                this.selectionManager
                    .select(sid, event.ctrlKey || event.metaKey || event.shiftKey)
                    .then(() => this.render());
            });

            if (d.children.length > 0) {
                this.drawToggle(card, d);
            }
        }
    }

    private drawToggle(card: Selection<SVGGElement, unknown, null, undefined>, d: OrgNode): void {
        const s = this.settings;
        const isCollapsed = this.collapsed.has(d.id);
        const label = isCollapsed ? `+${d.children.length}` : "−";

        const toggle = card
            .append("g")
            .attr("transform", `translate(${s.cardWidth / 2},${s.cardHeight})`)
            .style("cursor", "pointer");
        toggle
            .append("rect")
            .attr("x", -18)
            .attr("y", -9)
            .attr("width", 36)
            .attr("height", 18)
            .attr("rx", 9)
            .attr("fill", s.cardFill)
            .attr("stroke", s.linkColor);
        toggle
            .append("text")
            .attr("text-anchor", "middle")
            .attr("y", 4)
            .attr("font-size", 11)
            .attr("fill", s.textColor)
            .text(label);
        toggle.on("click", (event: MouseEvent) => {
            event.stopPropagation();
            if (this.collapsed.has(d.id)) {
                this.collapsed.delete(d.id);
            } else {
                this.collapsed.add(d.id);
            }
            this.render();
        });
    }

    /** Scales and centers the visible chart inside the viewport. */
    private fit(): void {
        if (this.visibleNodes.length === 0 || this.viewport.width <= 0 || this.viewport.height <= 0) {
            return;
        }
        const s = this.settings;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const n of this.visibleNodes) {
            minX = Math.min(minX, n.x - s.cardWidth / 2);
            maxX = Math.max(maxX, n.x + s.cardWidth / 2);
            minY = Math.min(minY, n.y);
            maxY = Math.max(maxY, n.y + s.cardHeight + 10);
        }
        const pad = 40;
        const top = 34; // room for the toolbar
        const w = maxX - minX;
        const h = maxY - minY;
        const k = Math.min(1, (this.viewport.width - pad) / w, (this.viewport.height - top - pad) / h);
        const tx = (this.viewport.width - w * k) / 2 - minX * k;
        const ty = top + (this.viewport.height - top - h * k) / 2 - minY * k;
        this.svg.call(this.zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(k));
    }
}
