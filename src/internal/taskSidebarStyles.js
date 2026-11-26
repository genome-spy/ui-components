/** Style app-owned sidebar contents without reaching into their scientific components. */
import { css } from "lit";
// Slots cannot style nested light-DOM controls. Scope these rules to the sidebar host.
const contentStyles = css`
    gsa-task-sidebar {
        container: gsa-sidebar / inline-size;
    }
    gsa-task-sidebar [hidden] {
        display: none !important;
    }
    /* Long controls must fit the panel instead of widening its automatic grid columns. */
    gsa-task-sidebar > [slot] {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
        min-width: 0;
        margin: 0;
    }
    gsa-task-sidebar label {
        display: grid;
        gap: 8px;
        min-width: 0;
    }
    gsa-task-sidebar button,
    gsa-task-sidebar input,
    gsa-task-sidebar select {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        max-width: 100%;
    }
    gsa-task-sidebar button {
        min-height: 36px;
        cursor: pointer;
    }
    gsa-task-sidebar input[type="checkbox"],
    gsa-task-sidebar input[type="radio"] {
        width: auto;
    }
    gsa-task-sidebar button.inline-action {
        width: auto;
        min-height: 0;
        line-height: inherit;
        vertical-align: baseline;
        text-decoration: underline;
    }
    gsa-task-sidebar h2 {
        margin: 0;
    }
    gsa-task-sidebar h3 {
        margin: 0;
    }
    gsa-task-sidebar p {
        margin: 0;
        line-height: 1.5;
        overflow-wrap: anywhere;
    }
    gsa-task-sidebar summary {
        cursor: pointer;
    }
    gsa-task-sidebar details > :not(summary) {
        margin-top: 8px;
    }
    gsa-task-sidebar .gsa-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
    }
    @media (min-width: 651px) {
        @container gsa-sidebar (min-width: 440px) {
            gsa-task-sidebar .gsa-actions {
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            }
        }
    }
    gsa-task-sidebar .gsa-history {
        display: grid;
        gap: 8px;
        max-height: 28vh;
        overflow: auto;
    }
    gsa-task-sidebar .gsa-table {
        overflow: auto;
        max-height: 300px;
        min-height: 50px;
    }
    gsa-task-sidebar th {
        position: sticky;
        top: 0;
        text-align: left;
    }
    gsa-task-sidebar th,
    gsa-task-sidebar td:first-child {
        white-space: nowrap;
    }
`;
/** Install once per document; all sidebar instances share these host-scoped rules.
 * @param {Document} document
 * @returns {void} */
export function installSidebarStyles(document) {
    if (document.head.querySelector("style[data-gsa-task-sidebar]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-gsa-task-sidebar", "");
    style.textContent = contentStyles.cssText;
    document.head.append(style);
}
