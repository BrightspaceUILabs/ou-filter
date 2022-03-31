import '@brightspace-ui/core/components/loading-spinner/loading-spinner.js';
import './tree-selector.js';

import 'array-flat-polyfill';
import { action, computed, decorate, observable } from 'mobx';
import { css, html } from 'lit-element/lit-element.js';
import { Localizer } from './locales/localizer';
import { MobxLitElement } from '@adobe/lit-mobx';

// node array indices
export const COURSE_OFFERING = 3;

/**
 * An object that represents org unit node
 * @typedef {Object} OrgUnitNode
 * @property {number} Id
 * @property {string} Name
 * @property {number} Type
 * @property {number[]} Parents - array of org unit ids
 * @property {boolean} IsActive - optional, should be populated if accessed via Tree.isActive property
*/

export class Tree {
	/**
	 * Type to use as the .tree property of a d2l-labs-tree-filter. Mutator methods will
	 * trigger re-rendering as needed. Call as new Tree({}) for a default empty tree.
	 * NB: this is actually a DAG, not a tree. :)
	 * @param {OrgUnitNode[]} [nodes=[]] - Array of OrgUnitNode
	 * @param {Number[]} [leafTypes=[]] - TYPE values that cannot be opened
	 * @param {Number[]} [invisibleTypes=[]] - TYPE values that should not be rendered
	 * @param {Number[]} [selectedIds] - ids to mark selected. Ancestors and descendants will be marked accordingly.
	 * @param {Number[]} [ancestorIds] - same as if passed to setAncestorFilter
	 * @param {Tree} [oldTree] - tree to copy previous state from (e.g. which nodes are open)
	 * @param {Boolean} isDynamic - if true, the tree is assumed to be incomplete, and tree-filter will fire events as needed
	 * to request children
	 * @param {Map}[extraChildren] - Map from parent node ids to arrays of
	 * {Items: OrgUnitNode[], PagingInfo: {HasMoreItems: boolean, Bookmark}}; these will be added to the tree before
	 * any selections are applied and the parents marked as populated. Useful for adding cached lookups to a dynamic tree.
	 * @param visibilityModifiers - optional kvp where values are functions that map an orgUnitId to a boolean indicating visibility
	 */
	constructor({
		nodes = [],
		leafTypes = [],
		invisibleTypes = [],
		selectedIds,
		ancestorIds,
		oldTree,
		isDynamic = false,
		extraChildren,
		visibilityModifiers = {}
	}) {
		this.leafTypes = leafTypes;
		this.invisibleTypes = invisibleTypes;
		this.initialSelectedIds = selectedIds;
		this._nodes = new Map(nodes.map(x => [x.Id, x]));
		this._children = new Map();
		this._ancestors = new Map();
		this._state = new Map();
		this._open = oldTree ? new Set(oldTree.open) : new Set();
		// null for no filter, vs. empty Set() when none match
		this._visible = null;
		this._populated = isDynamic ? new Set() : null;

		// for dynamic trees; see addNodes
		this._loading = new Set();
		this._hasMore = new Set();
		this._bookmarks = new Map();

		this._visibilityModifiers = visibilityModifiers;

		// fill in children (parents are provided by the caller, and ancestors will be generated on demand)
		this._updateChildren(this.ids);

		if (extraChildren) {
			extraChildren.forEach((data, orgUnitId) => {
				this.addNodes(orgUnitId, data.Items, data.PagingInfo.HasMoreItems, data.PagingInfo.Bookmark);
			});
		}

		if (selectedIds) {
			this.select(selectedIds);
		}

		if (ancestorIds) {
			this.setAncestorFilter(ancestorIds);
		}
	}

	get ids() {
		return [...this._nodes.keys()];
	}

	get isDynamic() {
		return !!this._populated;
	}

	get open() {
		return [...this._open];
	}

	get rootId() {
		if (!this._rootId) {
			this._rootId = this.ids.find(x => this._isRoot(x));
		}
		return this._rootId;
	}

	get selected() {
		// if selections are set before any nodes are populated, this getter should still work
		if (this._nodes.size === 0) {
			return [...this._state]
				.filter(([, state]) => state === 'explicit')
				.map(([id]) => id);
		}

		// if there are nodes, only return the root of each selected subtree
		return this._getSelected(this.rootId);
	}

	get allSelectedCourses() {
		const selected = [...this._state]
			.filter(([, state]) => state === 'explicit')
			.map(([id]) => id);
		return selected.filter(id => this.getType(id) === 3);
	}

	set selected(ids) {
		this.clearSelection();
		this.select(ids);
	}

	/**
	 * Adds nodes as children of the given parent. New nodes will be selected if the parent is.
	 * The parents of the new nodes will be set to the given parent plus any previous parents (if the node
	 * was already in the tree). The new nodes are assumed to match the ancestorFilter, if any;
	 * future changes to that filter are not supported (i.e. it is assumed the caller will reload data
	 * and create a new tree in that case). See also note on setAncestorFilter().
	 * @param {number} parentId The parent of the new nodes. The new nodes supplement any existing children.
	 * @param newChildren Array of nodes to be added to the tree; name and type will be updated if the id already exists.
	 * @param hasMore - if true, the node is not considered fully populated
	 * @param bookmark - Opaque data that will be stored with the parent if hasMore is true (or cleared if hasMore is falsy)
	 */
	addNodes(parentId, newChildren, hasMore, bookmark) {
		this._loading.delete(parentId);

		if (hasMore) {
			this._hasMore.add(parentId);
			this._bookmarks.set(parentId, bookmark);
		} else {
			this._hasMore.delete(parentId);
			this._bookmarks.delete(parentId);
		}

		// add parentId to any existing parents of these nodes (before replacing the nodes and losing this info)
		newChildren.forEach(x => {
			const existingParents = this.getParentIds(x.Id);
			const allParents = new Set([parentId, ...existingParents]);
			x.Parents = [...allParents];
		});
		newChildren.forEach(x => this._nodes.set(x.Id, x));

		// merge the new children in to the parent
		this._children.set(parentId, new Set([...newChildren.map(x => x.Id), ...this.getChildIds(parentId)]));

		// caller should only provide visible nodes
		if (this._visible) {
			newChildren.forEach(x => this._visible.add(x.Id));
		}
		if (this.getState(parentId) === 'explicit') {
			newChildren.forEach(x => this._state.set(x.Id, 'explicit'));
		}

		// Ancestors may need updating: if one or more of newChildren was already present (due to
		// being added under another parent), then they may also have been opened and have descendants,
		// which now need a new ancestor.
		// For simplicity and correctness, we simply reset the ancestors map, which will be
		// regenerated as needed by getAncestorIds.
		this._ancestors = new Map();

		if (this._populated) {
			this._populated.add(parentId);
		}
	}

	/**
	 * Merges the given nodes into the tree.
	 * @param {[][]} [nodes=[]] - Array of arrays, including all ancestors up to root, in the same format as for the constructor
	 */
	addTree(nodes) {
		nodes.forEach(x => this._nodes.set(x.Id, x));

		// invariant: the tree must always contain all ancestors of all nodes.
		// This means existing nodes cannot be new children of any node: we only need to update children for parents of new nodes.
		this._updateChildren(nodes.map(x => x.Id));

		// Set selected state for ancestors and descendants if a new node should be selected because its
		// parent is.
		// This could perform poorly if the tree being merged in is large and deep, but in the expected use case
		// (search with load more), we should only be adding a handful of nodes at a time.
		nodes.forEach(node => {
			if (node.Parents.some(parentId => this.getState(parentId) === 'explicit')) {
				this.setSelected(node.Id, true);
			}
		});

		// caller should only provide visible nodes
		if (this._visible) {
			nodes.forEach(x => this._visible.add(x.Id));
		}

		// refresh ancestors
		this._ancestors = new Map();
	}

	clearSelection() {
		this._state.clear();
	}

	selectAll() {
		this.selected = this.ids;
	}

	getAncestorIds(id) {
		if (id === 0) return new Set();

		if (!this._ancestors.has(id)) {
			const ancestors = new Set([
				id,
				...this.getParentIds(id).flatMap(x => [...this.getAncestorIds(x)])
			]);
			this._ancestors.set(id, ancestors);
		}

		return this._ancestors.get(id);
	}

	getBookmark(id) {
		return this._bookmarks.get(id);
	}

	getChildIdsForDisplay(id, pruning) {
		const children = this.getChildIds(id).filter(x => this._isVisible(x));

		const isPruning = !this.isDynamic
			&& (pruning || this._isRoot(id))
			&& children.length === 1
			&& this.getType(children[0]) !== COURSE_OFFERING;
		if (isPruning) return this.getChildIdsForDisplay(children[0], true);

		return children.sort((a, b) => this._nameForSort(a).localeCompare(this._nameForSort(b)));
	}

	getChildIds(id) {
		if (!id) id = this.rootId;
		if (!id) return [];
		const children = this._children.get(id);
		return children ? [...children] : [];
	}

	getMatchingIds(searchString) {
		return this.ids
			.filter(x => this._isVisible(x))
			.filter(x => !this._isRoot(x) && this._nameForSort(x).toLowerCase().includes(searchString.toLowerCase()))
			// reverse order by id so the order is consistent and (most likely) newer items are on top
			.sort((x, y) => y - x);
	}

	getName(id) {
		const node = this._nodes.get(id);
		return (node && node.Name) || '';
	}

	getParentIds(id) {
		const node = this._nodes.get(id);
		return (node && node.Parents) || [];
	}

	getState(id) {
		return this._state.get(id) || 'none';
	}

	getType(id) {
		const node = this._nodes.get(id);
		return (node && node.Type) || 0;
	}

	isActive(id) {
		const node = this._nodes.get(id);
		return (node && node.IsActive) || false;
	}

	/**
	 * Checks if a node has ancestors in a given list.
	 * NB: returns true if an id is itself is in the list to check
	 * @param {Number} id - the node whose ancestors we want to check
	 * @param {[Number]} listToCheck - an array of node ids which potentially has ancestors in it
	 * @returns {boolean}
	 */
	hasAncestorsInList(id, listToCheck) {
		const ancestorsSet = this.getAncestorIds(id);

		return listToCheck.some(potentialAncestor => ancestorsSet.has(potentialAncestor));
	}

	/**
	 * NB: for the purposes of this function, a node is its own descendant
	 * @param {Number} id
	 * @returns {Set<Number>}
	 */
	getDescendantIds(id) {
		const children = this._children.get(id);
		if (!children || !children.size) {
			return new Set([id]);
		}

		const descendants = new Set([...children].flatMap(child => [...this.getDescendantIds(child)]));
		descendants.add(id);
		return descendants;
	}

	/**
	 * NB: returns true if an id is itself is in the list to check
	 * @param {Number} id
	 * @param {[Number]} listToCheck
	 * @returns {boolean}
	 */
	hasDescendantsInList(id, listToCheck) {
		const descendants = this.getDescendantIds(id);
		const listToCheckUnique = [...new Set(listToCheck)];
		return listToCheckUnique.some(potentialDescendant => descendants.has(potentialDescendant));
	}

	hasMore(id) {
		return this._hasMore.has(id);
	}

	isLoading(id) {
		return this._loading.has(id);
	}

	isOpen(id) {
		return this._open.has(id);
	}

	isOpenable(id) {
		return !this.leafTypes.includes(this.getType(id));
	}

	/**
	 * True iff the children of id are known (even if there are zero children).
	 * @param id
	 * @returns {boolean}
	 */
	isPopulated(id) {
		return !this._populated || this._populated.has(id);
	}

	select(ids) {
		ids.forEach(x => this.setSelected(x, true));
	}

	/**
	 * Filters the visible tree to nodes which are ancestors of nodes descended from the given ids
	 * (a node is its own ancestor).
	 * NB: ignored if the tree is dynamic, so that dynamically loaded partial trees don't get
	 * hidden due to missing information. It is expected that dynamic trees only include visible
	 * nodes, and that the tree will be replaced if the ancestor filter should change.
	 * @param {Number[]} ancestorIds
	 */
	setAncestorFilter(ancestorIds) {
		if (this.isDynamic) return;

		if (!ancestorIds || ancestorIds.length === 0) {
			this._visible = null;
			return;
		}

		this._visible = new Set();

		this.ids.forEach(id => {
			if (this.hasAncestorsInList(id, ancestorIds)) {
				this._visible.add(id);
				this.getAncestorIds(id).forEach(ancestorId => this._visible.add(ancestorId));
			}
		});
	}

	setLoading(id) {
		this._loading.add(id);
	}

	setOpen(id, isOpen) {
		if (isOpen) {
			this._open.add(id);
		} else {
			this._open.delete(id);
		}
	}

	setSelected(id, isSelected) {
		// clicking on a node either fully selects or fully deselects its entire subtree
		this._setSubtreeSelected(id, isSelected);

		// parents may now be in any state, depending on siblings
		this.getParentIds(id).forEach(parentId => this._updateSelected(parentId));
	}

	_getSelected(id) {
		const state = this.getState(id);

		if (state === 'explicit') return [id];

		if (state === 'indeterminate' || this._isRoot(id)) {
			return this.getChildIds(id).flatMap(childId => this._getSelected(childId));
		}

		return [];
	}

	_isRoot(id) {
		return this.getParentIds(id).includes(0);
	}

	_isVisible(id) {
		const visible = (this._visible === null || this._visible.has(id))
			&& !this.invisibleTypes.includes(this.getType(id));

		return visible && Object.values(this._visibilityModifiers).every(modifier => modifier(id)); // every returns true if the array is empty
	}

	setVisibilityModifier(key, visibilityModFn) {
		const modifiersCopy = { ...this._visibilityModifiers };
		modifiersCopy[key] = visibilityModFn;
		this._visibilityModifiers = modifiersCopy;
	}

	removeVisibilityModifier(key) {
		this._visibilityModifiers = Object.fromEntries(Object.entries(this._visibilityModifiers).filter(kvp => kvp[0] !== key));
	}

	_nameForSort(id) {
		return this.getName(id) + id;
	}

	_setSubtreeSelected(id, isSelected) {
		if (isSelected) {
			this._state.set(id, 'explicit');
		} else {
			this._state.delete(id);
		}

		this.getChildIds(id).forEach(childId => this._setSubtreeSelected(childId, isSelected));
	}

	_updateChildren(ids) {
		ids.forEach(id => {
			this.getParentIds(id).forEach(parentId => {
				if (this._children.has(parentId)) {
					this._children.get(parentId).add(id);
				} else {
					this._children.set(parentId, new Set([id]));
				}
			});
		});
	}

	_updateSelected(id) {
		// never select the root (user can clear the selection instead)
		if (this._isRoot(id)) return;

		// don't select invisible node types
		if (this.invisibleTypes.includes(this.getType(id))) return;

		// Only consider children of visible types: this node is selected if all potentially visible children are
		// Note that if this node hasn't been populated, we don't know if all children are selected,
		// so it is indeterminate at most.
		const childIds = this.getChildIds(id).filter(x => !this.invisibleTypes.includes(this.getType(x)));
		const state = (this.isPopulated(id) && !this.hasMore(id) && childIds.every(childId => this.getState(childId) === 'explicit'))
			? 'explicit'
			: childIds.every(childId => this.getState(childId) === 'none')
				? 'none'
				: 'indeterminate' ;

		if (state === 'none') {
			this._state.delete(id);
		} else {
			this._state.set(id, state);
		}

		this.getParentIds(id).forEach(x => this._updateSelected(x));
	}
}

decorate(Tree, {
	_nodes: observable,
	_children: observable,
	_ancestors: observable,
	_state: observable,
	_open: observable,
	_visible: observable,
	_populated: observable,
	_loading: observable,
	_bookmarks: observable,
	_hasMore: observable,
	_visibilityModifiers: observable,
	selected: computed,
	allSelectedCourses: computed,
	addNodes: action,
	clearSelection: action,
	selectAll: action,
	select: action,
	setAncestorFilter: action,
	setLoading: action,
	setOpen: action,
	setSelected: action
});

/**
 * This is an opinionated wrapper around d2l-labs-tree-selector which maintains state
 * in the above Tree class.
 * @property {Object} tree - a Tree (defined above)
 * @property {String} openerText - appears on the dropdown opener if no items are selected
 * @property {String} openerTextSelected - appears on the dropdown opener if one or more items are selected
 * @fires d2l-labs-tree-filter-select - selection has changed; selected property of this element is the list of selected ids
 * @fires d2l-labs-tree-filter-request-children - (dynamic tree only) owner should call tree.addNodes with children of event.detail.id
 * @fires d2l-labs-tree-filter-search - (dynamic tree only) owner may call this.addSearchResults with nodes and ancestors matching
 * event.detail.searchString and event.detail.bookmark (arbitrary data previously passed to this.addSearchResults)
 */
class TreeFilter extends Localizer(MobxLitElement) {

	static get properties() {
		return {
			tree: { type: Object, attribute: false },
			openerText: { type: String, attribute: 'opener-text' },
			openerTextSelected: { type: String, attribute: 'opener-text-selected' },
			searchString: { type: String, attribute: 'search-string', reflect: true },
			isLoadMoreSearch: { type: Boolean, attribute: 'load-more-search', reflect: true },
			isSelectAllVisible: { type: Boolean, attribute: 'select-all-ui', reflect: true },
			_isLoadingSearch: { type: Boolean, attribute: false }
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

			d2l-button.d2l-tree-load-more {
				padding-bottom: 12px;
			}
		`;
	}

	constructor() {
		super();

		this.openerText = 'MISSING NAME';
		this.openerTextSelected = 'MISSING NAME';
		this.searchString = '';
		this.isLoadMoreSearch = false;
		this.isSelectAllVisible = false;

		this._needResize = false;
		this._searchBookmark = null;
	}

	get selected() {
		return this.tree.selected;
	}

	/**
	 * @returns {Promise} - resolves when all tree-selector-nodes, recursively, have finished updating
	 */
	get treeUpdateComplete() {
		return this.updateComplete.then(() => this.shadowRoot?.querySelector('d2l-labs-tree-selector').treeUpdateComplete || false);
	}

	/**
	 * Adds the given children to the given parent. See Tree.addNodes().
	 * @param parent
	 * @param children
	 * @param hasMore - Will display a "load more" button in the tree if true
	 * @param bookmark - Opaque data that will be sent in the request-children event if the user asks to load more results
	 */
	addChildren(parent, children, hasMore, bookmark) {
		this._needResize = true;
		this.tree.addNodes(parent, children, hasMore, bookmark);
	}

	/**
	 * Merges the given nodes into the tree and may display a load more control.
	 * @param {[][]} [nodes=[]] - Array of arrays, including all ancestors up to root, in the same format as for the constructor
	 * @param {Boolean}hasMore - Will display a "load more" button in the search if true
	 * @param {Object}bookmark - Opaque data that will be sent in the search event if the user asks to load more results
	 */
	addSearchResults(nodes, hasMore, bookmark) {
		this._needResize = true;
		this.tree.addTree(nodes);
		this.isLoadMoreSearch = hasMore;
		this._searchBookmark = bookmark;
		this._isLoadingSearch = false;
	}

	render() {
		// if selections are applied when loading from server but the selected ids were truncated out of the results,
		// the visible selections in the UI (this.tree.selected) could be empty even though selections are applied.
		// In that case, we should indicate to the user that selections are applied, even if they can't see them.
		const isSelected = (this.tree.selected.length || (this.tree.initialSelectedIds && this.tree.initialSelectedIds.length));
		const openerText = isSelected ? this.openerTextSelected : this.openerText;

		return html`<d2l-labs-tree-selector
				name="${openerText}"
				?search="${this._isSearch}"
				?selected="${isSelected}"
				?select-all-ui="${this.isSelectAllVisible}"
				@d2l-labs-tree-selector-search="${this._onSearch}"
				@d2l-labs-tree-selector-clear="${this._onClear}"
				@d2l-labs-tree-selector-select-all="${this._onSelectAll}"
			>
				${this._renderSearchResults()}
				${this._renderSearchLoadingControls()}
				${this._renderChildren(this.tree.rootId)}
			</d2l-labs-tree-selector>
		</div>`;
	}

	async resize() {
		await this.updateComplete;
		const treeSelector = this.shadowRoot?.querySelector('d2l-labs-tree-selector');
		treeSelector && treeSelector.resize();
	}

	async updated() {
		if (!this._needResize) return;

		await this.resize();
		this._needResize = false;
	}

	get _isSearch() {
		return this.searchString.length > 0;
	}

	_renderChildren(id, parentName, indentLevel = 0) {
		parentName = parentName || this.localize('treeFilter:nodeName:root');

		if (!this.tree.isPopulated(id)) {
			// request children; in the meantime we can render whatever we have
			this._requestChildren(id);
		}

		return [
			...this.tree
				.getChildIdsForDisplay(id)
				.map(id => this._renderNode(id, parentName, indentLevel + 1)),

			this._renderParentLoadingControls(id)
		];
	}

	_renderNode(id, parentName, indentLevel) {
		const isOpen = this.tree.isOpen(id);
		const isOpenable = this.tree.isOpenable(id);
		const orgUnitName = this.tree.getName(id);
		const state = this.tree.getState(id);
		return html`<d2l-labs-tree-selector-node slot="tree"
					name="${this.localize('treeFilter:nodeName', { orgUnitName, id })}"
					data-id="${id}"
					?openable="${isOpenable}"
					?open="${isOpen}"
					selected-state="${state}"
					indent-level="${indentLevel}"
					parent-name="${parentName}"
					@d2l-labs-tree-selector-node-open="${this._onOpen}"
					@d2l-labs-tree-selector-node-select="${this._onSelect}"
				>
					${isOpen ? this._renderChildren(id, orgUnitName, indentLevel) : ''}
				</d2l-labs-tree-selector-node>`;
	}

	_renderParentLoadingControls(id) {
		if (this.tree.isLoading(id)) {
			return html`<d2l-loading-spinner slot="tree"></d2l-loading-spinner>`;
		}

		if (this.tree.hasMore(id)) {
			return html`<d2l-button slot="tree"
				class="d2l-tree-load-more"
				@click="${this._onParentLoadMore}"
				data-id="${id}"
				description="${this.localize('treeSelector:parentLoadMore:ariaLabel')}"
			>${this.localize('treeSelector:loadMoreLabel')}</d2l-button>`;
		}

		return html``;
	}

	_renderSearchLoadingControls() {
		if (!this._isSearch) return html``;

		if (this._isLoadingSearch) {
			return html`<d2l-loading-spinner slot="search-results"></d2l-loading-spinner>`;
		}

		if (this.isLoadMoreSearch)  {
			return html`<d2l-button slot="search-results"
				@click="${this._onSearchLoadMore}"
				description="${this.localize('treeSelector:searchLoadMore:ariaLabel')}"
			>${this.localize('treeSelector:loadMoreLabel')}</d2l-button>`;
		}
	}

	_renderSearchResults() {
		if (!this._isSearch) return html``;

		return this.tree
			.getMatchingIds(this.searchString)
			.map(id => {
				const orgUnitName = this.tree.getName(id);
				const state = this.tree.getState(id);
				return html`<d2l-labs-tree-selector-node slot="search-results"
					name="${this.localize('treeFilter:nodeName', { orgUnitName, id })}"
					data-id="${id}"
					selected-state="${state}"
					@d2l-labs-tree-selector-node-select="${this._onSelect}"
				>
				</d2l-labs-tree-selector-node>`;
			});
	}

	_onClear(event) {
		event.stopPropagation();
		this.tree.clearSelection();
		this._fireSelectEvent();
	}

	_onSelectAll(event) {
		event.stopPropagation();
		this.tree.selectAll();
		this._fireSelectEvent();
	}

	_onOpen(event) {
		event.stopPropagation();
		this._needResize = true;
		this.tree.setOpen(event.detail.id, event.detail.isOpen);
	}

	_onSearch(event) {
		event.stopPropagation();
		this._needResize = true;
		this.searchString = event.detail.value;

		if (this.tree.isDynamic) {
			this._fireSearchEvent(this.searchString);
		}
	}

	_onSearchLoadMore(event) {
		event.stopPropagation();
		this._fireSearchEvent(this.searchString, this._searchBookmark);
	}

	_fireSearchEvent(searchString, bookmark) {
		if (!searchString) return;

		this._isLoadingSearch = true;

		/**
		 * @event d2l-labs-tree-filter-search
		 */
		this.dispatchEvent(new CustomEvent(
			'd2l-labs-tree-filter-search',
			{
				bubbles: true,
				composed: false,
				detail: { searchString, bookmark }
			}
		));
	}

	_onSelect(event) {
		event.stopPropagation();
		this.tree.setSelected(event.detail.id, event.detail.isSelected);
		this._fireSelectEvent();
	}

	_fireSelectEvent() {
		/**
		 * @event d2l-labs-tree-filter-select
		 */
		this.dispatchEvent(new CustomEvent(
			'd2l-labs-tree-filter-select',
			{ bubbles: true, composed: false }
		));
	}

	_onParentLoadMore(event) {
		const id = Number(event.target.getAttribute('data-id'));
		const bookmark = this.tree.getBookmark(id);
		this._requestChildren(id, bookmark);
	}

	_requestChildren(id, bookmark) {
		this.tree.setLoading(id);

		/**
		 * @event d2l-labs-tree-filter-request-children
		 */
		this.dispatchEvent(new CustomEvent(
			'd2l-labs-tree-filter-request-children',
			{
				bubbles: true,
				composed: false,
				detail: { id, bookmark }
			}
		));
	}
}

customElements.define('d2l-labs-tree-filter', TreeFilter);
