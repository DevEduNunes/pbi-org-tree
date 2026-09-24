# Preparing the data

The visual needs one row per employee with four core columns:

| Column | Example |
|---|---|
| Employee ID | `1004` |
| Employee name | `Diego Rocha` |
| Manager ID | `1002` |
| Manager name | `Bruno Lima` |

## Checklist

1. **One row per employee.** Deduplicate on Employee ID. If the source has history (several rows per person), keep only the current one. The visual keeps the first row it sees for a duplicated ID and ignores the rest.
2. **Same type on both ID columns.** Cast Employee ID and Manager ID to text so `1004` and `1004.0` do not end up as different keys.
3. **Top of the tree**: leave Manager ID empty (or equal to the employee's own ID). A manager who has no row of their own is still drawn, named from *Manager name*.
4. **No cycles.** If A reports to B and B reports to A the visual cuts the loop, but the data should be fixed at the source.
5. **Keep managers in the table** whenever possible: leaders that are also employees should have their own row, so their card can be selected and filtered.

## Power Query (M)

```m
let
    Source = /* your employee table */,
    Typed = Table.TransformColumns(Source, {
        {"EmployeeId", each Text.Trim(Text.From(_)), type text},
        {"ManagerId",  each if _ = null then "" else Text.Trim(Text.From(_)), type text}
    }),
    Distinct = Table.Distinct(Typed, {"EmployeeId"})
in
    Distinct
```

## Spark SQL (Fabric notebook / Lakehouse)

```sql
SELECT DISTINCT
    CAST(EmployeeId AS STRING) AS EmployeeId,
    EmployeeName,
    COALESCE(CAST(ManagerId AS STRING), '') AS ManagerId,
    ManagerName
FROM employees
```

## Optional columns

- **Card details**: add `Title`, `Department`, `Site`… as extra fields; each becomes one line on the card.
- **Card color**: any column with a CSS color. To highlight a rule, build the color in the model, for example in Power Query:

  ```m
  if [ValidationStatus] = "Remove" then "#FDE2E2" else ""
  ```

  Empty values keep the default card color (*Format → Colors*).
- **Image URL**: `https://` links to photos; people without one get initials.
