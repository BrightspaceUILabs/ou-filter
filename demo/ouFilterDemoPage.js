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
					@d2l-labs-ou-filter-change="${this._orgUnitFilterChange}"
				></d2l-labs-ou-filter>
			</div>
		`;
	}

	_orgUnitFilterChange(event) {
		event.stopPropagation();
		console.log(event.target.selected);
	}
}

customElements.define('d2l-labs-oufilter-demo-page', OuFilterDemoPage);
