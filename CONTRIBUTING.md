# Contributing

Thanks for helping! Bug reports, ideas and pull requests are all welcome.

## Ground rules
- **Never commit real data** (employee names, IDs, salaries, screenshots of real reports). Use the fake data in `sample/`.
- Keep the visual free of company-specific names or logic; everything must be configurable.
- Keep `src/orgModel.ts` free of Power BI/DOM imports so it stays easy to test.

## Workflow
1. Fork and create a branch (`feature/short-name`).
2. `npm install`, then `npm start` to try changes in the Power BI developer visual.
3. `npm run package` must succeed — the **Build visual** workflow runs it on every pull request.
4. Open a pull request describing the change and, for visual changes, add a screenshot made with the sample data.

## Ideas that would be welcome
- Unit tests for `buildForest` (cycles, duplicate IDs, missing managers)
- Horizontal layout option
- Tooltips using the Power BI tooltip service
- Dark-theme support and high-contrast mode
- Export to image
- Localization (pt-BR first)

## Reporting bugs
Include the Power BI version (Desktop or Service), what you dropped into each field, and, when possible, a small fake dataset that reproduces the problem.
