import powerbi from "powerbi-visuals-api";

export interface Settings {
    initialDepth: number;
    cardWidth: number;
    cardHeight: number;
    horizontalGap: number;
    verticalGap: number;
    cardFill: string;
    cardBorder: string;
    textColor: string;
    linkColor: string;
    flagValue: string;
    flagFill: string;
}

export const DEFAULT_SETTINGS: Settings = {
    initialDepth: 2,
    cardWidth: 190,
    cardHeight: 76,
    horizontalGap: 24,
    verticalGap: 44,
    cardFill: "#FFFFFF",
    cardBorder: "#B8C4D0",
    textColor: "#1F2933",
    linkColor: "#9AA5B1",
    flagValue: "",
    flagFill: "#FDE2E2",
};

type Objects = powerbi.DataViewObjects | undefined;

function readNumber(o: Objects, obj: string, prop: string, def: number, min: number, max: number): number {
    const v = (o as any)?.[obj]?.[prop];
    if (typeof v !== "number" || !isFinite(v)) {
        return def;
    }
    return Math.min(max, Math.max(min, v));
}

function readColor(o: Objects, obj: string, prop: string, def: string): string {
    const v = (o as any)?.[obj]?.[prop]?.solid?.color;
    return typeof v === "string" && v ? v : def;
}

function readText(o: Objects, obj: string, prop: string, def: string): string {
    const v = (o as any)?.[obj]?.[prop];
    return typeof v === "string" ? v : def;
}

export function readSettings(dataView: powerbi.DataView | undefined): Settings {
    const o = dataView?.metadata?.objects;
    const d = DEFAULT_SETTINGS;
    return {
        initialDepth: Math.round(readNumber(o, "layout", "initialDepth", d.initialDepth, 1, 50)),
        cardWidth: readNumber(o, "layout", "cardWidth", d.cardWidth, 100, 500),
        cardHeight: readNumber(o, "layout", "cardHeight", d.cardHeight, 40, 300),
        horizontalGap: readNumber(o, "layout", "horizontalGap", d.horizontalGap, 4, 200),
        verticalGap: readNumber(o, "layout", "verticalGap", d.verticalGap, 20, 300),
        cardFill: readColor(o, "colors", "cardFill", d.cardFill),
        cardBorder: readColor(o, "colors", "cardBorder", d.cardBorder),
        textColor: readColor(o, "colors", "textColor", d.textColor),
        linkColor: readColor(o, "colors", "linkColor", d.linkColor),
        flagValue: readText(o, "colors", "flagValue", d.flagValue).trim(),
        flagFill: readColor(o, "colors", "flagFill", d.flagFill),
    };
}

/** Values shown in the format pane for the given object. */
export function settingsToInstances(objectName: string, s: Settings): powerbi.VisualObjectInstance[] {
    const fill = (color: string) => ({ solid: { color } });
    if (objectName === "layout") {
        return [
            {
                objectName,
                selector: undefined,
                properties: {
                    initialDepth: s.initialDepth,
                    cardWidth: s.cardWidth,
                    cardHeight: s.cardHeight,
                    horizontalGap: s.horizontalGap,
                    verticalGap: s.verticalGap,
                },
            },
        ];
    }
    if (objectName === "colors") {
        return [
            {
                objectName,
                selector: undefined,
                properties: {
                    cardFill: fill(s.cardFill),
                    cardBorder: fill(s.cardBorder),
                    textColor: fill(s.textColor),
                    linkColor: fill(s.linkColor),
                    flagValue: s.flagValue,
                    flagFill: fill(s.flagFill),
                },
            },
        ];
    }
    return [];
}
