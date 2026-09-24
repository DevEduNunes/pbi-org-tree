import powerbi from "powerbi-visuals-api";

export type AvatarShape = "circle" | "square" | "none";
export type AvatarPosition = "left" | "top";
export type ConnectorShape = "elbow" | "curve" | "straight";

export interface Settings {
    // layout
    initialDepth: number;
    horizontalGap: number;
    verticalGap: number;
    // card
    cardWidth: number;
    cardHeight: number;
    cardRadius: number;
    cardBorderWidth: number;
    // avatar
    avatarShape: AvatarShape;
    avatarPosition: AvatarPosition;
    avatarSize: number;
    // text
    titleSize: number;
    titleBold: boolean;
    detailSize: number;
    // colors
    cardFill: string;
    cardBorder: string;
    textColor: string;
    flagValue: string;
    flagFill: string;
    // connectors
    linkColor: string;
    linkWidth: number;
    linkShape: ConnectorShape;
    linkRadius: number;
    linkEndMarker: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    initialDepth: 2,
    horizontalGap: 24,
    verticalGap: 44,
    cardWidth: 200,
    cardHeight: 80,
    cardRadius: 8,
    cardBorderWidth: 1,
    avatarShape: "circle",
    avatarPosition: "left",
    avatarSize: 44,
    titleSize: 12,
    titleBold: true,
    detailSize: 11,
    cardFill: "#FFFFFF",
    cardBorder: "#B8C4D0",
    textColor: "#1F2933",
    flagValue: "",
    flagFill: "#FDE2E2",
    linkColor: "#9AA5B1",
    linkWidth: 1.5,
    linkShape: "elbow",
    linkRadius: 10,
    linkEndMarker: false,
};

type Objects = powerbi.DataViewObjects | undefined;

function raw(o: Objects, obj: string, prop: string): any {
    return (o as any)?.[obj]?.[prop];
}

function readNumber(o: Objects, obj: string, prop: string, def: number, min: number, max: number): number {
    const v = raw(o, obj, prop);
    return typeof v === "number" && isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
}

function readBool(o: Objects, obj: string, prop: string, def: boolean): boolean {
    const v = raw(o, obj, prop);
    return typeof v === "boolean" ? v : def;
}

function readColor(o: Objects, obj: string, prop: string, def: string): string {
    const v = raw(o, obj, prop)?.solid?.color;
    return typeof v === "string" && v ? v : def;
}

function readText(o: Objects, obj: string, prop: string, def: string): string {
    const v = raw(o, obj, prop);
    return typeof v === "string" ? v : def;
}

function readEnum<T extends string>(o: Objects, obj: string, prop: string, allowed: readonly T[], def: T): T {
    const v = raw(o, obj, prop);
    return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : def;
}

export function readSettings(dataView: powerbi.DataView | undefined): Settings {
    const o = dataView?.metadata?.objects;
    const d = DEFAULT_SETTINGS;
    return {
        initialDepth: Math.round(readNumber(o, "layout", "initialDepth", d.initialDepth, 1, 50)),
        horizontalGap: readNumber(o, "layout", "horizontalGap", d.horizontalGap, 4, 200),
        verticalGap: readNumber(o, "layout", "verticalGap", d.verticalGap, 20, 300),

        cardWidth: readNumber(o, "card", "width", d.cardWidth, 100, 500),
        cardHeight: readNumber(o, "card", "height", d.cardHeight, 40, 300),
        cardRadius: readNumber(o, "card", "cornerRadius", d.cardRadius, 0, 50),
        cardBorderWidth: readNumber(o, "card", "borderWidth", d.cardBorderWidth, 0, 10),

        avatarShape: readEnum(o, "avatar", "shape", ["circle", "square", "none"] as const, d.avatarShape),
        avatarPosition: readEnum(o, "avatar", "position", ["left", "top"] as const, d.avatarPosition),
        avatarSize: readNumber(o, "avatar", "size", d.avatarSize, 16, 120),

        titleSize: readNumber(o, "text", "titleSize", d.titleSize, 8, 32),
        titleBold: readBool(o, "text", "titleBold", d.titleBold),
        detailSize: readNumber(o, "text", "detailSize", d.detailSize, 7, 28),

        cardFill: readColor(o, "colors", "cardFill", d.cardFill),
        cardBorder: readColor(o, "colors", "cardBorder", d.cardBorder),
        textColor: readColor(o, "colors", "textColor", d.textColor),
        flagValue: readText(o, "colors", "flagValue", d.flagValue).trim(),
        flagFill: readColor(o, "colors", "flagFill", d.flagFill),

        linkColor: readColor(o, "connectors", "color", d.linkColor),
        linkWidth: readNumber(o, "connectors", "width", d.linkWidth, 0.5, 10),
        linkShape: readEnum(o, "connectors", "shape", ["elbow", "curve", "straight"] as const, d.linkShape),
        linkRadius: readNumber(o, "connectors", "cornerRadius", d.linkRadius, 0, 60),
        linkEndMarker: readBool(o, "connectors", "endMarker", d.linkEndMarker),
    };
}

/** Values shown in the format pane for the given object. */
export function settingsToInstances(objectName: string, s: Settings): powerbi.VisualObjectInstance[] {
    const fill = (color: string) => ({ solid: { color } });
    let properties: { [name: string]: powerbi.DataViewPropertyValue } | undefined;

    switch (objectName) {
        case "layout":
            properties = {
                initialDepth: s.initialDepth,
                horizontalGap: s.horizontalGap,
                verticalGap: s.verticalGap,
            };
            break;
        case "card":
            properties = {
                width: s.cardWidth,
                height: s.cardHeight,
                cornerRadius: s.cardRadius,
                borderWidth: s.cardBorderWidth,
            };
            break;
        case "avatar":
            properties = { shape: s.avatarShape, position: s.avatarPosition, size: s.avatarSize };
            break;
        case "text":
            properties = { titleSize: s.titleSize, titleBold: s.titleBold, detailSize: s.detailSize };
            break;
        case "colors":
            properties = {
                cardFill: fill(s.cardFill),
                cardBorder: fill(s.cardBorder),
                textColor: fill(s.textColor),
                flagValue: s.flagValue,
                flagFill: fill(s.flagFill),
            };
            break;
        case "connectors":
            properties = {
                color: fill(s.linkColor),
                width: s.linkWidth,
                shape: s.linkShape,
                cornerRadius: s.linkRadius,
                endMarker: s.linkEndMarker,
            };
            break;
        default:
            return [];
    }
    return [{ objectName, selector: undefined, properties }];
}
