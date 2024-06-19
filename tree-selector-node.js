import '@brightspace-ui/core/components/icons/icon.js';
import '@brightspace-ui/core/components/inputs/input-checkbox';

import { css, html, LitElement, nothing } from 'lit';
import { Localizer } from './locales/localizer.js';
import { RtlMixin } from '@brightspace-ui/core/mixins/rtl-mixin.js';

/**
 * @property {string} name
 * @property {Number} dataId - returned in event.detail; caller should use this to update its model
 * @property {boolean} isOpen - whether the node is expanded (i.e. children are hidden unless true)
 * @property {string} selectedState - checkbox state: may be "explicit", "indeterminate", or "none"
 * @fires d2l-labs-tree-selector-node-select - user is requesting that this node be selected or deselected
 * @fires d2l-labs-tree-selector-node-open - user has requested that this node be expanded or collapsed
 *
 */
class TreeSelectorNode extends Localizer(RtlMixin(LitElement)) {
	static get properties() {
		return {
			name: { type: String },
			dataId: { type: Number, attribute: 'data-id' },
			isOpen: { type: Boolean, reflect: true, attribute: 'open' },
			selectedState: { type: String, reflect: true, attribute: 'selected-state' },
			isOpenable: { type: Boolean, reflect: true, attribute: 'openable' },
			// for screen readers
			indentLevel: { type: Number, attribute: 'indent-level' },
			parentName: { type: String, attribute: 'parent-name' },
			// for search: if isSearch, only search-result nodes are shown; the caller should ensure their ancestors are open
			isSearch: { type: Boolean, reflect: true, attribute: 'search' },
			isSearchResult: { type: Boolean, reflect: true, attribute: 'search-result' }
		};
	}

	static get styles() {
		return css`
			:host {
				display: block;
				font-size: 0.8rem;
			}
			:host([hidden]) {
				display: none;
			}

			.d2l-labs-tree-selector-node-node {
				display: flex;
				flex-wrap: nowrap;
				margin-bottom: 16px;
			}

			d2l-input-checkbox {
				display: inline-block;
			}

			.d2l-labs-tree-selector-node-open-control {
				cursor: default;
				margin-top: -3px;
			}
			.d2l-labs-tree-selector-node-open-control .d2l-labs-tree-selector-node-open {
				display: none;
			}
			.d2l-labs-tree-selector-node-open-control[open] .d2l-labs-tree-selector-node-open {
				display: inline-block;
			}
			.d2l-labs-tree-selector-node-open-control[open] .d2l-labs-tree-selector-node-closed {
				display: none;
			}

			.d2l-labs-tree-selector-node-subtree {
				margin-left: 34px;
				margin-right: 0;
			}
			:host([dir="rtl"]) .d2l-labs-tree-selector-node-subtree {
				margin-left: 0;
				margin-right: 34px;
			}
			.d2l-labs-tree-selector-node-subtree[hidden] {
				display: none;
			}

			.d2l-labs-tree-selector-node-text {
				cursor: default;
				display: inline-block;
				margin-left: 0.5rem;
				margin-right: 0.5rem;
				width: 100%;
			}
		`;
	}

	constructor() {
		super();

		this.isOpen = false;
		this.selectedState = 'none';
		this.indentLevel = 0;
	}

	/**
	 * @returns {Promise} - resolves when all tree-selector-nodes in slots, recursively, have finished updating
	 */
	get treeUpdateComplete() {
		return this._waitForTreeUpdateComplete();
	}

	render() {
		return html`
			${this._renderNode()}
			${this._renderSubtree()}
		`;
	}

	simulateArrowClick() {
		this._onArrowClick();
	}

	simulateCheckboxClick() {
		this.shadowRoot?.querySelector('d2l-input-checkbox').simulateClick();
	}

	get _arrowLabel() {
		return this.localize(
			this.isOpen ?
				'treeSelector:arrowLabel:open' :
				'treeSelector:arrowLabel:closed',
			{ name: this.name, level: this.indentLevel, parentName: this.parentName }
		);
	}

	get _showIndeterminate() {
		return this.selectedState === 'indeterminate';
	}

	get _showSelected() {
		return this.selectedState === 'explicit';
	}

	_onArrowClick() {
		if (!this.isOpenable) return;

		/**
		 * @event d2l-labs-tree-selector-node-open
		 */
		this.dispatchEvent(new CustomEvent(
			'd2l-labs-tree-selector-node-open',
			{
				bubbles: true,
				composed: false,
				detail: {
					id: this.dataId,
					isOpen: !this.isOpen
				}
			}
		));
	}

	_onChange(e) {
		/**
		 * @event d2l-labs-tree-selector-node-select
		 */
		this.dispatchEvent(new CustomEvent(
			'd2l-labs-tree-selector-node-select',
			{
				bubbles: true,
				composed: false,
				detail: {
					id: this.dataId,
					isSelected: e.target.checked
				}
			}
		));
	}

	_renderNode() {
		const label = this.parentName ?
			this.localize('treeSelector:node:ariaLabel', { name: this.name, parentName: this.parentName }) :
			this.name;

		return html`
			<div class="d2l-labs-tree-selector-node-node" ?search="${this.isSearch}" ?search-result="${this.isSearchResult}">
				<d2l-input-checkbox
					?checked="${this._showSelected}"
					?indeterminate="${this._showIndeterminate}"
					aria-label="${label}"
					@change="${this._onChange}"
				></d2l-input-checkbox>
				<span class="d2l-labs-tree-selector-node-text" @click="${this._onArrowClick}" aria-hidden="true">${this.name}</span>
				${this._renderOpenControl()}
			</div>
		`;
	}

	_renderOpenControl() {
		if (this.isOpenable) {
			return html`
				<a href="#" class="d2l-labs-tree-selector-node-open-control"
					?open="${this.isOpen}"
				 	@click="${this._onArrowClick}"
				 	aria-label="${this._arrowLabel}"
				 	aria-expanded="${this.isOpen}"
				 >
					<d2l-icon class="d2l-labs-tree-selector-node-closed" icon="tier1:arrow-expand"></d2l-icon>
					<d2l-icon class="d2l-labs-tree-selector-node-open" icon="tier1:arrow-collapse"></d2l-icon>
				</a>
			`;
		} else {
			return html`<span class="no-open-control"></span>`;
		}
	}

	_renderSubtree() {
		if (this.isOpenable) {
			return html`<div class="d2l-labs-tree-selector-node-subtree"
				?hidden="${!this.isOpen}"
				id="subtree"
			>
				<slot name="tree"></slot>
			</div>`;
		} else {
			return nothing;
		}
	}

	async _waitForTreeUpdateComplete() {
		await this.updateComplete;
		const slot = this.shadowRoot?.querySelector('slot');
		// to be sure all child nodes have been added, instead of using flatten,
		// we recursively walk down the tree, waiting for each node's update to complete
		if (slot) {
			const childNodes = slot.assignedNodes({ flatten: false });
			return Promise.all(childNodes.map(node => node.treeUpdateComplete));
		}
	}
}
customElements.define('d2l-labs-tree-selector-node', TreeSelectorNode);
