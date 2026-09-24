# Org Tree — free vertical org chart for Power BI

An open-source (MIT) custom visual that draws a **vertical organization chart** from a plain employee/manager table.

**Features**
- Vertical tree with **expand / collapse** per branch, plus *Expand all*, *Collapse all* and *Fit*
- **Search** by name or ID shows the **reporting line**: the match and every manager above it up to the top, highlighted. An exact ID wins over partial matches. Use the +N button on any card to bring in its other reports; *Expand all* / *Collapse all* clear the search
- Pan and zoom (mouse wheel + drag)
- **Cross-filtering**: click a card to filter the rest of the report (Ctrl/Shift for multi-select)
- Optional **card details** (title, department, …), shown as lines on the card and in the hover tooltip
- **Avatars**: photo from an image URL (circle or square, left or top of the card) or automatic initials
- **Card color from data**: a column with a color such as `#64C8C8`; text contrast is adjusted automatically. Build any highlight rule (for example "flag people to remove") as a color column in your model
- **Connectors**: elbow (rounded), curve or straight, custom width/color, optional dot at the child end
- Only seven fields to bind; **everything else lives in the Format pane**: layout, card size / radius / border, avatar, text sizes, colors, connectors
- Tolerant of messy data: managers with no row of their own, several roots, duplicated IDs and cycles

> Status: early version (1.0). It was written without a local build step, so expect small fixes — issues and pull requests are welcome.

## Data

Drop these fields into the visual:

| Field | Required | Notes |
|---|---|---|
| Employee ID | yes | Unique key of the row |
| Manager ID | yes | Empty (or equal to the employee) = top of the tree |
| Employee name | no | Falls back to the ID |
| Manager name | no | Used to name managers that have no row of their own |
| Card details | no | Any number of fields, one line each |
| Image URL | no | `https://` link to a photo; without it (or with an empty value) initials are shown |
| Card color | no | A CSS color such as `#64C8C8`; empty = default card color |

A sample is in [`sample/sample-data.csv`](sample/sample-data.csv). Preparing the source table is covered in [`docs/data-preparation.md`](docs/data-preparation.md).

## Get the `.pbiviz`

Every push runs the **Build visual** GitHub Action. Open the run and download the `org-tree-pbiviz` artifact, then in Power BI: *Visualizations → … → Import a visual from a file*.

## Develop

Requires Node.js 20.19+.

```bash
npm install
npm start          # dev server for the Power BI developer visual
npm run package    # creates dist/*.pbiviz
```

Layout:

```
src/orgModel.ts   flat rows -> forest (pure, no Power BI dependency)
src/settings.ts   format-pane settings
src/visual.ts     rendering (d3-hierarchy + SVG), interaction, selection
capabilities.json data roles and format-pane objects
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
