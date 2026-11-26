import { installToolbarLayout } from "./internal/toolbarLayout.js";
/** @typedef {import("lit").TemplateResult} TemplateResult */
/** Common app navigation and stable contribution slots; apps own all command behavior. */
import { LitElement, css, html, nothing } from "lit";
/** @typedef {import("./homeButton.js").HomeButton} HomeButton */
import { formStyles } from "./styles.js";
import { createAppMenu } from "./appMenu.js";
/**
 * @typedef {object} ToolbarCommand
 * @property {string} id
 * @property {string} label
 * @property {string} [title]
 * @property {boolean} [disabled]
 * @property {() => void} run
 */
/** @tag gsa-app-toolbar
 * @slot view-controls - App view controls.
 * @slot general-controls - App search/filter controls.
 * @slot - App actions.
 * @fires {CustomEvent<void>} gsa-open-tasks - Requests the narrow task drawer.
 */
export class AppToolbar extends LitElement {
    static properties = {
        sessionCommands: { attribute: false },
        responsive: { type: Boolean, reflect: true },
        taskDrawer: { type: Boolean, attribute: "task-drawer" },
        width: { state: true },
        hasGeneralControls: { state: true },
        appTitle: { type: String, attribute: "app-title" },
        homeDisabled: { type: Boolean, attribute: "home-disabled" },
    };

    /** @private */
    sessionMenu = createAppMenu();

    /** @private */
    sizeObserver = new ResizeObserver(([entry]) => {
        this.width = entry.contentRect.width;
    });
    constructor() {
        super();
        /** @type {readonly ToolbarCommand[]} */
        this.sessionCommands = [];
        this.responsive = false;
        this.taskDrawer = false;
        /** @type {number} @private */
        this.width = Infinity;
        /** @type {boolean} @private */
        this.hasGeneralControls = false;
        this.appTitle = "";
        this.homeDisabled = false;
    }
    static styles = [
        formStyles,
        css`
            :host {
                display: block;
                min-width: 0;
                color: var(--gs-control-text, #333);
            }
            header {
                box-sizing: border-box;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 6px;
                min-height: 52px;
                padding: 8px 14px;
                background: white;
                border-bottom: 1px solid var(--gs-divider-color, #d0d0d0);
            }
            .brand {
                flex-shrink: 0;
                padding: 0 4px;
            }
            .brand img {
                display: block;
                width: 28px;
                height: 28px;
            }
            .title {
                margin: 0 8px 0 2px;
                color: var(--gs-muted-text, #606060);
                font-weight: 500;
            }
            .actions,
            ::slotted([role="group"]),
            ::slotted([slot="view-controls"]),
            ::slotted([slot="general-controls"]) {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 4px;
                min-width: 0;
                max-width: 100%;
            }
            .actions {
                margin-left: auto;
            }
            :host([responsive]) header {
                flex-wrap: nowrap;
                padding-inline: 10px;
            }
            :host([responsive]) .actions {
                margin: 0;
                flex-wrap: nowrap;
                flex-shrink: 0;
            }
            .search-inline {
                flex: 1;
                min-width: 0;
            }
            ::slotted([slot="general-controls"]) {
                inline-size: 100%;
            }
            .task-trigger {
                display: none;
            }
            @media (max-width: 650px) {
                .task-trigger {
                    display: inline-flex;
                }
            }
            .search-trigger {
                margin-inline-end: auto;
            }
            .overflow-trigger,
            .search-trigger,
            .task-trigger {
                min-height: 44px;
                flex-shrink: 0;
            }
            .toolbar-popover {
                position: fixed;
                inset: 54px 10px auto auto;
                margin: 0;
                padding: 8px;
                max-width: calc(100% - 20px);
                max-height: calc(100dvh - 64px);
                overflow: auto;
                box-sizing: border-box;
                border: var(--gs-menu-border, 0);
                border-radius: var(--gs-menu-radius, 2px);
                background: white;
                color: inherit;
                box-shadow: var(--gs-menu-shadow, 0 3px 15px rgb(0 0 0 / 21%));
            }
            .toolbar-popover:popover-open {
                display: grid;
                gap: 6px;
            }
            .session-actions {
                display: grid;
                gap: 4px;
            }
            .session-actions button {
                justify-content: flex-start;
            }

            #toolbar-actions > slot:not([name])::slotted([role="group"]) {
                display: grid;
            }
            #toolbar-search {
                inset-inline: 10px;
                width: auto;
            }
            @supports (position-area: block-end) {
                #toolbar-actions {
                    inset: auto;
                    position-area: block-end span-inline-start;
                    position-try-fallbacks: flip-block;
                }
            }
            @media (max-width: 650px) {
                header {
                    padding: 6px 10px;
                }
                :host(:not([responsive])) .actions {
                    margin-left: 0;
                }
                :host(:not([responsive])) .brand {
                    margin-left: auto;
                }
            }
        `,
    ];

    /** Style app-supplied commands when the toolbar connects to the page.
     * @returns {void} */
    connectedCallback() {
        super.connectedCallback();
        this.classList.add("gs-form");
        installToolbarLayout(this.ownerDocument);
        this.sizeObserver.observe(this);
    }

    /** @returns {void} */
    disconnectedCallback() {
        this.sizeObserver.disconnect();
        this.sessionMenu.dismissDropdownMenu();
        super.disconnectedCallback();
    }

    /** Return focus after an app resumes its retained workspace.
     * @param {FocusOptions} [options]
     * @returns {void} */
    focusHome(options) {
        /** @type {HomeButton} */ (
            this.renderRoot.querySelector("gsa-home-button")
        )?.focus(options);
    }

    /** Return focus to the menu trigger when a command's opener is hidden.
     * @returns {void} */
    focusOverflow() {
        /** @type {HTMLButtonElement} */ (
            this.renderRoot.querySelector(".overflow-trigger")
        )?.focus();
    }

    /** Handle Escape before the search field consumes it to clear its draft.
     * @private */
    dismissSearch = {
        capture: true,
        /** @param {KeyboardEvent} event
         * @returns {void} */
        handleEvent(event) {
            if (event.key !== "Escape" || event.isComposing) return;
            event.preventDefault();
            const popover = /** @type {HTMLElement} */ (event.currentTarget);
            popover.hidePopover();
            const trigger = popover.previousElementSibling;
            if (trigger instanceof HTMLButtonElement) trigger.focus();
        },
    };

    /** Put the same slotted search in a full-width disclosure when space is tight.
     * @param {boolean} compact
     * @returns {TemplateResult}
     * @private */
    searchControls(compact) {
        const controls = html`<slot
            name="general-controls"
            @slotchange=${
                /** @param {Event} event */ (event) => {
                    const slot = /** @type {HTMLSlotElement} */ (
                        event.currentTarget
                    );
                    this.hasGeneralControls =
                        slot.assignedElements().length > 0;
                }
            }
        ></slot>`;
        if (!this.hasGeneralControls) return controls;
        if (!compact) return html`<div class="search-inline">${controls}</div>`;
        return html` <button
                type="button"
                class="btn search-trigger"
                popovertarget="toolbar-search"
            >
                Search
            </button>
            <div
                id="toolbar-search"
                class="toolbar-popover"
                popover="auto"
                role="group"
                aria-label="Search"
                @keydown=${this.dismissSearch}
                @toggle=${
                    /** @param {ToggleEvent} event */ (event) => {
                        if (event.newState !== "open") return;
                        const slot = /** @type {HTMLElement} */ (
                            event.currentTarget
                        ).querySelector("slot");
                        const control = slot.assignedElements()[0];
                        if (control instanceof HTMLElement) control.focus();
                    }
                }
            >
                ${controls}
            </div>`;
    }

    /** Dismiss compact overflow before opening another popup or dialog.
     * @returns {HTMLButtonElement | undefined} */
    closeOverflow() {
        const overflow = /** @type {HTMLElement} */ (
            this.renderRoot.querySelector("#toolbar-actions")
        );
        if (!overflow?.matches(":popover-open")) return;
        overflow.hidePopover();
        const button = /** @type {HTMLButtonElement} */ (
            this.renderRoot.querySelector(".overflow-trigger")
        );
        button.focus();
        return button;
    }

    /** @param {HTMLButtonElement} button
     * @param {"first" | "last"} initialFocus
     * @returns {void}
     * @private */
    showSessionMenu(button, initialFocus = "first") {
        this.sessionMenu.dropdownMenu(
            {
                label: "More actions",
                mode: "command",
                initialFocus,
                items: this.sessionCommands.map((command) => ({
                    key: command.id,
                    label: command.label,
                    disabled: command.disabled,
                    callback: command.run,
                })),
            },
            button,
            "bottom-end"
        );
    }

    /** Update commands as app state changes and dismiss when the layout switches.
     * @returns {void} */
    updated() {
        const button = /** @type {HTMLButtonElement} */ (
            this.renderRoot.querySelector(".overflow-trigger")
        );
        if (!this.sessionMenu.isContextMenuOpen()) return;
        if (!button || button.hasAttribute("popovertarget"))
            this.sessionMenu.dismissDropdownMenu();
        else this.showSessionMenu(button);
    }

    /** Compact overflow also holds the same mounted native workspace controls.
     * @param {boolean} compact
     * @returns {TemplateResult}
     * @private */
    overflowControls(compact) {
        return html` <button
                type="button"
                class="btn overflow-trigger"
                aria-label="More actions"
                title="More actions"
                aria-haspopup=${compact ? nothing : "menu"}
                aria-expanded=${compact ? nothing : "false"}
                popovertarget=${compact ? "toolbar-actions" : nothing}
                @click=${
                    /** @param {MouseEvent} event */ (event) => {
                        if (compact) return;
                        const button = /** @type {HTMLButtonElement} */ (
                            event.currentTarget
                        );
                        if (this.sessionMenu.isDropdownOpenFor(button))
                            this.sessionMenu.dismissDropdownMenu();
                        else this.showSessionMenu(button);
                    }
                }
                @keydown=${
                    /** @param {KeyboardEvent} event */ (event) => {
                        if (
                            compact ||
                            (event.key !== "ArrowDown" &&
                                event.key !== "ArrowUp")
                        )
                            return;
                        event.preventDefault();
                        this.showSessionMenu(
                            /** @type {HTMLButtonElement} */ (
                                event.currentTarget
                            ),
                            event.key === "ArrowUp" ? "last" : "first"
                        );
                    }
                }
            >
                <svg
                    viewBox="0 0 24 24"
                    /** @private */
    width="18"
                    height="18"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="5" r="1.8"></circle>
                    <circle cx="12" cy="12" r="1.8"></circle>
                    <circle cx="12" cy="19" r="1.8"></circle>
                </svg>
            </button>
            ${
                compact
                    ? html`<div
                          id="toolbar-actions"
                          class="toolbar-popover"
                          popover="auto"
                          role="group"
                          aria-label="More actions"
                      >
                          <slot name="view-controls"></slot><slot></slot>
                          <div
                              class="session-actions"
                              role="group"
                              aria-label="Session actions"
                          >
                              ${this.sessionCommands.map(
                                  (command) =>
                                      html` <button
                                          class="btn"
                                          type="button"
                                          title=${command.title ?? nothing}
                                          ?disabled=${command.disabled}
                                          @click=${() => {
                                              this.closeOverflow();
                                              command.run();
                                          }}
                                      >
                                          ${command.label}
                                      </button>`
                              )}
                          </div>
                      </div>`
                    : nothing
            }`;
    }

    /** Standard slots accept live native controls and any app-owned buttons or groups.
     * @returns {TemplateResult} */
    render() {
        const compact = this.responsive && this.width < 900;
        const compactSearch = this.responsive && this.width < 480;
        return html`<header aria-label="Workspace toolbar">
            <gsa-home-button .disabled=${this.homeDisabled}></gsa-home-button>
            ${this.appTitle ? html`<span class="title">${this.appTitle}</span>` : ""}
            ${!compact ? html`<slot name="view-controls"></slot>` : ""}
            ${this.responsive ? this.searchControls(compactSearch) : html`<slot name="general-controls"></slot>`}
            ${
                this.taskDrawer
                    ? html` <button
                          type="button"
                          class="btn task-trigger"
                          aria-haspopup="dialog"
                          @click=${() => this.dispatchEvent(new Event("gsa-open-tasks", { bubbles: true, composed: true }))}
                      >
                          Task panel
                      </button>`
                    : ""
            }
            ${!compact ? html`<div class="actions" role="group" aria-label="Application actions"><slot></slot></div>` : ""}
            ${this.responsive ? this.overflowControls(compact) : ""}
            <a
                class="button brand"
                href="https://genomespy.app/"
                target="_blank"
                rel="noopener noreferrer"
                title="GenomeSpy website (opens in a new tab)"
                aria-label="GenomeSpy website (opens in a new tab)"
                ><img
                    src=${new URL("./assets/bowtie.svg", import.meta.url).href}
                    alt="GenomeSpy"
                    /** @private */
    width="28"
                    height="28"
            /></a>
        </header>`;
    }
}
