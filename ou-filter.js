import { css, html } from 'lit-element/lit-element.js';
import { Localizer } from './locales/localizer';
import { MobxLitElement } from '@adobe/lit-mobx';
import { Tree } from './tree-filter';

/**
 * Class/interface that satisfies OuFilter API
 */
export class OuFilterDataManager {

	/**
	 * Fetches children of specified org unit
	 * @param {string} id - org unit id
	 * @param {string} bookmark
	 * @returns {Object} - { PagingInfo:{ HasMoreItems: boolean, Bookmark: string }, Items: [ [ID, NAME, TYPE, PARENTS, ACTIVE_STATUS]] }. Fields indices are defined in tree-filter.js
	 */
	// eslint-disable-next-line no-unused-vars
	async fetchRelevantChildren(id, bookmark) {
		return null;
	}

	/**
	 * Returns org units for the provided search string
	 * @param {string} searchString
	 * @param {string} bookmark
	 * @returns {Object} - { PagingInfo:{ HasMoreItems: boolean, Bookmark: string }, Items: [ [ID, NAME, TYPE, PARENTS, ACTIVE_STATUS]] }. Fields indices are defined in tree-filter.js
	 */
	// eslint-disable-next-line no-unused-vars
	async orgUnitSearch(searchString, bookmark) {
		return null;
	}

	/**
	 * Return instance of Tree declared in tree-filter.js
	 * NB. Implementation of this class/interface MUST make observable the variable that contains the instance of Tree class
	 */
	get orgUnitTree() {
		return new Tree({});
	}

	/**
	 * Applies semester filter if provided
	 */
	get selectedSemesterIds() {
		return [];
	}
}

/**
 * @property {Object} dataManager - an instance of OuFilterDataManager
 * @fires d2l-labs-ou-filter-change
 */
class OuFilter extends Localizer(MobxLitElement) {

	static get properties() {
		return {
			dataManager: { type: Object, attribute: false }
		};
	}

	static get styles() {
		return css`
			:host {
				display: inline-block;
			}
			:host([hidden]) {
				display: none;
			}
		`;
	}

	constructor() {
		super();
		this.dataManager = new OuFilterDataManager();
	}

	render() {
		this.dataManager.orgUnitTree.setAncestorFilter(this.dataManager.selectedSemesterIds);
		return html`
			<d2l-insights-tree-filter
				.tree="${this.dataManager.orgUnitTree}"
				opener-text="${this.localize('orgUnitFilter:nameAllSelected')}"
				opener-text-selected="${this.localize('orgUnitFilter:nameSomeSelected')}"
				@d2l-insights-tree-filter-select="${this._onChange}"
				@d2l-insights-tree-filter-request-children="${this._onRequestChildren}"
				@d2l-insights-tree-filter-search="${this._onSearch}"
			>
			</d2l-insights-tree-filter>`;
	}

	get selected() {
		return this.shadowRoot.querySelector('d2l-insights-tree-filter').selected;
	}

	_onChange() {
		/**
		 * @event d2l-labs-ou-filter-change
		 */
		this.dispatchEvent(new CustomEvent(
			'd2l-labs-ou-filter-change',
			{ bubbles: true, composed: false }
		));
	}

	async _onRequestChildren(event) {
		const el = event.target;
		const id = event.detail.id;
		const bookmark = event.detail.bookmark;
		const results = await this.dataManager.fetchRelevantChildren(id, bookmark);
		el.addChildren(id, results.Items, results.PagingInfo.HasMoreItems, results.PagingInfo.Bookmark);
	}

	async _onSearch(event) {
		const el = event.target;
		const searchString = event.detail.searchString;
		const bookmark = event.detail.bookmark;
		const results = await this.dataManager.orgUnitSearch(searchString, bookmark);
		el.addSearchResults(results.Items, results.PagingInfo.HasMoreItems, results.PagingInfo.Bookmark);
	}
}
customElements.define('d2l-labs-ou-filter', OuFilter);
