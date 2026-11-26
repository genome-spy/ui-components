import { formStyles } from "./styles.js";
/** @typedef {import("lit").TemplateResult} TemplateResult */
/** Reusable task navigation; each app supplies its controls and owns selected task state. */
import { LitElement, css, html, nothing } from "lit";
import { installSidebarStyles } from "./internal/taskSidebarStyles.js";
/**
 * @typedef {object} TaskTab
 * @property {string} id
 * @property {string} label
 * @property {TemplateResult} [icon]
 */
/** @tag gsa-task-sidebar
 * @fires {CustomEvent<{id: string}>} gsa-task-select - Requests a new active task.
 * @slot header - Persistent panel header.
 * @slot footer - Persistent panel footer.
 */
export class TaskSidebar extends LitElement {
    static properties = {
        tabs: { attribute: false },
        activeId: { type: String, attribute: "active-id" },
        collapsed: { type: Boolean, reflect: true },
    };
    constructor() {
        super();
        /** @type {readonly TaskTab[]} */
        this.tabs = [];
        this.activeId = "";
        this.collapsed = false;
    }
    static styles = [
        formStyles,
        css`
            :host {
                display: block;
                min-width: 0;
                min-height: 0;
                height: 100%;
            }
            .sidebar {
                display: grid;
                grid-template-columns: 88px minmax(0, 1fr);
                height: 100%;
                min-height: 0;
            }
            :host([collapsed]) .sidebar {
                grid-template-columns: minmax(0, 1fr);
            }
            .rail {
                display: flex;
                flex-direction: column;
                background: var(--gs-control-background, #fff);
                border-right: 1px solid var(--gs-divider-color, #d0d0d0);
                min-height: 0;
                overflow-y: auto;
            }
            .toggle {
                flex: none;
                margin: 4px;
                padding: 10px;
            }
            .toggle svg {
                display: block;
                margin: auto;
            }
            nav {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 0 4px 12px;
            }
            button {
                font: inherit;
                padding: 12px 3px;
                min-height: 44px;
                overflow-wrap: anywhere;
            }
            .icon-tab {
                align-self: center;
                display: grid;
                place-items: center;
                width: 44px;
                padding: 0;
                border: 0;
            }
            .icon-tab:hover {
                background: var(--gs-hover-background, #f0f2f4);
            }
            .tab-icon {
                display: grid;
                place-items: center;
            }
            .tab-icon svg {
                width: 22px;
                height: 22px;
            }
            .tab-tooltip {
                inset: auto;
                position-area: inline-end;
                position-try-fallbacks: flip-inline;
                margin: 0 0 0 8px;
                padding: 6px 10px;
                border: 0;
                border-radius: 8px;
                background: var(--gs-control-background, #fff);
                color: var(--gs-control-text, #333);
                font:
                    12px system-ui,
                    sans-serif;
            }
            .icon-tab[interestfor] {
                interest-delay: 200ms 150ms;
            }
            button[aria-selected="true"] {
                color: var(--gs-theme-primary, #51678d);
                background: var(--gs-selected-background, #dfe5eb);
                border-left-color: var(--gs-theme-primary, #51678d);
            }
            button:focus-visible {
                outline: 2px solid var(--gs-focus-color, #2563a6);
                outline-offset: -2px;
            }
            .content {
                display: grid;
                grid-template-rows: auto minmax(0, 1fr) auto;
                min-width: 0;
                min-height: 0;
            }
            header,
            footer {
                padding: 12px;
            }
            header {
                border-bottom: 1px solid var(--gs-divider-color, #d0d0d0);
            }
            footer {
                border-top: 1px solid var(--gs-divider-color, #d0d0d0);
                max-height: 50vh;
                overflow-y: auto;
            }
            .panels {
                overflow-y: auto;
                min-height: 0;
                padding: 12px;
            }
            [hidden] {
                display: none !important;
            }
            @media (max-width: 650px) {
                :host([drawer-on-narrow]) {
                    height: 100%;
                }
                :host([drawer-on-narrow]) .sidebar {
                    grid-template-columns: 64px minmax(0, 1fr);
                    min-height: 0;
                }
                :host([drawer-on-narrow]) .toggle {
                    display: none;
                }
                :host([drawer-on-narrow][collapsed]) nav {
                    display: flex;
                }
                :host([drawer-on-narrow]) .content {
                    grid-template-rows: auto minmax(0, 1fr) auto;
                }
                :host([drawer-on-narrow]) .content[hidden] {
                    display: grid !important;
                }
                :host([drawer-on-narrow]) .panels {
                    overflow-y: auto;
                }

                :host(:not([drawer-on-narrow])) {
                    height: auto;
                }
                :host(:not([drawer-on-narrow])) .sidebar {
                    min-height: 400px;
                }
                :host([collapsed]) .sidebar {
                    min-height: 0;
                }
                :host([collapsed]:not([drawer-on-narrow])) nav {
                    display: none;
                }
                :host(:not([drawer-on-narrow])) .content {
                    grid-template-rows: auto auto auto;
                }
                :host(:not([drawer-on-narrow])) .panels {
                    overflow: visible;
                }
            }
        `,
    ];

    /** Apply the same content presentation to every app's slotted forms.
     * @returns {void} */
    connectedCallback() {
        super.connectedCallback();
        this.classList.add("gs-form");
        if (!this.hasAttribute("role"))
            this.setAttribute("role", "complementary");
        installSidebarStyles(this.ownerDocument);
    }

    /** Request a tab change; the app decides when to publish its new selection.
     * @param {string} id
     * @returns {void}
     * @private */
    select(id) {
        this.collapsed = false;
        if (id !== this.activeId) {
            this.dispatchEvent(
                new CustomEvent("gsa-task-select", {
                    detail: { id },
                    bubbles: true,
                    composed: true,
                })
            );
        }
    }

    /** Move keyboard focus between vertical tabs and request the matching panel.
     * @param {KeyboardEvent} event
     * @returns {void}
     * @private */
    navigate(event) {
        const buttons = Array.from(
            /** @type {NodeListOf<HTMLButtonElement>} */ (
                this.renderRoot.querySelectorAll('[role="tab"]')
            )
        );
        const current = buttons.indexOf(
            /** @type {HTMLButtonElement} */ (event.target)
        );
        /** @type {number} */
        let next;
        switch (event.key) {
            case "ArrowDown":
                next = (current + 1) % buttons.length;
                break;
            case "ArrowUp":
                next = (current + buttons.length - 1) % buttons.length;
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = buttons.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        buttons[next].focus();
        this.select(this.tabs[next].id);
    }

    /** Use native hint popovers when both invocation and placement are supported.
     * @param {TaskTab} tab
     * @returns {TemplateResult}
     * @private */
    renderTab(tab) {
        const tooltipId = "hint-" + tab.id;
        const showHint =
            !!tab.icon &&
            "interestForElement" in HTMLButtonElement.prototype &&
            CSS.supports(
                "(position-area: inline-end) and (position-try-fallbacks: flip-inline)"
            );
        return html`<button
                type="button"
                role="tab"
                class=${tab.icon ? "btn icon-tab" : "btn"}
                aria-label=${tab.label}
                title=${showHint ? nothing : tab.label}
                interestfor=${showHint ? tooltipId : nothing}
                id=${"tab-" + tab.id}
                aria-controls=${"panel-" + tab.id}
                aria-selected=${tab.id === this.activeId}
                tabindex=${tab.id === this.activeId ? 0 : -1}
                @click=${() => this.select(tab.id)}
            >
                ${tab.icon ? html`<span class="tab-icon" aria-hidden="true">${tab.icon}</span>` : tab.label}
            </button>
            ${showHint ? html`<span id=${tooltipId} class="tab-tooltip" popover="hint">${tab.label}</span>` : nothing}`;
    }

    /** Render persistent slots so switching tasks retains supplied forms and results.
     * @returns {TemplateResult} */
    render() {
        if (
            this.tabs.length &&
            !this.tabs.some((tab) => tab.id === this.activeId)
        ) {
            throw new Error("Unknown active task: " + this.activeId);
        }
        return html`<div class="sidebar">
            <div class="rail">
                <button
                    type="button"
                    class="btn toggle"
                    aria-label=${this.collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title=${this.collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded=${!this.collapsed}
                    aria-controls="content"
                    @click=${() => {
                        this.collapsed = !this.collapsed;
                    }}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        aria-hidden="true"
                    >
                        <rect
                            x="2.5"
                            y="3.5"
                            width="15"
                            height="13"
                            rx="2"
                        ></rect>
                        <path d="M8 3.5v13"></path>
                    </svg>
                </button>
                <nav
                    role="tablist"
                    aria-label="Tasks"
                    aria-orientation="vertical"
                    @keydown=${/** @param {KeyboardEvent} event */ (event) => this.navigate(event)}
                >
                    ${this.tabs.map((tab) => this.renderTab(tab))}
                </nav>
            </div>
            <div id="content" class="content" ?hidden=${this.collapsed}>
                <header><slot name="header"></slot></header>
                <div class="panels">
                    ${this.tabs.map(
                        (tab) =>
                            html`<section
                                role="tabpanel"
                                id=${"panel-" + tab.id}
                                aria-labelledby=${"tab-" + tab.id}
                                ?hidden=${tab.id !== this.activeId}
                            >
                                <slot name=${tab.id}></slot>
                            </section>`
                    )}
                </div>
                <footer><slot name="footer"></slot></footer>
            </div>
        </div>`;
    }
}
