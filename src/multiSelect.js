import { LitElement, css, html, nothing } from "lit";
import { autoUpdate, computePosition, flip, offset } from "@floating-ui/dom";
import { formStyles } from "./internal/formStyles.js";

let nextElementId = 0;
const formatCount = new Intl.NumberFormat().format;

/**
 * @typedef {{ id: string, label?: string, detail?: string }} MultiSelectOption
 * @typedef {string | MultiSelectOption} MultiSelectSearchResult
 */

/**
 * @typedef {object} MultiSelectSearchPage
 * @property {MultiSelectSearchResult[]} options - Suggestions returned for the query.
 * @property {number} [totalMatches] - Number of matches before truncating the results. Includes selected options if the provider matched them.
 * @property {number} [totalItems] - Size of the catalogue before applying the query.
 *
 * @typedef {MultiSelectSearchResult[] | MultiSelectSearchPage} MultiSelectSearchResponse
 */

/** @param {MultiSelectSearchResponse} response */
function searchPage(response) {
    return Array.isArray(response) ? { options: response } : response;
}

/**
 * @param {MultiSelectSearchResult} result
 * @returns {MultiSelectOption}
 */
function normalizeResult(result) {
    if (typeof result === "string") {
        return { id: result, label: result };
    }

    return {
        id: result.id,
        label: result.label ?? result.id,
        detail: result.detail,
    };
}

/**
 * @param {string[]} values
 * @returns {string[]}
 */
function uniqueValues(values) {
    const seen = new Set();
    /** @type {string[]} */
    const deduplicated = [];

    for (const value of values) {
        const normalized = String(value).trim();
        if (normalized.length === 0 || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        deduplicated.push(normalized);
    }

    return deduplicated;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function parseMultilineValues(text) {
    return uniqueValues(text.split(/\r?\n/g));
}

/**
 * Choose multiple string IDs with search suggestions and removable chips.
 *
 * @tag gs-multi-select
 * @fires {MultiSelectChangeEvent} change - Bubbles across shadow roots with the selected IDs on `event.values`.
 * @csspart control - Wrapper around the selected chips and search field.
 * @csspart chip - A selected value.
 * @csspart remove-button - Button inside a selected chip.
 * @csspart input - Text field for the search query.
 * @csspart panel - Suggestion popover.
 * @csspart option - A suggestion row.
 * @cssprop --gs-control-background - Control and popover surfaces.
 * @cssprop --gs-control-border - Control and chip borders.
 * @cssprop --gs-selected-background - Chip and active suggestion fill.
 * @cssprop --gs-focus-color - Control and active suggestion outlines.
 */
export default class MultiSelect extends LitElement {
    static properties = {
        selectedValues: { attribute: false },
        selectedLabels: { attribute: false },
        search: { attribute: false },
        commitDelimiters: { attribute: false },
        label: { type: String, attribute: "aria-label" },
        placeholder: { type: String },
        disabled: { type: Boolean },
        allowUnknown: { type: Boolean, attribute: "allow-unknown" },
        keepQueryOnSelect: { type: Boolean, attribute: "keep-query-on-select" },
        debounceMs: { type: Number, attribute: "debounce-ms" },
        maxSuggestions: { type: Number, attribute: "max-suggestions" },
        _query: { state: true },
        _loading: { state: true },
        _searchFailed: { state: true },
        _open: { state: true },
        _activeIndex: { state: true },
        _suggestions: { state: true },
        _inputHasFocus: { state: true },
    };

    static styles = [
        formStyles,
        css`
            :host {
                display: block;
            }

            .control {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0.2em;
                width: 100%;
                box-sizing: border-box;
                padding: 0.3em 0.5em;
                font-size: 1em;
                line-height: 1.5;
                color: var(--form-control-color);
                background-color: var(--gs-control-background, #fff);
                border: var(--form-control-border);
                border-radius: var(--form-control-border-radius);
                transition:
                    border-color 0.15s ease-in-out,
                    box-shadow 0.15s ease-in-out;
                cursor: text;
            }

            .control:focus-within {
                outline: 2px solid var(--gs-focus-color, #c6dbff);
                outline-offset: 2px;
            }

            :host(.is-invalid) .control {
                border-color: var(--danger-color, #dc3545);
                box-shadow: 0 0 0 0.2rem rgb(220 53 69 / 25%);
            }

            .pill {
                display: inline-flex;
                align-items: center;
                gap: 0.35em;
                max-width: 100%;
                background: var(--gs-selected-background, #edf2f7);
                border: 1px solid var(--gs-control-border, #d4dce4);
                border-radius: 999px;
                padding: 0.1em 0.55em;
                font-size: 0.93em;
                line-height: 1.4;
            }

            .pill-label {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 18em;
            }

            .pill-remove {
                border: 0;
                background: transparent;
                color: var(--gs-muted-text, #495057);
                font-size: 1.1em;
                line-height: 1;
                padding: 0;
                margin: 0;
                cursor: pointer;
            }

            .query {
                flex: 1;
                min-width: 8em;
                border: 0;
                outline: 0;
                padding: 0.1em 0.25em;
                margin: 0;
                background: transparent;
                font: inherit;
                color: inherit;
            }

            .query::placeholder {
                color: var(--gs-muted-text, #a0a0a0);
            }

            .dropdown {
                position: fixed;
                margin: 0;
                inset: auto;
                border: var(--form-control-border);
                border-radius: var(--form-control-border-radius);
                background: var(--gs-control-background, #fff);
                box-shadow: 0 6px 16px rgb(0 0 0 / 12%);
                padding: 0.2em 0;
            }

            .dropdown:not([data-positioned]) {
                visibility: hidden;
            }

            .listbox {
                max-height: 16rem;
                overflow: auto;
            }

            .option {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 0.75em;
                overflow-wrap: anywhere;
                padding: 0.35em 0.75em;
                cursor: pointer;
                background: transparent;
            }

            .option-detail {
                color: var(--gs-muted-text, #606060);
            }

            .option.active {
                background: var(--gs-selected-background, #eef3ff);
                outline: 2px solid var(--gs-focus-color, #c6dbff);
                outline-offset: -2px;
            }

            .status {
                padding: 0.35em 0.75em;
                color: var(--gs-muted-text, #6c757d);
                font-size: 0.92em;
            }

            .summary {
                border-top: var(--form-control-border);
            }

            .control.disabled {
                background-color: var(--gs-disabled-background, #f4f4f4);
                color: var(--gs-disabled-text, var(--form-control-color));
                cursor: default;
            }

            .control.disabled .pill-remove,
            .control.disabled .query {
                cursor: default;
            }
        `,
    ];

    /** @type {string} */
    #listboxId;

    /** @type {number | null} */
    #debounceTimer;

    /** @type {number} */
    #searchVersion;

    /** @type {MultiSelectOption[]} */
    #matches = [];

    /** @type {Pick<MultiSelectSearchPage, "totalMatches" | "totalItems">} */
    #searchCounts = {};

    /** @type {Map<string, string>} */
    #chosenLabels = new Map();

    /** @type {(() => void) | null} */
    #cleanupAutoUpdate;

    #positionVersion = 0;

    constructor() {
        super();
        /** @type {string[]} Selected IDs. Assign a new array to update the selection. */
        this.selectedValues = [];
        /** @type {Readonly<Record<string, string>>} Labels keyed by ID, including values supplied before searching. */
        this.selectedLabels = {};
        /** @type {((query: string) => Promise<MultiSelectSearchResponse>) | null} Resolve suggestions and optional counts for a query. */
        this.search = null;
        /** @type {string[]} Extra key values that commit the current query, such as a comma. */
        this.commitDelimiters = [];
        /** Accessible name for the search field and its suggestions. */
        this.label = "Choose options";
        /** Prompt in the empty search field. */
        this.placeholder = "Type to search";
        /** Disable input and removal of selected values. */
        this.disabled = false;
        /** Allow free-text values and pasting multiple values on separate lines. */
        this.allowUnknown = false;
        /** Retain the query and remaining matches after choosing a suggestion. */
        this.keepQueryOnSelect = false;
        /** Delay before sending a search query, in milliseconds. */
        this.debounceMs = 180;
        /** Maximum number of suggestions shown. */
        this.maxSuggestions = 50;
        this._query = "";
        this._loading = false;
        this._searchFailed = false;
        this._open = false;
        this._activeIndex = -1;
        /** @type {MultiSelectOption[]} */
        this._suggestions = [];
        this._inputHasFocus = false;

        this.#listboxId = "gs-multiselect-listbox-" + String(nextElementId++);
        this.#debounceTimer = null;
        this.#searchVersion = 0;
        this.#cleanupAutoUpdate = null;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._inputHasFocus = false;
        this.#closeSuggestions();
        this.#stopPositionTracking();
    }

    /**
     * @param {import("lit").PropertyValues<this>} changed
     */
    willUpdate(changed) {
        if (changed.has("selectedValues")) {
            this.selectedValues = uniqueValues(
                Array.from(this.selectedValues, (value) => String(value))
            );
        }
        if (changed.has("selectedValues") || changed.has("maxSuggestions")) {
            this.#updateSuggestionVisibility();
        }
        if (changed.has("disabled") && this.disabled) {
            this._inputHasFocus = false;
            this.#closeSuggestions();
        }
    }

    /**
     * @param {import("lit").PropertyValues<this>} changed
     */
    updated(changed) {
        if (changed.has("_open")) {
            this.#syncPopoverVisibility();
        }

        if (changed.has("_activeIndex")) {
            this.#scrollActiveIntoView();
        }

        if (
            this._open &&
            (changed.has("_suggestions") || changed.has("_loading"))
        ) {
            this.#updatePopoverPosition();
        }
    }

    /** @type {string[]} Alias for the array of selected IDs. */
    get value() {
        return this.selectedValues;
    }

    /**
     * @param {string[]} values
     */
    set value(values) {
        this.selectedValues = uniqueValues(values);
    }

    focus() {
        this.#focusInput();
    }

    /**
     * Re-runs the async search for the current query text.
     * Useful when backing suggestion data changes asynchronously.
     */
    refreshSuggestions() {
        if (!this.search || this.disabled) {
            return;
        }

        this.#queueSearch();
    }

    #queueSearch() {
        this.#cancelSearch();
        this.#matches = [];
        this.#searchCounts = {};
        this._suggestions = [];
        this._activeIndex = -1;
        this._searchFailed = false;
        if (!this.search || this.disabled || !this.isConnected) {
            return;
        }

        const query = this._query;
        const version = this.#searchVersion;
        this._loading = true;

        this.#debounceTimer = window.setTimeout(() => {
            this.#debounceTimer = null;
            void this.#executeSearch(query, version);
        }, this.debounceMs);
    }

    #cancelSearch() {
        this.#searchVersion++;
        this._loading = false;
        if (this.#debounceTimer !== null) {
            window.clearTimeout(this.#debounceTimer);
            this.#debounceTimer = null;
        }
    }

    #openSuggestions() {
        if (!this._inputHasFocus || this.disabled || !this.search) {
            return;
        }
        this.#queueSearch();
    }

    #closeSuggestions() {
        this._open = false;
        this._activeIndex = -1;
        this.#cancelSearch();
    }

    /**
     * @param {string} query
     * @param {number} version
     */
    async #executeSearch(query, version) {
        if (!this.search) {
            this._loading = false;
            this._open = false;
            return;
        }

        try {
            const results = await this.search(query);
            if (
                version !== this.#searchVersion ||
                this.disabled ||
                !this.isConnected
            ) {
                return;
            }

            const { options, totalMatches, totalItems } = searchPage(results);
            this.#matches = options.map(normalizeResult);
            this.#searchCounts = { totalMatches, totalItems };
            this.#updateSuggestionVisibility();
            this._open =
                this._inputHasFocus &&
                (this._suggestions.length > 0 || query.trim().length > 0);
            this._activeIndex =
                this._open && this._suggestions.length > 0 ? 0 : -1;
        } catch {
            if (version === this.#searchVersion) {
                this._searchFailed = true;
                this._open = this._inputHasFocus;
            }
        } finally {
            if (version === this.#searchVersion) {
                this._loading = false;
            }
        }
    }

    #focusInput() {
        /** @type {HTMLInputElement | null} */
        const input = this.renderRoot.querySelector("input.query");
        input?.focus();
    }

    #controlEl() {
        return /** @type {HTMLElement | null} */ (
            this.renderRoot.querySelector(".control")
        );
    }

    #dropdownEl() {
        return /** @type {HTMLElement | null} */ (
            this.renderRoot.querySelector(".dropdown")
        );
    }

    /**
     * @param {string} id
     */
    #optionDomId(id) {
        return this.#listboxId + "-opt-" + id;
    }

    #scrollActiveIntoView() {
        if (
            this._activeIndex < 0 ||
            !this.#dropdownEl()?.hasAttribute("data-positioned")
        ) {
            return;
        }
        /** @type {HTMLElement | null} */
        const active = this.renderRoot.querySelector(
            "#" + this.#optionDomId(String(this._activeIndex))
        );
        active?.scrollIntoView({ block: "nearest" });
    }

    #updatePopoverPosition() {
        const control = this.#controlEl();
        const dropdown = this.#dropdownEl();
        if (!control || !dropdown || !this._open) {
            return;
        }

        const width = control.getBoundingClientRect().width;
        dropdown.style.minWidth = String(width) + "px";
        const version = ++this.#positionVersion;

        computePosition(control, dropdown, {
            placement: "bottom-start",
            strategy: "fixed",
            middleware: [offset(4), flip()],
        }).then(({ x, y }) => {
            if (!this._open || version !== this.#positionVersion) {
                return;
            }
            dropdown.style.left = String(x) + "px";
            dropdown.style.top = String(y) + "px";
            if (!dropdown.hasAttribute("data-positioned")) {
                dropdown.setAttribute("data-positioned", "");
                this.#scrollActiveIntoView();
            }
        });
    }

    #startPositionTracking() {
        const control = this.#controlEl();
        const dropdown = this.#dropdownEl();
        if (!control || !dropdown) {
            return;
        }

        this.#stopPositionTracking();
        this.#cleanupAutoUpdate = autoUpdate(control, dropdown, () =>
            this.#updatePopoverPosition()
        );
    }

    #stopPositionTracking() {
        this.#positionVersion++;
        this.#dropdownEl()?.removeAttribute("data-positioned");
        if (!this.#cleanupAutoUpdate) {
            return;
        }
        this.#cleanupAutoUpdate();
        this.#cleanupAutoUpdate = null;
    }

    #syncPopoverVisibility() {
        const dropdown = this.#dropdownEl();
        if (!dropdown) {
            return;
        }

        const supportsPopover =
            typeof dropdown.showPopover === "function" &&
            typeof dropdown.hidePopover === "function";

        if (this._open) {
            if (supportsPopover && !dropdown.matches(":popover-open")) {
                dropdown.showPopover();
            }
            this.#startPositionTracking();
        } else {
            this.#stopPositionTracking();
            if (supportsPopover && dropdown.matches(":popover-open")) {
                dropdown.hidePopover();
            }
        }
    }

    #updateSuggestionVisibility() {
        const selected = new Set(this.selectedValues);
        for (const id of this.#chosenLabels.keys()) {
            if (!selected.has(id)) {
                this.#chosenLabels.delete(id);
            }
        }
        this._suggestions = this.#matches
            .filter((suggestion) => !selected.has(suggestion.id))
            .slice(0, Math.max(0, this.maxSuggestions));
        if (this._suggestions.length === 0) {
            this._activeIndex = -1;
        } else if (this._activeIndex >= this._suggestions.length) {
            this._activeIndex = this._suggestions.length - 1;
        }
    }

    #emitChange() {
        this.dispatchEvent(
            new MultiSelectChangeEvent(Array.from(this.selectedValues))
        );
    }

    /**
     * @param {MultiSelectSearchResult[]} values
     * @returns {boolean}
     */
    #addValues(values) {
        const seen = new Set(this.selectedValues);
        /** @type {string[]} */
        const additions = [];

        for (const value of values) {
            const { id, label } = normalizeResult(value);
            const normalized = id.trim();
            if (normalized.length === 0 || seen.has(normalized)) {
                continue;
            }
            seen.add(normalized);
            additions.push(normalized);
            if (label && label !== id) {
                this.#chosenLabels.set(normalized, label);
            }
        }

        if (additions.length === 0) {
            return false;
        }

        this.selectedValues = [...this.selectedValues, ...additions];
        this.#emitChange();
        return true;
    }

    /**
     * @param {MultiSelectOption} option
     */
    #chooseOption(option) {
        this.#addValues([option]);
        if (!this.keepQueryOnSelect) {
            this._query = "";
            this.#openSuggestions();
        }
        this.#focusInput();
    }

    /**
     * @param {string} id
     */
    #removeValue(id) {
        const next = this.selectedValues.filter((value) => value !== id);
        if (next.length === this.selectedValues.length) {
            return;
        }
        this.selectedValues = next;
        this.#emitChange();
    }

    #removeLastValue() {
        if (this.selectedValues.length === 0) {
            return;
        }
        this.selectedValues = this.selectedValues.slice(
            0,
            this.selectedValues.length - 1
        );
        this.#emitChange();
    }

    /**
     * @param {string} query
     * @returns {MultiSelectOption | null}
     */
    #findExactMatch(query) {
        const lower = query.toLowerCase();
        return (
            this._suggestions.find(
                (suggestion) => suggestion.id.toLowerCase() === lower
            ) ?? null
        );
    }

    /**
     * @param {string} query
     * @param {string} delimiter
     * @returns {boolean}
     */
    #isDelimiterCommitAmbiguous(query, delimiter) {
        const continuationPrefix = (query + delimiter).toLowerCase();
        return this._suggestions.some((suggestion) =>
            suggestion.id.toLowerCase().startsWith(continuationPrefix)
        );
    }

    /**
     * @param {string} delimiter
     * @returns {boolean}
     */
    #commitExactMatchOnDelimiter(delimiter) {
        const query = this._query.trim();
        if (!this._open || query.length === 0) {
            return false;
        }

        const exact = this.#findExactMatch(query);
        if (!exact) {
            return false;
        }

        if (this.#isDelimiterCommitAmbiguous(query, delimiter)) {
            return false;
        }

        this.#chooseOption(exact);
        return true;
    }

    #confirmSelection() {
        if (this._loading && !this.allowUnknown) {
            return;
        }

        const query = this._query.trim();
        const option = this._open
            ? (this._suggestions[this._activeIndex] ??
              this.#findExactMatch(query))
            : null;
        if (option) {
            this.#chooseOption(option);
        } else if (this.allowUnknown && query) {
            this.#addValues([query]);
            this._query = "";
            this.#openSuggestions();
        }
    }

    /**
     * @param {MouseEvent} event
     */
    #onControlMouseDown(event) {
        if (this.disabled) {
            return;
        }

        if (
            event.target instanceof HTMLElement &&
            event.target.closest("input, button")
        ) {
            return;
        }

        event.preventDefault();
        this.#focusInput();
    }

    /**
     * @param {InputEvent} event
     */
    #onInput(event) {
        const input =
            /** @type {HTMLInputElement | null} */
            (event.currentTarget);
        if (!input) {
            return;
        }

        this._query = input.value;
        if (event.isComposing) {
            this.#closeSuggestions();
        } else {
            this.#openSuggestions();
        }
    }

    #onInputFocus() {
        this._inputHasFocus = true;
        this.#openSuggestions();
    }

    #onInputBlur() {
        const commit = (this._open || this._loading) && !this.disabled;
        this._inputHasFocus = false;
        this.#closeSuggestions();
        if (commit) {
            void this.#commitExactMatchOnBlur();
        }
    }

    async #commitExactMatchOnBlur() {
        const query = this._query.trim();
        if (query.length === 0) {
            return;
        }

        const version = this.#searchVersion;
        let exact = this.#findExactMatch(query);

        if (!exact && this.search) {
            try {
                const { options } = searchPage(await this.search(query));
                const lower = query.toLowerCase();
                exact =
                    options
                        .map((result) => normalizeResult(result))
                        .find(
                            (suggestion) =>
                                suggestion.id.toLowerCase() === lower
                        ) ?? null;
            } catch {
                return;
            }
        }

        if (
            !exact ||
            version !== this.#searchVersion ||
            this.disabled ||
            !this.isConnected ||
            this._inputHasFocus
        ) {
            return;
        }

        this.#addValues([exact]);
        this._query = "";
    }

    /**
     * @param {ClipboardEvent} event
     */
    #onInputPaste(event) {
        if (!this.allowUnknown || this.disabled) {
            return;
        }

        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (!text.includes("\n")) {
            return;
        }

        const values = parseMultilineValues(text);
        if (values.length === 0) {
            return;
        }

        event.preventDefault();
        this.#addValues(values);
        this._query = "";
        this.#closeSuggestions();
    }

    /**
     * @param {KeyboardEvent} event
     */
    #onInputKeyDown(event) {
        if (this.disabled || event.isComposing) {
            return;
        }

        if (this.commitDelimiters.includes(event.key)) {
            const committed = this.#commitExactMatchOnDelimiter(event.key);
            if (committed) {
                event.preventDefault();
                event.stopPropagation();
            }
            return;
        }

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (!this.search) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (!this._open) {
                if (!this._loading) {
                    this.#openSuggestions();
                }
                return;
            }

            if (this._suggestions.length === 0) {
                return;
            }

            if (this._activeIndex < 0) {
                this._activeIndex = 0;
                return;
            }

            const direction = event.key === "ArrowDown" ? 1 : -1;
            const next = Math.max(
                0,
                Math.min(
                    this._suggestions.length - 1,
                    this._activeIndex + direction
                )
            );
            this._activeIndex = next;
            return;
        }

        if (event.key === "Enter") {
            if (
                !this._open &&
                !this._loading &&
                !(this.allowUnknown && this._query.trim())
            ) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            this.#confirmSelection();
            return;
        }

        if (event.key === "Backspace" && this._query.length === 0) {
            event.stopPropagation();
            this.#removeLastValue();
            return;
        }

        if (event.key === "Escape" && (this._open || this._loading)) {
            event.preventDefault();
            event.stopPropagation();
            this.#closeSuggestions();
        }
    }

    /**
     * @param {number} index
     */
    #selectSuggestionByIndex(index) {
        const suggestion = this._suggestions[index];
        if (suggestion && this._open && !this.disabled) {
            this.#chooseOption(suggestion);
        }
    }

    #searchStatus() {
        if (this._loading) {
            return "Loading...";
        }
        if (this._searchFailed) {
            return "Search failed. Edit the query to retry.";
        }

        const shown = this._suggestions.length;
        const { totalMatches, totalItems } = this.#searchCounts;
        let status = "";
        if (shown === 0) {
            status =
                (totalMatches ?? 0) > 0
                    ? "No additional matches"
                    : "No matches";
        } else if (this._query.trim() && totalMatches !== undefined) {
            status =
                totalMatches > shown
                    ? `Showing ${formatCount(shown)} of ${formatCount(totalMatches)} matches`
                    : `${formatCount(shown)} ${shown === 1 ? "match" : "matches"}`;
        } else if (totalMatches !== undefined || totalItems !== undefined) {
            status = `${formatCount(shown)} ${shown === 1 ? "suggestion" : "suggestions"}`;
        }

        return totalItems === undefined
            ? status
            : `${status} · ${formatCount(totalItems)} in catalogue`;
    }

    /** @returns {import("lit").HTMLTemplateResult} */
    render() {
        const label = this.label || "Choose options";
        /** @type {Readonly<Record<string, string>>} */
        const selectedLabels = this.selectedLabels ?? {};
        const status = this.#searchStatus();
        const activeId =
            this._open && this._activeIndex >= 0
                ? this.#optionDomId(String(this._activeIndex))
                : nothing;

        return html`
            <div
                class="control ${this.disabled ? "disabled" : ""}"
                part="control"
                @mousedown=${(/** @type {MouseEvent} */ event) =>
                    this.#onControlMouseDown(event)}
            >
                ${this.selectedValues.map((value) => {
                    const label = Object.hasOwn(selectedLabels, value)
                        ? selectedLabels[value]
                        : (this.#chosenLabels.get(value) ?? value);
                    const fullLabel =
                        label === value ? label : `${label} (${value})`;
                    return html`<span
                        class="pill"
                        part="chip"
                        title=${fullLabel}
                    >
                        <span class="pill-label">${label}</span>
                        <button
                            class="pill-remove"
                            part="remove-button"
                            type="button"
                            aria-label=${"Remove " + fullLabel}
                            ?disabled=${this.disabled}
                            @click=${() => {
                                this.#removeValue(value);
                                this.#focusInput();
                            }}
                        >
                            ×
                        </button>
                    </span>`;
                })}

                <input
                    class="query"
                    part="input"
                    type="text"
                    role="combobox"
                    aria-label=${label}
                    aria-controls=${this.#listboxId}
                    aria-expanded=${this._open ? "true" : "false"}
                    aria-busy=${this._loading ? "true" : nothing}
                    aria-autocomplete="list"
                    aria-activedescendant=${activeId}
                    placeholder=${this.placeholder}
                    .value=${this._query}
                    ?disabled=${this.disabled}
                    @focus=${() => this.#onInputFocus()}
                    @blur=${() => this.#onInputBlur()}
                    @paste=${(/** @type {ClipboardEvent} */ event) =>
                        this.#onInputPaste(event)}
                    @input=${(/** @type {InputEvent} */ event) =>
                        this.#onInput(event)}
                    @compositionend=${() => this.#openSuggestions()}
                    @keydown=${(/** @type {KeyboardEvent} */ event) =>
                        this.#onInputKeyDown(event)}
                />
            </div>

            <div
                class="dropdown"
                part="panel"
                popover="auto"
                ?hidden=${!this._open}
                @toggle=${(/** @type {ToggleEvent} */ event) => {
                    if (
                        event.newState === "closed" &&
                        this._open &&
                        !(
                            /** @type {HTMLElement} */ (
                                event.currentTarget
                            ).matches(":popover-open")
                        )
                    ) {
                        this.#closeSuggestions();
                    }
                }}
            >
                <div
                    id=${this.#listboxId}
                    class="listbox"
                    role="listbox"
                    aria-label=${label}
                >
                    ${this._suggestions.map(
                        (suggestion, index) =>
                            html`<div
                                id=${this.#optionDomId(String(index))}
                                class="option ${
                                    index === this._activeIndex ? "active" : ""
                                }"
                                role="option"
                                part="option"
                                aria-selected=${
                                    index === this._activeIndex
                                        ? "true"
                                        : "false"
                                }
                                @mousedown=${(
                                    /** @type {MouseEvent} */ event
                                ) => event.preventDefault()}
                                @mouseenter=${() => {
                                    this._activeIndex = index;
                                }}
                                @click=${() => this.#selectSuggestionByIndex(index)}
                            >
                                <span
                                    >${suggestion.label ?? suggestion.id}</span
                                >
                                ${
                                    suggestion.detail
                                        ? html`<small class="option-detail"
                                              >${suggestion.detail}</small
                                          >`
                                        : nothing
                                }
                            </div>`
                    )}
                </div>
                ${
                    status
                        ? html`<div
                              class="status ${this._suggestions.length ? "summary" : ""}"
                              role="status"
                          >
                              ${status}
                          </div>`
                        : nothing
                }
            </div>
        `;
    }
}

/**
 * @extends {Event}
 */
export class MultiSelectChangeEvent extends Event {
    /** @type {string[]} */
    values;

    /**
     * @param {string[]} values
     */
    constructor(values) {
        super("change", { bubbles: true, composed: true });
        this.values = values;
    }
}
