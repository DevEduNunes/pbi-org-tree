<p align="center">
  <img src="docs/images/banner.svg" alt="Org Tree — free, open-source org chart for Power BI" width="100%">
</p>

<p align="center">
  <b>English</b> · <a href="README.pt-BR.md">Português</a>
</p>

<p align="center">
  <a href="https://github.com/DevEduNunes/pbi-org-tree/actions/workflows/build.yml"><img alt="Build" src="https://github.com/DevEduNunes/pbi-org-tree/actions/workflows/build.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <img alt="Power BI custom visual" src="https://img.shields.io/badge/Power%20BI-custom%20visual-F2C811?logo=powerbi&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-D3-3178C6?logo=typescript&logoColor=white">
  <a href="CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
</p>

# Org Tree

A **free and open-source vertical organization chart** for Power BI. Give it a simple table — one row per person, with the person's ID and their manager's ID — and it draws the whole hierarchy: expandable branches, search that shows the full reporting line, zoom and pan, photos, colors from your data and cross-filtering with the rest of your report.

No license fees, no per-user pricing, no data leaving your report.

## 🧭 What is an org chart?

<p align="center">
  <img src="docs/images/what-is-an-org-chart.en.svg" alt="A table of employees and their managers becomes an org chart: each card is a person and each line means 'reports to'" width="100%">
</p>

An **org chart** (organizational chart) is a diagram that shows **who reports to whom** in a company: the top person, their direct reports, the reports of those, and so on. All you need to draw one is a table with **one row per person** and the **ID of their manager**.

## 📸 See it in action

Every picture below was rendered by the real visual from [`sample/sample-data.csv`](sample/sample-data.csv) — fictional people only.

**Overview** — three levels open; the `+2`, `+3`… buttons expand each team, and card colors come from your data.

<p align="center"><img src="docs/images/full-tree.svg" alt="Org Tree overview with three levels open and colored cards" width="100%"></p>

**Search shows the reporting line** — type an ID or a name and see the person and every manager above them, up to the top.

<p align="center"><img src="docs/images/search-reporting-line.svg" alt="Searching for a person shows the chain of managers up to the CEO" width="70%"></p>

**Expand all keeps the filter** — every card in the line opens to show its reports, and the searched person shows their whole team. *Export team* and *Copy team* then hand you that list.

<p align="center"><img src="docs/images/search-expand-all.svg" alt="Expand all while searching, showing the reporting line and the team below the searched person" width="100%"></p>

**Make it yours** — avatar on top, curved connectors with dots, rounder cards, colors and sizes, all from *Format visual*.

<p align="center"><img src="docs/images/customized.svg" alt="Org Tree customized with avatars on top and curved connectors" width="100%"></p>

## ✨ Features

| | |
|---|---|
| 🌳 **Vertical tree** | Top-down chart with rounded, straight or curved connectors |
| ➕ **Expand / collapse** | Per branch, plus *Expand all*, *Collapse all* and *Fit*; choose how many levels start open |
| 🔎 **Reporting-line search** | Type an ID or a name and see the person and every manager above them, up to the top |
| 📤 **Export / Copy team** | Search a person and download a CSV — or copy it, ready to paste into Excel — with them and **everyone below** them, at every level |
| 🖱️ **Zoom & pan** | Mouse wheel and drag; *Fit* re-centers everything |
| 📐 **Responsive controls** | The toolbar grows with the visual (and with a zoomed-out browser), and the +N / − buttons on the cards grow as you zoom out |
| 🔗 **Cross-filtering** | Click a card to filter the other visuals (Ctrl/Shift to select several) |
| 🖼️ **Avatars** | Photo from a link or base64, or automatic initials; circle or square, on the left or on top |
| 🎨 **Colors from data** | A column with a color (`#64C8C8`) paints each card; text contrast is adjusted automatically |
| 🛠️ **Format pane** | Layout, cards, avatar, text, colors and connectors — all in *Format visual* |
| 🧹 **Forgiving data** | Managers without their own row, several top-level people, duplicated IDs and loops are handled |

## 🚀 Quick start

1. **Download** the latest `OrganogramaByDevEduNunes.pbiviz` from the [Releases](https://github.com/DevEduNunes/pbi-org-tree/releases) page.
2. In **Power BI Desktop**: *Visualizations* pane → **⋯** → **Import a visual from a file** → choose the file.
3. Add the visual to your report and drop your columns into the fields (below).
4. Open **Format visual** to style it.

### Fields

| Field | Required | What to put there |
|---|:---:|---|
| **Employee ID** | ✅ | Unique key of the row (text is safest) |
| **Manager ID** | ✅ | ID of the person's manager. Empty, or equal to the employee's own ID, means *top of the tree* |
| **Employee name** | | Name shown on the card (falls back to the ID) |
| **Manager name** | | Names managers that have no row of their own |
| **Card details** | | One or more columns; each is one extra line on the card and in the hover tooltip |
| **Image URL** | | `https://` link, or the image as base64 (see [limits](#-good-to-know)). Empty = initials |
| **Card color** | | A CSS color such as `#64C8C8`. Empty = default card color |

> **Tip — highlighting a rule.** Build the color in your model, e.g. in Power Query:
> `if [Status] = "Review" then "#FDE2E2" else ""`

### Format visual

| Section | Options |
|---|---|
| **Layout** | Initially expanded levels, horizontal gap, vertical gap |
| **Cards** | Width, height, corner radius, border width |
| **Avatar** | Shape (circle / square / none), position (left / top), size |
| **Text** | Title size, bold, details size |
| **Colors** | Card fill, border, text |
| **Connectors** | Color, width, shape (elbow / curve / straight), elbow radius, dot at the child end |
| **Toolbar** | Scale with the visual's size (on by default) and a manual size in % |
| **Export** | CSV separator: semicolon, comma or tab |

## 🔎 How search works

- An **exact ID** match wins: `7957` finds only employee `7957`, not `17957`.
- Otherwise, names and IDs *containing* your text match (up to 100 people).
- The chart then shows only the **reporting line**: the match(es) and all their managers up to the top, with the match highlighted.
- Use the **+N** button on any card in that line to bring in its other direct reports.
- While searching, **Expand all** keeps the filter and opens every card in it: each manager in the line shows their direct reports, and the searched person also shows their whole team. **Collapse all** goes back to just the reporting line.
- **Export team** (enabled while a search is active) saves a CSV with the searched person(s) and **everyone below them, at every level**, whether or not the cards are expanded. Columns: `Level` (0 = the searched person, 1 = direct reports…), then Employee ID, name, Manager ID, manager name and the *Card details* columns. The file is UTF-8 with BOM, so Excel reads accents correctly; the separator is set in *Format visual → Export* (semicolon by default, for Excel in Portuguese).
- **Copy team** puts the same list on the clipboard (tab-separated), so you can paste it straight into Excel. Use it when **downloads are blocked**: many organizations disable *"Allow downloads from custom visuals"* in the Power BI/Fabric admin portal, and then **Export team** shows a Power BI message saying the admin restricted downloads. If the clipboard is blocked too, a panel opens with the text so you can copy it by hand.
- Clear the search box to go back to the full tree.

## 📦 Sample data

[`sample/sample-data.csv`](sample/sample-data.csv) is a small, fictional company you can load into Power BI to try every field. To prepare your own table (types, deduplication, top of the tree, Power Query and Spark SQL snippets) read [`docs/data-preparation.md`](docs/data-preparation.md).

## 💡 Good to know

- The visual loads up to **30,000 rows**.
- Power BI **truncates text longer than 32,766 characters**, and a cut image will not open. Keep base64 thumbnails small (about 80×80 px, under ~20 KB).
- Images from `https://` links only load if the link opens **without signing in**. Photos stored behind a login (for example in SharePoint) won't show — use base64 instead.
- Loops (A reports to B, B reports to A) are broken automatically, but fix them at the source.

## 🔒 Security & privacy

- The visual runs entirely inside the Power BI sandbox. It **does not send your data anywhere**, has **no telemetry**, and makes **no network calls of its own**.
- The only file it can create is the CSV you request with **Export team**, saved through Power BI's own download service: Power BI asks you where to save it, and an admin can disable downloads from custom visuals. Text that would be read as a formula by a spreadsheet (starting with `=`, `+`, `-` or `@`) is exported with a leading quote.
- The only outgoing requests are the ones your browser makes to load an image when your data contains an `https://` image link.
- Text from your data is always rendered as plain text (never as HTML), and only `https://` links and PNG/JPEG/GIF/WebP data are accepted as images.
- Found a vulnerability? Please report it privately — see [SECURITY.md](SECURITY.md).

## 🧑‍💻 Development

Requires **Node.js 20.19+**.

```bash
npm install
npm start          # developer visual served to Power BI
npm run package    # creates dist/*.pbiviz
```

Want to try changes without Power BI *or* Node? Run `python dev/server.py` and open `http://localhost:8765/dev/harness.html`: it runs the real `src/visual.ts` in a browser tab with a stand-in Power BI host (TypeScript, Less and D3 load from a CDN). It renders `sample/sample-data.csv`, and *Save SVG* regenerates the pictures in `docs/images` — this is how they were made. `python dev/make_explainer.py` redraws the "What is an org chart?" pictures.

Don't want to install Node? Every push runs the **Build visual** GitHub Action and uploads the `.pbiviz` as an artifact; pushing a tag like `v1.0.0` publishes it as a release.

```
src/orgModel.ts    flat rows -> tree (pure code, no Power BI dependency)
src/settings.ts    format-pane settings and defaults
src/visual.ts      rendering (d3-hierarchy + SVG), search, interaction, selection
capabilities.json  fields and format-pane objects
```

## 🗺️ Roadmap

Ideas that would be welcome — open an issue or a pull request:

- Unit tests for the tree builder (loops, duplicate IDs, missing managers)
- Horizontal layout and "assistant" nodes beside a manager
- Power BI tooltips, dark theme and high-contrast support
- Export to image
- More languages

## 🤝 Contributing

Contributions of all sizes are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). **Never commit real employee data or screenshots of real reports.**

## 📄 License

[MIT](LICENSE) © DevEduNunes and contributors.

Built with [D3](https://d3js.org/) (`d3-hierarchy`, `d3-selection`, `d3-zoom`, ISC license) and the [Power BI visuals tools](https://github.com/microsoft/powerbi-visuals-tools).
