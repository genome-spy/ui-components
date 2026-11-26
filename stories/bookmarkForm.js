import { LitElement, html, nothing } from "lit";
import { FormController, formField } from "@genome-spy/ui-components";
import { formStyles } from "@genome-spy/ui-components/styles";

/** @typedef {{ title: string, notes: string }} BookmarkValues */

export class BookmarkForm extends LitElement {
    static styles = formStyles;

    static properties = {
        titleValue: { state: true },
        notes: { state: true },
        hideSaveButton: { type: Boolean, attribute: "hide-save-button" },
    };

    constructor() {
        super();
        this.titleValue = "";
        this.notes = "";
        this.hideSaveButton = false;

        this.form = new FormController(this);
        this.form.defineField("title", {
            valueKey: "titleValue",
            validate: (value) =>
                value.trim() ? null : "Enter a bookmark title.",
        });
        this.form.defineField("notes", {
            valueKey: "notes",
            validate: () => null,
        });
    }

    requestSubmit() {
        const form = /** @type {HTMLFormElement} */ (
            this.renderRoot.querySelector("form")
        );
        form.requestSubmit();
    }

    /** @param {FocusOptions} [options] */
    focus(options) {
        this.renderRoot?.querySelector("input")?.focus(options);
    }

    /** @param {SubmitEvent} event */
    async #save(event) {
        event.preventDefault();

        if (this.form.validateAll()) {
            await this.updateComplete;
            this.focus();
            return;
        }

        /** @type {BookmarkValues} */
        const detail = {
            title: this.titleValue.trim(),
            notes: this.notes.trim(),
        };
        this.dispatchEvent(new CustomEvent("bookmark-save", { detail }));
    }

    render() {
        return html`
            <form novalidate @submit=${this.#save}>
                <div class="gs-form-group">
                    <label for="bookmark-title">Title (required)</label>
                    <input
                        id="bookmark-title"
                        type="text"
                        required
                        aria-describedby=${
                            this.form.error("title")
                                ? "bookmark-title-error"
                                : nothing
                        }
                        ${formField(this.form, "title")}
                    />
                    <div id="bookmark-title-error">
                        ${this.form.feedback("title")}
                    </div>
                </div>
                <div class="gs-form-group">
                    <label for="bookmark-notes">Notes (optional)</label>
                    <textarea
                        id="bookmark-notes"
                        rows="3"
                        aria-describedby="bookmark-notes-hint"
                        ${formField(this.form, "notes")}
                    ></textarea>
                    <small id="bookmark-notes-hint">
                        Shown when you reopen the bookmark.
                    </small>
                </div>
                ${
                    this.hideSaveButton
                        ? nothing
                        : html`<button class="btn" type="submit">Save</button>`
                }
            </form>
        `;
    }
}

export const bookmarkFormTag = "gs-story-bookmark-form";
customElements.define(bookmarkFormTag, BookmarkForm);
