import '@brightspace-ui/core/components/inputs/input-search.js';

import { css, html } from 'lit-element/lit-element.js';
import { DemoDataManager } from './demoDataManager.js';
import { MobxLitElement } from '@adobe/lit-mobx';

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

	firstUpdated() {
		this.dataManager.loadData();
	}

	render() {
		return html`
			<div>
				<d2l-labs-ou-filter
					.dataManager=${this.dataManager}
					@d2l-labs-ou-filter-change="${this._handleOrgUnitFilterChange}"
				></d2l-labs-ou-filter>
				<label for="org-unit-id-search">Test visibility modifiers: show only branches containing org unit ids</label>
				<d2l-input-search
					id="org-unit-id-search"
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
		tree.addVisibilityModifier(
			visibilityModifierKey,
			(id) => tree.hasDescendantsInList(id, searchedOrgUnitIds)
		);
	}
}

customElements.define('d2l-labs-oufilter-demo-page', OuFilterDemoPage);
