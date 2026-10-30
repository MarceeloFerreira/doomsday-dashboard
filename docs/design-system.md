# BoPE visual system

The shared `app/design-system.css` stylesheet overrides the legacy base styles for the Next.js routes. `SiteFrame.jsx` keeps the legacy member DOM mounted so the calculator and member navigation continue to work.

- Original alliance emblem is preserved unchanged.
- Palette: graphite `#111210`, stone surfaces `#1b1c19` / `#242521`, off-white text `#e8e5dc`, gold `#d0b77f`, terracotta `#e99078`, sage `#9fc4a6`.
- Work Sans for readable headings, body and statistics; tabular numbers for scores.
- Persistent desktop sidebar above 1100px, collapsible navigation below 1100px, with grouped two-column links when open.
- Shared 44px minimum button targets, visible keyboard focus, skip-to-content link and reduced-motion support.
- Table headings remain fixed inside the scroll region. The player column also stays visible during horizontal scrolling on mobile.
- Switching sections resets page scroll; changing the R4 edition preserves it.

No deployment or data-source configuration is changed by these visual updates.

## Mobile finishing pass

`mobile-polish.css` provides a compact mobile header, an accessible navigation disclosure with Escape/route-close behavior, consistent selects, disclosure chevrons, comfortable touch targets and 16px mobile form text. Tables keep intentional horizontal scrolling within their own region.

Heróis and Bestas have three direct step links and a shared `RosterActionBar`: it appears after the first selection, explains the two-item prerequisite and takes the user to the comparison heading with keyboard focus. The footer and back-to-top control reserve space for the bar. Selection, authorization and recommendation criteria are unchanged.

Visual review covered seven views (Heróis, Bestas, training, access management, calendar, performance and login) at 320, 390, 768, 1280 and 1920px using isolated component fixtures with sample account/performance data, plus live public navigation/login checks. The narrow performance layout keeps full numeric values on spacious cards rather than splitting them across lines. Keyboard menu closure was checked in the live browser.
