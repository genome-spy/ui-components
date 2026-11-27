import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { LitElement, html } from "lit";
import {
    BaseDialog,
    createMenuController,
    Dialog,
    showDialog,
    type CustomSelect,
    type DataGrid,
    type MultiSelect,
    type ThresholdComparisonInput,
} from "@genome-spy/ui-components";
import "@genome-spy/ui-components/form.css";
import "@genome-spy/ui-components/contextMenu.css";
import { nativeSelectStyles } from "@genome-spy/ui-components/nativeSelectStyles";
import { render } from "lit";
import { live } from "lit/directives/live.js";
import { repeat } from "lit/directives/repeat.js";
import "@genome-spy/ui-components/define/multiSelect";
import "@genome-spy/ui-components/define/customSelect";
import "@genome-spy/ui-components/define/thresholdComparisonInput";
import "@genome-spy/ui-components/define/dataGrid";
import "@genome-spy/ui-components/define/dropZone";
import "@genome-spy/ui-components/define/imageExportDialog";
import "@genome-spy/ui-components/define/dialog";
import { Dialog as DialogModuleExport } from "@genome-spy/ui-components/dialog";
import {
    dialogLayoutStyles,
    formStyles,
} from "@genome-spy/ui-components/styles";
import {
    PngExportDialog,
    SvgExportDialog,
} from "@genome-spy/ui-components/imageExportDialog";

if (
    customElements.get("gs-save-image-dialog") !== PngExportDialog ||
    customElements.get("gs-save-svg-dialog") !== SvgExportDialog
) {
    throw new Error(
        "The image export dialog entry points must share the same elements."
    );
}

if (
    Dialog !== DialogModuleExport ||
    customElements.get("gs-dialog") !== Dialog
) {
    throw new Error("The dialog entry points must share the same element.");
}

class FixtureDialog extends BaseDialog {
    static properties = {
        ...BaseDialog.properties,
        pending: { state: true },
    };

    declare pending: boolean;

    constructor() {
        super();
        this.pending = false;
    }

    protected canCancel() {
        return !this.pending;
    }

    protected renderBody() {
        return html`<button
            type="button"
            @click=${() => {
                this.pending = !this.pending;
            }}
        >
            ${this.pending ? "End pending work" : "Start pending work"}
        </button>`;
    }

    protected renderButtons() {
        return [
            this.makeCloseButton("Close dialog", { autofocus: true }),
            this.makeButton("Apply", () => this.finish({ ok: true }), {
                iconDef: faCheck,
            }),
        ];
    }
}
customElements.define("gs-fixture-dialog", FixtureDialog);

const search = document.querySelector("gs-multi-select") as MultiSelect;
search.debounceMs = 0;
search.search = async (query) => {
    if (query === "unavailable") {
        throw new Error("Search backend unavailable");
    }
    return ["Group A"];
};

const select = document.querySelector("gs-custom-select") as CustomSelect;
select.options = ["Tracks", "Table"];
select.value = "Tracks";

const threshold = document.querySelector(
    "gs-threshold-comparison-input"
) as ThresholdComparisonInput;
threshold.values = [0, 20, 40];

const grid = document.querySelector("gs-data-grid") as DataGrid;
grid.items = Array.from({ length: 200 }, (_, i) => ({
    Sample: `Sample ${i + 1}`,
    Count: i + 1,
}));

document.querySelector("#open-dialog")!.addEventListener("click", async () => {
    const output = document.querySelector("#dialog-result")!;
    output.textContent = "";
    const result = await showDialog("gs-fixture-dialog", (dialog) => {
        dialog.dialogTitle = "Dialog lifecycle";
    });
    output.textContent = result.ok ? "applied" : (result.reason ?? "");
});

const settings = document.querySelector<Dialog>("#settings")!;
document.adoptedStyleSheets.push(dialogLayoutStyles.styleSheet!);
document.querySelector("#open-slotted")!.addEventListener("click", () => {
    settings.showModal();
});
document.querySelector("#show-slotted")!.addEventListener("click", () => {
    settings.show();
});
document.querySelector("#close-slotted")!.addEventListener("click", () => {
    settings.close();
});

const opener = document.querySelector<HTMLButtonElement>("#open-menu")!;
const menu = createMenuController();
opener.addEventListener("click", () =>
    menu.dropdownMenu(
        {
            label: "Dataset actions",
            mode: "command",
            items: [
                { label: "Import", callback: () => {} },
                {
                    label: "Export",
                    icon: {
                        prefix: "fad",
                        iconName: "file-export",
                        icon: [
                            16,
                            16,
                            [],
                            "",
                            ["M0 0H16V16H0Z", "M2 2H14V14H2Z"],
                        ],
                    },
                    callback: () => {},
                },
            ],
        },
        opener
    )
);

/** The fixture owns markup/state and consumes only the independent style export. */
const nativeRoot = document.querySelector<HTMLElement>(
    "#native-select-fixture"
)!;
const nativeState = {
    value: "",
    options: [
        { value: "lung", label: "Lung" },
        { value: "blood", label: "Blood" },
    ],
    disabled: false,
    hideLabel: false,
};
const chosenReferences: string[] = [];
function updateNativeSelect(update: Partial<typeof nativeState>) {
    Object.assign(nativeState, update);
    render(
        html`
            <style>
                ${nativeSelectStyles.cssText}
            </style>
            <label>
                <span ?hidden=${nativeState.hideLabel}>Reference</span>
                <select
                    class="gs-native-select"
                    name="reference"
                    aria-label="Reference"
                    ?disabled=${nativeState.disabled}
                    @change=${(event: Event) => {
                        nativeState.value = (
                            event.currentTarget as HTMLSelectElement
                        ).value;
                        chosenReferences.push(nativeState.value);
                        nativeRoot.dataset.choices = chosenReferences.join(",");
                    }}
                >
                    <button type="button">
                        <selectedcontent></selectedcontent>
                    </button>
                    <option
                        value=""
                        disabled
                        hidden
                        .selected=${live(nativeState.value === "")}
                    >
                        Choose a reference
                    </option>
                    ${repeat(
                        nativeState.options,
                        (option) =>
                            JSON.stringify([option.value, option.label]),
                        (option) => html`
                            <option
                                value=${option.value}
                                .selected=${live(option.value === nativeState.value)}
                            >
                                ${option.label}
                            </option>
                        `
                    )}
                </select>
            </label>
        `,
        nativeRoot
    );
}
Object.assign(window, { updateNativeSelect });
updateNativeSelect({});
declare global {
    interface Window {
        updateNativeSelect: typeof updateNativeSelect;
    }
}

/** Styles stay in the caller's shadow root, with ordinary native button behavior. */
class ToolbarFixture extends LitElement {
    static styles = formStyles;

    render() {
        return html`<div class="toolbar-group">
            <button
                class="btn"
                @click=${() => {
                    this.dataset.clicked = "yes";
                }}
            >
                Export table
            </button>
            <button class="btn" disabled>Unavailable command</button>
        </div>`;
    }
}
customElements.define("gs-toolbar-fixture", ToolbarFixture);
