import { html } from "lit";
import "@genome-spy/ui-components/define/dropZone";
import { showSelectedFiles } from "./fileSelection.js";

export default {
    title: "Components/UploadDropZone",
    component: "gs-upload-drop-zone",
    tags: ["autodocs"],
    args: {
        accept: "",
        multiple: false,
        dropText: "Drop a file here or",
        width: 500,
    },
    argTypes: {
        width: { control: { type: "number", min: 160, max: 1200 } },
    },
};

/** @param {{accept: string, multiple: boolean, dropText: string, width: number}} args */
function renderDropZone({ accept, multiple, dropText, width }) {
    return html`
        <div style="max-inline-size: ${width}px;">
            <gs-upload-drop-zone
                .accept=${accept}
                ?multiple=${multiple}
                .dropText=${dropText}
                @gs-files-chosen=${showSelectedFiles}
            ></gs-upload-drop-zone>
            <output
                style="display: block; margin-block-start: 0.75rem;"
            ></output>
        </div>
    `;
}

export const Basic = { render: renderDropZone };

export const AcceptCsv = {
    args: { accept: ".csv,text/csv", dropText: "Drop a CSV file here or" },
    render: renderDropZone,
};

export const CustomPicker = {
    render: () => html`
        <style>
            .landing-drop::part(drop-zone) {
                box-sizing: border-box;
                min-block-size: 15rem;
                align-items: stretch;
                padding: 0;
            }

            .landing-drop gs-file-picker {
                display: flex;
                flex: 1;
                --gs-control-border: transparent;
                --gs-file-picker-background: transparent;
                --gs-button-selected-background: transparent;
            }

            .landing-drop gs-file-picker::part(button) {
                flex: 1;
            }
        </style>
        <div style="max-inline-size: 500px;">
            <gs-upload-drop-zone
                class="landing-drop"
                @gs-files-chosen=${showSelectedFiles}
            >
                <gs-file-picker slot="picker" accept=".csv,text/csv"
                    >Drop a CSV file or choose one</gs-file-picker
                >
            </gs-upload-drop-zone>
            <output
                style="display: block; margin-block-start: 0.75rem;"
            ></output>
        </div>
    `,
};
