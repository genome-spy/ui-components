import { formStyles } from "./styles.js";
/** @typedef {import("lit").TemplateResult} TemplateResult */
/** @typedef {import("./filePicker.js").default} FilePicker */
/** @typedef {import("./filePicker.js").FilesChosenEvent} FilesChosenEvent */
/** Format-independent file/example presentation; apps read and validate the files. */
import { LitElement, css, html } from "lit";
/**
 * @typedef {object} DataExample
 * @property {string} id
 * @property {string} label
 */
/** @tag gsa-data-entry
 * @fires {CustomEvent<{files: File[]}>} gsa-files-selected - Supplies files for app validation.
 * @fires {CustomEvent<{id: string}>} gsa-example-selected - Requests the chosen example.
 * @slot message - App-owned validation or progress.
 */
export class DataEntry extends LitElement {
    static properties = {
        accept: { type: String },
        prompt: { type: String },
        pickerText: { type: String, attribute: "picker-text" },
        details: { type: String },
        examples: { attribute: false },
    };
    constructor() {
        super();
        this.accept = "";
        this.prompt = "Drop a file";
        this.pickerText = "or click to select";
        this.details = "";
        /** @type {readonly DataExample[]} */
        this.examples = [];
    }
    static styles = [
        formStyles,
        css`
            :host {
                display: block;
                max-width: 680px;
                margin: 20vh auto 0;
                padding: 24px;
                box-sizing: border-box;
            }
            #drop-zone::part(drop-zone) {
                box-sizing: border-box;
                min-block-size: 240px;
                align-items: stretch;
                padding: 0;
            }
            #drop {
                display: flex;
                flex: 1;
                min-inline-size: 0;
            }
            #drop::part(button) {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 16px;
            }
            #drop span {
                font-size: 20px;
                font-weight: 600;
            }
            #drop small {
                color: var(--gs-muted-text, #606060);
                font-size: 12px;
            }
            .examples {
                display: flex;
                gap: 12px;
                margin-top: 20px;
            }
            .examples button {
                flex: 1;
            }
            .message {
                min-height: 3lh;
                margin-top: 12px;
                overflow-wrap: anywhere;
                font-size: 12px;
            }
            @media (max-width: 650px) {
                :host {
                    margin-top: 12vh;
                }
            }
        `,
    ];

    /** Open the native picker for initial input or an app's replace-data command. */
    openPicker = /** @returns {void} */ () => {
        /** @type {FilePicker} */ (
            this.renderRoot.querySelector("#drop")
        ).openPicker();
    };

    /** Focus the primary input control without opening its file picker.
     * @param {FocusOptions} [options]
     * @returns {void} */
    focus(options) {
        /** @type {FilePicker} */ (
            this.renderRoot.querySelector("#drop")
        )?.focus(options);
    }

    /** Forward original files selected through either path to the app.
     * @private */
    selectFiles =
        /** @param {FilesChosenEvent} event
         * @returns {void} */ (event) => {
            event.stopPropagation();
            this.dispatchEvent(
                /** @type {CustomEvent<readonly File[]>} */ (
                    new CustomEvent("gsa-files-selected", {
                        detail: Array.from(event.detail.files),
                        bubbles: true,
                        composed: true,
                    })
                )
            );
        };

    /** @param {string} id
     * @returns {void}
     * @private */
    selectExample(id) {
        this.dispatchEvent(
            /** @type {CustomEvent<string>} */ (
                new CustomEvent("gsa-example-selected", {
                    detail: id,
                    bubbles: true,
                    composed: true,
                })
            )
        );
    }

    /** App-specific labels and examples occupy one shared, keyboard-accessible entry.
     * @returns {TemplateResult} */
    render() {
        return html`<gs-upload-drop-zone
                id="drop-zone"
                @gs-files-chosen=${this.selectFiles}
            >
                <gs-file-picker id="drop" slot="picker" .accept=${this.accept}>
                    <span>${this.prompt}</span><small>${this.pickerText}</small>
                    ${this.details ? html`<small>${this.details}</small>` : null}
                </gs-file-picker>
            </gs-upload-drop-zone>
            <div class="examples">
                ${this.examples.map(
                    (example) =>
                        html`<button
                            class="btn"
                            type="button"
                            data-example=${example.id}
                            @click=${() => this.selectExample(example.id)}
                        >
                            ${example.label}
                        </button>`
                )}
            </div>
            <div class="message"><slot name="message"></slot></div>`;
    }
}
