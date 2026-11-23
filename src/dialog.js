import { LitElement, html, css, nothing } from "lit";
import { faStyles, renderIcon } from "./internal/icon.js";
import { dialogLayoutStyles } from "./internal/dialogLayoutStyles.js";
import { formStyles } from "./internal/formStyles.js";

const DEFAULT_ACTION_INPUT_TYPES = new Set([
    "text",
    "search",
    "email",
    "url",
    "password",
    "tel",
    "number",
    "date",
    "time",
    "datetime-local",
    "month",
    "week",
]);

/**
 * @typedef {object} DialogFinishDetail
 * @property {boolean} ok
 * @property {string} [reason]
 * @property {unknown} [data]
 */

/**
 * Base class for native dialogs. Subclasses supply content and actions through
 * renderBody() and renderButtons(), and can also override the header and footer.
 *
 * @fires {CustomEvent<DialogFinishDetail>} gs-dialog-finished - Reports the outcome in event.detail.
 * @fires {Event} gs-dialog-opened - Fires on the host after the native dialog opens.
 * @fires {CustomEvent} gs-dialog-closed - Fires after the native dialog closes.
 * @csspart dialog - Native dialog frame.
 * @csspart header - Title area.
 * @csspart body - Content area.
 * @csspart footer - Action area.
 * @csspart button - Action created by makeButton().
 * @csspart primary-button - Primary action created by makeButton().
 * @cssprop --gs-dialog-background - Dialog surface.
 * @cssprop --gs-dialog-text - Dialog text color.
 * @cssprop --gs-dialog-backdrop - Modal backdrop color.
 * @cssprop --gs-dialog-radius - Dialog corner radius.
 * @cssprop --gs-dialog-stroke-color - Footer separator color.
 * @cssprop --gs-theme-primary - Primary action fill color.
 * @cssprop --gs-theme-on-primary - Primary action text color.
 * @cssprop --gs-primary-button-background - Custom primary action fill or gradient.
 * @cssprop --gs-primary-button-hover-background - Custom hovered primary action fill or gradient.
 */
export default class BaseDialog extends LitElement {
    static properties = {
        dialogTitle: {},
        dialogDescribedBy: { type: String, attribute: "dialog-described-by" },
        modal: { type: Boolean },
    };

    /** @type {HTMLDialogElement} */
    #dialog;

    /** @type {boolean | undefined} */
    #openOnFirstRender;

    /** @type {Animation | undefined} */
    #closeTransition;

    /** Open when first rendered. Set to false for a dialog opened on demand. */
    openOnConnect = true;

    static styles = [
        formStyles,
        dialogLayoutStyles,
        faStyles,
        css`
            dialog {
                font-family: var(--gs-font-family, sans-serif);
                font-size: var(--gs-font-size, 14px);
                padding: 0;

                box-shadow: 0px 3px 15px 0px rgba(0, 0, 0, 0.21);
                background: var(--gs-dialog-background, white);
                color: var(--gs-dialog-text, #212529);
                border-radius: var(--gs-dialog-radius, 3px);
                border: none;
                min-width: 300px;

                opacity: 1;
                transition: opacity 0.2s ease-in-out;

                @starting-style {
                    opacity: 0;
                }

                @media (prefers-reduced-motion: no-preference) {
                    transform: translateY(0);
                    transition-property: opacity, transform;

                    @starting-style {
                        transform: translateY(-15px);
                    }
                }
            }

            dialog.closing {
                opacity: 0;

                @media (prefers-reduced-motion: no-preference) {
                    transform: translateY(-15px);
                }
            }

            dialog:modal {
                overscroll-behavior: contain;
            }

            dialog::backdrop {
                background-color: var(
                    --gs-dialog-backdrop,
                    rgb(75 75 75 / 40%)
                );
                opacity: 1;
                overflow: hidden;
                overscroll-behavior: contain;
                transition: opacity 0.3s ease-in-out;

                @starting-style {
                    opacity: 0;
                }
            }

            dialog.closing::backdrop {
                opacity: 0;
                transition-duration: 0.2s;
            }

            @media (prefers-reduced-motion: reduce) {
                dialog,
                dialog::backdrop,
                dialog.closing::backdrop {
                    transition-duration: 0.1s;
                }
            }
        `,
    ];

    constructor() {
        super();

        /** @type {string | import("lit").TemplateResult} Title text or Lit markup. */
        this.dialogTitle = null;

        /** @type {string | null} Space-separated IDs of description elements in the dialog's render root. */
        this.dialogDescribedBy = null;

        /** Open in the browser's modal top layer. Defaults to true. */
        this.modal = true;

        this.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
            this.#handleKeyDown(e);
            e.stopPropagation();
        });
    }

    /**
     * @param {KeyboardEvent} event
     */
    #handleKeyDown(event) {
        if (event.defaultPrevented) {
            return;
        }

        const isPlainEnter =
            event.key == "Enter" &&
            !event.isComposing &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey;

        if (isPlainEnter) {
            const target = /** @type {HTMLElement | null} */ (
                event
                    .composedPath()
                    .find((entry) => entry instanceof HTMLElement)
            );
            if (this.#canTriggerDefaultAction(target)) {
                const primaryButton = this.#getPrimaryButton();
                if (primaryButton) {
                    event.preventDefault();
                    primaryButton.click();
                }
            }
        }
    }

    /**
     * @param {HTMLElement | null} target
     * @returns {boolean}
     */
    #canTriggerDefaultAction(target) {
        const root =
            this.renderRoot instanceof ShadowRoot ? this.renderRoot : null;
        const element =
            target ?? /** @type {HTMLElement | null} */ (root?.activeElement);
        if (!element) {
            return true;
        }

        const input = /** @type {HTMLInputElement | null} */ (
            element.closest("input")
        );
        if (!input) {
            return false;
        }

        const type = (input.type || "text").toLowerCase();
        return DEFAULT_ACTION_INPUT_TYPES.has(type);
    }

    #getPrimaryButton() {
        return /** @type {HTMLButtonElement | null} */ (
            this.renderRoot.querySelector(
                "footer button[data-primary]:not(:disabled)"
            )
        );
    }

    firstUpdated() {
        this.#dialog = this.renderRoot.querySelector("dialog");
        const shouldOpen = this.#openOnFirstRender ?? this.openOnConnect;
        this.#openOnFirstRender = undefined;
        if (shouldOpen) {
            this.openDialog();
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.#openOnFirstRender = undefined;
        // Removing an open native dialog drops it from the modal top layer
        // while leaving its open flag set. Reset it for the next mounting.
        if (this.dialogOpen) {
            this.#closeNativeDialog();
        }
    }

    /** Whether the native dialog is open. @protected */
    get dialogOpen() {
        return this.#dialog?.open ?? false;
    }

    /**
     * Open the mounted dialog, after its first render if needed.
     * @param {boolean} [modal]
     * @protected
     */
    openDialog(modal = this.modal) {
        if (!this.isConnected || this.dialogOpen || this.#openOnFirstRender) {
            return;
        }

        this.modal = modal;
        if (!this.#dialog) {
            this.#openOnFirstRender = true;
            return;
        }

        this.#closeTransition = undefined;
        this.#dialog.classList.remove("closing");
        if (modal) {
            this.#dialog.showModal();
        } else {
            this.#dialog.show();
        }

        this.#reflectOpen();
        if (this.dialogOpen) {
            this.#focusAutofocusTarget();
            this.dispatchEvent(new Event("gs-dialog-opened"));
        }
    }

    #reflectOpen() {
        this.toggleAttribute("open", this.dialogOpen);
    }

    #focusAutofocusTarget() {
        const autofocusTarget = /** @type {HTMLElement | null} */ (
            this.renderRoot.querySelector("[autofocus]")
        );
        if (!autofocusTarget) {
            return;
        }

        // Queue once immediately and once on the next frame so custom elements
        // have time to render internal focus targets.
        const focus = () => {
            if (this.isConnected && this.dialogOpen) {
                autofocusTarget.focus();
            }
        };
        queueMicrotask(focus);
        requestAnimationFrame(focus);
    }

    /**
     * Subclasses call this to report the dialog result.
     *
     * @param {DialogFinishDetail} detail
     * @protected
     */
    finish(detail) {
        this.dispatchEvent(
            new CustomEvent("gs-dialog-finished", {
                detail,
                bubbles: true,
                composed: true,
            })
        );
    }

    /**
     * Return whether the user can dismiss the dialog with a native close
     * request or the built-in close button. Override using reactive state
     * and show a status message while dismissal is blocked.
     *
     * @protected
     * @returns {boolean}
     */
    canCancel() {
        return true;
    }

    /**
     * ESC or native cancel event handler.
     *
     * @param {Event} [event]
     */
    #onDialogCancel(event) {
        event?.preventDefault();
        if (
            !this.#dialog.open ||
            this.#dialog.classList.contains("closing") ||
            !this.canCancel()
        ) {
            return;
        }

        this.finish({ ok: false, reason: "cancel" });
        this.triggerClose();
    }

    #onDialogClose() {
        // A close event may arrive after the element has already reopened.
        if (this.dialogOpen) {
            return;
        }
        this.#reflectOpen();
        this.dispatchEvent(
            new CustomEvent("gs-dialog-closed", {
                bubbles: true,
                composed: true,
            })
        );
    }

    #closeNativeDialog() {
        this.#closeTransition = undefined;
        this.#dialog.close();
        this.#reflectOpen();
    }

    /**
     * @protected
     */
    triggerClose() {
        const dialog = this.#dialog;
        if (!dialog) {
            this.#openOnFirstRender = false;
            return;
        }
        if (!dialog.open || dialog.classList.contains("closing")) {
            return;
        }

        dialog.classList.add("closing");

        // Keep the dialog visible during its own fade, even in browsers
        // without CSS top-layer exit transitions.
        const fade = dialog
            .getAnimations()
            .find(
                (animation) =>
                    animation instanceof CSSTransition &&
                    animation.transitionProperty === "opacity"
            );
        if (fade) {
            this.#closeTransition = fade;
            const close = () => {
                if (this.#closeTransition === fade) {
                    this.#closeNativeDialog();
                }
            };
            void fade.finished.then(close, close);
        } else {
            this.#closeNativeDialog();
        }
    }

    /**
     * @protected
     */
    onCloseButtonClick() {
        if (typeof this.#dialog.requestClose === "function") {
            this.#dialog.requestClose();
        } else {
            this.#onDialogCancel();
        }
    }

    /**
     * @protected
     * @returns {import("lit").HTMLTemplateResult}
     */
    renderHeader() {
        return html`${
            this.dialogTitle
                ? html`<span id="dialog-title">${this.dialogTitle}</span>`
                : nothing
        }`;
    }

    /**
     * @protected
     * @returns {import("lit").HTMLTemplateResult}
     */
    renderBody() {
        return html``;
    }

    /**
     * @protected
     * @returns {import("lit").HTMLTemplateResult | typeof nothing}
     */
    renderFooter() {
        const buttons = this.renderButtons();
        if (buttons?.length) {
            return html`<div>${buttons}</div>`;
        } else {
            return nothing;
        }
    }

    /**
     * @protected
     * @returns {import("lit").HTMLTemplateResult[]}
     */
    renderButtons() {
        return [this.makeCloseButton()];
    }

    /**
     * Creates a button for the dialog footer.
     * The dialog is closed automatically unless the callback returns a truthy value.
     * Set the autofocus option on the action that should receive initial focus.
     *
     * @param {string} title
     * @param {() => boolean | void | Promise<boolean | void>} callback If returns truthy value, dialog closing is canceled
     * @param {{
     *  iconDef?: import("@fortawesome/free-solid-svg-icons").IconDefinition,
     *  autofocus?: boolean,
     *  disabled?: boolean,
     *  preventMouseDown?: boolean,
     *  isPrimary?: boolean,
     * }} [options]
     * @protected
     * @returns {import("lit").HTMLTemplateResult}
     */
    makeButton(title, callback, options = {}) {
        const {
            iconDef,
            autofocus = false,
            disabled = false,
            preventMouseDown = false,
            isPrimary = false,
        } = options;
        // Ugly hack. TODO: Allow defining icon position in the future
        const reverse = title == "Next";
        const classNames = ["btn"];
        if (reverse) {
            classNames.push("reverse");
        }
        if (isPrimary) {
            classNames.push("btn-primary");
        }
        return html`<button
            class=${classNames.join(" ")}
            part=${isPrimary ? "button primary-button" : "button"}
            type="button"
            title=${title}
            ?autofocus=${autofocus}
            ?disabled=${disabled}
            ?data-primary=${isPrimary}
            @mousedown=${
                preventMouseDown
                    ? (/** @type {MouseEvent} */ event) =>
                          event.preventDefault()
                    : undefined
            }
            @click=${async () => {
                const cancelClose = !!(await callback());
                if (!cancelClose) {
                    this.triggerClose();
                }
            }}
        >
            ${iconDef ? renderIcon(iconDef) : nothing} ${title}
        </button>`;
    }

    /**
     * Create a close action that honors canCancel().
     *
     * @param {string} [label]
     * @param {{autofocus?: boolean}} [options]
     * @protected
     * @returns {import("lit").HTMLTemplateResult}
     */
    makeCloseButton(label = "Close", { autofocus = false } = {}) {
        return this.makeButton(
            label,
            () => {
                this.onCloseButtonClick();
                return true;
            },
            { autofocus, disabled: !this.canCancel(), preventMouseDown: true }
        );
    }

    /**
     * @protected
     * @returns {import("lit").HTMLTemplateResult}
     */
    renderDialogContent() {
        const header = this.renderHeader();
        const footer = this.renderFooter();
        return html`
            ${header ? html`<header part="header">${header}</header>` : nothing}
            <section part="body">${this.renderBody()}</section>
            ${footer ? html`<footer part="footer">${footer}</footer>` : nothing}
        `;
    }

    /** @returns {import("lit").HTMLTemplateResult} */
    render() {
        return html`
            <dialog
                class="gs-dialog-layout"
                part="dialog"
                aria-labelledby=${this.dialogTitle ? "dialog-title" : nothing}
                aria-label="GenomeSpy"
                aria-describedby=${this.dialogDescribedBy || nothing}
                closedby=${this.canCancel() ? nothing : "none"}
                @cancel=${this.#onDialogCancel}
                @close=${this.#onDialogClose}
            >
                ${this.renderDialogContent()}
            </dialog>
        `;
    }
}

/**
 * A persistent dialog for content owned by the caller. Starts closed and
 * retains slotted forms and controls between openings.
 *
 * @tag gs-dialog
 * @attr {string} dialog-title - Accessible name for the dialog.
 * @attr {boolean} open - Read-only reflection of the native open state.
 * @slot - Dialog content, including any headings, forms, and actions.
 * @csspart dialog - Native dialog frame.
 * @cssprop --gs-basic-spacing - Padding inside the dialog frame.
 */
export class Dialog extends BaseDialog {
    static properties = {
        ...BaseDialog.properties,
        dialogTitle: { attribute: "dialog-title" },
        dismissDisabled: { type: Boolean, attribute: "dismiss-disabled" },
    };

    static styles = [
        ...BaseDialog.styles,
        css`
            :host {
                display: contents;
            }

            dialog {
                box-sizing: border-box;
                min-width: 0;
                padding: var(--gs-basic-spacing, 10px);
            }
        `,
    ];

    openOnConnect = false;

    constructor() {
        super();
        /** Block platform dismissal requests, such as Escape, during pending work. */
        this.dismissDisabled = false;
    }

    /** Whether the dialog is open. The host reflects this state as `[open]`. */
    get open() {
        return this.dialogOpen;
    }

    /** Open in the browser's modal top layer after mounting this element. */
    showModal() {
        this.openDialog(true);
    }

    /** Open nonmodally after mounting this element. */
    show() {
        this.openDialog(false);
    }

    /** Close through the native dialog lifecycle or cancel a queued opening. */
    close() {
        this.triggerClose();
    }

    /** @protected */
    canCancel() {
        return !this.dismissDisabled;
    }

    /** @protected */
    renderDialogContent() {
        return html`<span id="dialog-title" hidden>${this.dialogTitle}</span
            ><slot @submit=${this.#onSlotSubmit}></slot>`;
    }

    /** @param {SubmitEvent} event */
    #onSlotSubmit(event) {
        const form = event.target;
        if (
            !this.open ||
            event.defaultPrevented ||
            !(form instanceof HTMLFormElement)
        ) {
            return;
        }

        const method =
            event.submitter?.getAttribute("formmethod") ??
            form.getAttribute("method");
        if (method?.toLowerCase() !== "dialog") {
            return;
        }

        // A slotted form cannot find the shadow dialog as a DOM ancestor.
        // Leave a form inside an intervening native dialog to the browser.
        const slotOrDialog = event
            .composedPath()
            .find(
                (node) =>
                    node === event.currentTarget ||
                    node instanceof HTMLDialogElement
            );
        if (slotOrDialog === event.currentTarget) {
            event.preventDefault();
            this.close();
        }
    }
}

/**
 * @typedef {object} DialogOptions
 * @property {HTMLElement | ShadowRoot} [mount] Element or shadow root supplying the dialog's theme. Defaults to document.body.
 */

/**
 * Open an auto-opening BaseDialog subclass and resolve to its result or a
 * cancellation on close. Use showDialogWithElement() for manual opening.
 *
 * @template {BaseDialog} T
 * @param {string} tagName - Custom element name, e.g. "gs-upload-dialog".
 * @param {(el: T) => void} [configure] - Optional function to configure props.
 * @param {DialogOptions} [options]
 * @returns {Promise<DialogFinishDetail>}
 */
export async function showDialog(tagName, configure, options) {
    return mountResultDialog(tagName, configure, options, true).promise;
}

/**
 * Open an auto-opening BaseDialog subclass and map the result.
 *
 * @template {BaseDialog} T
 * @template R
 * @param {string} tagName - Custom element name, e.g. "gs-upload-dialog".
 * @param {((el: T) => void) | undefined} configure - Optional function to configure props.
 * @param {(detail: DialogFinishDetail) => R | Promise<R>} map
 * @param {DialogOptions} [options]
 * @returns {Promise<R>}
 */
export function showDialogAndMap(tagName, configure, map, options) {
    return showDialog(tagName, configure, options).then(map);
}

/**
 * Open an auto-opening BaseDialog subclass and resolve to a boolean.
 *
 * @template {BaseDialog} T
 * @param {string} tagName - Custom element name, e.g. "gs-upload-dialog".
 * @param {(el: T) => void} [configure] - Optional function to configure props.
 * @param {DialogOptions} [options]
 * @returns {Promise<boolean>}
 */
export function showDialogOk(tagName, configure, options) {
    return showDialogAndMap(
        tagName,
        configure,
        (detail) => !!detail.ok,
        options
    );
}

/**
 * Mount a BaseDialog subclass and return its element and result promise.
 * For dialogs opened on demand, open the returned element after mounting.
 * If the dialog closes without reporting a result, the promise resolves
 * to a cancellation.
 *
 * @template {BaseDialog} T
 * @param {string} tagName - Custom element name, e.g. "gs-upload-dialog".
 * @param {(el: T) => void} [configure] - Optional function to configure props.
 * @param {DialogOptions} [options]
 * @returns {{element: T, promise: Promise<DialogFinishDetail>}}
 */
export function showDialogWithElement(tagName, configure, options) {
    return mountResultDialog(tagName, configure, options);
}

/**
 * @template {BaseDialog} T
 * @param {string} tagName
 * @param {(el: T) => void} [configure]
 * @param {DialogOptions} [options]
 * @param {boolean} [requireAutoOpen]
 * @returns {{element: T, promise: Promise<DialogFinishDetail>}}
 */
function mountResultDialog(
    tagName,
    configure,
    { mount = document.body } = {},
    requireAutoOpen = false
) {
    const element = mount.ownerDocument.createElement(tagName);
    if (!(element instanceof BaseDialog)) {
        throw new TypeError(
            `Register "${tagName}" as a BaseDialog subclass before mounting it.`
        );
    }
    const el = /** @type {T} */ (element);
    configure?.(el);
    if (requireAutoOpen && !el.openOnConnect) {
        throw new TypeError(
            `"${tagName}" does not open on connect. Use showDialogWithElement() to open it manually.`
        );
    }

    const promise = new Promise((resolve) => {
        /** @param {CustomEvent<DialogFinishDetail>} event */
        const finish = (event) => {
            if (event.composedPath()[0] === el) {
                el.removeEventListener("gs-dialog-finished", finish);
                resolve(event.detail);
            }
        };
        /** @param {Event} event */
        const close = (event) => {
            if (event.composedPath()[0] === el) {
                el.removeEventListener("gs-dialog-finished", finish);
                el.removeEventListener("gs-dialog-closed", close);
                el.remove();
                resolve({ ok: false, reason: "cancel" });
            }
        };
        el.addEventListener("gs-dialog-finished", finish);
        el.addEventListener("gs-dialog-closed", close);
    });

    mount.appendChild(el);

    return { element: el, promise };
}
