/** @typedef {import("lit").TemplateResult} TemplateResult */
/** Shared toolbar intent for returning to an app's opening page without discarding work. */
import { LitElement, css, html } from "lit";
import { formStyles } from "./styles.js";
/** @tag gsa-home-button
 * @fires {CustomEvent<void>} gsa-home - Requests the opening page.
 */
export class HomeButton extends LitElement {
    static properties = { disabled: { type: Boolean, reflect: true } };
    constructor() {
        super();
        this.disabled = false;
    }

    /** Focus the native control when an app returns from its opening page.
     * @param {FocusOptions} [options]
     * @returns {void} */
    focus(options) {
        /** @type {HTMLButtonElement} */ (
            this.renderRoot.querySelector("button")
        )?.focus(options);
    }
    static styles = [
        formStyles,
        css`
            :host {
                display: inline-flex;
            }
            button {
                width: 36px;
                height: 36px;
                padding: 8px;
            }
            svg {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }
        `,
    ];

    /** The app handles navigation through its action boundary and retains its workspace.
     * @returns {TemplateResult} */
    render() {
        return html`<button
            class="btn"
            type="button"
            aria-label="Home"
            title="Back to landing page"
            ?disabled=${this.disabled}
            @click=${() => this.dispatchEvent(/** @type {CustomEvent<void>} */ (new CustomEvent("gsa-home", { bubbles: true, composed: true })))}
        >
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M3.5 10.7a2 2 0 0 1 .8-1.6l6.5-5a2 2 0 0 1 2.4 0l6.5 5a2 2 0 0 1 .8 1.6V18a2 2 0 0 1-2 2H15v-4a3 3 0 0 0-6 0v4H5.5a2 2 0 0 1-2-2z"
                />
            </svg>
        </button>`;
    }
}
