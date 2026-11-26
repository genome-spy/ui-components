/** Existing focused-app presentation checks, now run against the npm archive. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { expect } from "playwright/test";

/** @param {import("playwright").Browser} browser
 * @param {string} origin
 * @param {(route: import("playwright").Route) => Promise<void>} serveAssets
 */
export async function checkFocusedApps(browser, origin, serveAssets) {
    async function open(t) {
        const page = await browser.newPage();
        t.after(() => page.close());
        await page.route(origin + "/**", serveAssets);
        await page.goto(origin + "/focusedApp.html");
        await page.waitForFunction(() =>
            globalThis.customElements.get("gsa-data-entry")
        );
        return page;
    }
    await test("binary input and example IDs reach the app without parsing or inference", async (t) => {
        const page = await open(t);
        await page.evaluate(async () => {
            const entry = globalThis.document.querySelector("gsa-data-entry");
            entry.examples = [{ id: "lung", label: "HLCA example" }];
            globalThis.window.received = [];
            globalThis.document.addEventListener(
                "gsa-files-selected",
                async (event) => {
                    globalThis.window.received.push(
                        await Promise.all(
                            event.detail.map(async (file) => ({
                                name: file.name,
                                bytes: Array.from(
                                    new Uint8Array(await file.arrayBuffer())
                                ),
                            }))
                        )
                    );
                }
            );
            globalThis.document.addEventListener(
                "gsa-example-selected",
                (event) => {
                    globalThis.window.example = event.detail;
                }
            );
            await entry.updateComplete;
        });
        const picker = page.getByRole("button", {
            name: /Drop an AnnData file/,
        });
        const surface = page.locator('#drop-zone [part="drop-zone"]');
        await expect(surface).toHaveCSS("min-block-size", "240px");
        const surfaceBox = await surface.boundingBox();
        const buttonBox = await picker.boundingBox();
        const border = await surface.evaluate((node) => {
            const style = globalThis.getComputedStyle(node);
            return {
                inline:
                    parseFloat(style.borderLeftWidth) +
                    parseFloat(style.borderRightWidth),
                block:
                    parseFloat(style.borderTopWidth) +
                    parseFloat(style.borderBottomWidth),
            };
        });
        // The public drop-zone border stays authoritative; the picker fills its content box.
        assert.ok(buttonBox.width >= surfaceBox.width - border.inline);
        assert.ok(buttonBox.height >= surfaceBox.height - border.block);

        const file = {
            name: "query.h5ad",
            mimeType: "application/octet-stream",
            buffer: Buffer.from([0, 255, 128, 10]),
        };
        const expected = [{ name: file.name, bytes: Array.from(file.buffer) }];

        const chooser = page.waitForEvent("filechooser");
        await picker.click();
        await (await chooser).setFiles(file);
        await page.waitForFunction(
            () => globalThis.window.received.length === 1
        );
        assert.deepEqual(
            await page.evaluate(() => globalThis.window.received[0]),
            expected
        );

        const reopen = page.waitForEvent("filechooser");
        await picker.press("Enter");
        await (await reopen).setFiles(file);
        await page.waitForFunction(
            () => globalThis.window.received.length === 2
        );
        assert.deepEqual(
            await page.evaluate(() => globalThis.window.received[1]),
            expected
        );

        await page.getByRole("button", { name: "HLCA example" }).click();
        assert.equal(
            await page.evaluate(() => globalThis.window.example),
            "lung"
        );

        const transfer = await page.evaluateHandle(() => {
            const data = new globalThis.DataTransfer();
            data.items.add(new File([new Uint8Array([200, 0])], "other.h5ad"));
            data.items.add(new File([new Uint8Array([7])], "extra.h5ad"));
            return data;
        });
        await page
            .locator("#drop")
            .dispatchEvent("drop", { dataTransfer: transfer });
        await transfer.dispose();
        await page.waitForFunction(
            () => globalThis.window.received.length === 3
        );
        assert.deepEqual(
            await page.evaluate(() => globalThis.window.received[2]),
            [
                { name: "other.h5ad", bytes: [200, 0] },
                { name: "extra.h5ad", bytes: [7] },
            ]
        );
    });

    await test("progress clocks, cancellation acknowledgement and terminal states preserve layout", async (t) => {
        const page = await open(t);
        await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
        await page.evaluate(async () => {
            globalThis.document.querySelector("#entry").hidden = true;
            const progress = globalThis.document.querySelector("#progress");
            progress.style.width = "230px";
            globalThis.window.cancelRequests = 0;
            globalThis.document.addEventListener("gs-job-cancel", () => {
                globalThis.window.cancelRequests++;
                progress.activity = {
                    ...progress.activity,
                    status: "cancelling",
                };
            });
            progress.activity = {
                label: "Computing cell annotations…",
                startedAt: Date.now() - 65000,
                status: "running",
            };
            await progress.updateComplete;
        });
        const progress = page.locator("#progress");
        const bounds = await progress.boundingBox();
        await expect(progress.getByText("Elapsed 1:05")).toBeVisible();
        await expect(progress.getByRole("progressbar")).not.toHaveAttribute(
            "aria-valuenow"
        );
        assert.equal(
            await page.evaluate(() => globalThis.window.cancelRequests),
            0
        );
        await page.clock.fastForward(2000);
        await expect(progress.getByText("Elapsed 1:07")).toBeVisible();
        await progress
            .getByRole("button", { name: "Cancel", exact: true })
            .click();
        await expect(progress.getByRole("button")).toBeDisabled();
        await expect(progress.getByRole("status")).toHaveText(
            "Cancellation requested…"
        );
        assert.equal(
            await page.evaluate(() => globalThis.window.cancelRequests),
            1
        );
        await page.clock.fastForward(1000);
        await expect(progress.getByText("Elapsed 1:08")).toBeVisible();

        await page.evaluate(async () => {
            const progress = globalThis.document.querySelector("#progress");
            globalThis.window.detachedProgress = progress;
            progress.remove();
        });
        await page.clock.fastForward(5000);
        await page.evaluate(() =>
            globalThis.document.body.append(globalThis.window.detachedProgress)
        );
        await expect(progress.getByText("Elapsed 1:13")).toBeVisible();
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(
            await progress
                .locator(".track")
                .evaluate(
                    (element) =>
                        globalThis.getComputedStyle(element, "::after")
                            .animationName
                ),
            "none"
        );

        await page.emulateMedia({ reducedMotion: "no-preference" });
        for (const status of ["complete", "failed", "cancelled"]) {
            await page.evaluate(async (status) => {
                const progress = globalThis.document.querySelector("#progress");
                progress.activity = {
                    label: "A long result notice ".repeat(30),
                    startedAt: Date.now() - 73000,
                    finishedAt: Date.now(),
                    status,
                };
                await progress.updateComplete;
            }, status);
            await expect(progress.getByRole("progressbar")).toHaveCount(0);
            assert.equal(
                await progress
                    .locator(".track")
                    .evaluate(
                        (element) =>
                            globalThis.getComputedStyle(element, "::after")
                                .animationName
                    ),
                "none"
            );
            await expect(progress.getByRole("button")).toBeDisabled();
            assert.deepEqual(await progress.boundingBox(), bounds);
            await page.clock.fastForward(2000);
            await expect(progress.getByText("Elapsed 1:13")).toBeVisible();
        }
        await page.evaluate(async () => {
            const progress = globalThis.document.querySelector("#progress");
            progress.activity = {
                label: "Reconnected to model run…",
                startedAt: null,
                status: "running",
            };
            await progress.updateComplete;
        });
        await expect(
            progress.getByText("Elapsed time unavailable")
        ).toBeVisible();
        assert.equal(
            await page.evaluate(() => globalThis.window.cancelRequests),
            1
        );
    });

    for (const side of ["left", "right"]) {
        await test(`${side} sidebar resizes and collapses while retaining plot and controls`, async (t) => {
            const page = await open(t);
            await page.setViewportSize({ width: 1200, height: 900 });
            await page.evaluate(async (side) => {
                globalThis.document.querySelector("#entry").hidden = true;
                const shell =
                    globalThis.document.querySelector("gsa-app-shell");
                shell.hidden = false;
                shell.panelSide = side;
                const sidebar =
                    globalThis.document.createElement("gsa-task-sidebar");
                sidebar.slot = "task-panel";
                sidebar.tabs = [
                    { id: "review", label: "Review" },
                    { id: "settings", label: "Settings" },
                ];
                sidebar.activeId = "review";
                sidebar.innerHTML =
                    '<label slot="review">Label<input value="Retained draft"></label><div slot="settings">Settings controls<div class="gsa-actions"><button>First action</button><button>Second action</button></div></div><gs-job-progress slot="footer"></gs-job-progress>';
                sidebar.querySelector("gs-job-progress").activity = {
                    label: "Mapping cells",
                    status: "running",
                    startedAt: Date.now() - 3000,
                };
                globalThis.window.requests = [];
                sidebar.addEventListener("gsa-task-select", (event) => {
                    globalThis.window.requests.push(event.detail.id);
                    sidebar.activeId = event.detail.id;
                });
                shell.querySelector('[slot="task-panel"]').replaceWith(sidebar);
                globalThis.window.originalControl =
                    sidebar.querySelector("input");
                globalThis.window.originalPlot =
                    globalThis.document.querySelector("#plot");
                globalThis.window.originalActivity =
                    sidebar.querySelector("gs-job-progress").activity;
                await shell.updateComplete;
                await sidebar.updateComplete;
            }, side);
            const sidebar = page.locator("gsa-task-sidebar");
            const viewport = page.locator('[slot="viewport"]');
            const expanded = await viewport.boundingBox();
            assert.equal((await sidebar.boundingBox()).width, 280);
            await sidebar
                .getByRole("button", { name: "Collapse sidebar" })
                .press("Enter");
            await expect(
                sidebar.getByRole("button", { name: "Expand sidebar" })
            ).toHaveAttribute("aria-expanded", "false");
            await expect(
                sidebar.getByLabel("Label", { exact: true })
            ).toBeHidden();
            await expect(
                sidebar.getByRole("button", { name: "Cancel", exact: true })
            ).toBeHidden();
            assert.equal((await sidebar.boundingBox()).width, 88);
            assert.equal(
                (await viewport.boundingBox()).width,
                expanded.width + 192
            );
            assert.deepEqual(
                await page.evaluate(() => globalThis.window.requests),
                []
            );
            await sidebar
                .getByRole("button", { name: "Expand sidebar" })
                .press("Space");
            await expect(
                sidebar.getByLabel("Label", { exact: true })
            ).toHaveValue("Retained draft");
            await expect(
                sidebar.getByRole("button", { name: "Cancel", exact: true })
            ).toBeEnabled();
            assert.equal((await sidebar.boundingBox()).width, 280);
            assert.equal(
                await page.evaluate(
                    () =>
                        globalThis.window.originalPlot ===
                            globalThis.document.querySelector("#plot") &&
                        globalThis.window.originalControl ===
                            globalThis.document.querySelector(
                                "gsa-task-sidebar input"
                            ) &&
                        globalThis.window.originalActivity ===
                            globalThis.document.querySelector(
                                "gsa-task-sidebar gs-job-progress"
                            ).activity
                ),
                true
            );
            await sidebar
                .getByRole("button", { name: "Collapse sidebar" })
                .click();
            await sidebar
                .getByRole("tab", { name: "Review", exact: true })
                .click();
            await expect(
                sidebar.getByLabel("Label", { exact: true })
            ).toBeVisible();
            assert.deepEqual(
                await page.evaluate(() => globalThis.window.requests),
                []
            );
            await sidebar
                .getByRole("button", { name: "Collapse sidebar" })
                .click();
            await sidebar
                .getByRole("tab", { name: "Review", exact: true })
                .press("ArrowDown");
            await expect(sidebar.getByText("Settings controls")).toBeVisible();
            await expect(
                sidebar.getByRole("tab", { name: "Settings", exact: true })
            ).toBeFocused();
            assert.deepEqual(
                await page.evaluate(() => globalThis.window.requests),
                ["settings"]
            );
            const splitter = page.getByRole("separator", {
                name: "Task panel width",
            });
            const first = sidebar.getByRole("button", { name: "First action" });
            const second = sidebar.getByRole("button", {
                name: "Second action",
            });
            assert.ok(
                (await first.boundingBox()).y < (await second.boundingBox()).y
            );

            const handle = await splitter.boundingBox();
            const x = handle.x + handle.width / 2;
            const y = handle.y + 40;
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x + (side === "left" ? 210 : -210), y, {
                steps: 5,
            });
            await page.mouse.up();
            await expect(splitter).toHaveAttribute("aria-valuenow", "490");
            assert.equal((await sidebar.boundingBox()).width, 490);
            assert.equal(
                (await viewport.boundingBox()).width,
                expanded.width - 210
            );
            assert.equal(
                (await first.boundingBox()).y,
                (await second.boundingBox()).y
            );
            await splitter.press(side === "left" ? "ArrowRight" : "ArrowLeft");
            assert.equal((await sidebar.boundingBox()).width, 506);
            await splitter.press("End");
            assert.equal((await sidebar.boundingBox()).width, 560);
            await page.setViewportSize({ width: 760, height: 900 });
            await expect(splitter).toHaveAttribute("aria-valuenow", "380");
            assert.equal((await sidebar.boundingBox()).width, 380);

            await page.setViewportSize({ width: 390, height: 844 });
            await expect(splitter).toBeHidden();
            assert.ok(
                (await first.boundingBox()).y < (await second.boundingBox()).y
            );
            await sidebar
                .getByRole("button", { name: "Collapse sidebar" })
                .click();
            assert.ok((await sidebar.boundingBox()).height < 100);
            assert.equal(
                await page.evaluate(
                    () =>
                        globalThis.document.documentElement.scrollWidth <=
                        globalThis.innerWidth
                ),
                true
            );
            await sidebar
                .getByRole("button", { name: "Expand sidebar" })
                .click();
            await expect(sidebar.getByText("Settings controls")).toBeVisible();
            assert.equal(
                await page.evaluate(
                    () =>
                        globalThis.document.documentElement.scrollWidth <=
                        globalThis.innerWidth
                ),
                true
            );
            await page.setViewportSize({ width: 1200, height: 900 });
            await expect(splitter).toHaveAttribute("aria-valuenow", "560");
            assert.equal((await sidebar.boundingBox()).width, 560);
            await splitter.press("Home");
            assert.equal((await sidebar.boundingBox()).width, 280);
            assert.equal(
                await page.evaluate(
                    () => globalThis.window.originalPlot.isConnected
                ),
                true
            );
        });
    }

    await test("shared toolbar retains app controls, native menus and focus across updates and reconnects", async (t) => {
        const page = await open(t);
        await page.evaluate(async () => {
            const toolbar =
                globalThis.document.createElement("gsa-app-toolbar");
            toolbar.appTitle = "Regulatory browser";
            toolbar.innerHTML =
                '<details slot="view-controls" open><summary>View settings</summary><button>Reference</button></details><button slot="general-controls">Intent history</button><div role="group"><label>Draft<input value="Retained edit" style="width:140px"></label><button id="app-command">Export</button></div>';
            const outside = globalThis.document.createElement("button");
            outside.textContent = "Outside";
            outside.style.fontSize = "21px";
            globalThis.document.body.replaceChildren(toolbar, outside);
            globalThis.window.homeRequests = 0;
            toolbar.addEventListener(
                "gsa-home",
                () => globalThis.window.homeRequests++
            );
            globalThis.window.originalDraft = toolbar.querySelector("input");
            globalThis.window.originalMenu = toolbar.querySelector("details");
            await toolbar.updateComplete;
        });
        const toolbar = page.locator("gsa-app-toolbar");
        await expect(toolbar.locator(".brand img")).toHaveJSProperty(
            "complete",
            true
        );
        await expect(toolbar.locator(".brand img")).not.toHaveJSProperty(
            "naturalWidth",
            0
        );
        const website = toolbar.getByRole("link", {
            name: /GenomeSpy website/,
        });
        await expect(website).toHaveAttribute("href", "https://genomespy.app/");
        await expect(website).toHaveAttribute("target", "_blank");
        assert.match(await website.getAttribute("rel"), /noopener/);
        const logo = website.getByRole("img", {
            name: "GenomeSpy",
            exact: true,
        });
        await expect(logo).toBeVisible();
        await expect
            .poll(() =>
                logo.evaluate(
                    (image) => image.complete && image.naturalWidth > 0
                )
            )
            .toBe(true);
        const commandBox = await toolbar
            .getByRole("button", { name: "Export", exact: true })
            .boundingBox();
        assert.ok(
            (await website.boundingBox()).x > commandBox.x,
            "shared website logo belongs at the right edge"
        );
        await toolbar.evaluate((node) => node.focusHome());
        const home = toolbar.getByRole("button", { name: "Home", exact: true });
        await expect(home).toBeFocused();
        const homeBox = await home.boundingBox();
        const websiteBox = await website.boundingBox();
        const viewBox = await toolbar
            .getByText("View settings", { exact: true })
            .boundingBox();
        assert.ok(homeBox.x < viewBox.x && viewBox.x < websiteBox.x);
        await home.press("Enter");
        assert.equal(
            await page.evaluate(() => globalThis.window.homeRequests),
            1
        );
        const command = toolbar.getByRole("button", {
            name: "Export",
            exact: true,
        });
        await command.focus();
        await toolbar.evaluate(async (node) => {
            node.homeDisabled = true;
            node.appTitle = "Cell Annotator";
            await node.updateComplete;
        });
        await expect(home).toBeDisabled();
        await expect(command).toBeFocused();
        assert.equal(
            await page.evaluate(() => globalThis.window.originalMenu.open),
            true
        );
        assert.equal(
            await page
                .getByRole("button", { name: "Outside", exact: true })
                .evaluate((node) => globalThis.getComputedStyle(node).fontSize),
            "21px"
        );
        assert.equal(
            await command.evaluate(
                (node) => globalThis.getComputedStyle(node).fontSize
            ),
            "14px"
        );
        await toolbar.evaluate(async (node) => {
            node.remove();
            globalThis.document.body.prepend(node);
            node.homeDisabled = false;
            const extra = globalThis.document.createElement("button");
            extra.textContent = "App action";
            node.append(extra);
            await node.updateComplete;
        });
        await expect(
            toolbar.getByRole("button", { name: "App action", exact: true })
        ).toBeEnabled();
        assert.equal(
            await page.evaluate(
                () =>
                    globalThis.document.querySelectorAll(
                        "#gsa-app-toolbar-styles"
                    ).length
            ),
            1
        );
        assert.equal(
            await toolbar.evaluate(
                (node) =>
                    globalThis.window.originalDraft ===
                        node.querySelector("input") &&
                    globalThis.window.originalMenu ===
                        node.querySelector("details")
            ),
            true
        );
        await expect(
            toolbar.getByRole("textbox", { name: "Draft", exact: true })
        ).toHaveValue("Retained edit");
        await toolbar.evaluate((node) => {
            node.responsive = true;
            globalThis.window.sessionRequests = 0;
            node.sessionCommands = [
                { id: "reset", label: "Reset", disabled: true, run() {} },
                {
                    id: "debug",
                    label: "Debug",
                    run: () => globalThis.window.sessionRequests++,
                },
            ];
        });
        const more = toolbar.getByRole("button", {
            name: "More actions",
            exact: true,
        });
        await more.press("ArrowUp");
        const menu = page.getByRole("menu", {
            name: "More actions",
            exact: true,
        });
        await expect(
            menu.getByRole("menuitem", { name: "Reset" })
        ).toBeDisabled();
        await expect(
            menu.getByRole("menuitem", { name: "Debug" })
        ).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await expect(more).toBeFocused();
        await more.click();
        await menu.getByRole("menuitem", { name: "Debug" }).click();
        assert.equal(
            await page.evaluate(() => globalThis.window.sessionRequests),
            1
        );

        await page.setViewportSize({ width: 360, height: 800 });
        await expect(more).toHaveAttribute("popovertarget", "toolbar-actions");
        assert.equal(
            await page.evaluate(
                () =>
                    globalThis.document.documentElement.scrollWidth <=
                    globalThis.innerWidth
            ),
            true
        );
        await more.click();
        const controls = toolbar.getByRole("group", {
            name: "More actions",
            exact: true,
        });
        await expect(
            toolbar.getByRole("textbox", { name: "Draft" })
        ).toHaveValue("Retained edit");
        await expect(
            controls.getByRole("button", { name: "Reset" })
        ).toBeDisabled();
        await controls.getByRole("button", { name: "Debug" }).click();
        await expect(controls).toBeHidden();
        await expect(more).toBeFocused();
        assert.equal(
            await page.evaluate(() => globalThis.window.sessionRequests),
            2
        );
        await expect(home).toBeVisible();
    });

    await test("slotted Cancel inherits the progress button appearance and preserves app-owned state", async (t) => {
        const page = await open(t);
        await page.evaluate(async () => {
            globalThis.document.querySelector("#entry").hidden = true;
            const progress = globalThis.document.querySelector("#progress");
            progress.activity = {
                label: "Preparing example",
                startedAt: Date.now(),
                status: "running",
            };
            await progress.updateComplete;
        });
        const progress = page.locator("#progress");
        const style = (button) =>
            button.evaluate((node) => {
                const computed = globalThis.getComputedStyle(node);
                return {
                    font: computed.font,
                    border: computed.border,
                    radius: computed.borderRadius,
                    background: computed.backgroundColor,
                    padding: computed.padding,
                    color: computed.color,
                };
            });
        const fallback = await style(
            progress.getByRole("button", { name: "Cancel", exact: true })
        );
        await page.evaluate(() => {
            const progress = globalThis.document.querySelector("#progress");
            const button = globalThis.document.createElement("button");
            button.slot = "cancel";
            button.textContent = "Cancel";
            progress.append(button);
            globalThis.window.cancelRequests = 0;
            progress.addEventListener(
                "gs-job-cancel",
                () => globalThis.window.cancelRequests++
            );
        });
        const button = progress.locator('button[slot="cancel"]');
        assert.deepEqual(await style(button), fallback);
        await button.focus();
        assert.equal(
            await button.evaluate(
                (node) => globalThis.getComputedStyle(node).outlineWidth
            ),
            "2px"
        );
        await page.keyboard.press("Enter");
        assert.equal(
            await page.evaluate(() => globalThis.window.cancelRequests),
            1
        );
        await button.evaluate((node) => {
            node.disabled = true;
        });
        await expect(button).toBeDisabled();
        assert.equal(
            await button.evaluate(
                (node) => globalThis.getComputedStyle(node).cursor
            ),
            "default"
        );
        assert.equal(
            await page.evaluate(() => globalThis.window.cancelRequests),
            1
        );
    });
}
