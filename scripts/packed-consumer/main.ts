import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { html } from "lit";
import {
    BaseDialog,
    createMenuController,
    showDialog,
    type CustomSelect,
    type DataGrid,
    type MultiSelect,
    type ThresholdComparisonInput,
} from "@genome-spy/ui-components";
import "@genome-spy/ui-components/form.css";
import "@genome-spy/ui-components/contextMenu.css";
import "@genome-spy/ui-components/define/multiSelect";
import "@genome-spy/ui-components/define/customSelect";
import "@genome-spy/ui-components/define/thresholdComparisonInput";
import "@genome-spy/ui-components/define/dataGrid";
import "@genome-spy/ui-components/define/dropZone";
import "@genome-spy/ui-components/define/imageExportDialog";
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
