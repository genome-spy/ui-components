import { css } from "lit";

/**
 * Header, body, and action layout shared with BaseDialog. Combine this with
 * formStyles in the render root that owns a slotted form. Add gs-dialog-layout
 * to the direct child of gs-dialog and place its action buttons in the footer.
 */
export const dialogLayoutStyles = css`
    gs-dialog:has(> .gs-dialog-layout)::part(dialog) {
        min-inline-size: min(300px, calc(100% - 2rem));
        padding: 0;
    }

    :where(.gs-dialog-layout) > :is(header, section, footer) {
        padding: var(--gs-basic-spacing, 10px);
    }

    :where(.gs-dialog-layout) > header {
        font-weight: bold;
        padding-bottom: 0;

        > :where(h1, h2, h3, h4, h5, h6) {
            font: inherit;
            margin: 0;
        }
    }

    :where(.gs-dialog-layout) > section {
        > :first-child {
            margin-top: 0;
        }

        > :last-child {
            margin-bottom: 0;
        }
    }

    :where(.gs-dialog-layout) > footer {
        border-top: 1px solid
            var(--gs-dialog-stroke-color, var(--gs-divider-color, #d0d0d0));

        .btn.btn-primary {
            --gs-dialog-primary-bg: var(--gs-theme-primary, #51678d);
            background: var(
                --gs-primary-button-background,
                var(--gs-dialog-primary-bg)
            );
            border-color: oklch(
                from var(--gs-dialog-primary-bg) calc(l - 0.08) c h
            );
            color: var(--gs-theme-on-primary, #fff);

            &:hover:not(:disabled) {
                background: var(
                    --gs-primary-button-hover-background,
                    var(
                        --gs-primary-button-background,
                        oklch(
                            from var(--gs-dialog-primary-bg) calc(l - 0.05) c h
                        )
                    )
                );
            }

            &:disabled {
                background: var(
                    --gs-disabled-background,
                    oklch(from var(--gs-dialog-primary-bg) calc(l + 0.08) c h)
                );
                border-color: oklch(
                    from var(--gs-dialog-primary-bg) calc(l - 0.02) c h
                );
                color: var(
                    --gs-disabled-text,
                    oklch(from var(--gs-theme-on-primary, #fff) l c h / 0.6)
                );
            }
        }
    }

    :where(.gs-dialog-layout) > footer:where(:has(> .btn)),
    :where(.gs-dialog-layout) > footer > div {
        display: flex;
        justify-content: flex-end;
        gap: var(--gs-basic-spacing, 10px);
    }
`;
