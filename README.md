# d2l-labs-ou-filter

[![ci](https://github.com/BrightspaceUILabs/ou-filter/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/BrightspaceUILabs/ou-filter/actions/workflows/ci.yml)

A Lit component that renders org unit structure tree. It supports load more and searching functionality.

> Note: this is a ["labs" component](https://daylight.d2l.dev/developing/getting-started/component-tiers/). While functional, these tasks are prerequisites to promotion to BrightspaceUI "official" status:
>
> - [ ] [Design organization buy-in](https://daylight.d2l.dev/developing/creating-component/before-building/#working-with-design)
> - [ ] [Architectural sign-off](https://daylight.d2l.dev/developing/creating-component/before-building/#web-component-architecture)
> - [x] [Continuous integration](https://daylight.d2l.dev/developing/testing/tools/#continuous-integration)
> - [x] [Cross-browser testing](https://daylight.d2l.dev/developing/testing/cross-browser/)
> - [x] [Unit tests](https://daylight.d2l.dev/developing/testing/tools/) (if applicable)
> - [x] [Accessibility tests](https://daylight.d2l.dev/developing/testing/accessibility/)
> - [x] [Visual diff tests](https://daylight.d2l.dev/developing/testing/visual-difference/)
> - [x] Localization with Serge (if applicable)
> - [x] Demo page
> - [x] README documentation

## Screenshot

![Org unit filter component](./test/visual-diff/screenshots/ci/golden/ou-filter/ou-filter-Desktop.png?raw=true)

## Usage

```js
import { action, decorate, observable } from 'mobx';
import { MobxLitElement } from '@adobe/lit-mobx';
import { OuFilterDataManager } from '@brightspace-ui-labs/ou-filter/ou-filter.js';

class FooDataManager extends OuFilterDataManager {

	constructor() {
		super();
		this._orgUnitTree = new Tree({});
	}

	async loadData() {
		this._orgUnitTree = new Tree({ nodes: ..., ... });
	}
}

decorate(FooDataManager, {
	_orgUnitTree: observable,
	loadData: action
});

class FooPage extends MobxLitElement {
  constructor() {
    this.dataManager = new FooDataManager();
  }

  firstUpdated() {
    this.dataManager.loadData();
  }

  render () {
    return html`<d2l-labs-ou-filter
        .dataManager=${this.dataManager}
        select-all-ui
        @d2l-labs-ou-filter-change="${this._orgUnitFilterChange}"
      ></d2l-labs-ou-filter>`;
  }

  _orgUnitFilterChange() {
    console.log(event.target.selected);
  }
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| dataManager | Object | {empty} | Object that extends OuFilterDataManager. It provides and manages data for d2l-labs-ou-filter |
| select-all-ui | Boolean | {empty} | Shows Select all button |
| d2l-labs-ou-filter-change | Function | {empty} | Event handler that is fired when selection is changed |

## Developing, Testing and Contributing

After cloning the repo, run `npm install` to install dependencies.

### Running the demos

To start a [@web/dev-server](https://modern-web.dev/docs/dev-server/overview/) that hosts the demo page and tests:

```shell
npm start
```

### Linting

```shell
# eslint and lit-analyzer
npm run lint

# eslint only
npm run lint:eslint

# lit-analyzer only
npm run lint:lit
```

### Testing

```shell
# lint, unit test and visual-diff test
npm test

# lint only
npm run lint

# unit tests only
npm run test:headless

# debug or run a subset of local unit tests
# then navigate to `http://localhost:9876/debug.html`
npm run test:headless:watch
```

### Visual Diff Testing

This repo uses the [@brightspace-ui/visual-diff utility](https://github.com/BrightspaceUI/visual-diff/) to compare current snapshots against a set of golden snapshots stored in source control.

The golden snapshots in source control must be updated by the [visual-diff GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/visual-diff).  If a pull request results in visual differences, a draft pull request with the new goldens will automatically be opened against its branch.

To run the tests locally to help troubleshoot or develop new tests, first install these dependencies:

```shell
npm install @brightspace-ui/visual-diff@X mocha@Y puppeteer@Z  --no-save
```

Replace `X`, `Y` and `Z` with [the current versions](https://github.com/BrightspaceUI/actions/tree/main/visual-diff#current-dependency-versions) the action is using.

Then run the tests:

```shell
# run visual-diff tests
npx mocha './test/**/*.visual-diff.js' -t 10000
# subset of visual-diff tests:
npx mocha './test/**/*.visual-diff.js' -t 10000 -g some-pattern
# update visual-diff goldens
npx mocha './test/**/*.visual-diff.js' -t 10000 --golden
```

### Versioning and Releasing

This repo is configured to use `semantic-release`. Commits prefixed with `fix:` and `feat:` will trigger patch and minor releases when merged to `main`.

To learn how to create major releases and release from maintenance branches, refer to the [semantic-release GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/semantic-release) documentation.
