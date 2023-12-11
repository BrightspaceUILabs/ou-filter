import '@brightspace-ui/core/components/inputs/input-search.js';

import { css, html } from 'lit';
import { DemoDataManager } from './demoDataManager.js';
import { MobxLitElement } from '@adobe/lit-mobx';
import { startsWithSearch } from '../tree-filter';

function parseHash(hash) {
	return hash.substring(1).split(';').reduce((acc, curr) => {
		const [key, val] = curr.split('=');
		acc.set(key, val);
		return acc;
	}, new Map());
}

/* eslint-disable no-console */
class OuFilterDemoPage extends MobxLitElement {

	static get styles() {
		return [
			css`
				:host {
					display: inline-block;
				}
				div {
					padding: 30px;
				}
				label {
					display: block;
					margin-top: 25px;
				}
			`
		];
	}

	constructor() {
		super();
		this.dataManager = new DemoDataManager();
	}

	connectedCallback() {
		super.connectedCallback();

		const hashMap = parseHash(window.location.hash);

		if (hashMap.has('dir')) {
			document.documentElement.setAttribute('dir', hashMap.get('dir'));
		}

		if (hashMap.has('search') && hashMap.get('search') === 'startswith') {
			this.dataManager = new DemoDataManager(startsWithSearch);
		}
	}

	firstUpdated() {
		this.dataManager.loadData();
	}

	render() {
		return html`
			<div>
				<d2l-labs-ou-filter
					.dataManager=${this.dataManager}
					select-all-ui
					@d2l-labs-ou-filter-change="${this._handleOrgUnitFilterChange}"
				></d2l-labs-ou-filter>
				<label for="org-unit-id-search">Test visibility modifiers: show only branches containing org unit ids</label>
				<d2l-input-search
					id="org-unit-id-search"
					label="Demo search input"
					@d2l-input-search-searched="${this._handleInputSearchChange}">
				</d2l-input-search>
			</div>
		`;
	}

	_handleOrgUnitFilterChange(event) {
		event.stopPropagation();
		console.log(event.target.selected);
	}

	_handleInputSearchChange(event) {
		const searchInput = event.detail.value;
		const visibilityModifierKey = 'searchInputFilter';
		if (!searchInput) {
			this.dataManager.orgUnitTree.removeVisibilityModifier(visibilityModifierKey);
			return;
		}

		// expect CSV of org unit ids
		const searchedOrgUnitIds = searchInput.split(',').map(orgUnitIdStr => Number(orgUnitIdStr));
		const tree = this.dataManager.orgUnitTree;

		// example: only load branches that contain any of the searched orgUnitIds
		tree.setVisibilityModifier(
			visibilityModifierKey,
			(id) => tree.hasDescendantsInList(id, searchedOrgUnitIds)
		);
	}
}

customElements.define('d2l-labs-oufilter-demo-page', OuFilterDemoPage);
