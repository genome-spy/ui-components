/** @typedef {import("lit").ReactiveControllerHost} ReactiveControllerHost */
/** @typedef {import("lit").TemplateResult} TemplateResult */
/** Bind the two bookmark fields to the editor's existing draft. */
import { html } from "lit";
import { FormController } from "./formController.js";
import { formField } from "./formField.js";
const titleLimit = 120;
const notesLimit = 10000;
/** @param {ReactiveControllerHost} host
 * @returns {FormController} */
export function createBookmarkForm(host) {
    const form = new FormController(host);
    form.defineField("name", {
        valueKey: "name",
        validate: (name) =>
            name.trim() && name.length <= titleLimit
                ? null
                : "Use a bookmark name of 1-120 characters.",
    });
    form.defineField("notes", {
        valueKey: "notes",
        validate: (notes) =>
            notes.length <= notesLimit
                ? null
                : "Use bookmark notes of at most 10000 characters.",
    });
    return form;
}
/** @param {FormController} form
 * @returns {TemplateResult} */
export function bookmarkFields(form) {
    return html`
        <div class="gs-form-group">
            <label for="bookmark-name">Title</label>
            <input
                id="bookmark-name"
                name="name"
                type="text"
                required
                maxlength=${titleLimit}
                autofocus
                aria-describedby="bookmark-name-feedback"
                ${formField(form, "name")}
            />
            <div id="bookmark-name-feedback" aria-live="polite">
                ${form.feedback("name")}
            </div>
        </div>
        <div class="gs-form-group">
            <label for="bookmark-notes">Notes (optional)</label>
            <textarea
                id="bookmark-notes"
                name="notes"
                rows="4"
                maxlength=${notesLimit}
                aria-describedby="bookmark-notes-hint bookmark-notes-feedback"
                ${formField(form, "notes")}
            ></textarea>
            <div id="bookmark-notes-feedback" aria-live="polite">
                ${form.feedback("notes")}
            </div>
            <small id="bookmark-notes-hint">Markdown is supported.</small>
        </div>
    `;
}
