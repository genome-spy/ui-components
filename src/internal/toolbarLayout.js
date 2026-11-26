/** Size app-owned command groups/icons without replacing the public form appearance. */
import { css } from "lit";

const layout = css`
    gsa-app-toolbar .toolbar-group {
        display: inline-flex;
        align-items: center;
        gap: 2px;
    }
    gsa-app-toolbar button.toolbar-icon {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        padding: 6px;
    }
    gsa-app-toolbar button.toolbar-icon svg {
        display: block;
        width: 16px;
        height: 16px;
        fill: currentColor;
    }
`;

/** Slots cannot style nested light-DOM commands, so scope the layout to this host.
 * @param {Document} document
 */
export function installToolbarLayout(document) {
    if (document.getElementById("gsa-app-toolbar-styles")) return;
    const style = document.createElement("style");
    style.id = "gsa-app-toolbar-styles";
    style.textContent = layout.cssText;
    document.head.append(style);
}
