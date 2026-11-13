// ============================================================
// charts.js — simple, hand-drawn SVG charts (no libraries needed)
//
//   Charts.columns(...)  monthly income vs. expenses
//   Charts.line(...)     a value over time (e.g. total balance)
//   Charts.barList(...)  ranked horizontal bars (e.g. spending by category)
//
// Each chart has a hover tooltip, and Charts.card() adds a
// "Table" button so the numbers can also be read as a table.
// ============================================================
"use strict";

const Charts = (() => {
  const { h, svg, formatMoney } = Utils;

  // Picks tidy axis numbers, e.g. 0 / 1,000 / 2,000 / 3,000
  function niceScale(min, max, count = 4) {
    if (min === max) max = min + 1;
    const rough = (max - min) / count;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const n = rough / magnitude;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
    return { lo, hi, ticks };
  }

  // A column whose top corners are rounded (4px) and whose base is square
  function columnPath(x, y, w, height) {
    const r = Math.min(4, w / 2, height);
    return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + height}Z`;
  }

  // Shared parts: a wrapper that holds the SVG and the hover tooltip
  function frame(container) {
    container.replaceChildren();
    const wrap = h("div", { class: "chart-wrap" });
    const tooltip = h("div", { class: "chart-tooltip", hidden: true, role: "status" });
    container.append(wrap);
    wrap.append(tooltip);
    const width = Math.max(wrap.clientWidth || container.clientWidth || 600, 260);
    return { wrap, tooltip, width };
  }

  function showTooltip(tooltip, wrap, x, title, rows) {
    tooltip.replaceChildren(
      h("div", { class: "tt-title", text: title }),
      ...rows.map((r) => h("div", { class: "tt-row" },
        r.color ? h("span", { class: "swatch", style: { background: r.color } }) : null,
        h("span", { class: "tt-name", text: r.name }),
        h("span", { class: "tt-value money", text: r.value }))),
    );
    tooltip.hidden = false;
    const w = tooltip.offsetWidth;
    const left = Utils.clamp(x - w / 2, 0, wrap.clientWidth - w);
    tooltip.style.left = left + "px";
    tooltip.style.top = "0px";
  }

  function legend(series) {
    return h("div", { class: "legend" }, series.map((s) =>
      h("span", { class: "legend-item" }, h("span", { class: "swatch", style: { background: s.color } }), s.name)));
  }

  function tickFormatter(ticks) {
    const big = Math.max(...ticks.map(Math.abs)) >= 10000;
    return (v) => Utils.formatMoney(v, big ? { compact: "always" } : { whole: true });
  }

  function axisLabelEvery(count, plotWidth, labelWidth = 44) {
    return Math.max(1, Math.ceil((count * labelWidth) / plotWidth));
  }

  // ---------- Grouped columns ----------
  // options: { labels: [...], series: [{ name, color, values: [...] }], height }
  function columns(container, { labels, series, height = 240, ariaLabel = "" }) {
    const { wrap, tooltip, width } = frame(container);
    if (series.length >= 2) container.prepend(legend(series));

    const m = { top: 16, right: 8, bottom: 28, left: 64 };
    const plotW = width - m.left - m.right;
    const plotH = height - m.top - m.bottom;
    const max = Math.max(0, ...series.flatMap((s) => s.values));
    const scale = niceScale(0, max || 100);
    const y = (v) => m.top + plotH - ((v - scale.lo) / (scale.hi - scale.lo)) * plotH;
    const tickLabel = tickFormatter(scale.ticks);

    const chart = svg("svg", { class: "chart", width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": ariaLabel });

    for (const tick of scale.ticks) {
      chart.append(
        svg("line", { class: tick === 0 ? "baseline" : "grid", x1: m.left, x2: width - m.right, y1: y(tick), y2: y(tick) }),
        svg("text", { class: "y-tick", x: m.left - 8, y: y(tick) + 4, "text-anchor": "end", text: tickLabel(tick) }),
      );
    }

    const band = plotW / labels.length;
    const n = series.length;
    const gap = 2;
    const barW = Math.max(3, Math.min(24, (band * 0.72 - gap * (n - 1)) / n));
    const groupW = barW * n + gap * (n - 1);
    const every = axisLabelEvery(labels.length, plotW);

    const hover = svg("rect", { class: "hover-band", y: m.top, height: plotH, width: band, visibility: "hidden" });
    chart.append(hover);

    labels.forEach((label, i) => {
      const cx = m.left + band * (i + 0.5);
      series.forEach((s, j) => {
        const v = s.values[i];
        if (v > 0) {
          const top = y(v);
          chart.append(svg("path", { d: columnPath(cx - groupW / 2 + j * (barW + gap), top, barW, y(0) - top), fill: s.color }));
        }
      });
      if (i % every === 0 || i === labels.length - 1) {
        chart.append(svg("text", { class: "x-tick", x: cx, y: height - 8, "text-anchor": "middle", text: label.short }));
      }
      // Invisible, full-height hit area so hovering anywhere in the column shows the tooltip
      const hit = svg("rect", { class: "hit", x: m.left + band * i, y: m.top, width: band, height: plotH, fill: "transparent" });
      const show = () => {
        hover.setAttribute("x", m.left + band * i);
        hover.setAttribute("visibility", "visible");
        showTooltip(tooltip, wrap, cx, label.long, series.map((s) => ({ name: s.name, color: s.color, value: formatMoney(s.values[i]) })));
      };
      hit.addEventListener("pointerenter", show);
      hit.addEventListener("pointerdown", show);
      chart.append(hit);
    });

    chart.addEventListener("pointerleave", () => {
      tooltip.hidden = true;
      hover.setAttribute("visibility", "hidden");
    });
    wrap.prepend(chart);
  }

  // ---------- Line ----------
  // options: { labels: [...], values: [...], color, name, height }
  function line(container, { labels, values, color, name, height = 220, ariaLabel = "" }) {
    const { wrap, tooltip, width } = frame(container);
    const m = { top: 16, right: 72, bottom: 28, left: 64 };
    const plotW = width - m.left - m.right;
    const plotH = height - m.top - m.bottom;
    const scale = niceScale(Math.min(...values), Math.max(...values));
    const x = (i) => m.left + (values.length === 1 ? plotW / 2 : (i / (values.length - 1)) * plotW);
    const y = (v) => m.top + plotH - ((v - scale.lo) / (scale.hi - scale.lo)) * plotH;
    const tickLabel = tickFormatter(scale.ticks);

    const chart = svg("svg", { class: "chart", width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": ariaLabel });

    for (const tick of scale.ticks) {
      chart.append(
        svg("line", { class: tick === 0 ? "baseline" : "grid", x1: m.left, x2: width - m.right, y1: y(tick), y2: y(tick) }),
        svg("text", { class: "y-tick", x: m.left - 8, y: y(tick) + 4, "text-anchor": "end", text: tickLabel(tick) }),
      );
    }

    const every = axisLabelEvery(labels.length, plotW);
    labels.forEach((label, i) => {
      if (i % every === 0 || i === labels.length - 1) {
        chart.append(svg("text", { class: "x-tick", x: x(i), y: height - 8, "text-anchor": "middle", text: label.short }));
      }
    });

    const d = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
    chart.append(svg("path", { d, fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));

    // End dot + value label (the one number worth labelling directly)
    const last = values.length - 1;
    chart.append(
      svg("circle", { class: "dot", cx: x(last), cy: y(values[last]), r: 4, fill: color }),
      svg("text", { class: "end-label money", x: x(last) + 10, y: y(values[last]) + 4, text: formatMoney(values[last], { compact: true }) }),
    );

    const crosshair = svg("line", { class: "crosshair", y1: m.top, y2: m.top + plotH, visibility: "hidden" });
    const focusDot = svg("circle", { class: "dot", r: 5, fill: color, visibility: "hidden" });
    chart.append(crosshair, focusDot);

    const step = values.length > 1 ? plotW / (values.length - 1) : plotW;
    values.forEach((v, i) => {
      const hit = svg("rect", { x: x(i) - step / 2, y: m.top, width: step, height: plotH, fill: "transparent" });
      const show = () => {
        crosshair.setAttribute("x1", x(i));
        crosshair.setAttribute("x2", x(i));
        crosshair.setAttribute("visibility", "visible");
        focusDot.setAttribute("cx", x(i));
        focusDot.setAttribute("cy", y(v));
        focusDot.setAttribute("visibility", "visible");
        showTooltip(tooltip, wrap, x(i), labels[i].long, [{ name, color, value: formatMoney(v) }]);
      };
      hit.addEventListener("pointerenter", show);
      hit.addEventListener("pointerdown", show);
      chart.append(hit);
    });

    chart.addEventListener("pointerleave", () => {
      tooltip.hidden = true;
      crosshair.setAttribute("visibility", "hidden");
      focusDot.setAttribute("visibility", "hidden");
    });
    wrap.prepend(chart);
  }

  // ---------- Ranked horizontal bars (plain HTML) ----------
  // items: [{ icon, name, value, detail }]
  function barList(items, { total, color = "var(--series-1)", onClick } = {}) {
    const max = Math.max(...items.map((i) => i.value), 1);
    return h("ul", { class: "bar-list" }, items.map((item) => {
      const row = h(onClick ? "button" : "div", { class: "bar-row", type: onClick ? "button" : null, onClick: onClick ? () => onClick(item) : null },
        h("span", { class: "bar-icon", "aria-hidden": "true", text: item.icon }),
        h("span", { class: "bar-body" },
          h("span", { class: "bar-top" },
            h("span", { class: "bar-name", text: item.name }),
            h("span", { class: "bar-value" }, Utils.money(item.value),
              total ? h("span", { class: "bar-pct", text: Utils.percent(item.value, total) }) : null)),
          h("span", { class: "bar-track" },
            h("span", { class: "bar-fill", style: { width: Math.max(1, (item.value / max) * 100) + "%", background: color } }))),
      );
      return h("li", null, row);
    }));
  }

  // ---------- A card with a title and a Chart/Table toggle ----------
  // table: { columns: [...], rows: [[...], ...] } — cells can be text or numbers (shown as money)
  function card({ title, subtitle, draw, table, actions, className = "" }) {
    const body = h("div", { class: "chart-body" });
    let showingTable = false;
    const toggle = table ? h("button", { class: "btn btn-ghost btn-small", type: "button", "aria-pressed": "false" }, Utils.icon("table", 16), "Table") : null;

    const render = () => {
      body.replaceChildren();
      if (showingTable) body.append(renderTable(table));
      else draw(body);
    };

    toggle?.addEventListener("click", () => {
      showingTable = !showingTable;
      toggle.setAttribute("aria-pressed", String(showingTable));
      toggle.lastChild.textContent = showingTable ? "Chart" : "Table";
      render();
    });

    const el = h("section", { class: `card ${className}` },
      h("header", { class: "card-header" },
        h("div", null, h("h2", { class: "card-title", text: title }), subtitle ? h("p", { class: "card-subtitle", text: subtitle }) : null),
        h("div", { class: "card-actions" }, actions, toggle)),
      body);
    // Draw after the card is on the page, so the chart can measure its width
    requestAnimationFrame(render);
    return el;
  }

  function renderTable({ columns: cols, rows }) {
    return h("div", { class: "table-scroll" },
      h("table", { class: "data-table" },
        h("thead", null, h("tr", null, cols.map((c, i) => h("th", { scope: "col", class: i ? "num" : null, text: c })))),
        h("tbody", null, rows.map((row) => h("tr", null, row.map((cell, i) =>
          i === 0 ? h("th", { scope: "row", text: cell }) : h("td", { class: "num" }, typeof cell === "number" ? Utils.money(cell) : cell)))))));
  }

  return { columns, line, barList, card };
})();
