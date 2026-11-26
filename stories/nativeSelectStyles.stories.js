import { html } from "lit";
import { nativeSelectStyles } from "@genome-spy/ui-components/nativeSelectStyles";
import "@genome-spy/ui-components/form.css";

export default {
    title: "Utilities/NativeSelectStyles",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component: `Use an ordinary labelled **select** for a single choice. The browser owns keyboard navigation, values, change events and form submission. The caller lays out the label, control and feedback.

For long choices, optionally import **nativeSelectStyles** from **@genome-spy/ui-components/nativeSelectStyles** and add it to your Lit styles. It is independent of **formStyles**, installs nothing globally, and only affects **select.gs-native-select**.

Include **button** with **selectedcontent** inside the select for selected-label truncation. Supported browsers get a wider, wrapping picker. Other browsers and forced-color mode retain the platform picker. The caller supplies its usual form styles; no palette is installed by this module.

### Replacing NativeSelect

Remove the NativeSelect class/registration import. Replace **gs-native-select** with a labelled **select** and ordinary **option** children. Read **event.currentTarget.value** from the native **change** event, rather than **event.detail.value**. Set **select.value** to restore a selection without dispatching an event. Supply a hidden disabled empty option if a placeholder is needed. Unlike the removed wrapper, a select with a name participates in FormData.

The optional style class has no selection state or event API. The app still validates choices, stores accepted values and decides whether choosing a value starts work. Use CustomSelect when its custom option renderer is needed, and MultiSelect for several values.`,
            },
        },
    },
    args: { disabled: false, value: "", enhanced: true },
    /** @param {{ disabled: boolean, value: string, enhanced: boolean }} args */
    render: ({ disabled, value, enhanced }) => html`
        <style>
            ${nativeSelectStyles.cssText}
        </style>
        <form class="gs-form" style="max-inline-size:20rem">
            <label style="display:grid;gap:0.5rem">
                Reference
                <select
                    class=${enhanced ? "gs-native-select" : ""}
                    name="reference"
                    ?disabled=${disabled}
                >
                    <button type="button">
                        <selectedcontent></selectedcontent>
                    </button>
                    <option value="" disabled hidden .selected=${value === ""}>
                        Choose a reference
                    </option>
                    <option value="lung" .selected=${value === "lung"}>
                        Lung
                    </option>
                    <option value="blood" .selected=${value === "blood"}>
                        Blood
                    </option>
                    <option value="long" .selected=${value === "long"}>
                        A long reference name whose selected label must fit
                        without overlapping the arrow
                    </option>
                    <option value="unavailable" disabled>Unavailable</option>
                </select>
            </label>
        </form>
    `,
};
export const Default = {};
export const LongLabel = { args: { value: "long" } };
export const PlatformPicker = { args: { enhanced: false } };
