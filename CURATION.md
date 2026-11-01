# Curated plugins

The `dsh-kit` organization maintains a small, reviewed list of plugins built with this template. The list is
curated, not a marketplace: the goal is that every entry is safe to install and possible to maintain.

## Criteria

- Generated from `create-dsh-kit` (or a documented, reviewable fork of the template).
- Its own documentation site with install, usage and reference pages; README alone is not enough.
- Green CI: type check, tests, build, artifact check and secret scan.
- A release in the last six months and a named maintainer who responds to issues.
- No undocumented DSH APIs, no telemetry without explicit opt-in, and no destructive default.
- Local data paths and permissions documented; destructive actions reversible or explicitly labelled.
- MIT (or a compatible OSI license) and a complete `package.json`.

## Applying

Open a **Plugin application** issue in this repository with:

- repository and documentation URLs;
- the DSH version you tested;
- the commands that prove the artifact works;
- maintenance plan and known limitations.

A maintainer reviews the plugin and either lists it, asks for changes, or declines with a reason.

## After listing

- Keep the docs site and release notes current.
- Open a pull request here when the docs URL or install command changes.
- A plugin is removed from the list after six months without a release or response, or on a security report.

## Listing format

Each entry lives on the [Plugins](docs/plugins/index.md) page and links to the plugin's **own** documentation,
not to this site.
