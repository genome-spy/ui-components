import { formStyles } from "./styles.js";
/** @typedef {import("./dialog.js").Dialog} Dialog */
/** @typedef {import("lit").TemplateResult} TemplateResult */
/** Shared workspace geometry; slotted content and the live plot stay app-owned. */
import { LitElement, css, html } from "lit";
const minimumPanelWidth = 280;
const maximumPanelWidth = 560;
const keyboardStep = 16;
/** @tag gsa-app-shell
 * @slot toolbar - App-owned command controls.
 * @slot viewport - Retained plot container.
 * @slot task-panel - Retained task contents, docked or in the narrow drawer.
 * @slot - App-owned dialogs.
 */
export class AppShell extends LitElement {
    static properties = {
        compactTasks: {
            type: Boolean,
            attribute: "compact-tasks",
            reflect: true,
        },
        narrow: { state: true },
        panelSide: { type: String, attribute: "panel-side", reflect: true },
    };

    /** @private */
    narrowScreen = matchMedia("(max-width: 650px)");

    /** @type {{ pointerId: number; x: number; width: number } | undefined} @private */
    drag;

    /** @type {ResizeObserver | undefined} @private */
    observer;

    /** @private */
    panelLimit = maximumPanelWidth;
    constructor() {
        super();
        this.compactTasks = false;
        /** @type {boolean} @private */
        this.narrow = this.narrowScreen.matches;
        /** @type {"left" | "right"} */
        this.panelSide = "right";
    }
    static styles = [
        formStyles,
        css`
            :host {
                display: block;
                height: 100dvh;
                min-height: 0;
            }
            :host([hidden]) {
                display: none;
            }
            main {
                display: grid;
                grid-template-rows: auto minmax(0, 1fr);
                height: 100%;
                min-height: 0;
            }
            .workspace {
                position: relative;
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                min-height: 0;
                overflow: hidden;
            }
            :host([compact-tasks]:not([panel-side="left"]))
                ::slotted([slot="viewport"]) {
                grid-column: 1;
                grid-row: 1;
            }
            :host([compact-tasks]:not([panel-side="left"]))
                ::slotted([slot="task-panel"]) {
                grid-column: 2;
                grid-row: 1;
            }
            :host([panel-side="left"]) .workspace {
                grid-template-columns: auto minmax(0, 1fr);
            }
            :host([panel-side="left"]) ::slotted([slot="viewport"]) {
                grid-column: 2;
                grid-row: 1;
            }
            :host([panel-side="left"]) ::slotted([slot="task-panel"]) {
                grid-column: 1;
                grid-row: 1;
                border-left: 0;
                border-right: 1px solid var(--gs-divider-color, #d0d0d0);
            }
            ::slotted([slot="toolbar"]) {
                box-sizing: border-box;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                padding: 10px 16px;
                background: white;
                border-bottom: 1px solid var(--gs-divider-color, #d0d0d0);
            }
            ::slotted(gsa-app-toolbar[slot="toolbar"]) {
                display: block;
                min-width: 0;
                padding: 0;
                border: 0;
            }
            ::slotted([slot="viewport"]) {
                box-sizing: border-box;
                min-width: 0;
                min-height: 0;
                overflow: auto;
                padding: 16px;
            }
            ::slotted([slot="task-panel"]) {
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                width: min(
                    var(
                        --_panel-width,
                        var(--gsa-panel-width, ${minimumPanelWidth}px)
                    ),
                    var(--_panel-limit, ${maximumPanelWidth}px)
                );
                min-width: 0;
                min-height: 0;
                overflow-y: auto;
                padding: var(--gsa-panel-padding, 16px);
                background: white;
                border: 0;
                border-left: 1px solid var(--gs-divider-color, #d0d0d0);
                border-radius: 0;
            }
            ::slotted(gsa-task-sidebar[slot="task-panel"]) {
                display: block;
                padding: 0;
                overflow: hidden;
            }
            ::slotted(gsa-task-sidebar[slot="task-panel"][collapsed]) {
                width: 88px;
            }
            .panel-resize {
                position: absolute;
                grid-area: 1 / 2 / 2 / 3;
                inset: 0 auto 0 -6px;
                width: 12px;
                z-index: 1;
                cursor: col-resize;
                touch-action: none;
                user-select: none;
            }
            :host([panel-side="left"]) .panel-resize {
                grid-column: 1 / 2;
                inset: 0 -6px 0 auto;
            }
            .panel-resize[hidden] {
                display: none;
            }
            .panel-resize::after {
                content: "";
                position: absolute;
                inset: 0 calc(50% - 1px);
                height: 36px;
                margin-block: auto;
                border-radius: 2px;
                background: var(--gs-divider-color, #d0d0d0);
            }
            .panel-resize:is(:hover, :focus-visible, [data-dragging])::after {
                background: var(--gs-focus-color, #2563a6);
            }
            .panel-resize:focus-visible {
                outline: 2px solid var(--gs-focus-color, #2563a6);
                outline-offset: -2px;
            }
            .tasks-drawer::part(dialog) {
                box-sizing: border-box;
                position: fixed;
                inset: 0 auto 0 0;
                margin: 0;
                padding: 0;
                border: 0;
                width: min(420px, 100%);
                max-width: none;
                height: 100dvh;
                max-height: none;
                background: white;
                color: inherit;
            }
            :host([panel-side="right"]) .tasks-drawer::part(dialog) {
                inset: 0 0 0 auto;
            }
            .tasks-drawer[open]::part(dialog) {
                display: grid;
                grid-template-rows: auto minmax(0, 1fr);
            }
            .drawer-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                border-bottom: 1px solid var(--gs-divider-color, #d0d0d0);
            }
            .drawer-header h2 {
                margin: 0;
                font-size: 16px;
            }
            .drawer-header button {
                min-height: 44px;
                padding-inline: 12px;
                font: inherit;
                color: inherit;
                background: white;
                border: 1px solid var(--gs-control-border, #ced4da);
                border-radius: 6px;
                cursor: pointer;
            }
            @media (max-width: 650px) {
                .panel-resize {
                    display: none;
                }
                :host([panel-side="left"]) .workspace {
                    grid-template-columns: 1fr;
                }
                :host([panel-side="left"]) ::slotted([slot="viewport"]),
                :host([panel-side="left"]) ::slotted([slot="task-panel"]) {
                    grid-column: 1;
                    grid-row: auto;
                    border-right: 0;
                }
                :host {
                    height: auto;
                    min-height: 100dvh;
                }
                main {
                    height: auto;
                    min-height: 100dvh;
                    grid-template-rows: auto auto;
                }
                .workspace {
                    grid-template-columns: 1fr;
                    overflow: visible;
                }
                ::slotted([slot="viewport"]) {
                    height: var(--gsa-narrow-viewport-height, 650px);
                }
                ::slotted([slot="task-panel"]),
                ::slotted(gsa-task-sidebar[slot="task-panel"][collapsed]) {
                    width: auto;
                    min-height: 400px;
                    border-left: 0;
                    border-top: 1px solid var(--gs-divider-color, #d0d0d0);
                }
                ::slotted(gsa-task-sidebar[slot="task-panel"][collapsed]) {
                    min-height: 0;
                }

                :host([compact-tasks]) {
                    height: 100dvh;
                }
                :host([compact-tasks]) main {
                    height: 100%;
                    min-height: 0;
                    grid-template-rows: auto minmax(0, 1fr);
                }
                :host([compact-tasks]) .workspace {
                    grid-template-rows: minmax(0, 1fr);
                    overflow: hidden;
                }
                :host([compact-tasks][panel-side])
                    ::slotted([slot="viewport"]) {
                    grid-column: 1;
                    grid-row: 1;
                    height: auto;
                }
                :host([compact-tasks][panel-side])
                    ::slotted([slot="task-panel"]) {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    border: 0;
                }
            }
        `,
    ];

    /** Observe the slots after mounting, and resume observation after reconnect.
     * @returns {void} */
    connectedCallback() {
        super.connectedCallback();
        this.narrowScreen.addEventListener("change", this.syncNarrowScreen);
        this.syncNarrowScreen();
        void this.updateComplete.then(() => this.observeLayout());
    }

    /** @returns {HTMLElement | null}
     * @private */
    get panel() {
        return /** @type {HTMLElement} */ (
            this.querySelector('[slot="task-panel"]')
        );
    }

    /** @returns {HTMLElement}
     * @private */
    get workspace() {
        return /** @type {HTMLElement} */ (
            this.renderRoot.querySelector(".workspace")
        );
    }

    /** Rebind when the task slot changes. The same observer sees collapse and window resize.
     * @returns {void}
     * @private */
    observeLayout() {
        if (!this.isConnected) return;
        this.observer ??= new ResizeObserver(() => this.updateGeometry());
        this.observer.disconnect();
        this.observer.observe(this.workspace);
        const panel = this.panel;
        if (panel) this.observer.observe(panel);
    }

    /** @returns {void}
     * @private */
    updateGeometry() {
        this.panelLimit = Math.max(
            minimumPanelWidth,
            Math.min(
                maximumPanelWidth,
                Math.floor(this.workspace.clientWidth / 2)
            )
        );
        this.style.setProperty("--_panel-limit", this.panelLimit + "px");
        const panel = this.panel;
        this.splitter.hidden =
            !panel || panel.hidden || panel.hasAttribute("collapsed");
        this.updateSplitter(this.currentWidth);
    }

    /** @returns {void} */
    disconnectedCallback() {
        super.disconnectedCallback();
        this.narrowScreen.removeEventListener("change", this.syncNarrowScreen);
        this.observer?.disconnect();
        this.observer = undefined;
        this.drag = undefined;
        this.renderRoot
            .querySelector(".panel-resize")
            ?.removeAttribute("data-dragging");
    }

    /** @returns {HTMLElement}
     * @private */
    get splitter() {
        return /** @type {HTMLElement} */ (
            this.renderRoot.querySelector(".panel-resize")
        );
    }

    /** Keep the announced size in sync without rerendering or replacing the plot.
     * @param {number} width
     * @returns {void}
     * @private */
    updateSplitter(width) {
        this.splitter.setAttribute("aria-valuemax", String(this.panelLimit));
        this.splitter.setAttribute(
            "aria-valuenow",
            String(
                Math.max(minimumPanelWidth, Math.min(this.panelLimit, width))
            )
        );
    }

    /** @returns {number}
     * @private */
    get currentWidth() {
        return this.panel?.offsetWidth ?? minimumPanelWidth;
    }

    /** @param {number} width
     * @returns {void}
     * @private */
    setWidth(width) {
        const next = Math.max(
            minimumPanelWidth,
            Math.min(this.panelLimit, Math.round(width))
        );
        this.style.setProperty("--_panel-width", next + "px");
        this.updateSplitter(next);
    }

    /** @param {PointerEvent} event
     * @returns {void}
     * @private */
    startResize(event) {
        if (!event.isPrimary || event.button !== 0 || this.drag) return;
        this.drag = {
            pointerId: event.pointerId,
            x: event.clientX,
            width: this.currentWidth,
        };
        this.splitter.setPointerCapture(event.pointerId);
        this.splitter.setAttribute("data-dragging", "");
    }

    /** @param {PointerEvent} event
     * @returns {void}
     * @private */
    moveResize(event) {
        const drag = this.drag;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const delta = event.clientX - drag.x;
        this.setWidth(
            drag.width + (this.panelSide === "left" ? delta : -delta)
        );
    }

    /** @param {PointerEvent} event
     * @returns {void}
     * @private */
    endResize(event) {
        if (this.drag?.pointerId !== event.pointerId) return;
        this.drag = undefined;
        this.splitter.removeAttribute("data-dragging");
    }

    /** Arrow keys move the separator in the physical direction of the key.
     * @param {KeyboardEvent} event
     * @returns {void}
     * @private */
    resizeWithKey(event) {
        const width = this.currentWidth;
        /** @type {number} */
        let next;
        switch (event.key) {
            case "Home":
                next = minimumPanelWidth;
                break;
            case "End":
                next = maximumPanelWidth;
                break;
            case "ArrowLeft":
            case "ArrowRight": {
                const growing =
                    event.key ===
                    (this.panelSide === "left" ? "ArrowRight" : "ArrowLeft");
                next = width + (growing ? keyboardStep : -keyboardStep);
                break;
            }
            default:
                return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.setWidth(next);
    }

    /** Close the modal before docking the same task controls at desktop widths.
     * @private */
    syncNarrowScreen = /** @returns {void} */ () => {
        this.narrow = this.narrowScreen.matches;
        if (!this.narrow)
            /** @type {Dialog} */ (
                this.renderRoot.querySelector(".tasks-drawer")
            )?.close();
    };

    /** Open the task panel from the shared toolbar without changing the plot layout.
     * @returns {void}
     * @private */
    openTasks() {
        const drawer = /** @type {Dialog} */ (
            this.renderRoot.querySelector(".tasks-drawer")
        );
        if (drawer && !drawer.open) drawer.showModal();
    }

    /** Layout updates never recreate app-supplied controls or the embed container.
     * @returns {TemplateResult} */
    render() {
        return html`<main>
                <slot
                    name="toolbar"
                    @gsa-open-tasks=${() => this.openTasks()}
                ></slot>
                <div class="workspace">
                    <slot name="viewport"></slot>
                    ${
                        this.compactTasks && this.narrow
                            ? html`<gs-dialog
                                  class="tasks-drawer"
                                  dialog-title="Task panel"
                              >
                                  <header class="drawer-header">
                                      <h2 id="tasks-title">Task panel</h2>
                                      <form method="dialog">
                                          <button class="btn" autofocus>
                                              Close
                                          </button>
                                      </form>
                                  </header>
                                  <slot
                                      name="task-panel"
                                      @slotchange=${() => this.observeLayout()}
                                  ></slot>
                              </gs-dialog>`
                            : html`<slot
                                  id="tasks-panel"
                                  name="task-panel"
                                  @slotchange=${() => this.observeLayout()}
                              ></slot>`
                    }
                    <div
                        class="panel-resize"
                        hidden
                        role="separator"
                        tabindex="0"
                        aria-label="Task panel width"
                        aria-orientation="vertical"
                        aria-controls="tasks-panel"
                        aria-valuemin=${minimumPanelWidth}
                        aria-valuemax=${maximumPanelWidth}
                        aria-valuenow=${minimumPanelWidth}
                        @pointerdown=${/** @param {PointerEvent} event */ (event) => this.startResize(event)}
                        @pointermove=${/** @param {PointerEvent} event */ (event) => this.moveResize(event)}
                        @lostpointercapture=${/** @param {PointerEvent} event */ (event) => this.endResize(event)}
                        @keydown=${/** @param {KeyboardEvent} event */ (event) => this.resizeWithKey(event)}
                    ></div>
                </div>
            </main>
            <slot></slot>`;
    }
}
