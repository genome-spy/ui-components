/** Optional picker layout for select.gs-native-select; labels, values and events stay native. */
import { css } from "lit";

/**
 * Add to a caller's Lit styles independently of formStyles. The class opts in;
 * unmarked selects and labels are unchanged. Supply the label/options in the caller.
 * Keep the platform picker when customizable selects are unavailable or colors forced.
 */
export const nativeSelectStyles = css`
    select.gs-native-select {
        box-sizing: border-box;
        min-inline-size: 0;
        inline-size: 100%;
        padding-inline-end: 2.25rem;
        font: inherit;
        appearance: auto;
        background-image: none;
    }
    @supports (appearance: base-select) {
        select.gs-native-select,
        select.gs-native-select::picker(select) {
            appearance: base-select;
        }
        select.gs-native-select {
            position: relative;
            white-space: nowrap;
            overflow: hidden;
        }
        select.gs-native-select > button {
            min-inline-size: 0;
            inline-size: 100%;
            padding: 0;
            min-block-size: 0;
            line-height: inherit;
            border: 0;
            background: none;
            box-shadow: none;
            font: inherit;
            color: inherit;
        }
        select.gs-native-select selectedcontent {
            display: block;
            min-inline-size: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        select.gs-native-select::picker-icon {
            position: absolute;
            inset-inline-end: 0.75rem;
        }
        select.gs-native-select::picker(select) {
            box-sizing: border-box;
            inline-size: max-content;
            min-inline-size: anchor-size(width);
            max-inline-size: min(48rem, calc(100vw - 16px));
            max-block-size: min(24rem, calc(100dvh - 16px));
            overflow: auto;
            color: var(--gs-control-text, #212529);
            background: var(--gs-control-background, #fff);
            border: 1px solid var(--gs-control-border, #ced4da);
            border-radius: var(--gs-control-radius, 0.25em);
            font: inherit;
        }
        select.gs-native-select option {
            white-space: normal;
            overflow-wrap: anywhere;
            padding: 0.375em 0.75em;
        }
    }
    @media (forced-colors: active) {
        select.gs-native-select,
        select.gs-native-select::picker(select) {
            appearance: auto;
        }
    }
`;
