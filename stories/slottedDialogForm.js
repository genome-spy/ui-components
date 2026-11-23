import { LitElement, html } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import "@genome-spy/ui-components/define/dialog";
import {
    dialogLayoutStyles,
    formStyles,
} from "@genome-spy/ui-components/styles";

class DatasetSettings extends LitElement {
    static styles = [formStyles, dialogLayoutStyles];

    #dialog = createRef();
    #result = createRef();

    #save(event) {
        const values = new FormData(event.currentTarget);
        this.#result.value.textContent = `Saved “${values.get("dataset")}” in ${values.get("display")} view.`;
    }

    render() {
        return html`
            <button
                class="btn"
                type="button"
                @click=${() => this.#dialog.value.showModal()}
            >
                Edit dataset settings
            </button>
            <output ${ref(this.#result)}></output>
            <gs-dialog dialog-title="Dataset settings" ${ref(this.#dialog)}>
                <form
                    class="gs-dialog-layout"
                    method="dialog"
                    @submit=${this.#save}
                >
                    <header><h2>Dataset settings</h2></header>
                    <section>
                        <div class="gs-form-group">
                            <label for="dataset-name">Dataset name</label>
                            <input
                                id="dataset-name"
                                name="dataset"
                                type="text"
                                value="Sample overview"
                                required
                                autofocus
                            />
                        </div>
                        <div class="gs-form-group">
                            <label for="display-mode">Display mode</label>
                            <select id="display-mode" name="display">
                                <option value="table">Table</option>
                                <option value="chart">Chart</option>
                            </select>
                        </div>
                    </section>
                    <footer>
                        <button
                            class="btn"
                            type="button"
                            @click=${() => this.#dialog.value.close()}
                        >
                            Cancel
                        </button>
                        <button class="btn btn-primary" type="submit">
                            Save
                        </button>
                    </footer>
                </form>
            </gs-dialog>
        `;
    }
}

export const datasetSettingsTag = "gs-story-dataset-settings";
customElements.define(datasetSettingsTag, DatasetSettings);
