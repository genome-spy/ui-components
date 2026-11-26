/** @typedef {import("./appMenu.js").MenuItem} MenuItem */
/** Shared bookmark menu presentation. The app owns bookmark reads and actions. */
import { html } from "lit";
import { createAppMenu } from "./appMenu.js";
/**
 * @typedef {object} BookmarkRow
 * @property {string} id
 * @property {string} name
 */
/**
 * @template {BookmarkRow} Entry
 * @typedef {object} BookmarkMenuOptions
 * @property {() => {entries: readonly Entry[], blocked: boolean, pending: boolean, error: string}} state Current UI projection.
 * @property {() => Promise<void>} refresh Read entries without restoring a view.
 * @property {(entry: Entry) => string} name Display copy of a saved name.
 * @property {() => void} add Begin an app-owned draft.
 * @property {() => void} import Choose a file through the app.
 * @property {(entry: Entry) => void} open Restore the selected saved view.
 * @property {(entry: Entry) => void} edit Edit/replace an existing bookmark.
 * @property {(entry: Entry) => void} delete Request deletion confirmation.
 * @property {(entry: Entry) => void} share Show local sharing controls.
 */
/** @param {BookmarkMenuOptions<Entry>} options
 * @template {BookmarkRow} Entry
 * @returns {{toggle: (button: HTMLButtonElement, initialFocus: "first" | "last") => void, update: (initialFocus?: "first" | "last") => void, close: () => void, isOpen: () => boolean}}
 */
export function createBookmarkMenu(options) {
    const controller = createAppMenu();
    /** @type {HTMLButtonElement | undefined} */
    let opener;
    /** @param {"first" | "last"} [initialFocus]
     * @returns {void} */
    function update(initialFocus) {
        if (!opener || (!initialFocus && !controller.isDropdownOpenFor(opener)))
            return;
        const { entries, blocked, pending, error } = options.state();
        /** @type {MenuItem[]} */
        const items = [
            {
                key: "add",
                label: "Add bookmark...",
                disabled: blocked || pending,
                callback: options.add,
            },
            {
                key: "import",
                label: "Import bookmark...",
                disabled: pending,
                callback: options.import,
            },
            { type: "divider" },
            { type: "header", label: "Bookmarks in the web browser" },
        ];
        for (const entry of entries) {
            const label = options.name(entry);
            /** @type {MenuItem[]} */
            const actions = [
                {
                    label: "Edit and replace...",
                    disabled: blocked,
                    callback: () => options.edit(entry),
                },
                { label: "Delete", callback: () => options.delete(entry) },
                { type: "divider" },
                { label: "Share...", callback: () => options.share(entry) },
            ];
            items.push({
                key: entry.id,
                label,
                disabled: blocked || pending,
                callback: () => options.open(entry),
                ellipsisSubmenu: actions,
            });
            if (blocked && !pending) {
                items.push({
                    key: `actions-${entry.id}`,
                    label: `Actions for ${label}`,
                    submenu: actions,
                });
            }
        }
        if (!entries.length)
            items.push({
                type: "header",
                label: pending ? "Loading bookmarks..." : "No bookmarks yet",
            });
        if (error)
            items.push({
                type: "header",
                label: html`<span role="status">${error}</span>`,
            });
        controller.dropdownMenu(
            { label: "Bookmarks", mode: "command", initialFocus, items },
            opener
        );
    }
    return {
        /** @param {HTMLButtonElement} button
         * @param {"first" | "last"} initialFocus */
        toggle(button, initialFocus) {
            if (controller.isDropdownOpenFor(button)) {
                controller.dismissDropdownMenu();
                return;
            }
            opener = button;
            update(initialFocus);
            void options.refresh();
        },
        update,
        close: controller.dismissDropdownMenu,
        isOpen: controller.isContextMenuOpen,
    };
}
