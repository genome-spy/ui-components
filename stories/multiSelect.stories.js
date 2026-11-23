import { LitElement, css, html } from "lit";
import "@genome-spy/ui-components/define/multiSelect";

const COLUMNS = [
    "TP53",
    "MYC",
    "EGFR",
    "BRCA1",
    "BRCA2",
    "PTEN",
    "KRAS",
    "ALK",
    "BRAF",
    "PIK3CA",
    "CDKN2A",
    "ARID1A",
    "RB1",
    "ATM",
    "ERBB2",
    "GATA3",
    "Sample",
    "Sample name",
];

const MOTIFS = [
    { id: "MA0071.1", label: "RORA" },
    { id: "MA0107.1", label: "RELA" },
    { id: "MA0036.3", label: "GATA2" },
    { id: "MA0099.3", label: "AP-1 / FOS::JUN" },
    { id: "MA0098.3", label: "ETS / ETS1" },
];

const DEFAULT_MOTIFS = MOTIFS.slice(0, 2);

/** @param {string} query */
async function searchMotifs(query) {
    const term = query.trim().toLowerCase();
    const matches = MOTIFS.filter(({ id, label }) =>
        `${label} ${id}`.toLowerCase().includes(term)
    );
    return {
        options: matches.map((motif) => ({ ...motif, detail: motif.id })),
        totalMatches: matches.length,
        totalItems: MOTIFS.length,
    };
}

export default {
    title: "Components/MultiSelect",
    component: "gs-multi-select",
    tags: ["autodocs"],
    args: {
        allowUnknown: false,
        placeholder: "Search columns",
        debounceMs: 180,
        maxSuggestions: 10,
    },
    argTypes: {
        allowUnknown: { control: { type: "boolean" } },
        placeholder: { control: { type: "text" } },
        debounceMs: { control: { type: "number", min: 0, max: 1000 } },
        maxSuggestions: { control: { type: "number", min: 1, max: 100 } },
    },
};

if (!customElements.get("gs-multi-select-demo")) {
    class MultiSelectDemo extends LitElement {
        static properties = {
            allowUnknown: { type: Boolean, attribute: "allow-unknown" },
            placeholder: { type: String },
            debounceMs: { type: Number, attribute: "debounce-ms" },
            maxSuggestions: { type: Number, attribute: "max-suggestions" },
            _selected: { state: true },
        };

        static styles = css`
            .stack {
                display: grid;
                gap: 0.5rem;
                max-width: 620px;
                padding: 1rem;
            }

            .selected {
                font-size: 0.92rem;
                color: #4c4c4c;
            }
        `;

        constructor() {
            super();
            this.allowUnknown = false;
            this.placeholder = "Search columns";
            this.debounceMs = 180;
            this.maxSuggestions = 10;
            this._selected = ["TP53"];
        }

        /**
         * @param {string} query
         * @returns {Promise<string[]>}
         */
        async #search(query) {
            await new Promise((resolve) => window.setTimeout(resolve, 120));
            const term = query.trim().toLowerCase();
            if (term.length === 0) {
                return COLUMNS;
            }
            return COLUMNS.filter((column) =>
                column.toLowerCase().includes(term)
            );
        }

        render() {
            return html`
                <div class="stack">
                    <gs-multi-select
                        aria-label="Select columns"
                        .selectedValues=${this._selected}
                        .search=${(/** @type {string} */ query) =>
                            this.#search(query)}
                        .placeholder=${this.placeholder}
                        .debounceMs=${this.debounceMs}
                        .maxSuggestions=${this.maxSuggestions}
                        .allowUnknown=${this.allowUnknown}
                        .commitDelimiters=${this.allowUnknown ? [",", " "] : []}
                        @change=${(/** @type {Event} */ event) => {
                            const change =
                                /** @type {import("@genome-spy/ui-components/multiSelect").MultiSelectChangeEvent} */ (
                                    event
                                );
                            this._selected = change.values;
                        }}
                    ></gs-multi-select>
                    <div class="selected">
                        Selected:
                        ${
                            this._selected.length > 0
                                ? this._selected.join(", ")
                                : "none"
                        }
                    </div>
                </div>
            `;
        }
    }

    customElements.define("gs-multi-select-demo", MultiSelectDemo);
}

export const Basic = {
    render: (/** @type {any} */ args) => html`
        <gs-multi-select-demo
            ?allow-unknown=${args.allowUnknown}
            placeholder=${args.placeholder}
            debounce-ms=${args.debounceMs}
            max-suggestions=${args.maxSuggestions}
        ></gs-multi-select-demo>
    `,
};

export const ColumnQueries = {
    ...Basic,
    args: {
        allowUnknown: true,
        placeholder: "Search or paste column names",
    },
    parameters: {
        docs: {
            description: {
                story:
                    "App-style entry allows typed values and one value per line when pasting. " +
                    "Comma and space commit an exact match when the delimiter cannot extend another match.",
            },
        },
    },
};

export const MotifSelection = {
    parameters: {
        docs: {
            description: {
                story:
                    "Search for the TF name or JASPAR ID. The result shows the ID in `detail` and the chip shows the label. " +
                    "`selectedLabels` names the preset IDs before the first search. " +
                    "The footer shows how many matches are visible and how many motifs are in the catalogue. " +
                    "The query stays in place after a choice, and `change` reports the IDs.",
            },
        },
    },
    render: () => html`
        <gs-multi-select
            aria-label="Select motifs"
            placeholder="TF name or JASPAR ID"
            keep-query-on-select
            max-suggestions="2"
            .selectedValues=${DEFAULT_MOTIFS.map(({ id }) => id)}
            .selectedLabels=${Object.fromEntries(
                DEFAULT_MOTIFS.map(({ id, label }) => [id, label])
            )}
            .search=${searchMotifs}
            style="max-inline-size: 38rem"
        ></gs-multi-select>
    `,
};
