import { css, html } from 'lit-element/lit-element.js';
import { Localizer } from './locales/localizer';
import { MobxLitElement } from '@adobe/lit-mobx';
import { Tree } from './tree-filter';

/**
 * Class/interface that satisfies OuFilter API
 */
export class OuFilterDataManager {

	/**
	 * Fetches children of specified org unit. It's called only when Tree.isDynamic == true.
	 * @param {string} id - org unit id
	 * @param {string} bookmark
	 * @returns {Object} - { PagingInfo: { HasMoreItems: boolean, Bookmark: string }, Items: OrgUnitNode[] }. Fields indices are defined in tree-filter.js
	 */
	// eslint-disable-next-line no-unused-vars
	async fetchRelevantChildren(id, bookmark) {
		return { PagingInfo: {}, Items: [] };
	}

	/**
	 * Returns org units for the provided search string. It's called only when Tree.isDynamic == true.
	 * @param {string} searchString
	 * @param {string} bookmark
	 * @returns {Object} - { PagingInfo:{ HasMoreItems: boolean, Bookmark: string }, Items: OrgUnitNode[] }. Fields indices are defined in tree-filter.js
	 */
	// eslint-disable-next-line no-unused-vars
	async orgUnitSearch(searchString, bookmark) {
		return { PagingInfo: {}, Items: [] };
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
			dataManager: { type: Object, attribute: false },
			isSelectAllVisible: { type: Boolean, attribute: 'select-all-ui', reflect: true }
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
		this.isSelectAllVisible = false;
	}

	render() {
		this.dataManager.orgUnitTree.setAncestorFilter(this.dataManager.selectedSemesterIds);
		return html`
			<d2l-labs-tree-filter
				.tree="${this.dataManager.orgUnitTree}"
				opener-text="${this.localize('orgUnitFilter:nameAllSelected')}"
				opener-text-selected="${this.localize('orgUnitFilter:nameSomeSelected')}"
				?select-all-ui="${this.isSelectAllVisible}"
				@d2l-labs-tree-filter-select="${this._onChange}"
				@d2l-labs-tree-filter-request-children="${this._onRequestChildren}"
				@d2l-labs-tree-filter-search="${this._onSearch}"
			>
			</d2l-labs-tree-filter>`;
	}

	get selected() {
		return this.shadowRoot?.querySelector('d2l-labs-tree-filter')?.selected || [];
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
