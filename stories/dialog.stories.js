import { html } from "lit";
import BaseDialog, { showDialog } from "@genome-spy/ui-components/dialog";
import DialogWizardController from "@genome-spy/ui-components/dialogWizardController";
import { FormController } from "@genome-spy/ui-components/formController";
import { formField } from "@genome-spy/ui-components/formField";
import { datasetSettingsTag } from "./slottedDialogForm.js";
import slottedDialogFormSource from "./slottedDialogForm.js?raw";

class SetupDialog extends BaseDialog {
    static properties = {
        ...super.properties,
        _page: { state: true },
        name: { state: true },
    };

    constructor() {
        super();
        this.dialogTitle = "Set up a dataset";
        this._page = 0;
        this.name = "";
        this.form = new FormController(this);
        this.form.defineField("name", {
            valueKey: "name",
            validate: () => (this.name.trim() ? null : "Enter a dataset name."),
        });
        this.wizard = new DialogWizardController(this, [
            {
                render: () => html`
                    <div class="gs-form-group">
                        <label for="dataset-name">Dataset name</label>
                        <input
                            id="dataset-name"
                            type="text"
                            autofocus
                            ${formField(this.form, "name")}
                        />
                        ${this.form.feedback("name")}
                    </div>
                `,
                onAdvance: () => !this.form.validateAll(),
            },
            {
                render: () =>
                    html`<p>
                        Use <strong>${this.name}</strong> as the dataset name.
                    </p>`,
            },
        ]);
    }

    renderBody() {
        return this.wizard.currentPage.render();
    }

    renderButtons() {
        return [
            this.makeCloseButton("Cancel"),
            ...(this.wizard.isFirstPage
                ? []
                : [this.makeButton("Back", () => this.wizard.advance(-1))]),
            this.makeButton(
                this.wizard.isLastPage ? "Finish" : "Next",
                () => {
                    if (this.wizard.isLastPage) {
                        this.finish({ ok: true, data: this.name });
                        return false;
                    }

                    this.wizard.advance(1);
                    return true;
                },
                { isPrimary: true }
            ),
        ];
    }
}

customElements.define("gs-story-setup-dialog", SetupDialog);

class ConfirmSaveDialog extends BaseDialog {
    static properties = {
        ...super.properties,
        saving: { state: true },
    };

    constructor() {
        super();
        this.dialogTitle = "Save display settings?";
        this.dialogDescribedBy = "save-status";
        this.saving = false;
    }

    canCancel() {
        return !this.saving;
    }

    renderBody() {
        return html`<p id="save-status" role="status">
            ${
                this.saving
                    ? "Saving display settings…"
                    : "Apply the new settings to this workspace."
            }
        </p>`;
    }

    renderButtons() {
        return [
            this.makeCloseButton("Cancel", { autofocus: true }),
            this.makeButton(
                "Save",
                async () => {
                    this.saving = true;
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    this.finish({ ok: true });
                },
                { isPrimary: true, disabled: this.saving }
            ),
        ];
    }
}

customElements.define("gs-story-confirm-save-dialog", ConfirmSaveDialog);

export default {
    title: "Components/Dialog",
    component: "gs-dialog",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "Use `<gs-dialog>` for forms and controls rendered by the caller. " +
                    "Pass an accessible name in `dialog-title` and open it with `showModal()` or `show()`. " +
                    "The slotted content stays mounted and inherits the caller's theme. " +
                    "The `open` property and attribute track visibility. Listen for `gs-dialog-opened` or `gs-dialog-closed`. " +
                    "Use `dismiss-disabled` to block requests such as Escape while work is pending. " +
                    "For a self-contained workflow, extend `BaseDialog`, override `renderBody()` and `renderButtons()`, " +
                    "and call `finish({ ok, data })` to return a result to `showDialog()`.",
            },
        },
    },
};

export const SlottedForm = {
    parameters: {
        docs: {
            description: {
                story:
                    "Add `formStyles` and `dialogLayoutStyles` from `@genome-spy/ui-components/styles` to the Lit component that renders the slotted form. " +
                    "Add `.gs-dialog-layout` to the form to use the same header, section, and footer layout as the PNG and SVG export dialogs. " +
                    "Use `.gs-form-group` around each label and control. Place `.btn` actions in the footer and add `.btn-primary` to the primary action. " +
                    'Submit a form with `method="dialog"` to close it. Switch the Storybook theme to see both the frame and controls inherit the palette.',
            },
            source: {
                language: "javascript",
                code: slottedDialogFormSource.trim(),
            },
        },
    },
    render: () => document.createElement(datasetSettingsTag),
};

/** @param {MouseEvent} event */
async function openWizard(event) {
    const button = /** @type {HTMLButtonElement} */ (event.currentTarget);
    const result = await showDialog("gs-story-setup-dialog", undefined, {
        mount: /** @type {HTMLElement} */ (button.parentElement),
    });
    const output = /** @type {HTMLOutputElement} */ (button.nextElementSibling);
    output.textContent = result.ok
        ? "Dataset name: " + result.data
        : "Canceled";
}

export const FormWizard = {
    render: () => html`
        <div>
            <button type="button" @click=${openWizard}>
                Open setup dialog
            </button>
            <output
                style="display: block; margin-block-start: 0.75rem;"
            ></output>
        </div>
    `,
};

export const SaveConfirmation = {
    render: () => html`
        <div>
            <button
                type="button"
                @click=${(/** @type {MouseEvent} */ event) => {
                    const button = /** @type {HTMLButtonElement} */ (
                        event.currentTarget
                    );
                    return showDialog(
                        "gs-story-confirm-save-dialog",
                        undefined,
                        {
                            mount: /** @type {HTMLElement} */ (
                                button.parentElement
                            ),
                        }
                    );
                }}
            >
                Confirm changes
            </button>
        </div>
    `,
};
