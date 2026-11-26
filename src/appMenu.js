/** Create a themed command menu without installing DOM or CSS on module import. */
import { createMenuController } from "./contextMenu.js";

/** @typedef {import("./contextMenu.js").MenuItem} MenuItem */

/** @type {HTMLElement | undefined} */
let mount;
/** @type {(() => void) | undefined} */
let dismissCurrent;

/** Share one unclipped menu surface; the caller explicitly loads contextMenu.css.
 * @returns {ReturnType<typeof createMenuController>}
 */
export function createAppMenu() {
    mount ??= document.createElement("div");
    mount.className = "gsa-menu-mount";
    const menuMount = mount;
    const menu = createMenuController({
        mount: menuMount,
        lightDismiss: true,
        onOpen() {
            if (!menuMount.isConnected) document.body.append(menuMount);
            dismissCurrent?.();
            dismissCurrent = menu.dismissDropdownMenu;
            return () => {
                if (dismissCurrent === menu.dismissDropdownMenu)
                    dismissCurrent = undefined;
            };
        },
    });
    return menu;
}
