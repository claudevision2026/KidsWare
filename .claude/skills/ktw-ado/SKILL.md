---
name: ktw-ado
description: Manage Azure DevOps work items for KTW (org "claudevision2026", project "KidsWare") — create/assign/update Epics, Features, and Tasks, keep them linked to specs/*.md, and pull a specific work item to implement against the codebase. Use when asked to create, list, assign, re-estimate, or update ADO work items, to turn a spec into work items, or to "work on task #<id>" / "what's next in the backlog".
---

KTW's Azure DevOps org/project is `claudevision2026` / `KidsWare`
(`https://dev.azure.com/claudevision2026/KidsWare`), reached via the `azure-devops` MCP server
(`mcp__azure-devops__*` tools). This project uses a spec-driven flow: `specs/*.md` at the repo root
is the detailed design doc for a feature area; ADO work items are the tracked, assignable,
estimable units of work that reference those specs rather than duplicating their content.

## 0. Always check access first

The MCP server authenticates via a cached identity that has, in the past, not been a member of
this org. Before anything else in a session, run one cheap call:

```
mcp__azure-devops__core_list_projects (projectNameFilter: "KidsWare")
```

If it fails with `TF400813` ("not authorized"), **stop and tell the user** — this is an org
membership issue they must fix at `https://dev.azure.com/claudevision2026/_settings/users`
(add the signed-in identity, grant it at least Contributor on `KidsWare`). Do not retry with
different tool calls; retrying doesn't change identity/permissions.

## 1. Discover the real field/type/state names before writing anything

Never hardcode Azure DevOps field reference names — they depend on the process template
(Basic/Agile/Scrum/CMMI) chosen when the project was created, and this project's template hasn't
been verified. Before the *first* create/update in a session:

```
mcp__azure-devops__wit_get_work_item_type (project: "KidsWare", workItemType: "Epic" | "Feature" | "Task")
```

This returns the valid states and fields (including whatever the effort/estimate field is
actually called — e.g. `Microsoft.VSTS.Scheduling.Effort`, `...StoryPoints`, or
`...RemainingWork` depending on template). Cache what you learn for the rest of the session
instead of re-querying every call. If `Feature` or `Task` don't exist under those exact names,
list the project's process via the returned error / `wit_get_work_item_type` on `WorkItemTypes`
and use the closest equivalents (e.g. Basic process calls the mid-tier "Issue" — treat it as
"Feature" per the user's chosen hierarchy: **Epic → Feature → Task**).

## 2. Hierarchy convention

- **Epic** — one per `specs/NN-*.md` file (e.g. `specs/05-user-addresses.md` → Epic "User
  Addresses & Admin Order Auto-Provisioning"). Description links the spec path.
- **Feature** — one per major `##` section within that spec, or per cohesive sub-capability if
  the work didn't start from a spec.
- **Task** — a concrete, implementable unit (roughly one PR's worth). This is the leaf level
  people get assigned and estimate effort on.

Link children to parents with:
```
mcp__azure-devops__wit_add_child_work_items   (or wit_work_items_link with relation "System.LinkTypes.Hierarchy-Reverse"/"-Forward")
```

## 3. CRUD recipes

**Create** (`wit_create_work_item`): set `System.Title`, `System.Description` (for a Task
generated from a spec, quote the relevant spec paragraph and link the file path), and parent it
immediately rather than leaving it orphaned.

**Assign** (`wit_update_work_item`): set `System.AssignedTo` to the person's email/UPN. Ask the
user for the UPN if unknown — don't guess an email format.

**Change effort/estimate** (`wit_update_work_item`): set whatever field `wit_get_work_item_type`
told you is the effort field for that work item type (step 1). Don't assume it's the same field
name across Epic/Feature/Task.

**List/query** (`wit_query_by_wiql`): scope every query to the project and, usually, area/state:
```sql
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
FROM WorkItems
WHERE [System.TeamProject] = 'KidsWare' AND [System.WorkItemType] = 'Task'
  AND [System.State] <> 'Closed'
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
```
Use `mcp__azure-devops__wit_my_work_items` for "what's assigned to me" instead of hand-rolling
that WIQL.

**Read one** (`wit_get_work_item`): pull full details (description, parent, state, effort) before
implementing anything against it.

## 4. Spec ↔ work item sync

- **Spec exists, work items don't yet**: read the spec, propose the Epic/Feature/Task breakdown
  to the user before creating anything (specs here are dense — e.g. `05-user-addresses.md` covers
  four distinct capabilities in one file; don't flatten it into one Task).
- **Work item created directly in ADO with no spec backing it**: that's fine for small tasks. If
  the resulting change is non-trivial (new table, new endpoint, new cross-cutting behavior), write
  or extend a `specs/*.md` file as part of the implementation, matching this repo's existing
  numbered-file convention — link the work item's description to the new/updated spec path
  afterward so future readers can find both directions.
- Don't let the two drift silently: if implementing a task changes scope from what the spec says,
  update the spec in the same change, and note the delta in the work item comment.

## 5. Implementing a work item

1. `wit_get_work_item` the Task (and its parent Feature/Epic for context) — read description,
   acceptance criteria, and any linked spec.
2. Read `CLAUDE.md` and the relevant `specs/*.md` file(s) for conventions.
3. Implement using the `backend-api` / `frontend-ui` agents as the work touches `backend/` /
   `frontend/` (see root `CLAUDE.md` for the split) — don't do cross-cutting backend+frontend work
   in a single agent call, delegate each side to its agent.
4. Verify (run the app / relevant checks — see `run-ktw` skill) before marking anything done.
5. Update the work item: `wit_update_work_item` to move state forward (use the state names from
   step 1, not a guess), `wit_add_work_item_comment` summarizing what changed, and — once a
   commit/PR exists — `wit_link_work_item_to_pull_request` or `wit_add_artifact_link` so the work
   item and the code stay traceable to each other.

## Gotchas

- `TF400813` from any `mcp__azure-devops__*` call means an auth/membership problem, not a bad
  query — see step 0. Don't debug your WIQL/payload first.
- Field reference names are process-template-specific — see step 1. A field name that worked in
  a different Azure DevOps project may not exist here.
- Work item descriptions support HTML, not Markdown — Azure DevOps renders `System.Description`
  as rich HTML. Wrap code/paths in `<code>` rather than backticks if formatting matters.
