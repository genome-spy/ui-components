import { html, unsafeStatic } from "lit/static-html.js";
import { bookmarkFormTag } from "./bookmarkForm.js";
import bookmarkFormSource from "./bookmarkForm.js?raw";

const bookmarkForm = unsafeStatic(bookmarkFormTag);

export default { title: "Utilities/Form Helpers" };

export const ValidatedForm = {
    parameters: {
        docs: {
            description: {
                story: "Try Save with an empty title to see the inline error. Fill in the title, then press Enter or choose Save to see the submitted values.",
            },
            source: {
                language: "javascript",
                code: bookmarkFormSource.trim(),
            },
        },
    },
    render: () => html`
        <div style="max-inline-size: 32rem;">
            <${bookmarkForm}
                @bookmark-save=${(
                    /** @type {CustomEvent<import("./bookmarkForm.js").BookmarkValues>} */ event
                ) => {
                    const output = /** @type {HTMLOutputElement} */ (
                        event.currentTarget.nextElementSibling
                    );
                    const { title, notes } = event.detail;
                    output.textContent = notes
                        ? `Saved “${title}” with notes: ${notes}`
                        : `Saved “${title}”.`;
                }}
            ></${bookmarkForm}>
            <output
                style="display: block; margin-block-start: 0.75rem;"
            ></output>
        </div>
    `,
};
