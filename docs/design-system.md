# BoPE visual system

The shared `app/design-system.css` stylesheet overrides the legacy base styles for all four Next.js routes. `SiteFrame.jsx` keeps the legacy member DOM mounted so the calculator and member navigation continue to work.

- Original alliance emblem is preserved unchanged.
- Palette: graphite `#111210`, stone surfaces `#1b1c19` / `#242521`, off-white text `#e8e5dc`, gold `#d0b77f`, terracotta `#e99078`, sage `#9fc4a6`.
- Work Sans for readable headings, body and statistics; tabular numbers for scores.
- Persistent desktop sidebar above 1100px, compact top navigation below 1100px, four visible mobile shortcuts below 760px.
- Shared 44px minimum button targets, visible keyboard focus, skip-to-content link and reduced-motion support.
- Table headings remain fixed inside the scroll region. The player column also stays visible during horizontal scrolling on mobile.
- Switching sections resets page scroll; changing the R4 edition preserves it.

No deployment or data-source configuration is changed by these visual updates.
