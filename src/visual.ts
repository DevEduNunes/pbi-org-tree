"use strict";

import powerbi from "powerbi-visuals-api";
import "../style/visual.less";

import { hierarchy, tree, HierarchyPointNode } from "d3-hierarchy";
import { select, Selection } from "d3-selection";
import { zoom, zoomIdentity, ZoomBehavior } from "d3-zoom";

import { buildForest, levelOf, OrgNode, RawRow } from "./orgModel";
import { readSettings, settingsToInstances, Settings, DEFAULT_SETTINGS, ExportSeparator } from "./settings";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataView = powerbi.DataView;

type SvgSelection<T extends SVGElement> = Selection<T, unknown, null, undefined>;

const MINUS = "−";
const MAX_SEARCH_MATCHES = 100;
const SEPARATORS: { [key in ExportSeparator]: string } = { semicolon: ";", comma: ",", tab: "\t" };

interface TeamRow {
    node: OrgNode;
    /** 0 = the searched person, 1 = their direct reports, and so on. */
    level: number;
}

interface ExportColumn {
    role: string;
    name: string;
    index: number;
}

/** One CSV cell. Text starting with = + - @ gets a leading quote so spreadsheets never read it as a formula. */
function csvCell(value: string, separator: string): string {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    const needsQuotes = safe.includes(separator) || /["\r\n]/.test(safe);
    return needsQuotes ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function text(value: powerbi.PrimitiveValue | undefined): string {
    return value === null || value === undefined ? "" : String(value).trim();
}

function shorten(value: string, maxChars: number): string {
    return value.length > maxChars ? value.slice(0, Math.max(1, maxChars - 1)) + "…" : value;
}

function initials(name: string): string {
    const parts = name.split(/\s+/).filter((p) => p.length > 0);
    if (parts.length === 0) {
        return "?";
    }
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
}

function isValidColor(value: string): boolean {
    return value !== "" && typeof CSS !== "undefined" && CSS.supports("color", value);
}

/** Dark or white text for a "#rrggbb" background; null when the color cannot be parsed. */
function readableText(hex: string): string | null {
    const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
    if (!m) {
        return null;
    }
    const n = parseInt(m[1], 16);
    const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return luminance > 0.6 ? "#1F2933" : "#FFFFFF";
}

/**
 * Turns the Image URL value into something an <image> can load, or "" if it is not an image.
 * Accepts https links, data URIs, and raw base64 (PNG/JPEG/GIF/WebP, detected by their signature).
 */
function imageSource(value: string): string {
    if (/^https?:\/\//i.test(value) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) {
        return value;
    }
    const compact = value.replace(/\s+/g, "");
    if (compact.length > 40 && /^[A-Za-z0-9+/]+=*$/.test(compact)) {
        if (compact.startsWith("/9j/")) {
            return `data:image/jpeg;base64,${compact}`;
        }
        if (compact.startsWith("iVBORw0KGgo")) {
            return `data:image/png;base64,${compact}`;
        }
        if (compact.startsWith("R0lGOD")) {
            return `data:image/gif;base64,${compact}`;
        }
        if (compact.startsWith("UklGR")) {
            return `data:image/webp;base64,${compact}`;
        }
    }
    return "";
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private selectionManager: ISelectionManager;

    private container: HTMLDivElement;
    private emptyMessage: HTMLDivElement;
    private searchInput!: HTMLInputElement;
    private exportButton!: HTMLButtonElement;
    private copyButton!: HTMLButtonElement;
    private copyPanel!: HTMLDivElement;
    private copyArea!: HTMLTextAreaElement;
    private statusLabel!: HTMLSpanElement;
    private statusTimer: number | undefined;
    private svg: SvgSelection<SVGSVGElement>;
    private canvas: SvgSelection<SVGGElement>;
    private zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;

    private settings: Settings = DEFAULT_SETTINGS;
    private viewport: powerbi.IViewport = { width: 0, height: 0 };
    private lastDataView: DataView | undefined;

    private root: OrgNode | null = null;
    private nodes = new Map<string, OrgNode>();
    private selectionIds = new Map<string, ISelectionId>();
    private hasImageRole = false;
    private collapsed = new Set<string>();
    private knownIds = new Set<string>();
    private lastInitialDepth = -1;
    private query = "";
    private needFit = true;
    private matchIds = new Set<string>();
    /** While searching: the matches plus all their ancestors. null when not searching. */
    private focusIds: Set<string> | null = null;
    /** While searching: nodes whose other subordinates were expanded by the user. */
    private searchExpanded = new Set<string>();
    private emptyText = "";
    private visibleNodes: HierarchyPointNode<OrgNode>[] = [];
    private zoomK = 1;
    private toolbarScale = 1;
    private tableRows: powerbi.DataViewTableRow[] = [];
    private exportColumns: ExportColumn[] = [];

    constructor(options?: VisualConstructorOptions) {
        // The generated visual plugin may call this without options (type-only); Power BI always passes them.
        if (!options) {
            throw new Error("Org Tree: missing visual constructor options");
        }
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.selectionManager.registerOnSelectCallback(() => this.render());

        this.container = document.createElement("div");
        this.container.className = "org-tree";
        options.element.appendChild(this.container);

        this.container.appendChild(this.buildToolbar());

        this.emptyMessage = document.createElement("div");
        this.emptyMessage.className = "empty";
        this.emptyText = "Add Employee ID and Manager ID (and, optionally, names) to build the organization chart.";
        this.emptyMessage.textContent = this.emptyText;
        this.container.appendChild(this.emptyMessage);

        this.copyPanel = this.buildCopyPanel();
        this.container.appendChild(this.copyPanel);

        this.svg = select(this.container).append("svg");
        this.canvas = this.svg.append("g");

        this.zoomBehavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                this.zoomK = event.transform.k;
                this.canvas.attr("transform", event.transform.toString());
                this.applyToggleScale();
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
        this.toolbarScale = this.computeToolbarScale();
        this.container.style.setProperty("--ot-scale", String(this.toolbarScale));
        this.render();
    }

    /** Bigger visual (or zoomed-out browser) -> bigger toolbar, so it stays readable. */
    private computeToolbarScale(): number {
        const s = this.settings;
        const fromViewport = Math.min(this.viewport.width / 720, this.viewport.height / 420);
        const auto = s.toolbarAuto ? Math.min(2.5, Math.max(1, fromViewport)) : 1;
        return Math.round(auto * (s.toolbarSize / 100) * 100) / 100;
    }

    /** The +N / − buttons on the cards grow as the chart is zoomed out, so they stay clickable. */
    private toggleScale(): number {
        return Math.min(3.5, Math.max(1, 1 / this.zoomK));
    }

    private applyToggleScale(): void {
        const s = this.settings;
        this.canvas
            .selectAll<SVGGElement, unknown>("g.org-toggle")
            .attr("transform", `translate(${s.cardWidth / 2},${s.cardHeight}) scale(${this.toggleScale()})`);
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
        this.hasImageRole = false;
        this.tableRows = [];
        this.exportColumns = [];

        const table = dataView && dataView.table;
        if (!table) {
            return;
        }

        const idx = (role: string): number => table.columns.findIndex((c) => c.roles && c.roles[role]);
        const idCol = idx("employeeId");
        const nameCol = idx("employeeName");
        const parentCol = idx("managerId");
        const parentNameCol = idx("managerName");
        const imageCol = idx("image");
        const colorCol = idx("color");
        const detailCols: number[] = [];
        table.columns.forEach((c, i) => {
            if (c.roles && c.roles["details"]) {
                detailCols.push(i);
            }
        });

        if (idCol < 0 || parentCol < 0) {
            return;
        }
        this.hasImageRole = imageCol >= 0;

        // Columns of the CSV export: the four core fields, then the card details (no image or color).
        this.tableRows = table.rows ?? [];
        const exportable: Array<[string, number]> = [
            ["employeeId", idCol],
            ["employeeName", nameCol],
            ["managerId", parentCol],
            ["managerName", parentNameCol],
            ...detailCols.map((c): [string, number] => ["details", c]),
        ];
        this.exportColumns = exportable
            .filter(([, index]) => index >= 0)
            .map(([role, index]) => ({ role, index, name: table.columns[index].displayName }));

        const cell =(row: powerbi.DataViewTableRow, col: number): string => (col >= 0 ? text(row[col]) : "");

        const rows: RawRow[] = (table.rows ?? []).map((row, rowIndex) => ({
            rowIndex,
            id: text(row[idCol]),
            name: cell(row, nameCol),
            parentId: text(row[parentCol]),
            parentName: cell(row, parentNameCol),
            details: detailCols.map((c) => text(row[c])).filter((v) => v !== ""),
            image: cell(row, imageCol),
            color: cell(row, colorCol),
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
        this.computeSearch();
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
            this.searchExpanded.clear();
            this.computeSearch();
            this.needFit = true;
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
            button("Expand all", "Expand every branch (while searching: every card in the filter)", () => {
                if (this.focusIds) {
                    // Every card in the reporting line shows its direct reports...
                    for (const id of this.focusIds) {
                        const node = this.nodes.get(id) ?? (this.root && this.root.id === id ? this.root : undefined);
                        if (node && node.children.length > 0) {
                            this.searchExpanded.add(node.id);
                        }
                    }
                    // ...and whoever was searched also shows their whole team.
                    for (const id of this.matchIds) {
                        const match = this.nodes.get(id);
                        if (match) {
                            this.expandBelow(match);
                        }
                    }
                } else {
                    this.collapsed.clear();
                }
                this.needFit = true;
                this.render();
            })
        );
        bar.appendChild(
            button("Collapse all", "Show only the top level (while searching: only the reporting line)", () => {
                if (this.focusIds) {
                    this.searchExpanded.clear();
                } else {
                    for (const node of this.nodes.values()) {
                        if (!node.virtual && node.children.length > 0 && node !== this.root) {
                            this.collapsed.add(node.id);
                        }
                    }
                    if (this.root && !this.root.virtual) {
                        this.collapsed.delete(this.root.id);
                    }
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

        this.exportButton = button("Export team", "", () => this.exportTeam());
        bar.appendChild(this.exportButton);
        this.copyButton = button("Copy team", "", () => this.copyTeam());
        bar.appendChild(this.copyButton);

        this.statusLabel = document.createElement("span");
        this.statusLabel.className = "status";
        bar.appendChild(this.statusLabel);
        this.updateExportState();
        return bar;
    }

    // -------------------------------------------------------------- export

    private updateExportState(): void {
        const ready = this.matchIds.size > 0;
        this.exportButton.disabled = !ready;
        this.copyButton.disabled = !ready;
        this.exportButton.title = ready
            ? "Download a CSV with the searched person(s) and everyone below them, at every level"
            : "Search for a person first to export their team";
        this.copyButton.title = ready
            ? "Copy the same list to the clipboard, ready to paste into Excel (works even when downloads are blocked)"
            : "Search for a person first to copy their team";
    }

    // ------------------------------------------------------- copy fallback

    private buildCopyPanel(): HTMLDivElement {
        const panel = document.createElement("div");
        panel.className = "copy-panel";

        const title = document.createElement("div");
        title.className = "copy-title";
        title.textContent = "Select all (Ctrl+A), copy (Ctrl+C) and paste into Excel";

        this.copyArea = document.createElement("textarea");
        this.copyArea.readOnly = true;
        this.copyArea.addEventListener("keydown", (e) => e.stopPropagation());

        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "Close";
        close.addEventListener("click", () => {
            panel.style.display = "none";
        });

        panel.appendChild(title);
        panel.appendChild(this.copyArea);
        panel.appendChild(close);
        return panel;
    }

    private showCopyPanel(content: string): void {
        this.copyArea.value = content;
        this.copyPanel.style.display = "flex";
        this.copyArea.focus();
        this.copyArea.select();
    }

    private copyWithTextarea(content: string): boolean {
        const area = document.createElement("textarea");
        area.value = content;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try {
            ok = document.execCommand("copy");
        } catch {
            ok = false;
        }
        document.body.removeChild(area);
        return ok;
    }

    /** Copies the team as tab-separated text, which Excel splits into columns on paste. */
    private copyTeam(): void {
        const team = this.collectTeam();
        if (team.length === 0) {
            this.notify("Search for a person first.");
            return;
        }
        const content = this.buildCsv(team, "\t");
        const done = (): void => this.notify(`Copied ${team.length} people. Paste into Excel.`);
        const fallback = (): void => {
            if (this.copyWithTextarea(content)) {
                done();
            } else {
                // Clipboard blocked by the host: show the text so it can be copied by hand.
                this.showCopyPanel(content);
                this.notify("Copy blocked here: select the text and copy it.");
            }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(content).then(done, fallback);
        } else {
            fallback();
        }
    }

    private notify(message: string): void {
        this.statusLabel.textContent = message;
        if (this.statusTimer !== undefined) {
            window.clearTimeout(this.statusTimer);
        }
        this.statusTimer = window.setTimeout(() => {
            this.statusLabel.textContent = "";
        }, 7000);
    }

    /** The searched people and everyone below them, at every level, without repeating anyone. */
    private collectTeam(): TeamRow[] {
        const matches = Array.from(this.matchIds)
            .map((id) => this.nodes.get(id))
            .filter((n): n is OrgNode => n !== undefined)
            .sort((a, b) => levelOf(a) - levelOf(b) || a.name.localeCompare(b.name));

        const seen = new Set<string>();
        const team: TeamRow[] = [];
        for (const match of matches) {
            const stack: TeamRow[] = [{ node: match, level: 0 }];
            while (stack.length > 0) {
                const item = stack.pop() as TeamRow;
                if (seen.has(item.node.id)) {
                    continue;
                }
                seen.add(item.node.id);
                team.push(item);
                for (let i = item.node.children.length - 1; i >= 0; i--) {
                    stack.push({ node: item.node.children[i], level: item.level + 1 });
                }
            }
        }
        return team;
    }

    private buildCsv(team: TeamRow[], separatorOverride?: string): string {
        const separator = separatorOverride ?? SEPARATORS[this.settings.exportSeparator];
        const line = (cells: string[]): string => cells.map((c) => csvCell(c, separator)).join(separator);

        const lines = [line(["Level", ...this.exportColumns.map((c) => c.name)])];
        for (const { node, level } of team) {
            const row = node.rowIndex >= 0 ? this.tableRows[node.rowIndex] : undefined;
            const cells = this.exportColumns.map((c) => {
                if (row) {
                    return text(row[c.index]);
                }
                // A manager without a row of their own: only the ID and the name are known.
                if (c.role === "employeeId") {
                    return node.id;
                }
                return c.role === "employeeName" ? node.name : "";
            });
            lines.push(line([String(level), ...cells]));
        }
        return lines.join("\r\n");
    }

    private exportFileName(): string {
        const base = this.matchIds.size === 1 ? Array.from(this.matchIds)[0] : this.query;
        const safe = base.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 40) || "search";
        return `org-tree-team-${safe}.csv`;
    }

    private exportTeam(): void {
        const team = this.collectTeam();
        if (team.length === 0) {
            this.notify("Search for a person first.");
            return;
        }
        const service = this.host.downloadService;
        if (!service) {
            this.notify("This Power BI host cannot save files.");
            return;
        }
        // The BOM makes Excel read the accents correctly.
        const csv = "﻿" + this.buildCsv(team);

        // Power BI's promises are thenables; wrapping them gives a standard Promise.
        const asPromise = <T>(p: unknown): Promise<T> => Promise.resolve(p as PromiseLike<T>);

        asPromise<powerbi.PrivilegeStatus>(service.exportStatus())
            .then((status) => {
                if (status !== powerbi.PrivilegeStatus.Allowed) {
                    this.notify(
                        status === powerbi.PrivilegeStatus.DisabledByAdmin
                            ? "Downloads are disabled by your Power BI admin. Use Copy team."
                            : "This Power BI host does not let the visual save files. Use Copy team."
                    );
                    return undefined;
                }
                return asPromise<boolean>(
                    service.exportVisualsContent(csv, this.exportFileName(), "csv", "Org Tree team (CSV)")
                ).then((saved) => {
                    this.notify(
                        saved ? `Exported ${team.length} people.` : "Export canceled or blocked. Try Copy team."
                    );
                });
            })
            .catch(() => this.notify("The export failed."));
    }

    /** While searching: shows every subordinate, direct and indirect, of the given node. */
    private expandBelow(node: OrgNode): void {
        const stack: OrgNode[] = [node];
        while (stack.length > 0) {
            const cur = stack.pop() as OrgNode;
            if (cur.children.length > 0) {
                this.searchExpanded.add(cur.id);
                stack.push(...cur.children);
            }
        }
    }

    /**
     * Search shows the reporting line: every match plus all its ancestors up to the top.
     * An exact ID match wins; otherwise names and IDs containing the text match (capped, to keep the chart readable).
     */
    private computeSearch(): void {
        this.matchIds = new Set();
        this.focusIds = null;
        if (!this.query) {
            return;
        }
        const q = this.query;
        const all = Array.from(this.nodes.values()).filter((n) => !n.virtual);
        let found = all.filter((n) => n.id.toLowerCase() === q);
        if (found.length === 0) {
            found = all.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
        }
        const focus = new Set<string>();
        for (const match of found.slice(0, MAX_SEARCH_MATCHES)) {
            this.matchIds.add(match.id);
            let cur: OrgNode | null = match;
            while (cur) {
                focus.add(cur.id);
                cur = cur.parent;
            }
        }
        this.focusIds = focus;
    }

    /** Whether a node shows a +/- button, and what it says. */
    private toggleState(d: OrgNode): { open: boolean; label: string } | null {
        if (d.children.length === 0) {
            return null;
        }
        const focus = this.focusIds;
        if (focus) {
            const hidden = d.children.filter((c) => !focus.has(c.id)).length;
            const open = this.searchExpanded.has(d.id);
            if (hidden === 0 && !open) {
                return null;
            }
            return { open, label: open ? MINUS : `+${hidden}` };
        }
        const open = !this.collapsed.has(d.id);
        return { open, label: open ? MINUS : `+${d.children.length}` };
    }

    private toggleNode(d: OrgNode): void {
        const set = this.focusIds ? this.searchExpanded : this.collapsed;
        if (set.has(d.id)) {
            set.delete(d.id);
        } else {
            set.add(d.id);
        }
        this.render();
    }

    // ----------------------------------------------------------- rendering

    private render(): void {
        const { width, height } = this.viewport;
        this.updateExportState();
        this.svg.attr("width", width).attr("height", height);
        this.canvas.selectAll("*").remove();

        if (!this.root) {
            this.emptyMessage.textContent = this.emptyText;
            this.svg.style("display", "none");
            this.emptyMessage.style.display = "block";
            return;
        }
        if (this.focusIds && this.matchIds.size === 0) {
            this.emptyMessage.textContent = `No employee matches "${this.searchInput.value.trim()}".`;
            this.svg.style("display", "none");
            this.emptyMessage.style.display = "block";
            return;
        }
        this.emptyMessage.textContent = this.emptyText;
        this.svg.style("display", "block");
        this.emptyMessage.style.display = "none";

        const s = this.settings;
        const focus = this.focusIds;
        const hier = hierarchy<OrgNode>(this.root, (d) => {
            if (d.children.length === 0) {
                return null;
            }
            if (focus) {
                if (this.searchExpanded.has(d.id)) {
                    return d.children;
                }
                const onPath = d.children.filter((c) => focus.has(c.id));
                return onPath.length > 0 ? onPath : null;
            }
            return this.collapsed.has(d.id) ? null : d.children;
        });
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

    private linkPath(sx: number, sy: number, tx: number, ty: number): string {
        const s = this.settings;
        const mid = (sy + ty) / 2;
        if (s.linkShape === "straight") {
            return `M${sx},${sy}L${tx},${ty}`;
        }
        if (s.linkShape === "curve") {
            return `M${sx},${sy}C${sx},${mid} ${tx},${mid} ${tx},${ty}`;
        }
        if (sx === tx) {
            return `M${sx},${sy}V${ty}`;
        }
        const dir = tx > sx ? 1 : -1;
        const r = Math.min(s.linkRadius, Math.abs(tx - sx) / 2, Math.abs(mid - sy), Math.abs(ty - mid));
        if (r <= 0) {
            return `M${sx},${sy}V${mid}H${tx}V${ty}`;
        }
        return (
            `M${sx},${sy}V${mid - r}` +
            `Q${sx},${mid} ${sx + dir * r},${mid}` +
            `H${tx - dir * r}` +
            `Q${tx},${mid} ${tx},${mid + r}` +
            `V${ty}`
        );
    }

    private drawLinks(laid: HierarchyPointNode<OrgNode>): void {
        const s = this.settings;
        const layer = this.canvas
            .append("g")
            .attr("fill", "none")
            .attr("stroke", s.linkColor)
            .attr("stroke-width", s.linkWidth);
        const topOffset = this.avatarOnTop() ? s.avatarSize / 2 : 0;

        for (const link of laid.links()) {
            if (link.source.data.virtual) {
                continue;
            }
            const sx = link.source.x;
            const sy = link.source.y + s.cardHeight;
            const tx = link.target.x;
            const ty = link.target.y - topOffset;
            layer.append("path").attr("d", this.linkPath(sx, sy, tx, ty));
            if (s.linkEndMarker) {
                layer
                    .append("circle")
                    .attr("cx", tx)
                    .attr("cy", ty)
                    .attr("r", 3 + s.linkWidth)
                    .attr("fill", s.linkColor)
                    .attr("stroke", "none");
            }
        }
    }

    private avatarOnTop(): boolean {
        const s = this.settings;
        return this.hasImageRole && s.avatarShape !== "none" && s.avatarPosition === "top";
    }

    private drawNodes(selected: ISelectionId[]): void {
        const s = this.settings;
        const hasSelection = selected.length > 0;
        const hasAvatar = this.hasImageRole && s.avatarShape !== "none";
        const avatarLeft = hasAvatar && s.avatarPosition === "left";
        const avatarTop = hasAvatar && s.avatarPosition === "top";

        const textX = avatarLeft ? 8 + s.avatarSize + 10 : avatarTop ? s.cardWidth / 2 : 10;
        const anchor = avatarTop ? "middle" : "start";
        const availWidth = s.cardWidth - (avatarLeft ? s.avatarSize + 26 : 20);
        const titleChars = Math.max(4, Math.floor(availWidth / (s.titleSize * 0.58)));
        const detailChars = Math.max(4, Math.floor(availWidth / (s.detailSize * 0.56)));
        const startY = avatarTop ? s.avatarSize / 2 + 6 : 8;
        const titleY = startY + s.titleSize + 2;
        const lineHeight = s.detailSize + 3;
        const maxDetailLines = Math.max(0, Math.floor((s.cardHeight - 6 - (titleY + 4)) / lineHeight));

        const layer = this.canvas.append("g");
        let clipCounter = 0;

        for (const n of this.visibleNodes) {
            const d = n.data;
            const sid = this.selectionIds.get(d.id);
            const isSelected = !!sid && selected.some((x) => x.equals(sid));
            const isMatch = this.matchIds.has(d.id);
            const customFill = isValidColor(d.color) ? d.color : "";
            const fill = customFill || s.cardFill;
            const ink = (customFill && readableText(customFill)) || s.textColor;

            const card = layer
                .append("g")
                .attr("transform", `translate(${n.x - s.cardWidth / 2},${n.y})`)
                .style("cursor", sid ? "pointer" : "default")
                .attr("opacity", hasSelection && !isSelected ? 0.45 : 1);

            card.append("title").text([d.name, `ID: ${d.id}`, ...d.details].join("\n"));

            card.append("rect")
                .attr("width", s.cardWidth)
                .attr("height", s.cardHeight)
                .attr("rx", s.cardRadius)
                .attr("fill", fill)
                .attr("stroke", isSelected ? "#0078D4" : isMatch ? "#F2A100" : s.cardBorder)
                .attr("stroke-width", isSelected || isMatch ? Math.max(2.5, s.cardBorderWidth) : s.cardBorderWidth);

            if (hasAvatar) {
                const clipId = `org-avatar-${clipCounter++}`;
                const cx = avatarTop ? s.cardWidth / 2 : 8 + s.avatarSize / 2;
                const cy = avatarTop ? 0 : s.cardHeight / 2;
                this.drawAvatar(card, d, clipId, cx, cy);
            }

            card.append("text")
                .attr("x", textX)
                .attr("y", titleY)
                .attr("text-anchor", anchor)
                .attr("font-size", s.titleSize)
                .attr("font-weight", s.titleBold ? 600 : 400)
                .attr("fill", ink)
                .text(shorten(d.name, titleChars));

            d.details.slice(0, maxDetailLines).forEach((line, i) => {
                card.append("text")
                    .attr("x", textX)
                    .attr("y", titleY + 4 + (i + 1) * lineHeight - 2)
                    .attr("text-anchor", anchor)
                    .attr("font-size", s.detailSize)
                    .attr("fill", ink)
                    .attr("fill-opacity", 0.78)
                    .text(shorten(line, detailChars));
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

            const toggle = this.toggleState(d);
            if (toggle) {
                this.drawToggle(card, d, toggle.label);
            }
        }
    }

    private drawAvatar(
        card: SvgSelection<SVGGElement>,
        d: OrgNode,
        clipId: string,
        cx: number,
        cy: number
    ): void {
        const s = this.settings;
        const size = s.avatarSize;
        const half = size / 2;
        const isCircle = s.avatarShape === "circle";
        const radius = isCircle ? half : Math.min(8, s.cardRadius);

        const drawShape = (parent: SvgSelection<any>): Selection<any, unknown, null, undefined> => {
            return isCircle
                ? parent.append("circle").attr("cx", cx).attr("cy", cy).attr("r", half)
                : parent
                      .append("rect")
                      .attr("x", cx - half)
                      .attr("y", cy - half)
                      .attr("width", size)
                      .attr("height", size)
                      .attr("rx", radius);
        };

        const source = imageSource(d.image);
        if (source) {
            drawShape(card.append("clipPath").attr("id", clipId));
            card.append("image")
                .attr("href", source)
                .attr("x", cx - half)
                .attr("y", cy - half)
                .attr("width", size)
                .attr("height", size)
                .attr("preserveAspectRatio", "xMidYMid slice")
                .attr("clip-path", `url(#${clipId})`);
            drawShape(card).attr("fill", "none").attr("stroke", s.cardBorder).attr("stroke-width", 1);
            return;
        }

        drawShape(card).attr("fill", "#E1E8F0").attr("stroke", s.cardBorder).attr("stroke-width", 1);
        card.append("text")
            .attr("x", cx)
            .attr("y", cy + size * 0.16)
            .attr("text-anchor", "middle")
            .attr("font-size", Math.round(size * 0.4))
            .attr("font-weight", 600)
            .attr("fill", "#3E4C59")
            .text(initials(d.name));
    }

    private drawToggle(card: SvgSelection<SVGGElement>, d: OrgNode, label: string): void {
        const s = this.settings;

        const toggle = card
            .append("g")
            .attr("class", "org-toggle")
            .attr("transform", `translate(${s.cardWidth / 2},${s.cardHeight}) scale(${this.toggleScale()})`)
            .style("cursor", "pointer");
        toggle
            .append("rect")
            .attr("x", -18)
            .attr("y", -9)
            .attr("width", 36)
            .attr("height", 18)
            .attr("rx", 9)
            .attr("fill", "#FFFFFF")
            .attr("stroke", s.linkColor);
        toggle
            .append("text")
            .attr("text-anchor", "middle")
            .attr("y", 4)
            .attr("font-size", 11)
            .attr("fill", "#1F2933")
            .text(label);
        toggle.on("click", (event: MouseEvent) => {
            event.stopPropagation();
            this.toggleNode(d);
        });
    }

    /** Scales and centers the visible chart inside the viewport. */
    private fit(): void {
        if (this.visibleNodes.length === 0 || this.viewport.width <= 0 || this.viewport.height <= 0) {
            return;
        }
        const s = this.settings;
        const overhang = this.avatarOnTop() ? s.avatarSize / 2 : 0;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const n of this.visibleNodes) {
            minX = Math.min(minX, n.x - s.cardWidth / 2);
            maxX = Math.max(maxX, n.x + s.cardWidth / 2);
            minY = Math.min(minY, n.y - overhang);
            maxY = Math.max(maxY, n.y + s.cardHeight + 10);
        }
        const pad = 40;
        const top = 24 * this.toolbarScale + 16; // room for the toolbar
        const w = maxX - minX;
        const h = maxY - minY;
        const k = Math.min(1, (this.viewport.width - pad) / w, (this.viewport.height - top - pad) / h);
        const tx = (this.viewport.width - w * k) / 2 - minX * k;
        const ty = top + (this.viewport.height - top - h * k) / 2 - minY * k;
        this.svg.call(this.zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(k));
    }
}
