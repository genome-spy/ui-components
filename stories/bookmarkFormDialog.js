import { createRef, ref } from "lit/directives/ref.js";
import { html, unsafeStatic } from "lit/static-html.js";
import BaseDialog from "@genome-spy/ui-components/dialog";
import { bookmarkFormTag } from "./bookmarkForm.js";

const bookmarkForm = unsafeStatic(bookmarkFormTag);

class BookmarkFormDialog extends BaseDialog {
    /** @type {import("lit/directives/ref.js").Ref<import("./bookmarkForm.js").BookmarkForm>} */
    #form = createRef();

    constructor() {
        super();
        this.dialogTitle = "Save bookmark";
    }

    renderBody() {
        return html`
            <${bookmarkForm}
                autofocus
                hide-save-button
                ${ref(this.#form)}
                @bookmark-save=${this.#save}
            ></${bookmarkForm}>
        `;
    }

    renderButtons() {
        return [
            this.makeCloseButton("Cancel"),
            this.makeButton(
                "Save",
                () => {
                    this.#form.value.requestSubmit();
                    return true;
                },
                { isPrimary: true }
            ),
        ];
    }

    /** @param {CustomEvent<import("./bookmarkForm.js").BookmarkValues>} event */
    #save(event) {
        this.finish({ ok: true, data: event.detail });
        this.triggerClose();
    }
}

export const bookmarkFormDialogTag = "gs-story-bookmark-form-dialog";
customElements.define(bookmarkFormDialogTag, BookmarkFormDialog);
