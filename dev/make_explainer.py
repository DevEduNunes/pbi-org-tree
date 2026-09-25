"""Generates docs/images/what-is-an-org-chart.<lang>.svg (an explainer for people new to org charts).

    python dev/make_explainer.py

Uses only fictional people. Edit TEXT to add a language.
"""
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "images")

TEXT = {
    "en": {
        "title": "What is an org chart?",
        "subtitle": "A diagram that shows who reports to whom in an organization.",
        "left": "1. Your data",
        "right": "2. The org chart",
        "employee": "Employee",
        "manager": "Manager",
        "none": "(no manager)",
        "arrow": ["Org Tree", "draws it"],
        "top": "the top has no manager",
        "reports": "Bruno reports to Alice",
        "legend": "Each card is a person  ·  each line means “reports to”",
        "foot": "One row per person is all you need. This example uses fictional people.",
    },
    "pt-BR": {
        "title": "O que é um organograma?",
        "subtitle": "Um diagrama que mostra quem responde para quem em uma organização.",
        "left": "1. Seus dados",
        "right": "2. O organograma",
        "employee": "Colaborador",
        "manager": "Gestor",
        "none": "(sem gestor)",
        "arrow": ["O Org Tree", "desenha"],
        "top": "o topo não tem gestor",
        "reports": "Bruno responde para Alice",
        "legend": "Cada card é uma pessoa  ·  cada linha significa “responde para”",
        "foot": "Uma linha por pessoa é tudo o que você precisa. Este exemplo usa pessoas fictícias.",
    },
}

NAVY, TEAL, INK, MUTED, LINE, PANEL = "#0F4C81", "#64C8C8", "#1F2933", "#52606D", "#9AA5B1", "#F5F7FA"
PEOPLE = [("Alice Prado", None), ("Bruno Lima", "Alice Prado"), ("Carla Souza", "Alice Prado"),
          ("Diego Rocha", "Bruno Lima"), ("Elisa Moraes", "Bruno Lima")]


def initials(name):
    a = name.split()
    return (a[0][0] + a[-1][0]).upper()


def card(cx, y, name, title, fill, ink):
    x = cx - 62
    return (
        f'<rect x="{x}" y="{y}" width="124" height="46" rx="8" fill="{fill}" stroke="#B8C4D0"/>'
        f'<circle cx="{x + 24}" cy="{y + 23}" r="14" fill="#E1E8F0"/>'
        f'<text x="{x + 24}" y="{y + 28}" text-anchor="middle" font-size="11" font-weight="600" fill="#3E4C59">{initials(name)}</text>'
        f'<text x="{x + 46}" y="{y + 21}" font-size="12" font-weight="600" fill="{ink}">{name}</text>'
        f'<text x="{x + 46}" y="{y + 35}" font-size="10" fill="{ink}" fill-opacity="0.8">{title}</text>'
    )


def build(lang):
    t = TEXT[lang]
    p = []
    p.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 440" width="1000" height="440" '
             'font-family="\'Segoe UI\', \'Helvetica Neue\', Arial, sans-serif" role="img" '
             f'aria-label="{t["title"]}">')
    p.append(f"<title>{t['title']}</title>")
    p.append('<rect width="1000" height="440" rx="16" fill="#ffffff" stroke="#D9E0E7"/>')
    p.append(f'<text x="40" y="56" font-size="30" font-weight="700" fill="{NAVY}">{t["title"]}</text>')
    p.append(f'<text x="40" y="86" font-size="16" fill="{MUTED}">{t["subtitle"]}</text>')

    # left panel: the data
    p.append(f'<rect x="40" y="112" width="340" height="270" rx="12" fill="{PANEL}" stroke="#D9E0E7"/>')
    p.append(f'<text x="60" y="142" font-size="14" font-weight="700" fill="{NAVY}">{t["left"]}</text>')
    p.append(f'<rect x="60" y="156" width="300" height="30" rx="6" fill="{NAVY}"/>')
    p.append(f'<text x="74" y="176" font-size="13" font-weight="600" fill="#fff">{t["employee"]}</text>')
    p.append(f'<text x="214" y="176" font-size="13" font-weight="600" fill="#fff">{t["manager"]}</text>')
    for i, (person, boss) in enumerate(PEOPLE):
        y = 186 + i * 38
        p.append(f'<rect x="60" y="{y}" width="300" height="38" fill="{"#ffffff" if i % 2 == 0 else "#EEF2F6"}"/>')
        p.append(f'<text x="74" y="{y + 24}" font-size="13" fill="{INK}">{person}</text>')
        if boss:
            p.append(f'<text x="214" y="{y + 24}" font-size="13" fill="{INK}">{boss}</text>')
        else:
            p.append(f'<text x="214" y="{y + 24}" font-size="12" font-style="italic" fill="{MUTED}">{t["none"]}</text>')

    # arrow
    p.append(f'<path d="M392 250 H442" stroke="{NAVY}" stroke-width="3" stroke-linecap="round"/>')
    p.append(f'<path d="M432 240 L444 250 L432 260" fill="none" stroke="{NAVY}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
    for i, word in enumerate(t["arrow"]):
        p.append(f'<text x="417" y="{276 + i * 14}" text-anchor="middle" font-size="11" fill="{MUTED}">{word}</text>')

    # right panel: the chart
    p.append(f'<rect x="456" y="112" width="504" height="270" rx="12" fill="{PANEL}" stroke="#D9E0E7"/>')
    p.append(f'<text x="476" y="142" font-size="14" font-weight="700" fill="{NAVY}">{t["right"]}</text>')
    line = f'fill="none" stroke="{LINE}" stroke-width="1.6"'
    p.append(f'<path d="M718 196 V214 H634 V232" {line}/>')
    p.append(f'<path d="M718 196 V214 H832 V232" {line}/>')
    p.append(f'<path d="M634 278 V296 H556 V314" {line}/>')
    p.append(f'<path d="M634 278 V296 H712 V314" {line}/>')
    p.append(card(718, 150, "Alice Prado", "CEO", NAVY, "#ffffff"))
    p.append(card(634, 232, "Bruno Lima", "VP Operations", TEAL, INK))
    p.append(card(832, 232, "Carla Souza", "VP Finance", TEAL, INK))
    p.append(card(556, 314, "Diego Rocha", "Manager", "#ffffff", INK))
    p.append(card(712, 314, "Elisa Moraes", "Manager", "#ffffff", INK))

    # annotations
    p.append(f'<path d="M782 173 H806" stroke="#D97706" stroke-width="1.6" stroke-linecap="round"/>')
    p.append(f'<path d="M790 167 L782 173 L790 179" fill="none" stroke="#D97706" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>')
    p.append(f'<text x="812" y="177" font-size="12" font-style="italic" fill="#B45309">{t["top"]}</text>')
    p.append(f'<text x="600" y="210" text-anchor="end" font-size="12" font-style="italic" fill="#B45309">{t["reports"]}</text>')
    p.append(f'<text x="708" y="372" text-anchor="middle" font-size="12" fill="{MUTED}">{t["legend"]}</text>')

    p.append(f'<text x="40" y="414" font-size="13" fill="{MUTED}">{t["foot"]}</text>')
    p.append("</svg>")
    return "\n".join(p) + "\n"


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for lang in TEXT:
        path = os.path.join(OUT, f"what-is-an-org-chart.{lang}.svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(build(lang))
        print("wrote", path)
