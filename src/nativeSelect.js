/** A labeled native dropdown with room for its arrow; apps own choices and actions. */
import { LitElement, css, html } from "lit";
import { live } from "lit/directives/live.js";
import { repeat } from "lit/directives/repeat.js";
import { formStyles } from "./styles.js";

/**
 * @typedef {object} NativeSelectOption
 * @property {string} value Exact option ID, kept separate from the displayed label.
 * @property {string} label Text shown in the button and menu.
 * @property {boolean} [disabled] Whether the option can be chosen.
 * @property {string} [title] Additional native tooltip text.
 */

/**
 * Choose one plain-text app setting, such as a reference, method or display mode.
 * Keeps native keyboard/picker behavior, a non-selectable placeholder and bounded labels.
 * The app supplies options, validates choices and saves accepted state. Assigning
 * properties emits no change, so restoring state does not trigger app actions.
 * For custom option markup use CustomSelect; for multiple values use MultiSelect.
 * This control does not submit a value with an HTML form; use a normal select for that.
 *
 * @tag gs-native-select
 * @fires {CustomEvent<{value: string}>} change - A user choice; bubbles across shadow roots.
 * @csspart control - The native select, including its padded arrow area.
 * @csspart label - The visible label; hideLabel preserves the accessible name.
 * @cssprop --gs-control-border - Border color.
 * @cssprop --gs-control-radius - Border radius.
 * @cssprop --gs-control-background - Button and picker background.
 * @cssprop --gs-focus-color - Keyboard focus outline.
 */
export default class NativeSelect extends LitElement {
    static properties = {
        label: { type: String },
        placeholder: { type: String },
        value: { type: String },
        options: { attribute: false },
        disabled: { type: Boolean, reflect: true },
        hideLabel: { type: Boolean, attribute: "hide-label" },
    };

    constructor() {
        super();
        /** Accessible name, also shown unless hideLabel is set. */
        this.label = "";
        /** Non-selectable empty-state text; empty means no placeholder. */
        this.placeholder = "";
        /** Selected option ID. Assigning it never emits an event. */
        this.value = "";
        /** @type {readonly NativeSelectOption[]} Choices in display order. */
        this.options = [];
        /** Disable the native control using the shared form appearance. */
        this.disabled = false;
        /** Hide only the visual label, retaining the accessible name. */
        this.hideLabel = false;
    }

    static styles = [
        formStyles,
        css`
            :host {
                display: block;
                min-inline-size: 0;
            }
            .gs-form-group {
                margin: 0;
            }
            .gs-form-group > label {
                display: block;
                min-inline-size: 0;
            }
            .gs-form-group select {
                min-inline-size: 0;
                padding-inline-end: 2.25rem;
                font: inherit;
            }
            @supports (appearance: base-select) {
                .gs-form-group select,
                .gs-form-group select::picker(select) {
                    appearance: base-select;
                }
                .gs-form-group select {
                    white-space: nowrap;
                    overflow: hidden;
                }
                select > button {
                    min-inline-size: 0;
                    inline-size: 100%;
                }
                selectedcontent {
                    display: block;
                    min-inline-size: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                select::picker-icon {
                    display: none;
                }
                select::picker(select) {
                    box-sizing: border-box;
                    inline-size: max-content;
                    min-inline-size: anchor-size(width);
                    max-inline-size: min(48rem, calc(100vw - 16px));
                    max-block-size: min(24rem, calc(100dvh - 16px));
                    overflow: auto;
                    color: var(--gs-control-text, #212529);
                    background: var(--gs-control-background, #fff);
                    border: var(--form-control-border);
                    border-radius: var(--form-control-border-radius);
                    font: inherit;
                }
                option {
                    white-space: normal;
                    overflow-wrap: anywhere;
                    padding: 0.375em 0.75em;
                }
            }
            @media (forced-colors: active) {
                .gs-form-group select {
                    appearance: auto;
                    background-image: none;
                }
            }
        `,
    ];

    /** Report a user choice; assigning a value from the caller emits no event.
     * @param {Event} event
     */
    #choose = (event) => {
        event.stopPropagation();
        // Reflect the native choice so a controlled binding can also restore a rejected change.
        this.value = /** @type {HTMLSelectElement} */ (
            event.currentTarget
        ).value;
        this.dispatchEvent(
            new CustomEvent("change", {
                detail: { value: this.value },
                bubbles: true,
                composed: true,
            })
        );
    };

    /**
     * Keep native keyboard, focus and option behavior beneath the shared appearance.
     * Native selectedcontent copies an option's label. Give changed labels new option
     * nodes so that copy cannot retain a previous experiment's text.
     * @returns {import("lit").HTMLTemplateResult}
     */
    render() {
        return html`<div class="gs-form-group"><label>
            <span part="label" ?hidden=${this.hideLabel}>${this.label}</span>
            <span class="control">
                <select
                    part="control"
                    aria-label=${this.label}
                    ?disabled=${this.disabled}
                    @change=${this.#choose}
                >
                    <button><selectedcontent></selectedcontent></button>
                    ${
                        this.placeholder
                            ? html`<option
                                  value=""
                                  disabled
                                  hidden
                                  .selected=${live(this.value === "")}
                              >
                                  ${this.placeholder}
                              </option>`
                            : null
                    }
                    ${repeat(
                        this.options,
                        (option) =>
                            JSON.stringify([option.value, option.label]),
                        (option) =>
                            html`<option
                                value=${option.value}
                                .selected=${live(option.value === this.value)}
                                ?disabled=${option.disabled}
                                title=${option.title ?? ""}
                            >
                                ${option.label}
                            </option>`
                    )}
                </select>
        </label></div>`;
    }
}
