import { html } from "lit";
import "@genome-spy/ui-components/define/nativeSelect";

/** @typedef {import("@genome-spy/ui-components/nativeSelect").NativeSelectOption} NativeSelectOption */

export default {
    title: "Components/NativeSelect",
    component: "gs-native-select",
    tags: ["autodocs"],
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
