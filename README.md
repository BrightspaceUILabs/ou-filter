# d2l-labs-ou-filter

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
| disabled | Boolean | {empty} | Render the filter in a disabled state |

## Developing and Contributing

After cloning the repo, run `npm install` to install dependencies.

### Testing

To run the full suite of tests:

```shell
npm test
```

Alternatively, tests can be selectively run:

```shell
# eslint
npm run lint:eslint

# stylelint
npm run lint:style

# unit tests
npm run test:unit
```

This repo uses [@brightspace-ui/testing](https://github.com/BrightspaceUI/testing)'s vdiff command to perform visual regression testing:

```shell
# vdiff
npm run test:vdiff

# re-generate goldens
npm run test:vdiff golden
```

### Running the demos

To start a [@web/dev-server](https://modern-web.dev/docs/dev-server/overview/) that hosts the demo page and tests:

```shell
npm start
```

### Versioning and Releasing

This repo is configured to use `semantic-release`. Commits prefixed with `fix:` and `feat:` will trigger patch and minor releases when merged to `main`.

To learn how to create major releases and release from maintenance branches, refer to the [semantic-release GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/semantic-release) documentation.
