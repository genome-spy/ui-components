import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { build } from "vite";

const packageDir = fileURLToPath(new URL("..", import.meta.url));
const consumerDir = await mkdtemp(join(tmpdir(), "genomespy-ui-consumer-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

try {
    const [pack] = JSON.parse(
        execFileSync(
            npm,
            ["pack", "--json", "--pack-destination", consumerDir],
            {
                cwd: packageDir,
                encoding: "utf8",
            }
        )
    );
    const installed = join(consumerDir, "node_modules", pack.name);
    await mkdir(installed, { recursive: true });
    execFileSync("tar", [
        "-xf",
        join(consumerDir, pack.filename),
        "-C",
        installed,
        "--strip-components=1",
    ]);

    const resolveFromConsumer = createRequire(
        join(consumerDir, "package.json")
    ).resolve;
    for (const subpath of ["internal/icon", "dialog.test"]) {
        assert.throws(() => resolveFromConsumer(pack.name + "/" + subpath), {
            code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
        });
    }

    // Reuse npm ci's dependencies while resolving the library from the archive.
    const manifest = JSON.parse(
        await readFile(join(installed, "package.json"))
    );
    for (const name of Object.keys({
        ...manifest.dependencies,
        ...manifest.peerDependencies,
    })) {
        const source = join(packageDir, "node_modules", name);
        const destination = join(consumerDir, "node_modules", name);
        await mkdir(dirname(destination), { recursive: true });
        await symlink(source, destination, "junction");
    }

    await cp(join(packageDir, "scripts/packed-consumer"), consumerDir, {
        recursive: true,
    });
    execFileSync(
        process.execPath,
        [
            fileURLToPath(import.meta.resolve("typescript/bin/tsc")),
            "--ignoreConfig",
            "--strict",
            "--noEmit",
            "--noUncheckedSideEffectImports",
            "--target",
            "es2022",
            "--module",
            "esnext",
            "--moduleResolution",
            "bundler",
            "main.ts",
        ],
        { cwd: consumerDir, stdio: "inherit" }
    );
    await build({ configFile: false, root: consumerDir, logLevel: "warn" });

    const browser = await chromium.launch({
        channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
    });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const origin = "http://ui-components.local";
        await page.route(origin + "/**", (route) => {
            const { pathname } = new URL(route.request().url());
            return route.fulfill({
                path: join(
                    consumerDir,
                    "dist",
                    pathname === "/" ? "index.html" : pathname
                ),
            });
        });
        await page.goto(origin);

        await expect(page.getByLabel("Dataset name")).toHaveCSS(
            "border-top-color",
            "rgb(18, 52, 86)"
        );
        await expect(
            page.getByRole("button", { name: "Display mode: Tracks" })
        ).toBeVisible();
        await expect(
            page.getByRole("spinbutton", { name: "Maximum reads" })
        ).toBeVisible();

        const search = page.getByRole("combobox", { name: "Find samples" });
        await search.fill("unavailable");
        await expect(
            page.getByText("Search failed.", { exact: false })
        ).toBeVisible();
        await expect(page.getByText("No matches")).toHaveCount(0);
        await search.fill("group");
        await expect(
            page.getByRole("option", { name: "Group A" })
        ).toBeVisible();

        const region = page.getByRole("region", { name: "Import preview" });
        const table = region.getByRole("table");
        await expect(table).toHaveCount(1);
        await expect(table).toHaveAttribute("aria-rowcount", "201");
        const header = table.getByRole("columnheader", { name: "Sample" });
        await expect(header).toBeInViewport();
        await region.focus();
        await page.keyboard.press("End");
        await expect(
            table.getByRole("cell", { name: "Sample 200" })
        ).toBeInViewport();
        await expect(header).toBeInViewport();

        const dialogOpener = page.getByRole("button", { name: "Open dialog" });
        const dialog = page.getByRole("dialog", { name: "Dialog lifecycle" });
        const dialogResult = page.locator("#dialog-result");
        await dialogOpener.click();
        const close = dialog.getByRole("button", { name: "Close dialog" });
        const apply = dialog.getByRole("button", {
            name: "Apply",
            exact: true,
        });
        await expect(
            apply.locator("svg[data-icon=check] path[d]")
        ).toBeVisible();
        await expect(close).toBeFocused();

        const startPending = dialog.getByRole("button", {
            name: "Start pending work",
        });
        await startPending.click();
        await expect(close).toBeDisabled();
        await expect(dialog).toHaveAttribute("closedby", "none");
        await page.keyboard.press("Escape");
        await dialog.evaluate((element) => element.requestClose());
        await expect(dialog).toBeVisible();
        await expect(dialogResult).toBeEmpty();

        await dialog.getByRole("button", { name: "End pending work" }).click();
        await expect(close).toBeEnabled();
        await close.click();
        await expect(dialog).toHaveCount(0);
        await expect(dialogResult).toHaveText("cancel");
        await expect(dialogOpener).toBeFocused();

        await dialogOpener.click();
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(dialogResult).toHaveText("cancel");

        await dialogOpener.click();
        await startPending.click();
        await apply.click();
        await expect(dialog).toHaveCount(0);
        await expect(dialogResult).toHaveText("applied");
        await expect(dialogOpener).toBeFocused();

        const opener = page.getByRole("button", { name: "Open menu" });
        await opener.click();
        const menu = page.getByRole("menu", { name: "Dataset actions" });
        await expect(menu).toHaveCSS("position", "fixed");
        await expect(
            menu.getByRole("menuitem", { name: "Import" })
        ).toBeFocused();
        await page.keyboard.press("ArrowDown");
        const exportItem = menu.getByRole("menuitem", { name: "Export" });
        await expect(exportItem).toBeFocused();
        const menuIcon = exportItem.locator("svg[data-icon=file-export]");
        await expect(menuIcon).toHaveAttribute("aria-hidden", "true");
        await expect(menuIcon.locator("path")).toHaveCount(2);
        await expect(menuIcon.locator(".fa-secondary")).toHaveCSS(
            "opacity",
            "0.4"
        );
        await page.keyboard.press("Escape");
        await expect(menu).toHaveCount(0);
        await expect(opener).toBeFocused();

        const threshold = page.locator("gs-threshold-comparison-input");
        const operand = threshold.getByRole("spinbutton", {
            name: "Maximum reads",
        });
        const histogram = threshold.locator("gs-histogram");
        const extent = histogram.locator(".histogram-extent > div");
        const plot = histogram.locator(".histogram-thresholds");
        const knob = histogram.locator(".histogram-knob");
        await expect(extent).toHaveText(["0", "41"]);

        // Use the midpoint of the binned domain and drag by a quarter of its width.
        await plot.scrollIntoViewIfNeeded();
        const plotBox = await plot.boundingBox();
        await plot.click({
            position: { x: plotBox.width / 2, y: plotBox.height / 2 },
        });
        await expect(operand).toHaveValue("20.5");
        const knobBox = await knob.boundingBox();
        await page.mouse.move(
            knobBox.x + knobBox.width / 2,
            knobBox.y + knobBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
            knobBox.x + knobBox.width / 2 + plotBox.width / 4,
            knobBox.y + knobBox.height / 2
        );
        await page.mouse.up();
        await expect(operand).toHaveValue("30.8");

        await threshold.evaluate((element) => {
            element.values = [7, 7, 7];
            element.operand = 7;
        });
        await expect(extent).toHaveText(["7", "7"]);
        await expect(histogram.locator(".histogram-threshold")).toHaveCSS(
            "left",
            `${plotBox.width / 2}px`
        );
        await expect(operand).toHaveValue("7");

        const defaultDropZone = page.locator("gs-upload-drop-zone").first();
        const dropIcon = defaultDropZone.locator("svg[data-icon=upload]");
        await expect(dropIcon).toHaveCSS("height", "32px");
        await expect(dropIcon.locator("path[d]")).toBeVisible();

        const dropZone = page.locator("#custom-drop-zone");
        await expect(
            dropZone.getByRole("button", { name: "Choose file", exact: true })
        ).toHaveCount(0);
        await expect(dropZone.locator('[part="drop-zone"]')).toHaveCSS(
            "min-block-size",
            "180px"
        );
        await dropZone.evaluate((element) => {
            const output = element.ownerDocument.querySelector("#chosen-files");
            element.addEventListener("gs-files-chosen", (event) => {
                for (const file of event.detail.files) {
                    output.append(file.name + " ");
                }
            });
        });
        const picker = dropZone.getByRole("button", {
            name: "Choose sample files",
        });
        const chooser = page.waitForEvent("filechooser");
        await picker.press("Enter");
        const openedPicker = await chooser;
        expect(await openedPicker.element().getAttribute("accept")).toBe(
            ".csv"
        );
        await openedPicker.setFiles({
            name: "picked.csv",
            mimeType: "text/csv",
            buffer: Buffer.from("sample\n1"),
        });

        const transfer = await page.evaluateHandle(() => {
            const data = new globalThis.DataTransfer();
            data.items.add(new File(["sample\n2"], "dropped.csv"));
            return data;
        });
        await picker.dispatchEvent("drop", { dataTransfer: transfer });
        await transfer.dispose();
        await expect(page.locator("#chosen-files")).toHaveText(
            "picked.csv dropped.csv"
        );

        expect(errors).toEqual([]);
        process.stdout.write(
            "Packed UI components passed consumer type and browser checks.\n"
        );
    } finally {
        await browser.close();
    }
} finally {
    await rm(consumerDir, { recursive: true, force: true });
}
