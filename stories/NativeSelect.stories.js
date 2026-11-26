import { html } from "lit";
import "@genome-spy/ui-components/define/nativeSelect";

/** @typedef {import("@genome-spy/ui-components/nativeSelect").NativeSelectOption} NativeSelectOption */

export default {
    title: "Components/NativeSelect",
    component: "gs-native-select",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component: `Choose one plain-text setting from options supplied by your app.
Typical uses are choosing a reference atlas, data source, method or display mode.
The control keeps the browser's native keyboard and picker behavior; its appearance can vary by browser.

### Which selector should I use?

| Need | Component |
| --- | --- |
| One value with a text label | **NativeSelect** |
| One value with custom option markup, such as colour swatches | **CustomSelect**, using its option renderer |
| Several values with search and selected-value chips | **MultiSelect** |
| A visible, searchable list of checkboxes | **SearchableCheckboxList** |
| A value submitted by an ordinary HTML form | A normal HTML **select**; NativeSelect does not participate in FormData |

### Connect it to your app

Import the registration, supply stable IDs and labels, and handle the selected ID:

\`\`\`js
import "@genome-spy/ui-components/define/nativeSelect";

const picker = document.createElement("gs-native-select");
picker.label = "Reference";
picker.placeholder = "Choose a reference";
picker.options = [
    { value: "lung", label: "Lung" },
    { value: "blood", label: "Blood" },
];
picker.value = "lung";
picker.addEventListener("change", (event) => {
    // Replace this with your app's validated selection action.
    console.log(event.detail.value);
});
document.body.append(picker);
\`\`\`

The app owns allowed choices, validation and saved state. This component does not discover references,
download data or run a method. A user choice emits one bubbling, composed **change** event with
**event.detail.value**. Assigning **value** or **options** programmatically emits no event, so restoring
saved state does not trigger work. If a choice is rejected, assign the accepted value again.

Always provide **label**, even with **hideLabel**: the label still names the control for assistive
technology. The placeholder is hidden from the option list and cannot be selected. Use **disabled**
on the control or individual options when a choice is unavailable.`,
            },
        },
    },
    args: {
        label: "Reference",
        placeholder: "Choose a reference",
        value: "",
        disabled: false,
        hideLabel: false,
        options: [
            { value: "lung", label: "Lung" },
            { value: "blood", label: "Blood" },
            { value: "unavailable", label: "Unavailable", disabled: true },
        ],
    },
    /** @param {{ label: string, placeholder: string, value: string, disabled: boolean, hideLabel: boolean, options: NativeSelectOption[] }} args */
    render: (args) => html`
        <gs-native-select
            style="max-inline-size: 20rem"
            .label=${args.label}
            .placeholder=${args.placeholder}
            .value=${args.value}
            .options=${args.options}
            .disabled=${args.disabled}
            .hideLabel=${args.hideLabel}
        ></gs-native-select>
    `,
};

export const Default = {};

export const LongLabels = {
    args: {
        value: "long",
        hideLabel: true,
        options: [
            {
                value: "long",
                label: "A long reference name that must not overlap the dropdown arrow",
            },
        ],
    },
};
