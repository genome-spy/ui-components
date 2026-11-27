/** Exercise the packed optional native-select styles; jsdom cannot verify native picker layout. */
import { expect } from "playwright/test";

/** @param {import("playwright").Page} page */
export async function checkNativeSelect(page) {
    const select = page.getByRole("combobox", {
        name: "Reference",
        exact: true,
    });
    const host = page.locator("#native-select-fixture");
    // Opt-in styles must leave other native fields alone.
    const unmarkedAppearance = await host.evaluate((form) => {
        const unmarked = globalThis.document.createElement("select");
        form.append(unmarked);
        const sheet = form.querySelector("style").sheet;
        try {
            const enhanced = globalThis.getComputedStyle(unmarked).appearance;
            sheet.disabled = true;
            return [enhanced, globalThis.getComputedStyle(unmarked).appearance];
        } finally {
            sheet.disabled = false;
            unmarked.remove();
        }
    });
    expect(unmarkedAppearance[0]).toBe(unmarkedAppearance[1]);
    const placeholder = select.locator('option[value=""]');
    await expect(select).toHaveValue("");
    await expect(placeholder).toHaveText("Choose a reference");
    await expect(placeholder).toHaveJSProperty("hidden", true);
    await expect(placeholder).toHaveJSProperty("disabled", true);
    await select.selectOption("lung");
    await expect(select).toHaveValue("lung");
    await expect(host).toHaveAttribute("data-choices", "lung");

    await host.evaluate(() => {
        globalThis.updateNativeSelect({ value: "" });
    });
    await expect(select).toHaveValue("");
    await expect(select.locator("option:checked")).toHaveText(
        "Choose a reference"
    );
    await expect(host).toHaveAttribute("data-choices", "lung");

    await host.evaluate(() => {
        globalThis.updateNativeSelect({
            options: [{ value: "liver", label: "Liver" }],
            value: "liver",
        });
    });
    await expect(select).toHaveValue("liver");
    await expect(select.locator("selectedcontent")).toHaveText("Liver");
    await host.evaluate(() => {
        globalThis.updateNativeSelect({
            options: [{ value: "liver", label: "Updated reference" }],
        });
    });
    await expect(select).toHaveValue("liver");
    await expect(select.locator("selectedcontent")).toHaveText(
        "Updated reference"
    );

    // Exercise real keyboard choice, not just Playwright's programmatic selection.
    await host.evaluate(() => {
        globalThis.updateNativeSelect({
            options: [
                { value: "lung", label: "Lung" },
                { value: "blood", label: "Blood" },
            ],
            value: "lung",
            hideLabel: true,
        });
    });
    await select.focus();
    await select.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(select).toHaveValue("blood");
    await expect(select).toBeFocused();
    await expect(host).toHaveAttribute("data-choices", "lung,blood");
    expect(
        await host.evaluate((form) => new FormData(form).get("reference"))
    ).toBe("blood");

    await host.evaluate((control) => {
        const label = "Long reference name ".repeat(15);
        globalThis.updateNativeSelect({
            options: [{ value: "long", label }],
            value: "long",
        });
        control.style.width = "180px";
        control.style.setProperty("--gs-control-border", "#123456");
    });
    await expect(select).toHaveCSS("border-top-color", "rgb(18, 52, 86)");
    const labelFits = await select.evaluate((control) => {
        const text = control
            .querySelector("selectedcontent")
            .getBoundingClientRect();
        const padding = parseFloat(
            globalThis.getComputedStyle(control).paddingInlineEnd
        );
        const box = control.getBoundingClientRect();
        return text.right <= box.right - padding && box.width <= 180;
    });
    expect(labelFits).toBe(true);
    await select.click();
    const option = page.getByRole("option", { name: /^Long reference name/ });
    await expect(option).toBeVisible();
    const bounds = await option.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
        page.viewportSize().width
    );
    await page.keyboard.press("Escape");
    await expect(select).toBeFocused();
    // Forced colors uses the platform field rather than the enhanced picker.
    await host.evaluate(() => {
        globalThis.updateNativeSelect({
            options: [
                { value: "lung", label: "Lung" },
                { value: "blood", label: "Blood" },
            ],
            value: "lung",
        });
    });
    await page.emulateMedia({ forcedColors: "active" });
    try {
        await expect(select).toHaveCSS("appearance", "auto");
        await select.focus();
        // OS picker keyboard operation is unverified in macOS headless Chromium.
        await select.selectOption("blood");
        await expect(select).toHaveValue("blood");
        await expect(select).toBeFocused();
    } finally {
        await page.emulateMedia({ forcedColors: "none" });
    }
    await host.evaluate(() => {
        globalThis.updateNativeSelect({ disabled: true });
    });
    await expect(select).toBeDisabled();
}
