# Preparando os dados

[English](data-preparation.md) · **Português**

O visual precisa de uma linha por colaborador, com quatro colunas principais:

| Coluna | Exemplo |
|---|---|
| ID do colaborador | `1004` |
| Nome do colaborador | `Diego Rocha` |
| ID do gestor | `1002` |
| Nome do gestor | `Bruno Lima` |

## Checklist

1. **Uma linha por colaborador.** Remova duplicidades pelo ID do colaborador. Se a origem tiver histórico (várias linhas por pessoa), mantenha só a atual. Para um ID duplicado, o visual mantém a primeira linha e ignora as outras.
2. **Mesmo tipo nas duas colunas de ID.** Converta o ID do colaborador e o ID do gestor para texto, para `1004` e `1004.0` não virarem chaves diferentes.
3. **Topo da árvore:** deixe o ID do gestor vazio (ou igual ao ID da própria pessoa). Um gestor que não tem linha própria ainda é desenhado, com o nome vindo de *Manager name*. Se a sua origem usa um código como `0` para "sem gestor", dê um nome a ele (por exemplo "Sem gestor") ou esvazie o campo.
4. **Sem ciclos.** Se A reporta a B e B reporta a A, o visual corta o laço, mas o dado deve ser corrigido na origem.
5. **Mantenha os gestores na tabela** sempre que possível: líderes que também são colaboradores devem ter linha própria, para o card deles poder ser selecionado e filtrar o relatório.

## Power Query (M)

```m
let
    Source = /* sua tabela de colaboradores */,
    Typed = Table.TransformColumns(Source, {
        {"EmployeeId", each Text.Trim(Text.From(_)), type text},
        {"ManagerId",  each if _ = null then "" else Text.Trim(Text.From(_)), type text}
    }),
    Distinct = Table.Distinct(Typed, {"EmployeeId"})
in
    Distinct
```

## Spark SQL (notebook do Fabric / Lakehouse)

```sql
SELECT DISTINCT
    CAST(EmployeeId AS STRING) AS EmployeeId,
    EmployeeName,
    COALESCE(CAST(ManagerId AS STRING), '') AS ManagerId,
    ManagerName
FROM employees
```

## Colunas opcionais

- **Card details:** adicione `Cargo`, `Departamento`, `Filial`… como campos extras; cada um vira uma linha no card.
- **Card color:** qualquer coluna com uma cor CSS. Para destacar uma regra, monte a cor no modelo, por exemplo no Power Query:

  ```m
  if [Status] = "Remover" then "#FDE2E2" else ""
  ```

  Valores vazios mantêm a cor padrão do card (*Formatar → Cores*).
- **Image URL:** links `https://` ou a imagem em base64 (PNG/JPEG/GIF/WebP, com ou sem o prefixo `data:image/...;base64,`). Mantenha o texto abaixo de 32.766 caracteres (miniaturas de ~80×80 px). Quem não tem imagem fica com as iniciais.
